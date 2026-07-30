// One-off : backfill des offres existantes incomplètes (silencieux, aucun message client).
// Auth : header x-backfill-token === BACKFILL_TOKEN.
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchListingDetails } from "../_shared/listing-details.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-backfill-token",
};

const STATUTS = [
  "interesse", "visite_planifiee", "visite_confirmee", "visite_effectuee",
  "souhaite_postuler", "candidature_deposee", "acceptee",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("BACKFILL_TOKEN");
  if (!expected || req.headers.get("x-backfill-token") !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const limit: number = Math.min(Number(body.limit) || 500, 1000);
  const offset: number = Math.max(Number(body.offset) || 0, 0);
  const dryRun: boolean = body.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: offres, error } = await supabase
    .from("offres")
    .select("id, lien_annonce, surface, pieces, etage, disponibilite, description, type_bien, contact_gerance, contact_annonceur, contact_visite")
    .in("statut", STATUTS)
    .not("lien_annonce", "is", null)
    .neq("lien_annonce", "")
    .or("surface.is.null,etage.is.null,disponibilite.is.null,contact_gerance.is.null")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const report = {
    selected: offres?.length ?? 0,
    processed: 0,
    enriched: 0,
    unchanged: 0,
    failed: 0,
    failures_by_status: {} as Record<string, number>,
    fields_filled: {} as Record<string, number>,
    dry_run: dryRun,
  };

  const FIELDS = [
    "surface", "pieces", "etage", "disponibilite", "description",
    "type_bien", "contact_gerance", "contact_annonceur", "contact_visite",
  ] as const;

  for (const offre of offres ?? []) {
    report.processed += 1;
    const { details, status } = await fetchListingDetails(offre.lien_annonce as string);
    if (status !== "ok") {
      report.failed += 1;
      report.failures_by_status[status] = (report.failures_by_status[status] ?? 0) + 1;
      await sleep(400);
      continue;
    }

    const patch: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const current = (offre as any)[f];
      const isEmpty = current === null || current === undefined || current === "";
      const next = (details as any)[f];
      if (isEmpty && next !== null && next !== undefined && next !== "") {
        patch[f] = next;
        report.fields_filled[f] = (report.fields_filled[f] ?? 0) + 1;
      }
    }

    // Recalcul de l'état d'action requise à partir des valeurs finales
    const merged = { ...offre, ...patch } as any;
    const missing = [
      !merged.surface ? "surface" : null,
      !merged.pieces ? "pièces" : null,
      !merged.etage ? "étage" : null,
      !merged.disponibilite ? "disponibilité" : null,
      !merged.description ? "description" : null,
      !merged.contact_gerance ? "contact gérance" : null,
      !merged.contact_visite ? "contact visite" : null,
    ].filter(Boolean) as string[];
    patch.needs_agent_action = missing.length > 0;
    patch.missing_info = missing.length ? missing.join(", ") : null;

    const hasFieldFill = Object.keys(patch).length > 2;
    if (hasFieldFill) report.enriched += 1; else report.unchanged += 1;

    if (!dryRun) {
      const { error: upErr } = await supabase.from("offres").update(patch).eq("id", offre.id);
      if (upErr) {
        report.failed += 1;
        report.failures_by_status["update_error"] = (report.failures_by_status["update_error"] ?? 0) + 1;
      }
    }

    await sleep(400);
  }

  return new Response(JSON.stringify(report), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
