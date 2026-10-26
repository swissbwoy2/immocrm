// Prépare et qualifie les demandes de postulation (file postulation_jobs).
// N'envoie JAMAIS rien à une régie : le résultat est destiné à l'équipe (agent/admin).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { computeDeterministic, finalStatus, isRcItem, nextBackoffSeconds } from "./logic.ts";
import { anthropicCaller, costOf } from "../_shared/steeve/anthropic.ts";

const CLAUDE_MODEL = "claude-haiku-5-5";
const TRIAGE_INSTRUCTIONS =
  "Tu qualifies un dossier de candidature locative suisse pour l'équipe interne. " +
  "Utilise uniquement les faits fournis ; n'invente aucune donnée. " +
  "Tu ne soumets jamais la candidature et ne contactes personne. " +
  "Si des pièces obligatoires manquent, readiness doit être 'blocked'. L'attestation RC ménage n'est jamais obligatoire : ne bloque jamais un dossier pour elle. Réponds en français, de façon concise.";

/** Triage par Claude (Steeve) : même schéma que l'ancienne analyse, réponse structurée imposée. */
async function callClaude(apiKey: string, facts: unknown) {
  try {
    const resp = await anthropicCaller(apiKey)({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      system: [{ type: "text", text: TRIAGE_INSTRUCTIONS }],
      tools: [{ name: "postulation_triage", description: "Résultat du triage du dossier.", input_schema: AI_SCHEMA }],
      tool_choice: { type: "tool", name: "postulation_triage" },
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    });
    const use: any = resp.content.find((b: any) => b.type === "tool_use");
    if (!use?.input) return { error: "claude_empty" };
    return { result: use.input, responseId: `claude:${costOf(CLAUDE_MODEL, resp.usage).toFixed(5)}usd` };
  } catch (e) {
    const msg = String((e as Error)?.message ?? "");
    if (/ 429| 5\d\d|délai|timeout|aborted/i.test(msg)) throw new TransientError("claude_transient");
    return { error: "claude_error" };
  }
}

const OPENAI_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = "gpt-5-mini";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readiness", "missing_items", "priority", "concise_staff_summary", "recommended_next_actions"],
  properties: {
    readiness: { type: "string", enum: ["ready", "blocked"] },
    missing_items: { type: "array", items: { type: "string" } },
    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    concise_staff_summary: { type: "string" },
    recommended_next_actions: { type: "array", items: { type: "string" } },
  },
};

class TransientError extends Error {}

async function callOpenAI(apiKey: string, model: string, facts: unknown) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        instructions:
          "Tu qualifies un dossier de candidature locative suisse pour l'équipe interne. " +
          "Utilise uniquement les faits fournis ; n'invente aucune donnée. " +
          "Tu ne soumets jamais la candidature et ne contactes personne. " +
          "Si des pièces obligatoires manquent, readiness doit être 'blocked'. L'attestation RC ménage n'est jamais obligatoire : ne bloque jamais un dossier pour elle. Réponds en français, de façon concise.",
        input: [{ role: "user", content: JSON.stringify(facts) }],
        text: { format: { type: "json_schema", name: "postulation_triage", strict: true, schema: AI_SCHEMA } },
      }),
    });
    if (res.status === 429 || res.status >= 500) throw new TransientError(`openai_${res.status}`);
    if (!res.ok) return { error: `openai_${res.status}` };
    const body = await res.json();
    const text = (body.output ?? [])
      .flatMap((o: any) => o?.content ?? [])
      .find((c: any) => c?.type === "output_text")?.text;
    if (!text) return { error: "openai_empty", responseId: body.id ?? null };
    return { result: JSON.parse(text), responseId: body.id ?? null };
  } catch (e) {
    if (e instanceof TransientError) throw e;
    if ((e as Error)?.name === "AbortError") throw new TransientError("openai_timeout");
    return { error: "openai_error" };
  } finally {
    clearTimeout(timer);
  }
}

async function processJob(db: any, job: any) {
  const [{ data: offre }, { data: client }] = await Promise.all([
    db.from("offres").select("id, prix, pieces, surface, type_bien, statut").eq("id", job.offre_id).maybeSingle(),
    db.from("clients").select("id, user_id, type_permis, revenus_mensuels, type_contrat, nombre_occupants, animaux")
      .eq("id", job.client_id).maybeSingle(),
  ]);
  if (!offre || !client) throw new Error("offre_ou_client_introuvable");

  const [{ data: candidates }, { data: docs }] = await Promise.all([
    db.from("client_candidates").select("id, type, revenus_mensuels").eq("client_id", job.client_id),
    db.from("documents").select("type_document, date_upload")
      .or(`client_id.eq.${job.client_id}${client.user_id ? `,user_id.eq.${client.user_id}` : ""}`)
      .limit(500),
  ]);

  const det = computeDeterministic({ offre, client, candidates: candidates ?? [], documents: docs ?? [] });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  let ai: any = null;
  let aiError: string | null = null;
  let responseId: string | null = null;
  let aiSource = "openai";
  if (claudeKey) {
    aiSource = "claude";
    const facts = { offre: det.offerFacts, dossier: det.profileFacts, documents_presents: det.presentTypes, manquants_calcules: det.missing, indicateurs: det.indicators };
    let r: any;
    try {
      r = await callClaude(claudeKey, facts);
    } catch (e) {
      if (e instanceof TransientError && job.attempt_count < job.max_attempts) throw e;
      r = { error: (e as Error)?.message || "claude_error" };
    }
    if ("result" in r) { ai = r.result; responseId = r.responseId; } else { aiError = r.error; }
  } else if (apiKey) {
    const model = Deno.env.get("OPENAI_POSTULATION_MODEL") || DEFAULT_MODEL;
    // Faits minimaux, sans nom, e-mail, téléphone ni contenu de document.
    const facts = { offre: det.offerFacts, dossier: det.profileFacts, documents_presents: det.presentTypes, manquants_calcules: det.missing, indicateurs: det.indicators };
    let r: any;
    try {
      r = await callOpenAI(apiKey, model, facts);
    } catch (e) {
      // Erreur transitoire : on retente tant qu'il reste des essais, sinon analyse déterministe seule.
      if (e instanceof TransientError && job.attempt_count < job.max_attempts) throw e;
      r = { error: (e as Error)?.message || "openai_error" };
    }
    if ("result" in r) { ai = r.result; responseId = r.responseId; } else { aiError = r.error; responseId = (r as any).responseId ?? null; }
  }

  // RC ménage : jamais bloquante, même si l'IA la cite.
  if (ai && Array.isArray(ai.missing_items)) {
    const blocking = ai.missing_items.filter((m: string) => !isRcItem(String(m)));
    if (ai.readiness === "blocked" && blocking.length === 0 && ai.missing_items.length > 0) ai.readiness = "ready";
    ai.missing_items = blocking;
  }
  const status = finalStatus(det.missing, ai);
  const ai_result = {
    source: ai ? aiSource : "deterministic",
    analyzed_at: new Date().toISOString(),
    deterministic: { missing: det.missing, indicators: det.indicators, priority: det.priority },
    ai,
    ai_error: aiError,
    readiness: status,
    priority: ai?.priority ?? det.priority,
    missing_items: Array.from(new Set([...det.missing, ...(ai?.missing_items ?? [])])),
    optional_items: det.optional,
    concise_staff_summary: ai?.concise_staff_summary ?? det.summary,
    recommended_next_actions: ai?.recommended_next_actions ?? det.actions,
  };

  const { error } = await db.from("postulation_jobs").update({
    status, ai_result, priority: ai_result.priority, openai_response_id: responseId,
    processed_at: new Date().toISOString(), locked_at: null, last_error: aiError,
  }).eq("id", job.id).eq("status", "processing");
  if (error) throw new Error("maj_job_impossible");
  return status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const jobId = typeof body?.job_id === "string" && /^[0-9a-f-]{36}$/i.test(body.job_id) ? body.job_id : null;

  const caller = await verifyInternalCaller(req);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!caller.ok) {
    // Client authentifié : uniquement son propre job.
    if (!caller.userId) return json({ error: "Non autorisé" }, 401);
    if (!jobId) return json({ error: "job_id requis" }, 400);
    const { data: own } = await db.from("postulation_jobs").select("id, clients!inner(user_id)")
      .eq("id", jobId).eq("clients.user_id", caller.userId).maybeSingle();
    if (!own) return json({ error: "Non autorisé" }, 403);
  }

  const { data: claimed, error: claimErr } = await db.rpc("claim_postulation_jobs", {
    p_job_id: jobId, p_limit: jobId ? 1 : 10,
  });
  if (claimErr) { console.error("process-postulation-job: claim", claimErr.code); return json({ error: "claim" }, 500); }

  const results: { job_id: string; status: string }[] = [];
  for (const job of claimed ?? []) {
    try {
      results.push({ job_id: job.id, status: await processJob(db, job) });
    } catch (e) {
      const transient = e instanceof TransientError;
      const msg = (e as Error)?.message?.slice(0, 200) || "erreur";
      const exhausted = job.attempt_count >= job.max_attempts;
      await db.from("postulation_jobs").update({
        status: "failed",
        last_error: msg,
        locked_at: null,
        next_attempt_at: new Date(Date.now() + nextBackoffSeconds(job.attempt_count) * 1000).toISOString(),
      }).eq("id", job.id);
      console.error("process-postulation-job: échec", { job_id: job.id, transient, exhausted, code: msg });
      results.push({ job_id: job.id, status: "failed" });
    }
  }
  return json({ processed: results.length, results });
});
