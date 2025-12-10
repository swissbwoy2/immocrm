import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationRequest {
  email: string;
  localite: string | null;
  budget: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-new-lead function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, localite, budget }: LeadNotificationRequest = await req.json();
    console.log("New lead notification for:", email, localite, budget);

    // Admin notification email
    const adminEmail = "info@immo-rama.ch";
    
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Immo-Rama <${fromEmail}>`,
        to: [adminEmail],
        subject: "🎯 Nouveau lead shortlist !",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px;">
              Nouveau lead shortlist
            </h1>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>📧 Email :</strong> ${email}</p>
              <p style="margin: 8px 0;"><strong>📍 Localité :</strong> ${localite || "Non spécifiée"}</p>
              <p style="margin: 8px 0;"><strong>💰 Budget :</strong> ${budget || "Non spécifié"}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Ce lead a été soumis via le formulaire shortlist de la landing page.
            </p>
            
            <a href="https://app.immo-rama.ch/admin/leads" 
               style="display: inline-block; background: #e94560; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Voir tous les leads
            </a>
          </div>
        `,
      }),
    });

    const data = await res.json();
    console.log("Email sent successfully:", data);

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-lead function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
