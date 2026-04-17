import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Auth — require staff JWT (admin or agent)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "Session invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows || []).map((r: any) => r.role);
    const isStaff = roles.includes("admin") || roles.includes("agent");
    if (!isStaff) {
      return new Response(JSON.stringify({ success: false, error: "Permission refusée" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Body
    const body = await req.json();
    const { mandate_id, access_token, client_id } = body || {};
    if (!mandate_id || !access_token) {
      return new Response(JSON.stringify({ success: false, error: "mandate_id et access_token requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Load mandate
    const { data: mandate, error: mandateErr } = await admin
      .from("mandates")
      .select("id, access_token, email, prenom, nom, signed_at")
      .eq("id", mandate_id)
      .maybeSingle();

    if (mandateErr || !mandate) {
      return new Response(JSON.stringify({ success: false, error: "Mandat introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((mandate as any).access_token !== access_token) {
      return new Response(JSON.stringify({ success: false, error: "Token invalide" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((mandate as any).signed_at) {
      return new Response(JSON.stringify({ success: false, error: "Ce mandat est déjà signé" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const email = (mandate as any).email;
    const prenom = (mandate as any).prenom || "";
    const nom = (mandate as any).nom || "";

    if (!email || email.endsWith("@placeholder.local")) {
      return new Response(JSON.stringify({ success: false, error: "L'email du client est manquant. Renseignez-le à l'étape 1." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Update status to indicate awaiting signature
    await admin.from("mandates")
      .update({ status: "awaiting_client_signature" })
      .eq("id", mandate_id);

    // 5. Optional: link to client
    if (client_id) {
      await admin.from("mandates").update({ created_by: user.id }).eq("id", mandate_id);
    }

    // 6. Build signing link
    const origin = req.headers.get("origin") || "https://logisorama.ch";
    const signLink = `${origin}/mandat-v3/sign/${access_token}`;

    // 7. Send email via Resend
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Logisorama <noreply@notify.logisorama.ch>";

    if (!RESEND_KEY) {
      console.error("RESEND_API_KEY missing");
      return new Response(JSON.stringify({ success: false, error: "Service email non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resend = new Resend(RESEND_KEY);
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Votre mandat de recherche</title></head>
      <body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px 32px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="margin:0;font-size:22px;color:#0a0a0a;">Logisorama by Immo-rama.ch</h1>
          </div>
          <h2 style="font-size:20px;color:#0a0a0a;margin:0 0 16px;">Bonjour ${prenom} ${nom},</h2>
          <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 16px;">
            Votre agent a pré-rempli votre <strong>mandat de recherche immobilière</strong>.
            Il ne vous reste plus qu'à le vérifier, accepter les clauses et le signer en ligne.
          </p>
          <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 24px;">
            La signature prend moins de 2 minutes.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${signLink}"
               style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Vérifier et signer mon mandat
            </a>
          </div>
          <p style="font-size:13px;color:#666;line-height:1.6;margin:24px 0 0;">
            Ou copiez ce lien dans votre navigateur :<br>
            <span style="word-break:break-all;color:#0a0a0a;">${signLink}</span>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
          <p style="font-size:12px;color:#999;line-height:1.6;margin:0;">
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
          </p>
          <p style="font-size:12px;color:#999;line-height:1.6;margin:16px 0 0;">
            <strong>Christ Ramazani</strong><br>
            Directeur d'agence — Logisorama<br>
            Chemin de l'Esparcette 4, 1023 Crissier
          </p>
        </div>
      </body></html>
    `;

    const { error: emailErr } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "Votre mandat de recherche est prêt à signer",
      html,
    });

    if (emailErr) {
      console.error("Resend error:", emailErr);
      return new Response(JSON.stringify({ success: false, error: "Erreur d'envoi de l'email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 8. Audit log
    try {
      await admin.from("mandate_audit_logs").insert({
        mandate_id,
        event_type: "sent_for_signature_by_staff",
        event_description: `Mandat envoyé pour signature par ${user.email}`,
        success: true,
        metadata: { staff_user_id: user.id, recipient: email },
      });
    } catch (e) {
      console.warn("Audit log failed:", e);
    }

    return new Response(JSON.stringify({ success: true, sign_link: signLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("staff-send-mandate-for-signature error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
