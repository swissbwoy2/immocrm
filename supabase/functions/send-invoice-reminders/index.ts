import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingInvoice {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  abaninja_invoice_ref: string | null;
  abaninja_invoice_id: string | null;
  created_at: string;
  type_recherche: string;
  montant_acompte: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@immo-rama.ch';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invoices pending for more than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: pendingInvoices, error: fetchError } = await supabase
      .from('demandes_mandat')
      .select('id, email, prenom, nom, abaninja_invoice_ref, abaninja_invoice_id, created_at, type_recherche, montant_acompte')
      .eq('statut', 'facture_envoyee')
      .not('abaninja_invoice_id', 'is', null)
      .lt('created_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching pending invoices:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingInvoices?.length || 0} invoices pending > 7 days`);

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const invoice of (pendingInvoices as PendingInvoice[]) || []) {
      const montant = invoice.type_recherche === 'Acheter' ? 2500 : (invoice.montant_acompte || 300);
      const daysPending = Math.floor((Date.now() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder email to client
      if (resendApiKey) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Rappel - Facture en attente</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #dc2626;">Rappel de paiement</h1>
              </div>
              
              <p>Bonjour ${invoice.prenom} ${invoice.nom},</p>
              
              <p>Nous vous rappelons que votre facture <strong>${invoice.abaninja_invoice_ref || 'N/A'}</strong> d'un montant de <strong>${montant} CHF</strong> est en attente de paiement depuis <strong>${daysPending} jours</strong>.</p>
              
              <p>Votre mandat de recherche ne sera activé qu'après réception du paiement.</p>
              
              <div style="background: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #dc2626;"><strong>⚠️ Important :</strong> Sans paiement, nous ne pouvons pas commencer vos recherches immobilières.</p>
              </div>
              
              <p>Si vous avez déjà effectué le paiement, merci de nous en informer.</p>
              
              <p>Pour toute question, n'hésitez pas à nous contacter.</p>
              
              <p>Cordialement,<br>L'équipe Immo-Rama</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                Immo-rama.ch - Votre partenaire immobilier
              </p>
            </body>
            </html>
          `;

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: invoice.email,
              subject: `⏰ Rappel : Facture ${invoice.abaninja_invoice_ref || ''} en attente - ${montant} CHF`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error(`Failed to send email to ${invoice.email}:`, errorText);
            results.push({ email: invoice.email, success: false, error: errorText });
          } else {
            console.log(`Reminder sent to ${invoice.email}`);
            results.push({ email: invoice.email, success: true });
          }
        } catch (emailError) {
          console.error(`Error sending email to ${invoice.email}:`, emailError);
          results.push({ email: invoice.email, success: false, error: String(emailError) });
        }
      }

      // Create notification for admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            type: 'invoice_reminder_sent',
            title: '⏰ Rappel facture envoyé',
            message: `Rappel envoyé à ${invoice.prenom} ${invoice.nom} - Facture en attente depuis ${daysPending} jours (${montant} CHF)`,
            link: '/admin/factures-abaninja',
            metadata: { 
              demande_id: invoice.id,
              invoice_ref: invoice.abaninja_invoice_ref,
              days_pending: daysPending,
              montant: montant
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingInvoices?.length || 0,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-invoice-reminders:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
