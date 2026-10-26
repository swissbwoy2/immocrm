import { renderCorporateEmail, emailDetails, emailNotice, emailParagraph, emailSubheading, escapeEmailHtml } from '../_shared/email-shell.ts';
import { formatCHF } from '../_shared/date-fr.ts';
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

    const e = escapeEmailHtml;
    const fullName = `${data.prenom ?? ''} ${data.nom ?? ''}`.trim();
    // Montants au format suisse ; un budget absent ne fait plus planter l'envoi
    const acompte = formatCHF(data.montant_acompte) || '—';
    const emailHtml = renderCorporateEmail({
      title: 'Confirmation de votre demande de mandat',
      preview: `Demande de mandat bien reçue — acompte de ${acompte} à régler.`,
      category: "VOTRE MANDAT",
      bodyHtml:
        emailParagraph(fullName ? `Bonjour <strong>${e(fullName)}</strong>,` : 'Bonjour,') +
        emailParagraph("Nous avons bien reçu votre demande de mandat de recherche. Voici un récapitulatif :") +
        emailDetails([
          ['Type de recherche', data.type_recherche || '—'],
          ['Type de bien', data.type_bien || '—'],
          ['Nombre de pièces', data.pieces_recherche || '—'],
          ['Région', data.region_recherche || '—'],
          ['Budget maximum', formatCHF(data.budget_max) || '—'],
        ], 'Votre recherche') +
        emailNotice(
          `<p style="margin:4px 0 4px;font-size:28px;line-height:36px;font-weight:700;color:#205a43;">${e(acompte)}</p>${
            data.type_recherche === 'Acheter'
              ? 'Acompte pour recherche d\'achat immobilier'
              : 'Acompte pour recherche de logement à louer'
          }`,
          'info',
          "Montant de l'acompte à régler",
        ) +
        ((data.payment_method ?? 'qr_invoice') === 'twint'
          ? emailSubheading('Paiement TWINT instantané') +
            emailParagraph("Payez l'acompte par TWINT au numéro :") +
            emailDetails([
              ['Numéro TWINT', '079 483 91 99'],
              ['Mention obligatoire', `${fullName} - Acompte mandat`],
            ])
          : emailSubheading('Facture QR par email') +
            emailParagraph("Vous recevrez votre facture QR par email sous quelques minutes. Vous pourrez la régler depuis votre application bancaire (e-banking, mobile banking).")) +
        emailSubheading('Prochaines étapes') +
        `<ol style="margin:0 0 18px;padding:0 0 0 20px;color:#36443b;font-size:16px;line-height:24px;">
          <li style="margin:0 0 8px;"><strong>Effectuez le paiement</strong> de l'acompte via virement bancaire</li>
          <li style="margin:0 0 8px;"><strong>Vous recevrez une facture</strong> par email de notre système de facturation</li>
          <li style="margin:0 0 8px;"><strong>Dès réception du paiement</strong>, votre compte sera activé</li>
          <li style="margin:0 0 8px;"><strong>Votre agent</strong> commencera immédiatement vos recherches</li>
        </ol>` +
        emailParagraph("Pour toute question, n'hésitez pas à nous contacter.") +
        emailParagraph("Cordialement,<br><strong>L'équipe Immo-rama.ch</strong>"),
    });

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
