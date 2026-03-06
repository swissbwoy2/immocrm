import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IDENTITY_WHITELIST: Record<string, "string" | "number" | "boolean"> = {
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
  type_recherche: "string",
  type_bien: "string",
  zone_recherche: "string",
  pieces_min: "string",
  budget_max: "number",
  date_entree_souhaitee: "string",
  criteres_obligatoires: "string",
  criteres_souhaites: "string",
};

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
    const { email, prenom, nom, telephone } = body;

    // Validate required fields
    if (!email || !prenom || !nom || !telephone) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs obligatoires manquants: email, prenom, nom, telephone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Format d'email invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Filter input through whitelist
    const filteredData = filterFields(body, IDENTITY_WHITELIST);

    // Create mandate via service_role
    const { data: mandate, error } = await supabase
      .from("mandates")
      .insert(filteredData)
      .select("id, access_token")
      .single();

    if (error) {
      console.error("Mandate creation error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création du mandat" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        mandate_id: mandate.id,
        access_token: mandate.access_token,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
