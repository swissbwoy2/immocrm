// Steeve, copilote de l'admin. Appel depuis /admin/steeve avec la session de l'admin.
// Garde-fous : utilisateur authentifié ET admin (vérifié en base), plafond quotidien, outils en lecture seule
// exécutés avec la session de l'admin (chaque fonction revérifie le rôle). Voir _shared/steeve/admin-chat.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { anthropicCaller } from "../_shared/steeve/anthropic.ts";
import { handleAdminChat, historyFromConversation } from "../_shared/steeve/admin-chat.ts";
import { runOperator } from "../_shared/steeve/operator.ts";
import { realMailPort } from "../_shared/steeve/operator-mail.ts";
import { abaninjaFromEnv } from "../_shared/steeve/abaninja.ts";

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?logisorama\.ch|id-preview--f4e29d86-2c22-4626-ac70-fd341e0305cf\.lovable\.app|f4e29d86-2c22-4626-ac70-fd341e0305cf\.lovableproject\.com)$/i;
const MAX_BODY_BYTES = 60_000;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGIN.test(origin) ? origin : "https://logisorama.ch",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST" || (origin && !ALLOWED_ORIGIN.test(origin))) return reply(403, { error: "Accès refusé" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Connexion requise" });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userDb = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData } = await userDb.auth.getUser();
  const user = userData?.user;
  if (!user) return reply(401, { error: "Connexion requise" });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "Message trop long" });
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return reply(400, { error: "Requête invalide" }); }

  const serviceDb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const callModel = apiKey ? anthropicCaller(apiKey) : null;
  // Reprise d'un dossier : la tâche créée (droits vérifiés en base avec la session de l'admin) est exécutée
  // tout de suite par Steeve opérateur, réservée avec un jeton (jamais en même temps que le passage planifié).
  const runTask = async (taskId: string) => {
    const r = await runOperator({ db: serviceDb, mail: realMailPort(serviceDb), callModel, taskId });
    return { mode: r.mode, tache: r.tache ?? null, erreurs: r.erreurs };
  };
  // Actions de l'application (résiliation, remboursement…) : appelées avec la session de l'admin, mêmes contrôles que l'interface.
  const callFunction = async (fn: string, payload: Record<string, unknown>) => {
    if (!/^[a-z0-9-]{3,60}$/.test(fn)) throw new Error("fonction invalide");
    const r = await fetch(`${url}/functions/v1/${fn}`, {
      method: "POST",
      headers: { Authorization: authHeader, apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(String(out?.error ?? `HTTP ${r.status}`));
    return out;
  };
  const abaninja = abaninjaFromEnv();
  // Conversation « Steeve » de la messagerie : l'historique vient de la base, la réponse y est publiée.
  const conversationId = typeof (body as any)?.conversation_id === "string" && /^[0-9a-f-]{36}$/i.test((body as any).conversation_id)
    ? (body as any).conversation_id as string : null;
  if (conversationId) {
    const { data: conv } = await userDb.from("conversations").select("id, conversation_type, admin_user_id").eq("id", conversationId).maybeSingle();
    if (!conv || conv.conversation_type !== "steeve-admin" || conv.admin_user_id !== user.id) return reply(403, { error: "Accès refusé" });
    const { data: rows } = await serviceDb.from("messages").select("sender_type, content, payload, created_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(16);
    const history = historyFromConversation([...(rows ?? [])].reverse());
    if (!history) return reply(200, { reply: null });
    const result = await handleAdminChat({ serviceDb, userDb, userId: user.id, body, callModel, runTask, history, abaninja, callFunction });
    if (result.body.reply) {
      await serviceDb.from("messages").insert({
        conversation_id: conversationId, sender_id: "steeve", sender_type: "assistant", content: result.body.reply,
        payload: { source: "steeve_admin", outils: result.body.tools ?? [] }, read: false,
      });
      await serviceDb.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    }
    return reply(result.status, result.body);
  }

  const result = await handleAdminChat({ serviceDb, userDb, userId: user.id, body, callModel, runTask, abaninja, callFunction });
  return reply(result.status, result.body);
});
