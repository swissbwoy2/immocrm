// Steeve opérateur : passage planifié (toutes les 15 minutes, voir la migration 20261026000000).
// Appel réservé au serveur (clé de service ou secret interne). Voir _shared/steeve/operator.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { anthropicCaller } from "../_shared/steeve/anthropic.ts";
import { runOperator } from "../_shared/steeve/operator.ts";
import { realMailPort } from "../_shared/steeve/operator-mail.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée" });
  const caller = await verifyInternalCaller(req);
  if (!caller.ok || (caller.kind !== "service" && caller.kind !== "secret")) return json(403, { error: "Accès refusé" });

  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  try {
    const report = await runOperator({ db, mail: realMailPort(db), callModel: apiKey ? anthropicCaller(apiKey) : null });
    console.log("[steeve-operator]", JSON.stringify({ ...report, erreurs: report.erreurs.length }));
    return json(200, { success: true, report });
  } catch (err) {
    console.error("[steeve-operator] échec", (err as Error)?.message);
    return json(500, { success: false });
  }
});
