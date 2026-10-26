// Relève complète des boîtes partagées pour l'écran « Boîte mail » de l'admin :
// tous les dossiers (Réception, Envoyés, Brouillons, Spam, Corbeille, Archives, dossiers perso).
// Appelée par le cron (clé de service) toutes les 5 minutes, ou par un admin (bouton Actualiser).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { loadBox, type SyncStats, syncBox } from "../_shared/mailbox/core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// La fonction est coupée vers 150 s : on s'arrête bien avant, la suite au passage suivant.
const TIME_BUDGET_MS = 80_000;
// Messages lus en entier par passage (toutes boîtes) : garde le temps de calcul sous la limite.
const MESSAGE_BUDGET = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const caller = await verifyInternalCaller(req);
  const isAdmin = caller.kind === "staff" && (caller.roles || []).includes("admin");
  if (!caller.ok || !(caller.kind === "service" || caller.kind === "secret" || isAdmin)) {
    return json({ error: "Accès refusé" }, 403);
  }
  const body = await req.json().catch(() => ({}));
  const onlyId = typeof body?.mailbox_id === "string" ? body.mailbox_id : null;

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let query = db.from("shared_mailboxes").select("id, address").not("secret_id", "is", null)
    .order("full_sync_at", { ascending: true, nullsFirst: true });
  if (onlyId) query = query.eq("id", onlyId);
  const { data: boxes, error } = await query;
  if (error) return json({ success: false, error: "Lecture des boîtes impossible" }, 500);

  const started = Date.now();
  const deadline = started + (onlyId ? 45_000 : TIME_BUDGET_MS);
  const budget = { deadline, messageBudget: onlyId ? 40 : MESSAGE_BUDGET };
  const results: SyncStats[] = [];
  for (const b of boxes || []) {
    if (Date.now() > deadline || budget.messageBudget <= 0) break;
    try {
      const box = await loadBox(db, b.id);
      results.push(await syncBox(db, box, budget));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ mailbox: b.address, folders: 0, fetched: 0, error: message });
      await db.from("shared_mailboxes").update({ full_sync_at: new Date().toISOString(), full_sync_error: message.slice(0, 500) }).eq("id", b.id);
    }
  }
  console.log("[mailbox-sync]", JSON.stringify(results));
  return json({ success: true, results, ms: Date.now() - started });
});
