import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SYNC_SECRET = Deno.env.get("IMMORAMA_SYNC_SECRET") || "";
const SOURCE = "immo-rama.ch";
const ANNONCEUR_ID = "11110000-0000-4000-8000-000000000001";

// Valeurs initiales uniquement : le profil annonceur immo-rama.ch (rattaché à l'admin)
// reste la source de vérité et peut être modifié à tout moment.
const FALLBACK_CONTACT = {
  nom_contact: "Immo-Rama",
  email_contact: "info@immo-rama.ch",
  telephone_contact: "+41 22 519 09 04",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SOUS_TYPES = [
  "appartement", "maison", "studio", "loft", "villa", "chalet", "terrain",
  "commerce", "bureau", "parking", "attique", "duplex", "entrepot",
  "location_longue", "location_courte", "colocation", "sous_location",
];

function mapSousType(v: unknown): string | null {
  const raw = String(v ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (!raw) return null;
  const alias: Record<string, string> = {
    flat: "appartement", apartment: "appartement", house: "maison",
    penthouse: "attique", land: "terrain", office: "bureau", shop: "commerce",
    garage: "parking", warehouse: "entrepot", room: "colocation",
  };
  const v2 = alias[raw] || raw;
  return SOUS_TYPES.includes(v2) ? v2 : null;
}

function mapTransaction(v: unknown): "vente" | "location" {
  const raw = String(v ?? "").toLowerCase().trim();
  if (["sale", "vente", "buy", "achat", "acheter", "for_sale"].includes(raw)) return "vente";
  return "location";
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function isPublished(p: any): boolean {
  const s = String(p.status ?? p.statut ?? "published").toLowerCase();
  if (p.published === false || p.is_active === false) return false;
  return ["published", "publie", "publié", "active", "online", "live", ""].includes(s);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!SYNC_SECRET) {
    console.error("IMMORAMA_SYNC_SECRET manquant");
    return json({ error: "Service non configuré" }, 500);
  }
  if ((req.headers.get("x-sync-secret") || "") !== SYNC_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const event: string = String(payload?.event || "upsert").toLowerCase();
  const list: any[] = Array.isArray(payload?.properties)
    ? payload.properties
    : Array.isArray(payload)
      ? payload
      : payload?.property
        ? [payload.property]
        : [payload];

  // Source de vérité des coordonnées : le profil annonceur immo-rama.ch (compte admin)
  const { data: annonceurProfil } = await supabase
    .from("annonceurs")
    .select("nom, prenom, nom_entreprise, email, telephone")
    .eq("id", ANNONCEUR_ID)
    .maybeSingle();

  const contact = {
    nom_contact:
      annonceurProfil?.nom_entreprise ||
      [annonceurProfil?.prenom, annonceurProfil?.nom].filter(Boolean).join(" ") ||
      FALLBACK_CONTACT.nom_contact,
    email_contact: annonceurProfil?.email || FALLBACK_CONTACT.email_contact,
    telephone_contact: annonceurProfil?.telephone || FALLBACK_CONTACT.telephone_contact,
  };

  const results: any[] = [];

  for (const p of list) {
    const externalId = String(p?.id ?? p?.external_id ?? "").trim();
    if (!externalId) {
      results.push({ external_id: null, ok: false, error: "id manquant" });
      continue;
    }

    try {
      const { data: existing } = await supabase
        .from("annonces_publiques")
        .select("id, slug")
        .eq("source", SOURCE)
        .eq("external_id", externalId)
        .maybeSingle();

      // Retrait (soft) : suppression source ou annonce non publiée
      if (event === "delete" || !isPublished(p)) {
        if (existing?.id) {
          await supabase
            .from("annonces_publiques")
            .update({ statut: "archive", updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
        results.push({ external_id: externalId, ok: true, action: "retiree" });
        continue;
      }

      const titre = String(p.title ?? p.titre ?? "Annonce Immo-Rama").slice(0, 250);
      const baseSlug = slugify(String(p.slug || titre) || "annonce");
      const slug = existing?.slug || `${baseSlug}-imr-${externalId}`.slice(0, 120);

      const row: Record<string, unknown> = {
        annonceur_id: ANNONCEUR_ID,
        source: SOURCE,
        external_id: externalId,
        titre,
        slug,
        description: p.description ?? null,
        points_forts: Array.isArray(p.highlights) ? p.highlights : null,
        type_transaction: mapTransaction(p.transaction ?? p.type_transaction),
        sous_type: mapSousType(p.property_type ?? p.sous_type),
        prix: num(p.price ?? p.prix) ?? 0,
        nombre_pieces: num(p.rooms ?? p.nombre_pieces),
        surface_habitable: num(p.surface_m2 ?? p.surface_habitable),
        ville: String(p.city ?? p.ville ?? "—"),
        quartier: p.district ?? p.quartier ?? null,
        code_postal: String(p.postal_code ?? p.code_postal ?? "—"),
        adresse: String(p.address ?? p.adresse ?? p.city ?? "—"),
        latitude: num(p.lat ?? p.latitude),
        longitude: num(p.lng ?? p.longitude),
        est_mise_en_avant: p.featured === true,
        statut: "publie",
        date_publication: p.published_at ?? p.date_publication ?? new Date().toISOString(),
        nom_contact: p.contact_name ?? DEFAULT_CONTACT.nom_contact,
        email_contact: p.contact_email ?? DEFAULT_CONTACT.email_contact,
        telephone_contact: p.contact_phone ?? DEFAULT_CONTACT.telephone_contact,
        updated_at: new Date().toISOString(),
      };

      let annonceId = existing?.id as string | undefined;

      if (annonceId) {
        const { error } = await supabase
          .from("annonces_publiques")
          .update(row)
          .eq("id", annonceId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("annonces_publiques")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        annonceId = inserted.id;
      }

      // Galerie photos réelles (annonces natives autorisées)
      const images: string[] = Array.isArray(p.images)
        ? p.images
            .map((im: any) => (typeof im === "string" ? im : im?.url))
            .filter((u: any) => typeof u === "string" && u.startsWith("http"))
        : [];

      if (images.length) {
        await supabase.from("photos_annonces_publiques").delete().eq("annonce_id", annonceId);
        const { error: photoErr } = await supabase.from("photos_annonces_publiques").insert(
          images.slice(0, 40).map((url, i) => ({
            annonce_id: annonceId,
            url,
            ordre: i,
            est_principale: i === 0,
            type_media: "photo",
          })),
        );
        if (photoErr) console.error("photos insert", photoErr);
      }

      results.push({
        external_id: externalId,
        ok: true,
        action: existing ? "mise_a_jour" : "creee",
        annonce_id: annonceId,
        photos: images.length,
      });
    } catch (e) {
      console.error("ingest-immorama item error", externalId, e);
      results.push({ external_id: externalId, ok: false, error: String((e as Error).message || e) });
    }
  }

  return json({
    success: results.every((r) => r.ok),
    processed: results.length,
    results,
  });
});
