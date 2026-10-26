// Accès aux documents d'un bien (brochure, dossiers, analyse de marché, bail).
// Autorisés : l'équipe et les appels internes (verifyInternalCaller), le propriétaire du bien,
// et pour la brochure seulement, tout utilisateur connecté si le bien est publié dans l'espace acheteur.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyInternalCaller } from "./internal-auth.ts";

function refus(corsHeaders: Record<string, string>, status: number): Response {
  return new Response(JSON.stringify({ error: "Non autorisé" }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Renvoie une 401/403 si l'appelant n'a pas accès au bien visé par la requête, sinon null. */
export async function denyIfNoAccesBien(
  req: Request,
  corsHeaders: Record<string, string>,
  fnName: string,
  opts: { annoncePublique?: boolean } = {},
): Promise<Response | null> {
  const appelant = await verifyInternalCaller(req);
  if (appelant.ok) return null;
  if (!appelant.userId) return refus(corsHeaders, 401);

  const corps: any = await req.clone().json().catch(() => ({}));
  const svc = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let immeubleId: string | null = typeof corps?.immeuble_id === "string" ? corps.immeuble_id : null;
  if (!immeubleId && typeof corps?.bail_id === "string") {
    const { data: bail } = await svc.from("baux").select("lot_id").eq("id", corps.bail_id).maybeSingle();
    if (bail?.lot_id) {
      const { data: lot } = await svc.from("lots").select("immeuble_id").eq("id", bail.lot_id).maybeSingle();
      immeubleId = lot?.immeuble_id ?? null;
    }
  }
  if (!immeubleId) return refus(corsHeaders, 403);

  const { data: imm } = await svc
    .from("immeubles")
    .select("proprietaire_id, statut_vente, publier_espace_acheteur")
    .eq("id", immeubleId)
    .maybeSingle();
  if (!imm) return refus(corsHeaders, 403);

  if (opts.annoncePublique && imm.statut_vente === "publie" && imm.publier_espace_acheteur === true) {
    return null;
  }

  if (imm.proprietaire_id) {
    const { data: prop } = await svc
      .from("proprietaires")
      .select("user_id")
      .eq("id", imm.proprietaire_id)
      .maybeSingle();
    if (prop?.user_id && prop.user_id === appelant.userId) return null;
  }

  console.error(fnName + ": accès refusé au bien", { userId: appelant.userId, immeubleId });
  return refus(corsHeaders, 403);
}
