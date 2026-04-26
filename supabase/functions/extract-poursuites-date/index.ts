import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return jsonResponse({ ok: false, error: "LOVABLE_API_KEY non configurée" }, 500);
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ ok: false, error: "Authentification requise" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ ok: false, error: "Session invalide" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { client_id } = body;

    if (!client_id) {
      return jsonResponse({ ok: false, error: "client_id requis" }, 400);
    }

    // Vérifier accès au client
    const { data: client } = await supabase
      .from("clients")
      .select("id, user_id, agent_id")
      .eq("id", client_id)
      .maybeSingle();

    if (!client) return jsonResponse({ ok: false, error: "Client introuvable" }, 404);

    // Autorisation
    const isOwner = client.user_id === userData.user.id;
    let isStaff = false;
    if (!isOwner) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      isStaff = (roles ?? []).some((r) => ["admin", "agent"].includes(r.role));
    }
    if (!isOwner && !isStaff) {
      return jsonResponse({ ok: false, error: "Accès refusé" }, 403);
    }

    // 🆕 Auto-scan : récupérer TOUS les extraits du client, du plus récent au plus ancien
    const { data: docs } = await supabase
      .from("documents")
      .select("id, url, nom, date_upload")
      .eq("client_id", client_id)
      .eq("type_document", "extrait_poursuites")
      .order("date_upload", { ascending: false });

    if (!docs?.length) {
      return jsonResponse({
        ok: false,
        error: "Aucun extrait de poursuites trouvé pour ce client. Uploadez d'abord un extrait.",
      }, 404);
    }

    const scanResults: Array<{
      document_id: string;
      nom: string;
      date_emission?: string;
      confidence?: number;
      error?: string;
    }> = [];

    let bestResult: {
      document_id: string;
      date_emission: string;
      confidence: number;
      office_canton?: string;
      nom_personne?: string;
    } | null = null;

    // Itérer du plus récent au plus ancien, prendre le 1er valide (≥ 0.5 confiance)
    // Stop dès qu'on a un résultat fiable, fallback sur les anciens sinon.
    for (const doc of docs) {
      const ai = await extractFromPdf(supabase, doc, lovableKey);
      scanResults.push({
        document_id: doc.id,
        nom: doc.nom,
        date_emission: ai?.date_emission,
        confidence: ai?.confidence,
        error: ai?.error,
      });

      if (ai?.date_emission && ai?.confidence !== undefined && ai.confidence >= 0.5) {
        bestResult = {
          document_id: doc.id,
          date_emission: ai.date_emission,
          confidence: ai.confidence,
          office_canton: ai.office_canton,
          nom_personne: ai.nom_personne,
        };
        break; // 1er résultat fiable trouvé (= le plus récent par tri date_upload)
      }
    }

    if (!bestResult) {
      return jsonResponse({
        ok: false,
        error: "Aucune date détectable dans les extraits. Saisissez-la manuellement.",
        scanned: scanResults,
      }, 422);
    }

    // Sauvegarde dans clients
    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        extrait_poursuites_date_emission: bestResult.date_emission,
        extrait_poursuites_extraction_method: "ai_auto_scan",
        extrait_poursuites_document_id: bestResult.document_id,
        extrait_poursuites_ai_confidence: bestResult.confidence,
      })
      .eq("id", client_id);

    if (updateErr) {
      console.error("Update client failed:", updateErr);
      return jsonResponse({ ok: false, error: "Sauvegarde échouée" }, 500);
    }

    return jsonResponse({
      ok: true,
      date_emission: bestResult.date_emission,
      confidence: bestResult.confidence,
      document_id: bestResult.document_id,
      office_canton: bestResult.office_canton ?? null,
      nom_personne: bestResult.nom_personne ?? null,
      total_scanned: scanResults.length,
      total_extracts: docs.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("extract-poursuites-date error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});

async function extractFromPdf(
  supabase: ReturnType<typeof createClient>,
  doc: { id: string; url: string | null; nom: string },
  lovableKey: string,
): Promise<{
  date_emission?: string;
  confidence?: number;
  office_canton?: string;
  nom_personne?: string;
  error?: string;
} | null> {
  try {
    if (!doc.url) return { error: "URL manquante" };

    // Construire signed URL si besoin
    let signedUrl = doc.url;
    if (!doc.url.startsWith("http")) {
      const { data: signed } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(doc.url, 300);
      if (signed?.signedUrl) signedUrl = signed.signedUrl;
    }
    if (!signedUrl) return { error: "URL indisponible" };

    // Télécharger
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
    // Devine le MIME via extension
    const isPdf = /\.pdf$/i.test(doc.nom);
    const mime = isPdf ? "application/pdf" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    // Appel Lovable AI Gateway
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
