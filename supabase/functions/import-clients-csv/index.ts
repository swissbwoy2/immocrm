import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportClient {
  user: {
    email: string;
    password: string;
    prenom: string;
    nom: string;
    telephone?: string;
  };
  client: {
    nationalite?: string;
    type_permis?: string;
    situation_familiale?: string;
    profession?: string;
    revenus_mensuels?: number;
    budget_max?: number;
    charges_mensuelles?: number;
    pieces?: number;
    region_recherche?: string;
    type_bien?: string;
    type_contrat?: string;
    date_ajout?: string;
    date_naissance?: string;
    adresse?: string;
    etat_civil?: string;
    gerance_actuelle?: string;
    contact_gerance?: string;
    loyer_actuel?: number;
    depuis_le?: string;
    pieces_actuel?: number;
    motif_changement?: string;
    employeur?: string;
    date_engagement?: string;
    charges_extraordinaires?: boolean;
    montant_charges_extra?: number;
    poursuites?: boolean;
    curatelle?: boolean;
    souhaits_particuliers?: string;
    nombre_occupants?: number;
    utilisation_logement?: string;
    animaux?: boolean;
    instrument_musique?: boolean;
    vehicules?: boolean;
    numero_plaques?: string;
    decouverte_agence?: string;
  };
  agentEmail?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  emailsSent: number;
  emailsFailed: number;
  errors: Array<{ email: string; reason: string; emailSent?: boolean }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { clients } = await req.json() as { clients: ImportClient[] };

    console.log(`Starting import of ${clients.length} clients...`);

    const result: ImportResult = {
      created: 0,
      updated: 0,
      failed: 0,
      emailsSent: 0,
      emailsFailed: 0,
      errors: []
    };

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const appUrl = Deno.env.get('VITE_SUPABASE_URL')?.replace('.supabase.co', '.lovable.app').replace('https://', 'https://app-') || 'https://ydljsdscdnqrqnjvqela.lovable.app';

    // Process each client
    for (const clientData of clients) {
      let isNewClient = false;
      try {
        let userId: string;
        let isUpdate = false;

        // 1. Check if user already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', clientData.user.email)
          .single();

        if (existingProfile) {
          // User exists - we'll update their data
          userId = existingProfile.id;
          isUpdate = true;
          console.log(`User ${clientData.user.email} already exists, updating...`);
        } else {
          // Create new user in auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: clientData.user.email,
            password: clientData.user.password,
            email_confirm: true,
            user_metadata: {
              prenom: clientData.user.prenom,
              nom: clientData.user.nom
            }
          });

          if (authError) throw authError;
          userId = authData.user.id;
          isNewClient = true;
          console.log(`Created new user: ${clientData.user.email}`);
        }

        // 2. Create or update profile
        if (isUpdate) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              prenom: clientData.user.prenom,
              nom: clientData.user.nom,
              telephone: clientData.user.telephone
            })
            .eq('id', userId);

          if (profileError) {
            console.error('Profile update error:', profileError);
            throw profileError;
          }
        } else {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: clientData.user.email,
              prenom: clientData.user.prenom,
              nom: clientData.user.nom,
              telephone: clientData.user.telephone
            });

          if (profileError) {
            console.error('Profile error:', profileError);
            throw profileError;
          }

          // 3. Create user_role as 'client' (only for new users)
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'client'
            });

          if (roleError) {
            console.error('Role error:', roleError);
            throw roleError;
          }
        }

        // 4. Find agent if specified
        let agentId = null;
        if (clientData.agentEmail) {
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', clientData.agentEmail)
            .single();

          if (agentProfile) {
            const { data: agent } = await supabase
              .from('agents')
              .select('id')
              .eq('user_id', agentProfile.id)
              .single();

            if (agent) {
              agentId = agent.id;
            }
          }
        }

        // 5. Create or update client
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingClient) {
          // Update existing client
          const { error: clientError } = await supabase
            .from('clients')
            .update({
              agent_id: agentId,
              ...clientData.client
            })
            .eq('user_id', userId);

          if (clientError) {
            console.error('Client update error:', clientError);
            throw clientError;
          }

          result.updated++;
          console.log(`Successfully updated: ${clientData.user.email}`);
        } else {
          // Create new client
          const { error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: userId,
              agent_id: agentId,
              ...clientData.client
            });

          if (clientError) {
            console.error('Client error:', clientError);
            throw clientError;
          }

          // Update agent's client count if assigned (only for new clients)
          if (agentId) {
            const { data: agent } = await supabase
              .from('agents')
              .select('nombre_clients_assignes')
              .eq('id', agentId)
              .single();
            
            if (agent) {
              await supabase
                .from('agents')
                .update({ nombre_clients_assignes: (agent.nombre_clients_assignes || 0) + 1 })
                .eq('id', agentId);
            }
          }

          result.created++;
          console.log(`Successfully created: ${clientData.user.email}`);

          // Send welcome email for new clients
          if (isNewClient) {
            try {
              console.log(`Sending welcome email to: ${clientData.user.email}`);
              
              const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">Bienvenue chez Immo-Rama</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${clientData.user.prenom} ${clientData.user.nom}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #666; font-size: 15px; line-height: 1.6;">
                Votre compte client a été créé avec succès sur la plateforme Immo-Rama.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #333; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Vos identifiants de connexion
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #666; font-size: 14px;">📧 Email :</span>
                        </td>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333; font-size: 14px;">${clientData.user.email}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #666; font-size: 14px;">🔐 Mot de passe :</span>
                        </td>
                        <td style="padding: 8px 0;">
                          <code style="background-color: white; padding: 4px 8px; border-radius: 4px; color: #667eea; font-size: 15px; font-weight: 600;">${clientData.user.password}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Se connecter maintenant →
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                      ⚠️ <strong>Important :</strong> Pour votre sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                Besoin d'aide ? N'hésitez pas à contacter votre agent ou notre support.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; color: #666; font-size: 13px;">
                Cordialement,<br>
                <strong style="color: #333;">L'équipe Immo-Rama</strong>
              </p>
              <p style="margin: 8px 0 0; color: #999; font-size: 12px;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

              await resend.emails.send({
                from: 'Immo-Rama <onboarding@resend.dev>',
                to: [clientData.user.email],
                subject: 'Bienvenue chez Immo-Rama - Vos identifiants de connexion',
                html: emailHtml,
              });
              
              result.emailsSent++;
              console.log(`Welcome email sent successfully to: ${clientData.user.email}`);
            } catch (emailError) {
              console.error(`Failed to send email to ${clientData.user.email}:`, emailError);
              result.emailsFailed++;
            }
          }
        }

      } catch (error) {
        console.error(`Failed to import ${clientData.user.email}:`, error);
        result.failed++;
        result.errors.push({
          email: clientData.user.email,
          reason: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    console.log(`Import completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed, ${result.emailsSent} emails sent, ${result.emailsFailed} email failures`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in import-clients-csv function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
