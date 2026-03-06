import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { mandate_id, signature_data, email, access_token } = body;

    if (!mandate_id || !signature_data || !email || !access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (mandate_id, signature_data, email, access_token)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture IP and User-Agent server-side
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Verify mandate exists and validate access_token
    const { data: mandate, error: fetchErr } = await supabase
      .from("mandates")
      .select("id, signed_at, activation_deposit_paid, access_token, token_invalidated_at")
      .eq("id", mandate_id)
      .single();

    if (fetchErr || !mandate) {
      return new Response(
        JSON.stringify({ success: false, error: "Mandat introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate access_token
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

    // Verify all 11 legal checkboxes are checked
    const { data: mandateData } = await supabase
      .from("mandates")
      .select("legal_exclusivite, legal_duree, legal_commission, legal_acompte, legal_resiliation, legal_obligations_client, legal_obligations_agence, legal_protection_donnees, legal_litiges, legal_droit_applicable, legal_acceptation_generale")
      .eq("id", mandate_id)
      .single();

    const legalFields = [
      "legal_exclusivite", "legal_duree", "legal_commission", "legal_acompte",
      "legal_resiliation", "legal_obligations_client", "legal_obligations_agence",
      "legal_protection_donnees", "legal_litiges", "legal_droit_applicable",
      "legal_acceptation_generale"
    ];

    const allChecked = legalFields.every((f) => (mandateData as any)?.[f] === true);
    if (!allChecked) {
      return new Response(
        JSON.stringify({ success: false, error: "Toutes les cases juridiques doivent être cochées" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate SHA-256 hash server-side
    const encoder = new TextEncoder();
    const dataToHash = `${mandate_id}:${email}:${signature_data.substring(0, 100)}:${ip}:${new Date().toISOString()}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataToHash));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signatureHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Determine status
    const newStatus = mandate.activation_deposit_paid ? "active" : "pending_payment";

    // Get active contract version
    const { data: contractText } = await supabase
      .from("mandate_contract_texts")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Update mandate with signature
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("mandates")
      .update({
        signature_data,
        signature_hash: signatureHash,
        signature_ip: ip,
        signature_user_agent: userAgent,
        signed_at: now,
        status: newStatus,
        contract_version_id: contractText?.id || null,
      })
      .eq("id", mandate_id);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la signature" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the signature event
    await supabase.rpc("log_mandate_event", {
      p_mandate_id: mandate_id,
      p_event_type: "signature_submitted",
      p_event_description: "Mandat signé électroniquement",
      p_actor_type: "mandant",
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_metadata: JSON.stringify({ status: newStatus, hash: signatureHash }),
      p_is_client_visible: true,
    });

    // Send confirmation email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@immoresidence.ch";

    if (resendApiKey) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      // Extract project domain for tracking link
      const projectUrl = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
      const trackingUrl = `https://immocrm.lovable.app/mandat-v3/suivi?token=${mandate.access_token}`;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: "Confirmation de votre mandat de recherche – ImmoRésidence",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e;">Confirmation de signature</h2>
                <p>Bonjour,</p>
                <p>Votre mandat de recherche immobilière a bien été signé électroniquement.</p>
                <p><strong>Statut actuel :</strong> ${newStatus === "active" ? "Actif" : "En attente de paiement de l'acompte"}</p>
                <p>Vous pouvez suivre l'avancement de votre dossier en cliquant sur le lien ci-dessous :</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${trackingUrl}" style="background-color: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Suivre mon dossier
                  </a>
                </p>
                <p style="color: #666; font-size: 12px;">Ce lien est personnel et confidentiel. Ne le partagez pas.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 11px;">ImmoRésidence Sàrl – Mandat de recherche immobilière</p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the signature if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mandat signé avec succès. Un email de confirmation vous a été envoyé.",
        status: newStatus,
      }),
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
