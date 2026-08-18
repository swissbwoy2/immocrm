// Calibration VISION d'un modèle de demande de location.
// L'IA regarde les pages du formulaire (images PNG) et construit une carte
// champ -> (clé sémantique, section). Le résultat est mémorisé dans
// formulaire_champs : le remplissage devient ensuite 100% déterministe.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const KEYS = [
  "prenom", "nom", "date_naissance", "etat_civil", "nationalite", "permis",
  "adresse_actuelle", "npa_ville_actuelle", "regie_actuelle", "motif",
  "profession", "employeur", "lieu_travail", "revenus_mensuels", "revenus_annuels",
  "nb_personnes", "animaux", "fumeur", "date_entree_souhaitee",
  "email_contact", "tel_contact",
  "bien_adresse", "bien_npa_ville", "bien_ville", "bien_etage", "bien_pieces",
  "bien_loyer", "bien_charges", "bien_loyer_brut", "date_visite",
  "lieu", "date_du_jour", "lieu_et_date", "signature",
];

const SYSTEM = `Tu es un expert des formulaires suisses de demande de location.
On te donne les IMAGES des pages d'un formulaire et, le cas échéant, la liste des champs interactifs (AcroForm) avec leur page et leurs coordonnées.
Ta mission : produire le SCHÉMA du formulaire, c'est-à-dire, pour CHAQUE zone à remplir, la signification sémantique et la section.

Règles :
- "cle" doit appartenir STRICTEMENT à cette liste : ${KEYS.join(", ")}.
- "section" vaut : "principal" (candidat locataire / titulaire 1), "conjoint" (co-candidat, colocataire, occupant, titulaire 2, conjoint) ou "garant" (garant / caution).
- Les colonnes de droite d'un tableau à deux colonnes (souvent intitulées « conjoint », « occupant », « 2e candidat », « co-titulaire ») sont TOUJOURS section "conjoint".
- Les informations du logement convoité (adresse, NPA/ville, pièces, étage, loyer, charges) utilisent les clés bien_* et section "principal".
- Les champs e-mail / téléphone utilisent email_contact / tel_contact quelle que soit la colonne.
- Ignore les zones purement décoratives, les titres, les cases de signature de la régie.
- Ne renvoie AUCUN champ que tu n'as pas vu.
- Réponds UNIQUEMENT un JSON : {"champs":[{"cle":"...","section":"...","nom_champ_pdf":"..."|null,"page":1,"x":0,"y":0,"largeur":160,"hauteur":16}]}
- Pour un formulaire AcroForm : renseigne "nom_champ_pdf" avec le nom EXACT fourni, et laisse les coordonnées à 0.
- Pour un formulaire à plat : "nom_champ_pdf" = null et donne page + coordonnées en POINTS PDF, origine EN HAUT À GAUCHE de la page.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY non configurée" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const caller = userRes?.user;
    if (!caller) return json({ error: "Non authentifié" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    if (!(roles ?? []).some((r: any) => ["admin", "agent"].includes(r.role))) {
      return json({ error: "Accès refusé" }, 403);
    }

    const body = await req.json();
    const formulaireId: string = body.formulaireId;
    const mode: string = body.mode === "acroform" ? "acroform" : "overlay";
    const pages: { page: number; image: string; width: number; height: number }[] = body.pages ?? [];
    const fields: { name: string; type: string; options?: string[]; page?: number; x?: number; y?: number }[] = body.fields ?? [];
    if (!formulaireId || pages.length === 0) return json({ error: "formulaireId et pages sont requis" }, 400);

    const fieldsBlock = mode === "acroform"
      ? fields.map((f) =>
          `- "${f.name}" (type: ${f.type}${f.options?.length ? `, options: ${JSON.stringify(f.options)}` : ""}${
            f.page ? `, page ${f.page}, x=${Math.round(f.x ?? 0)}, y=${Math.round(f.y ?? 0)}` : ""
          })`,
        ).join("\n")
      : "(aucun champ interactif : formulaire à plat, donne des coordonnées)";

    const content: any[] = [
      {
        type: "text",
        text: `FORMULAIRE (mode ${mode}) — ${pages.length} page(s).\n\nCHAMPS INTERACTIFS DÉTECTÉS :\n${fieldsBlock}\n\nDimensions des pages (points PDF) : ${pages
          .map((p) => `p${p.page}: ${Math.round(p.width)}x${Math.round(p.height)}`)
          .join(", ")}\n\nProduis le schéma complet du formulaire.`,
      },
      ...pages.map((p) => ({ type: "image_url", image_url: { url: p.image } })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return json({ error: "Limite de requêtes IA atteinte, réessayez dans un instant." }, 429);
    if (res.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!res.ok) return json({ error: `Erreur passerelle IA (${res.status}): ${await res.text()}` }, 502);

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return json({ error: "Réponse IA illisible" }, 502);
      parsed = JSON.parse(m[0]);
    }
    const list: any[] = Array.isArray(parsed) ? parsed : parsed.champs ?? parsed.fields ?? [];

    const validNames = new Set(fields.map((f) => f.name));
    const typeByName = new Map(fields.map((f) => [f.name, f.type]));
    const seen = new Set<string>();
    const rows = list
      .map((c: any) => {
        const cle = String(c.cle ?? c.cle_champ ?? "").trim();
        if (!KEYS.includes(cle)) return null;
        const section = ["principal", "conjoint", "garant"].includes(String(c.section))
          ? String(c.section)
          : "principal";
        const nom = c.nom_champ_pdf ? String(c.nom_champ_pdf) : null;
        if (mode === "acroform") {
          if (!nom || !validNames.has(nom)) return null;
          if (seen.has(nom)) return null;
          seen.add(nom);
          return {
            formulaire_id: formulaireId,
            cle_champ: cle,
            section,
            nom_champ_pdf: nom,
            type_champ: typeByName.get(nom) ?? "text",
            page: 1, pos_x: 0, pos_y: 0, largeur: 0, hauteur: 0,
            taille_police: 10, alignement: "left",
          };
        }
        const page = Math.max(1, Number(c.page) || 1);
        return {
          formulaire_id: formulaireId,
          cle_champ: cle,
          section,
          nom_champ_pdf: null,
          type_champ: "text",
          page,
          pos_x: Math.max(0, Number(c.x ?? c.pos_x) || 0),
          pos_y: Math.max(0, Number(c.y ?? c.pos_y) || 0),
          largeur: Number(c.largeur ?? c.w) || 160,
          hauteur: Number(c.hauteur ?? c.h) || 14,
          taille_police: 10,
          alignement: "left",
        };
      })
      .filter(Boolean) as any[];

    if (rows.length === 0) return json({ error: "L'IA n'a identifié aucun champ exploitable" }, 422);

    await admin.from("formulaire_champs").delete().eq("formulaire_id", formulaireId);
    const { error: insErr } = await admin.from("formulaire_champs").insert(rows);
    if (insErr) return json({ error: insErr.message }, 500);

    await admin
      .from("formulaires_location")
      .update({ mode, calibrated_at: new Date().toISOString() })
      .eq("id", formulaireId);

    const conjoint = rows.filter((r) => r.section === "conjoint").length;
    console.log(`postulation-calibrate: ${rows.length} champs (conjoint=${conjoint}) mode=${mode}`);

    return json({ mode, count: rows.length, conjoint, champs: rows });
  } catch (e) {
    console.error("postulation-calibrate error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
