import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FORM_BUCKET = "formulaires-location";

/** Date du jour à Zurich, JJ.MM.AAAA */
function todayZurich(): string {
  return new Intl.DateTimeFormat("fr-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date()).replace(/\//g, ".");
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("fr-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date).replace(/\//g, ".");
}

/** Numéro suisse national avec le 0 initial (021 634 28 39) */
function formatPhoneCH(tel?: string | null): string {
  if (!tel) return "";
  const t = String(tel).trim();
  const m = t.match(/^(?:\+41|0041)\s*(.*)$/);
  if (m) {
    const rest = m[1].trim();
    return rest.startsWith("0") ? rest : `0${rest}`;
  }
  return t;
}

function extractNpaVille(adresse?: string | null): string {
  if (!adresse) return "";
  const m = adresse.match(/(\d{4})\s+([^,]+)/);
  if (m) return `${m[1]} ${m[2]}`.trim();
  const parts = adresse.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

interface PdfFieldInfo {
  name: string;
  type: "text" | "checkbox" | "radio" | "dropdown" | "optionlist" | "other";
  options?: string[];
}

async function extractPdfFields(bytes: Uint8Array): Promise<PdfFieldInfo[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const out: PdfFieldInfo[] = [];
  for (const f of form.getFields()) {
    const name = f.getName();
    const ctor = f.constructor?.name ?? "";
    if (ctor.includes("CheckBox")) out.push({ name, type: "checkbox" });
    else if (ctor.includes("RadioGroup")) {
      out.push({ name, type: "radio", options: (f as any).getOptions?.() ?? [] });
    } else if (ctor.includes("Dropdown")) {
      out.push({ name, type: "dropdown", options: (f as any).getOptions?.() ?? [] });
    } else if (ctor.includes("OptionList")) {
      out.push({ name, type: "optionlist", options: (f as any).getOptions?.() ?? [] });
    } else if (ctor.includes("TextField")) out.push({ name, type: "text" });
    else out.push({ name, type: "other" });
  }
  return out;
}

const SYSTEM_PROMPT = `Tu es un assistant expert en gestion locative suisse. Tu remplis des formulaires de demande de location à partir d'un dossier client structuré.

RÈGLES STRICTES (non négociables) :
1. Tout champ e-mail = TOUJOURS l'e-mail de l'AGENT, jamais celui du client.
2. Tout champ téléphone de contact = TOUJOURS le téléphone de l'AGENT, jamais celui du client. Conserve le 0 initial (ex. "021 634 28 39", jamais "21 634 28 39").
3. Les dates sont au format JJ.MM.AAAA (fuseau Europe/Zurich). La "date du jour" est celle fournie dans le dossier.
4. Si une donnée est manquante ou inconnue, laisse le champ VIDE (chaîne vide). N'invente JAMAIS de valeur, aucune approximation, aucun "N/A".
5. Ne mets jamais de donnée du candidat principal dans un champ destiné au garant, au co-locataire ou au co-candidat, sauf s'il existe réellement un co-candidat dans le dossier.
6. Réponds UNIQUEMENT avec un objet JSON valide, sans texte ni balises autour.

Pour les cases à cocher : réponds "Oui" (à cocher) ou "" (laisser vide).
Pour les boutons radio / listes : réponds EXACTEMENT une des options proposées, ou "" si aucune ne correspond.
Pour les montants : chiffres avec séparateur d'espace, ex. "5 400" ou "CHF 5 400" selon le libellé du champ.`;

async function callLLM(userPrompt: string): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY non configurée");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Limite de requêtes IA atteinte, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur passerelle IA (${res.status}): ${await res.text()}`);

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Réponse IA illisible");
    parsed = JSON.parse(m[0]);
  }
  if (parsed && typeof parsed === "object" && parsed.fields && typeof parsed.fields === "object") {
    parsed = parsed.fields;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed ?? {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    out[k] = String(v).trim();
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const caller = userRes?.user;
    if (!caller) return json({ error: "Non authentifié" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    const allowed = (roles ?? []).some((r: any) => ["admin", "agent", "coursier"].includes(r.role));
    if (!allowed) return json({ error: "Accès refusé" }, 403);

    const { formulaireId, clientId, offreId, lieu } = await req.json();
    if (!formulaireId || !clientId) return json({ error: "formulaireId et clientId sont requis" }, 400);

    // ---- Modèle ----
    const { data: formulaire } = await admin
      .from("formulaires_location")
      .select("id, nom, mode, fichier_pdf_url")
      .eq("id", formulaireId)
      .maybeSingle();
    if (!formulaire) return json({ error: "Modèle introuvable" }, 404);
    const mode: string = formulaire.mode ?? "overlay";

    // ---- Dossier client ----
    const { data: client } = await admin
      .from("clients")
      .select(
        "id, user_id, adresse, date_naissance, etat_civil, situation_familiale, nationalite, type_permis, profession, employeur, revenus_mensuels, nombre_occupants, pieces, budget_max, source_revenus, curatelle, animaux, gerance_actuelle, motif_changement, date_engagement, secteur_activite",
      )
      .eq("id", clientId)
      .maybeSingle();
    if (!client) return json({ error: "Client introuvable" }, 404);

    let clientProfile: any = null;
    if (client.user_id) {
      const { data } = await admin
        .from("profiles")
        .select("prenom, nom, email, telephone")
        .eq("id", client.user_id)
        .maybeSingle();
      clientProfile = data;
    }

    const { data: candidates } = await admin
      .from("client_candidates")
      .select("*")
      .eq("client_id", clientId)
      .limit(5);
    const co: any =
      (candidates ?? []).find((c: any) => c.type === "conjoint" || c.type === "colocataire") ??
      (candidates ?? [])[0] ??
      null;

    let offre: any = null;
    if (offreId) {
      const { data } = await admin
        .from("offres")
        .select("adresse, prix, pieces, surface, etage, disponibilite, contact_gerance, lien_annonce")
        .eq("id", offreId)
        .maybeSingle();
      offre = data;
    }

    const { data: agent } = await admin
      .from("profiles")
      .select("prenom, nom, email, telephone")
      .eq("id", caller.id)
      .maybeSingle();

    let dateVisite = "";
    if (offreId) {
      const { data: visite } = await admin
        .from("visites")
        .select("date_visite")
        .eq("offre_id", offreId)
        .order("date_visite", { ascending: false })
        .limit(1)
        .maybeSingle();
      dateVisite = fmtDate(visite?.date_visite as any);
    }

    const dossier = {
      candidat_principal: {
        prenom: clientProfile?.prenom ?? "",
        nom: clientProfile?.nom ?? "",
        date_naissance: fmtDate(client.date_naissance),
        etat_civil: client.etat_civil ?? client.situation_familiale ?? "",
        nationalite: client.nationalite ?? "",
        permis_sejour: client.type_permis ?? "",
        adresse_actuelle: client.adresse ?? "",
        npa_ville_actuelle: extractNpaVille(client.adresse),
        profession: client.profession ?? "",
        employeur: client.employeur ?? "",
        lieu_travail: client.secteur_activite ?? "",
        revenus_mensuels: client.revenus_mensuels ?? "",
        revenus_annuels: client.revenus_mensuels ? Number(client.revenus_mensuels) * 12 : "",
        source_revenus: client.source_revenus ?? "",
        nombre_occupants: client.nombre_occupants ?? "",
        animaux: client.animaux === true ? "Oui" : client.animaux === false ? "Non" : "",
        curatelle: client.curatelle === true ? "Oui" : client.curatelle === false ? "Non" : "",
        regie_actuelle: client.gerance_actuelle ?? "",
        motif_demenagement: client.motif_changement ?? "",
        date_entree_souhaitee: offre?.disponibilite ?? fmtDate(client.date_engagement),
        budget_max: client.budget_max ?? "",
        pieces_recherchees: client.pieces ?? "",
        // Ces coordonnées client NE DOIVENT PAS être utilisées dans les champs de contact
        _email_client_ne_pas_utiliser: clientProfile?.email ?? "",
        _tel_client_ne_pas_utiliser: clientProfile?.telephone ?? "",
      },
      co_candidat: co
        ? {
            prenom: co.prenom ?? "",
            nom: co.nom ?? "",
            date_naissance: fmtDate(co.date_naissance),
            etat_civil: co.etat_civil ?? "",
            nationalite: co.nationalite ?? "",
            permis_sejour: co.type_permis ?? co.permis ?? "",
            adresse_actuelle: co.adresse ?? client.adresse ?? "",
            profession: co.profession ?? "",
            employeur: co.employeur ?? "",
            revenus_mensuels: co.revenus_mensuels ?? "",
            lien: co.lien_avec_client ?? co.type ?? "",
          }
        : null,
      bien_convoite: offre
        ? {
            adresse: offre.adresse ?? "",
            npa_ville: extractNpaVille(offre.adresse),
            pieces: offre.pieces ?? "",
            surface_m2: offre.surface ?? "",
            etage: offre.etage ?? "",
            loyer_mensuel: offre.prix ?? "",
            disponibilite: offre.disponibilite ?? "",
            regie: offre.contact_gerance ?? "",
            date_visite: dateVisite,
          }
        : null,
      agent_responsable: {
        prenom: agent?.prenom ?? "",
        nom: agent?.nom ?? "",
        email: agent?.email ?? "",
        telephone: formatPhoneCH(agent?.telephone),
      },
      signature: {
        lieu: lieu || "Genève",
        date_du_jour: todayZurich(),
      },
    };

    // ---- Champs à remplir selon le mode ----
    let fieldsBlock = "";
    let pdfFields: PdfFieldInfo[] = [];
    let cles: { cle_champ: string }[] = [];

    if (mode === "acroform") {
      if (!formulaire.fichier_pdf_url) return json({ error: "Modèle sans fichier PDF" }, 400);
      const { data: file, error: dlErr } = await admin.storage.from(FORM_BUCKET).download(formulaire.fichier_pdf_url);
      if (dlErr || !file) return json({ error: "PDF du modèle introuvable" }, 404);
      pdfFields = await extractPdfFields(new Uint8Array(await file.arrayBuffer()));
      if (pdfFields.length === 0) return json({ error: "Aucun champ interactif détecté dans ce PDF" }, 400);
      fieldsBlock = pdfFields
        .map((f) =>
          `- "${f.name}" (type: ${f.type}${f.options?.length ? `, options: ${JSON.stringify(f.options)}` : ""})`,
        )
        .join("\n");
    } else {
      const { data } = await admin
        .from("formulaire_champs")
        .select("cle_champ")
        .eq("formulaire_id", formulaireId);
      cles = Array.from(new Set((data ?? []).map((c: any) => c.cle_champ))).map((c) => ({ cle_champ: c }));
      if (cles.length === 0) return json({ error: "Ce modèle n'a aucun champ mappé" }, 400);
      fieldsBlock = cles.map((c) => `- "${c.cle_champ}"`).join("\n");
    }

    const userPrompt = `FORMULAIRE : ${formulaire.nom} (mode ${mode})

CHAMPS À REMPLIR (utilise EXACTEMENT ces identifiants comme clés JSON) :
${fieldsBlock}

DOSSIER CLIENT (JSON) :
${JSON.stringify(dossier, null, 2)}

Renvoie un objet JSON dont les clés sont exactement les identifiants de champs ci-dessus et les valeurs les textes à insérer (chaîne vide si la donnée est absente du dossier).`;

    const values = await callLLM(userPrompt);

    const nonEmpty = Object.values(values).filter((v) => v !== "").length;
    console.log(`postulation-fill-llm: mode=${mode} champs=${pdfFields.length || cles.length} remplis=${nonEmpty}`);

    return json({
      mode,
      values,
      fields: mode === "acroform" ? pdfFields : cles.map((c) => ({ name: c.cle_champ, type: "text" })),
      filled: nonEmpty,
      dossier_resume: {
        client: `${dossier.candidat_principal.prenom} ${dossier.candidat_principal.nom}`.trim(),
        agent_email: dossier.agent_responsable.email,
        agent_tel: dossier.agent_responsable.telephone,
      },
    });
  } catch (e) {
    console.error("postulation-fill-llm error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
