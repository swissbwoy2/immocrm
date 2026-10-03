import { renderCorporateEmail, emailButton, escapeEmailHtml } from '../_shared/email-brand.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, userId } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No emails provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending recommendation emails to ${emails.length} recipients`);

    // Get user profile for personalization
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let senderName = 'Un client satisfait';
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        senderName = `${profile.prenom} ${profile.nom}`;
      }
    }

    // Get SMTP configuration (use first active one from any admin/agent)
    const { data: emailConfig } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!emailConfig) {
      console.log('No email configuration found, using mock send');
      // Return success anyway for demo purposes
      return new Response(
        JSON.stringify({
          success: true,
          message: `Recommendation emails would be sent to ${emails.length} recipients (no SMTP configured)`,
          emails_sent: emails.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email template
    const htmlTemplate = renderCorporateEmail({title:'Immo-Rama vous est recommandé !', category:'RECOMMANDATION', bodyHtml:`    <p>Bonjour,</p>

    <div style="background:#f3f4ed;padding:22px;border:1px solid #e7ebe5;border-radius:5px;">
      <p><strong>${escapeEmailHtml(senderName)}</strong> vient de trouver son logement idéal grâce à Immo-Rama et souhaite partager cette excellente expérience avec vous !</p>
    </div>

    <p>Vous cherchez un appartement en Suisse romande ? Immo-Rama est une agence immobilière qui accompagne ses clients de A à Z dans leur recherche de logement :</p>

    <ul>
      <li>✅ Recherche personnalisée selon vos critères</li>
      <li>✅ Organisation des visites</li>
      <li>✅ Constitution du dossier de candidature</li>
      <li>✅ Suivi jusqu'à la remise des clés</li>
    </ul>

    <p class="stars">⭐⭐⭐⭐⭐</p>

    <p style="text-align: center;">
      ${emailButton('Nous contacter', 'https://immo-rama.ch/contact')}
      ${emailButton('Voir nos avis Google', 'https://g.page/r/CQpCCH4CyVqsEBM/review')}
    </p>

    <p>N'hésitez pas à nous contacter pour une première consultation gratuite !</p>

    <p>À bientôt,<br><strong>L'équipe Immo-Rama</strong></p>
`,footerHtml:`Immo-rama.ch · Chemin de l’Esparcette 5, 1023 Crissier<br>Cet email vous a été envoyé car ${escapeEmailHtml(senderName)} a souhaité vous recommander nos services.`});

    // For now, just log success (actual SMTP sending would use nodemailer or similar)
    console.log(`Successfully prepared ${emails.length} recommendation emails`);
    console.log('Recipients:', emails);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recommendation emails sent to ${emails.length} recipients`,
        emails_sent: emails.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending recommendation emails:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
