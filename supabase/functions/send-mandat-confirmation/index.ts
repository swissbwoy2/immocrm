import { renderCorporateEmail } from '../_shared/email-brand.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "../_shared/tracked-resend.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"), "send-mandat-confirmation");
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@immo-rama.ch";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MandatConfirmationRequest {
  email: string;
  prenom: string;
  nom: string;
  type_recherche: string;
  montant_acompte: number;
  region_recherche: string;
  type_bien: string;
  pieces_recherche: string;
  budget_max: number;
  payment_method?: 'twint' | 'qr_invoice';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: MandatConfirmationRequest = await req.json();
    console.log('Sending confirmation email to:', data.email);

    const emailHtml = renderCorporateEmail({ title: 'Confirmation de votre demande de mandat', category: "VOTRE MANDAT", bodyHtml: `
      <p style="margin:0 0 18px;">Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>

      <p style="margin:0 0 18px;">Nous avons bien reçu votre demande de mandat de recherche. Voici un récapitulatif :</p>

      <div style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:22px;margin:20px 0;">
        <h3 style="font-size:18px;line-height:26px;color:#193d2c;margin:22px 0 14px;">Votre recherche</h3>
        <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
          <span style="display:block;color:#677a6c;font-size:12px;line-height:20px;">Type de recherche</span>
          <span style="display:block;color:#202b22;font-weight:600;">${data.type_recherche}</span>
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
          <span style="display:block;color:#677a6c;font-size:12px;line-height:20px;">Type de bien</span>
          <span style="display:block;color:#202b22;font-weight:600;">${data.type_bien}</span>
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
          <span style="display:block;color:#677a6c;font-size:12px;line-height:20px;">Nombre de pièces</span>
          <span style="display:block;color:#202b22;font-weight:600;">${data.pieces_recherche}</span>
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
          <span style="display:block;color:#677a6c;font-size:12px;line-height:20px;">Région</span>
          <span style="display:block;color:#202b22;font-weight:600;">${data.region_recherche}</span>
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
          <span style="display:block;color:#677a6c;font-size:12px;line-height:20px;">Budget maximum</span>
          <span style="display:block;color:#202b22;font-weight:600;">${data.budget_max.toLocaleString('fr-CH')} CHF</span>
        </div>
      </div>

      <div style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:22px;margin:20px 0;">
        <h4 style="font-size:16px;line-height:24px;color:#193d2c;margin:0 0 12px;">Montant de l'acompte à régler</h4>
        <p style="font-size:28px;line-height:36px;color:#205a43;font-weight:700;margin:10px 0;">${data.montant_acompte.toLocaleString('fr-CH')} CHF</p>
        <p style="margin-bottom: 0; color: #205a43;">
          ${data.type_recherche === 'Acheter'
            ? 'Acompte pour recherche d\'achat immobilier'
            : 'Acompte pour recherche de logement à louer'}
        </p>
      </div>

      ${(data.payment_method ?? 'qr_invoice') === 'twint' ? `
      <div style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:22px;margin:20px 0;">
        <h4 style="font-size:16px;line-height:24px;color:#193d2c;margin:0 0 12px;">Paiement TWINT instantané</h4>
        <p style="margin:0 0 18px;">Payez l'acompte par TWINT au numéro :</p>
        <div class="bank-info" style="font-size:18px;font-weight:bold;text-align:center;">079 483 91 99</div>
        <p style="margin-top:10px;"><strong>Mention obligatoire</strong> dans le message TWINT :</p>
        <div class="bank-info" style="text-align:center;">${data.prenom} ${data.nom} - Acompte mandat</div>
      </div>
      ` : `
      <div class="bank-details" style="background:#f3f4ed;border-color:#205a43;">
        <h4 style="color:#205a43;">Facture QR par email</h4>
        <p style="margin:0 0 18px;">Vous recevrez votre facture QR par email sous quelques minutes. Vous pourrez la régler depuis votre application bancaire (e-banking, mobile banking).</p>
      </div>
      `}

      <div style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:22px;margin:20px 0;">
        <h3 style="font-size:18px;line-height:26px;color:#193d2c;margin:22px 0 14px;">Prochaines étapes</h3>
        <ol style="padding-left: 20px;">
          <li style="margin-bottom:8px;"><strong>Effectuez le paiement</strong> de l'acompte via virement bancaire</li>
          <li style="margin-bottom:8px;"><strong>Vous recevrez une facture</strong> par email de notre système de facturation</li>
          <li style="margin-bottom:8px;"><strong>Dès réception du paiement</strong>, votre compte sera activé</li>
          <li style="margin-bottom:8px;"><strong>Votre agent</strong> commencera immédiatement vos recherches</li>
        </ol>
      </div>

      <p style="margin:0 0 18px;">Pour toute question, n'hésitez pas à nous contacter.</p>

      <p style="margin:0 0 18px;">Cordialement,<br><strong>L'équipe Immo-rama.ch</strong></p>` });

    const emailResponse = await resend.emails.send({
      from: `Immo-rama.ch <${fromEmail}>`,
      to: [data.email],
      subject: `✅ Confirmation de votre demande de mandat - Immo-rama.ch`,
      html: emailHtml,
    });

    console.log('Confirmation email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: (emailResponse as any).id || 'sent' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    console.error('Error sending confirmation email:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
