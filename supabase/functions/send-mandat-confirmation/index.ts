import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: MandatConfirmationRequest = await req.json();
    console.log('Sending confirmation email to:', data.email);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .section h3 { color: #1a365d; margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 600; color: #1e293b; }
    .highlight-box { background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .highlight-box h4 { color: #1e40af; margin-top: 0; }
    .amount { font-size: 28px; color: #1e40af; font-weight: bold; }
    .bank-details { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .bank-details h4 { color: #92400e; margin-top: 0; }
    .bank-info { font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    .cta { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 IMMO-RAMA</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Confirmation de votre demande de mandat</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
      
      <p>Nous avons bien reçu votre demande de mandat de recherche. Voici un récapitulatif :</p>
      
      <div class="section">
        <h3>📋 Votre recherche</h3>
        <div class="info-row">
          <span class="info-label">Type de recherche</span>
          <span class="info-value">${data.type_recherche}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type de bien</span>
          <span class="info-value">${data.type_bien}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nombre de pièces</span>
          <span class="info-value">${data.pieces_recherche}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Région</span>
          <span class="info-value">${data.region_recherche}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Budget maximum</span>
          <span class="info-value">${data.budget_max.toLocaleString('fr-CH')} CHF</span>
        </div>
      </div>
      
      <div class="highlight-box">
        <h4>💰 Montant de l'acompte à régler</h4>
        <p class="amount">${data.montant_acompte.toLocaleString('fr-CH')} CHF</p>
        <p style="margin-bottom: 0; color: #1e40af;">
          ${data.type_recherche === 'Acheter' 
            ? 'Acompte pour recherche d\'achat immobilier'
            : 'Acompte pour recherche de logement à louer'}
        </p>
      </div>
      
      <div class="bank-details">
        <h4>🏦 Coordonnées bancaires pour le paiement</h4>
        <p>Veuillez effectuer le virement avec la référence suivante :</p>
        <div class="bank-info">
          <strong>Référence :</strong> ${data.prenom} ${data.nom} - Mandat
        </div>
        <div class="bank-info">
          <strong>Bénéficiaire :</strong> IMMO-RAMA SA
        </div>
        <div class="bank-info">
          <strong>IBAN :</strong> CH93 0076 7000 E541 3796 7
        </div>
        <div class="bank-info">
          <strong>BIC :</strong> BCVLCH2LXXX
        </div>
        <div class="bank-info">
          <strong>Banque :</strong> Banque Cantonale Vaudoise
        </div>
      </div>
      
      <div class="section">
        <h3>📌 Prochaines étapes</h3>
        <ol style="padding-left: 20px;">
          <li><strong>Effectuez le paiement</strong> de l'acompte via virement bancaire</li>
          <li><strong>Vous recevrez une facture</strong> par email de notre système de facturation</li>
          <li><strong>Dès réception du paiement</strong>, votre compte sera activé</li>
          <li><strong>Votre agent</strong> commencera immédiatement vos recherches</li>
        </ol>
      </div>
      
      <p>Pour toute question, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br><strong>L'équipe IMMO-RAMA</strong></p>
    </div>
    
    <div class="footer">
      <p>IMMO-RAMA SA<br>
      Chemin de l'Esparcette 5, 1023 Crissier<br>
      Tél: 021 625 95 05 | Email: info@immo-rama.ch</p>
      <p>© ${new Date().getFullYear()} IMMO-RAMA SA - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: `IMMO-RAMA <${fromEmail}>`,
      to: [data.email],
      subject: `✅ Confirmation de votre demande de mandat - IMMO-RAMA`,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
