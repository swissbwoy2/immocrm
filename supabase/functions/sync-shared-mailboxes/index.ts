// Relève des boîtes e-mail lues par Steeve (table shared_mailboxes), toutes les 5 minutes (cron).
// Appel interne uniquement (clé de service, secret interne ou membre du personnel).
import { createClient } from "npm:@supabase/supabase-js@2";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";
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
  const denied = await denyIfNotInternal(req, corsHeaders, "sync-shared-mailboxes");
  if (denied) return denied;

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: mailboxes, error } = await db
    .from("shared_mailboxes")
    .select("id, address, imap_host, imap_port, uid_validity, last_uid, last_sync_at")
    .eq("is_active", true)
    .order("last_sync_at", { ascending: true, nullsFirst: true });
  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
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
  console.log("[sync-shared-mailboxes]", JSON.stringify(results));
  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
