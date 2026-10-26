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
  // Facultatif : { task_id } pour exécuter tout de suite une tâche du registre (copilote de l'équipe).
  const body = await req.json().catch(() => ({}));
  const taskId = typeof body?.task_id === "string" && /^[0-9a-f-]{36}$/i.test(body.task_id) ? body.task_id : null;
  try {
    const report = await runOperator({ db, mail: realMailPort(db), callModel: apiKey ? anthropicCaller(apiKey) : null, taskId });
    console.log("[steeve-operator]", JSON.stringify({ ...report, erreurs: report.erreurs.length }));
    return json(200, { success: true, report });
  } catch (err) {
    console.error("[steeve-operator] échec", (err as Error)?.message);
    return json(500, { success: false });
  }
});
