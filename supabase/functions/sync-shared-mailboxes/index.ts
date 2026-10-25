// Relève des boîtes e-mail lues par Steeve (table shared_mailboxes), toutes les 5 minutes (cron).
// Appel réservé au serveur : clé de service ou secret interne (pas de compte du personnel).
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { LeanImap } from "../_shared/imap/lean-imap.ts";
import { syncMailbox, type SyncResult } from "../_shared/imap/shared-mailbox-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// Au-delà, les boîtes restantes attendent le passage suivant (la fonction est coupée vers 150 s).
const TIME_BUDGET_MS = 90_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const caller = await verifyInternalCaller(req);
  if (!caller.ok || (caller.kind !== "service" && caller.kind !== "secret")) {
    return new Response(JSON.stringify({ error: "Accès refusé" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Boîtes jamais tentées d'abord, puis la plus anciennement tentée : une boîte en échec ne bloque pas les autres.
  const { data: mailboxes, error } = await db
    .from("shared_mailboxes")
    .select("id, address, imap_host, imap_port, uid_validity, last_uid")
    .eq("is_active", true)
    .order("last_attempt_at", { ascending: true, nullsFirst: true });
  if (error) {
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const started = Date.now();
  const results: SyncResult[] = [];
  for (const mailbox of mailboxes ?? []) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    results.push(await syncMailbox({ db, mailbox, connect: LeanImap.connect }));
  }
  console.log("[sync-shared-mailboxes]", JSON.stringify(results.map(({ error: _e, ...r }) => r)));
  return new Response(JSON.stringify({ success: true, results: results.map(({ error: _e, ...r }) => r) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
