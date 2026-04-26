// Logique partagée d'extraction IA de la date d'émission d'un extrait de poursuites
// Utilisée par `extract-poursuites-date` (1 client) et `extract-poursuites-batch` (masse)

export interface ExtractDoc {
  id: string;
  url: string | null;
  nom: string;
}

export interface ExtractResult {
  date_emission?: string;
  confidence?: number;
  office_canton?: string;
  nom_personne?: string;
  error?: string;
}

export interface BestResult {
  document_id: string;
  date_emission: string;
  confidence: number;
  office_canton?: string;
  nom_personne?: string;
}

export async function extractFromPdf(
  supabase: any,
  doc: ExtractDoc,
  lovableKey: string,
): Promise<ExtractResult | null> {
  try {
    if (!doc.url) return { error: "URL manquante" };

    let signedUrl = doc.url;
    if (!doc.url.startsWith("http")) {
      const { data: signed } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(doc.url, 300);
      if (signed?.signedUrl) signedUrl = signed.signedUrl;
    }
    if (!signedUrl) return { error: "URL indisponible" };

    const fileResp = await fetch(signedUrl);
    if (!fileResp.ok) return { error: `Téléchargement échoué (${fileResp.status})` };

    const arrayBuf = await fileResp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    const CHUNK = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);
    const isPdf = /\.pdf$/i.test(doc.nom);
    const mime = isPdf ? "application/pdf" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en analyse de documents officiels suisses. Tu reçois un extrait du registre des poursuites (Office des poursuites, eSchKG). " +
              "Extrais avec précision la DATE D'ÉMISSION du document (souvent libellée 'Lausanne, le ...', 'Date d'émission', 'Etabli le', ou date d'impression en haut/bas du document). " +
              "Cette date doit être au format YYYY-MM-DD. Si plusieurs dates apparaissent, privilégie la date d'établissement/émission du document, PAS la date de naissance ni la date des dernières poursuites.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse ce document et extrais la date d'émission." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_poursuites_data",
              description: "Retourne les informations clés extraites de l'extrait de poursuites",
              parameters: {
                type: "object",
                properties: {
                  date_emission: { type: "string", description: "Date d'émission au format YYYY-MM-DD" },
                  office_canton: { type: "string", description: "Canton ou ville de l'office" },
                  nom_personne: { type: "string", description: "Nom et prénom de la personne concernée" },
                  confidence: { type: "number", description: "Score de confiance entre 0 et 1" },
                },
                required: ["date_emission", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_poursuites_data" } },
      }),
    });

    if (aiResp.status === 429) return { error: "Rate limit IA" };
    if (aiResp.status === 402) return { error: "Crédits IA épuisés" };
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t.slice(0, 300));
      return { error: `AI error ${aiResp.status}` };
    }

    const aiResult = await aiResp.json();
    const toolCall = aiResult?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return { error: "Aucun tool_call" };

    const parsed = JSON.parse(toolCall.function.arguments);
    if (!parsed.date_emission || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date_emission)) {
      return { error: "Date invalide" };
    }

    return {
      date_emission: parsed.date_emission,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      office_canton: parsed.office_canton,
      nom_personne: parsed.nom_personne,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Scanne tous les extraits d'un client (du + récent au + ancien) et retourne le 1er résultat fiable (≥0.5).
 */
export async function scanClientExtracts(
  supabase: any,
  clientId: string,
  lovableKey: string,
): Promise<{ best: BestResult | null; scanned: number; total: number }> {
  const { data: docs } = await supabase
    .from("documents")
    .select("id, url, nom, date_upload")
    .eq("client_id", clientId)
    .eq("type_document", "extrait_poursuites")
    .order("date_upload", { ascending: false });

  if (!docs?.length) return { best: null, scanned: 0, total: 0 };

  let scanned = 0;
  for (const doc of docs) {
    scanned++;
    const ai = await extractFromPdf(supabase, doc, lovableKey);
    if (ai?.date_emission && ai?.confidence !== undefined && ai.confidence >= 0.5) {
      return {
        best: {
          document_id: doc.id,
          date_emission: ai.date_emission,
          confidence: ai.confidence,
          office_canton: ai.office_canton,
          nom_personne: ai.nom_personne,
        },
        scanned,
        total: docs.length,
      };
    }
  }
  return { best: null, scanned, total: docs.length };
}
