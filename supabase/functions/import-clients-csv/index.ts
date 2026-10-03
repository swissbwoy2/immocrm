import { renderCorporateEmail } from '../_shared/email-brand.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "../_shared/tracked-resend.ts";

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
    type_recherche?: string;
    apport_personnel?: number;
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
  activated: number;
  failed: number;
  emailsSent: number;
  emailsFailed: number;
  errors: Array<{ email: string; reason: string; emailSent?: boolean }>;
}

// Generate welcome email for newly created accounts (with password)
function generateCreationEmailHtml(prenom: string, nom: string, email: string, password: string, appUrl: string): string {
  return renderCorporateEmail({ title: 'Bienvenue chez Immo-Rama', category: 'VOTRE COMPTE', bodyHtml: `
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${prenom} ${nom}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #666; font-size: 15px; line-height: 1.6;">
                Votre compte client a été créé avec succès sur la plateforme Immo-Rama.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4ed; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
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
                          <strong style="color: #333; font-size: 14px;">${email}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #666; font-size: 14px;">🔐 Mot de passe :</span>
                        </td>
                        <td style="padding: 8px 0;">
                          <code style="background-color: white; padding: 4px 8px; border-radius: 4px; color: #205a43; font-size: 15px; font-weight: 600;">${password}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/login" style="display: inline-block; background: #205a43; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; ">
                      Se connecter maintenant →
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                      <strong>Important :</strong> Pour votre sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                Besoin d'aide ? N'hésitez pas à contacter votre agent ou notre support.
              </p>
            ` });
}

// Generate activation email for accounts that were activated (without password)
function generateActivationEmailHtml(prenom: string, nom: string, appUrl: string): string {
  return renderCorporateEmail({ title: 'Votre compte est activé !', category: 'VOTRE COMPTE', bodyHtml: `
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${prenom} ${nom}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #666; font-size: 15px; line-height: 1.6;">
                Excellente nouvelle ! Nous avons bien reçu votre mandat de recherche et votre acompte a été comptabilisé.
              </p>
              <p style="margin: 0 0 30px; color: #666; font-size: 15px; line-height: 1.6;">
                <strong style="color: #205a43;">Votre compte Immo-Rama est maintenant pleinement activé</strong> et vous pouvez accéder à toutes les fonctionnalités de votre espace client.
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4ed; border-radius: 8px; padding: 24px; margin-bottom: 30px; border: 1px solid #bbf7d0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #205a43; font-size: 14px; font-weight: 600;">
                      ✅ Ce que vous pouvez faire maintenant :
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #205a43; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom:8px;">Consulter les offres de biens qui correspondent à vos critères</li>
                      <li style="margin-bottom:8px;">Planifier des visites avec votre agent</li>
                      <li style="margin-bottom:8px;">Gérer vos documents et votre dossier</li>
                      <li style="margin-bottom:8px;">Échanger avec votre agent via la messagerie</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/login" style="display: inline-block; background: #205a43; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; ">
                      Accéder à mon espace client →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                Votre agent va bientôt vous contacter pour commencer votre recherche. En attendant, n'hésitez pas à compléter votre dossier si ce n'est pas déjà fait.
              </p>
            ` });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // ---- AuthN + AuthZ: caller must be authenticated AND have admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clients } = await req.json() as { clients: ImportClient[] };

    console.log(`Starting import of ${clients.length} clients...`);

    const result: ImportResult = {
      created: 0,
      updated: 0,
      activated: 0,
      failed: 0,
      emailsSent: 0,
      emailsFailed: 0,
      errors: []
    };

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'), "import-clients-csv");
    const appUrl = Deno.env.get('VITE_SUPABASE_URL')?.replace('.supabase.co', '.lovable.app').replace('https://', 'https://app-') || 'https://ydljsdscdnqrqnjvqela.lovable.app';

    // Process each client
    for (const clientData of clients) {
      let isNewClient = false;
      let wasActivated = false;

      try {
        let userId: string;
        let isUpdate = false;

        // 1. Check if user already exists - include actif status
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, actif')
          .eq('email', clientData.user.email)
          .single();

        if (existingProfile) {
          // User exists - we'll update their data
          userId = existingProfile.id;
          isUpdate = true;

          // Check if account was inactive (will be activated)
          wasActivated = existingProfile.actif === false;

          console.log(`User ${clientData.user.email} already exists (actif: ${existingProfile.actif}), updating...`);
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
          // Update profile AND set actif = true (activation)
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              prenom: clientData.user.prenom,
              nom: clientData.user.nom,
              telephone: clientData.user.telephone,
              actif: true // ACTIVATION: Set to true when importing via CSV
            })
            .eq('id', userId);

          if (profileError) {
            console.error('Profile update error:', profileError);
            throw profileError;
          }

          if (wasActivated) {
            console.log(`Account ${clientData.user.email} has been ACTIVATED`);
          }
        } else {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: clientData.user.email,
              prenom: clientData.user.prenom,
              nom: clientData.user.nom,
              telephone: clientData.user.telephone,
              actif: true // New accounts created via admin CSV are active by default
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

          // Track activation separately from updates
          if (wasActivated) {
            result.activated++;
            console.log(`Successfully activated: ${clientData.user.email}`);

            // Send activation email (different from creation email - no password)
            try {
              console.log(`Sending activation email to: ${clientData.user.email}`);

              const emailHtml = generateActivationEmailHtml(
                clientData.user.prenom,
                clientData.user.nom,
                appUrl
              );

              await resend.emails.send({
                from: 'Immo-Rama <onboarding@resend.dev>',
                to: [clientData.user.email],
                subject: '🎉 Votre compte Immo-Rama est maintenant activé !',
                html: emailHtml,
              });

              result.emailsSent++;
              console.log(`Activation email sent successfully to: ${clientData.user.email}`);
            } catch (emailError) {
              console.error(`Failed to send activation email to ${clientData.user.email}:`, emailError);
              result.emailsFailed++;
            }
          } else {
            result.updated++;
            console.log(`Successfully updated: ${clientData.user.email}`);
          }
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

          // Send welcome email for new clients (with password)
          if (isNewClient) {
            try {
              console.log(`Sending welcome email to: ${clientData.user.email}`);

              const emailHtml = generateCreationEmailHtml(
                clientData.user.prenom,
                clientData.user.nom,
                clientData.user.email,
                clientData.user.password,
                appUrl
              );

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
          reason: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Erreur inconnue'
        });
      }
    }

    console.log(`Import completed: ${result.created} created, ${result.updated} updated, ${result.activated} activated, ${result.failed} failed, ${result.emailsSent} emails sent, ${result.emailsFailed} email failures`);

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
      JSON.stringify({ error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
