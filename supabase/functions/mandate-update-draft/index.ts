import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ====== STRICT WHITELISTS PER ACTION ======

const IDENTITY_FIELDS: Record<string, "string" | "number" | "boolean"> = {
  email: "string",
  prenom: "string",
  nom: "string",
  telephone: "string",
  date_naissance: "string",
  nationalite: "string",
  adresse: "string",
  npa: "string",
  ville: "string",
  type_permis: "string",
  etat_civil: "string",
  profession: "string",
  employeur: "string",
  revenus_mensuels: "number",
  nombre_enfants: "number",
  animaux: "boolean",
  notes_personnelles: "string",
};

const SEARCH_FIELDS: Record<string, "string" | "number" | "boolean"> = {
  type_recherche: "string",
  type_bien: "string",
  zone_recherche: "string",
  pieces_min: "string",
  budget_max: "number",
  date_entree_souhaitee: "string",
  criteres_obligatoires: "string",
  criteres_souhaites: "string",
};

const RELATED_PARTY_FIELDS: Record<string, "string" | "number" | "boolean"> = {
  role: "string",
  prenom: "string",
  nom: "string",
  email: "string",
  telephone: "string",
  date_naissance: "string",
  nationalite: "string",
  type_permis: "string",
  profession: "string",
  employeur: "string",
  revenus_mensuels: "number",
  lien_avec_mandant: "string",
};

const DOCUMENT_FIELDS: Record<string, "string" | "number" | "boolean"> = {
  file_name: "string",
  file_path: "string",
  file_type: "string",
  file_size: "number",
  document_category: "string",
};

const LEGAL_FIELDS: Record<string, "string" | "number" | "boolean"> = {
  legal_exclusivite: "boolean",
  legal_duree: "boolean",
  legal_commission: "boolean",
  legal_acompte: "boolean",
  legal_resiliation: "boolean",
  legal_obligations_client: "boolean",
  legal_obligations_agence: "boolean",
  legal_protection_donnees: "boolean",
  legal_litiges: "boolean",
  legal_droit_applicable: "boolean",
  legal_acceptation_generale: "boolean",
};

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function filterFields(
  data: Record<string, unknown>,
  whitelist: Record<string, "string" | "number" | "boolean">
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, expectedType] of Object.entries(whitelist)) {
    if (key in data && typeof data[key] === expectedType) {
      result[key] = data[key];
    }
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mandate_id, access_token, action, data } = body;

    // ====== VALIDATION 1: Presence ======
    if (!mandate_id || !access_token || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "mandate_id, access_token et action sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ====== VALIDATION 2-4: Token match, not invalidated, not signed ======
    const { data: mandate, error: fetchErr } = await supabase
      .from("mandates")
      .select("id, access_token, token_invalidated_at, signed_at")
      .eq("id", mandate_id)
      .single();

    if (fetchErr || !mandate) {
      return new Response(
        JSON.stringify({ success: false, error: "Mandat introuvable" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mandate.access_token !== access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token invalide" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mandate.token_invalidated_at) {
      return new Response(
        JSON.stringify({ success: false, error: "Token révoqué" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mandate.signed_at) {
      return new Response(
        JSON.stringify({ success: false, error: "Ce mandat est déjà signé" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== DISPATCH ACTION ======
    switch (action) {
      case "update_identity": {
        const filtered = filterFields(data || {}, IDENTITY_FIELDS);
        if (Object.keys(filtered).length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Aucun champ valide" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("mandates")
          .update(filtered)
          .eq("id", mandate_id);
        if (error) {
          console.error("update_identity error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Erreur mise à jour identité" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "update_search": {
        const filtered = filterFields(data || {}, SEARCH_FIELDS);
        if (Object.keys(filtered).length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Aucun champ valide" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("mandates")
          .update(filtered)
          .eq("id", mandate_id);
        if (error) {
          console.error("update_search error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Erreur mise à jour recherche" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "add_related_party": {
        const filtered = filterFields(data || {}, RELATED_PARTY_FIELDS);
        if (!filtered.prenom || !filtered.nom) {
          return new Response(
            JSON.stringify({ success: false, error: "Prénom et nom du tiers requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("mandate_related_parties")
          .insert({ ...filtered, mandate_id });
        if (error) {
          console.error("add_related_party error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Erreur ajout tiers" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "register_document": {
        const filtered = filterFields(data || {}, DOCUMENT_FIELDS) as Record<string, string | number>;
        
        // Validate file_path starts with mandate_id
        if (typeof filtered.file_path !== "string" || !filtered.file_path.startsWith(`${mandate_id}/`)) {
          return new Response(
            JSON.stringify({ success: false, error: "Chemin fichier invalide" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate file_type
        if (typeof filtered.file_type !== "string" || !ALLOWED_MIME_TYPES.includes(filtered.file_type)) {
          return new Response(
            JSON.stringify({ success: false, error: "Type de fichier non autorisé" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate file_size
        if (typeof filtered.file_size !== "number" || filtered.file_size > MAX_FILE_SIZE || filtered.file_size <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Taille de fichier invalide (max 20MB)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!filtered.file_name) {
          return new Response(
            JSON.stringify({ success: false, error: "Nom de fichier requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: docRow, error } = await supabase
          .from("mandate_documents")
          .insert({
            mandate_id,
            file_name: filtered.file_name,
            file_path: filtered.file_path,
            file_type: filtered.file_type,
            file_size: filtered.file_size,
            document_category: filtered.document_category || "autre",
          })
          .select("id")
          .single();

        if (error) {
          console.error("register_document error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Erreur enregistrement document" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, document_id: docRow.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_legal_checkboxes": {
        const filtered = filterFields(data || {}, LEGAL_FIELDS);
        if (Object.keys(filtered).length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Aucune case valide" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("mandates")
          .update(filtered)
          .eq("id", mandate_id);
        if (error) {
          console.error("update_legal_checkboxes error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Erreur mise à jour juridique" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
