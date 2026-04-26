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
    const { document_id, client_id } = body;

    if (!document_id || !client_id) {
      return jsonResponse({ ok: false, error: "document_id et client_id requis" }, 400);
    }

    // Vérifier accès au client
    const { data: client } = await supabase
      .from("clients")
      .select("id, user_id, agent_id")
      .eq("id", client_id)
      .maybeSingle();

    if (!client) return jsonResponse({ ok: false, error: "Client introuvable" }, 404);

    // Autorisation : owner du client OU admin/agent assigné
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

    // Récupérer le document
    const { data: doc } = await supabase
      .from("documents")
      .select("id, url, nom, type_document")
      .eq("id", document_id)
      .maybeSingle();

    if (!doc) return jsonResponse({ ok: false, error: "Document introuvable" }, 404);

    // Construire signed URL pour le PDF
    let signedUrl = doc.url;
    if (doc.url && !doc.url.startsWith("http")) {
      const { data: signed } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(doc.url, 300);
      if (signed?.signedUrl) signedUrl = signed.signedUrl;
    }

    if (!signedUrl) {
      return jsonResponse({ ok: false, error: "URL du document indisponible" }, 400);
    }

    // Télécharger et convertir en base64
    const fileResp = await fetch(signedUrl);
    if (!fileResp.ok) {
      return jsonResponse({ ok: false, error: "Téléchargement du PDF échoué" }, 500);
    }
    const arrayBuf = await fileResp.arrayBuffer();
    // Encodage base64 par chunks pour éviter "Maximum call stack size exceeded" sur gros fichiers
    const bytes = new Uint8Array(arrayBuf);
    const CHUNK = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);
    const mime = doc.type || "application/pdf";
    const dataUrl = `data:${mime};base64,${base64}`;

    // Appel Lovable AI Gateway (Gemini Flash, multimodal + tool calling)
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
                  date_emission: {
                    type: "string",
                    description: "Date d'émission du document au format YYYY-MM-DD",
                  },
                  office_canton: { type: "string", description: "Canton ou ville de l'office (ex: Vaud, Lausanne)" },
                  nom_personne: { type: "string", description: "Nom et prénom de la personne concernée" },
                  confidence: {
                    type: "number",
                    description: "Score de confiance entre 0 et 1 sur la fiabilité de l'extraction",
                  },
                  notes: { type: "string", description: "Notes optionnelles si quelque chose semble inhabituel" },
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

    if (aiResp.status === 429) {
      return jsonResponse({ ok: false, error: "Limite IA atteinte, réessayez dans 1 minute" }, 429);
    }
    if (aiResp.status === 402) {
      return jsonResponse({ ok: false, error: "Crédits IA épuisés. Ajoutez des crédits dans Lovable Cloud." }, 402);
    }
    if (!aiResp.ok) {
      const errTxt = await aiResp.text();
      console.error("AI error:", aiResp.status, errTxt.slice(0, 500));
      return jsonResponse({ ok: false, error: `Erreur IA (${aiResp.status})` }, 500);
    }

    const aiResult = await aiResp.json();
    const toolCall = aiResult?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return jsonResponse({ ok: false, error: "Aucune donnée extraite par l'IA" }, 422);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return jsonResponse({ ok: false, error: "Réponse IA invalide" }, 500);
    }

    const dateEmission = parsed.date_emission;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

    // Validation date
    if (!dateEmission || !/^\d{4}-\d{2}-\d{2}$/.test(dateEmission)) {
      return jsonResponse({
        ok: false,
        error: "Date non détectable, veuillez la saisir manuellement",
        ai_response: parsed,
      }, 422);
    }

    // Sauvegarde dans clients
    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        extrait_poursuites_date_emission: dateEmission,
        extrait_poursuites_extraction_method: "ai",
        extrait_poursuites_document_id: document_id,
        extrait_poursuites_ai_confidence: confidence,
      })
      .eq("id", client_id);

    if (updateErr) {
      console.error("Update client failed:", updateErr);
      return jsonResponse({ ok: false, error: "Sauvegarde échouée" }, 500);
    }

    return jsonResponse({
      ok: true,
      date_emission: dateEmission,
      confidence,
      office_canton: parsed.office_canton ?? null,
      nom_personne: parsed.nom_personne ?? null,
      notes: parsed.notes ?? null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("extract-poursuites-date error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
