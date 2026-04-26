import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_BASE_URL = 'https://immocrm.lovable.app';
const COOLDOWN_DAYS = 7; // anti-spam : pas plus d'1 rappel par 7 jours
const COOLDOWN_DAYS_EXPIRED = 5; // urgent : tous les 5 jours

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateFr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@immo-rama.ch';

    const today = new Date();

    // 1. Récupérer tous les clients actifs
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, user_id, agent_id, extrait_poursuites_date_emission, extrait_poursuites_last_reminder_at')
      .in('statut', ['actif', 'en_recherche', 'en_attente']);

    if (clientsError) throw clientsError;
    if (!clients?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Précharger les admins une seule fois
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    const adminUserIds = (admins ?? []).map((a) => a.user_id);

    let counters = { missing: 0, warning: 0, expired: 0, skipped: 0 };

    for (const client of clients) {
      try {
        const dateEmission = client.extrait_poursuites_date_emission;
        const lastReminder = client.extrait_poursuites_last_reminder_at;

        let level: 'missing' | 'warning' | 'expired' | null = null;

        if (!dateEmission) {
          level = 'missing';
        } else {
          const ageMonths = monthsBetween(new Date(dateEmission), today);
          if (ageMonths >= 3) level = 'expired';
          else if (ageMonths >= 2) level = 'warning';
        }

        if (!level) {
          counters.skipped++;
          continue;
        }

        // Anti-spam
        if (lastReminder) {
          const sinceLast = daysBetween(new Date(lastReminder), today);
          const cooldown = level === 'expired' ? COOLDOWN_DAYS_EXPIRED : COOLDOWN_DAYS;
          if (sinceLast < cooldown) {
            counters.skipped++;
            continue;
          }
        }

        // Récupérer profil client
        const { data: profile } = await supabase
          .from('profiles')
          .select('prenom, nom, email')
          .eq('id', client.user_id)
          .maybeSingle();

        const fullName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Le client';

        // Construire le contenu selon le niveau
        const { clientTitle, clientMessage, agentTitle, agentMessage, adminTitle, adminMessage, emailSubject, emailHtml } =
          buildContent(level, fullName, dateEmission, client.id);

        // 3. Notifier le CLIENT
        if (client.user_id) {
          await supabase.from('notifications').insert({
            user_id: client.user_id,
            type: `extrait_poursuites_${level}`,
            title: clientTitle,
            message: clientMessage,
            link: '/client/documents',
            metadata: { client_id: client.id, level },
          });

          if (resendApiKey && profile?.email) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: fromEmail,
                  to: profile.email,
                  subject: emailSubject,
                  html: emailHtml,
                }),
              });
            } catch (e) {
              console.error('Email client send error:', e);
            }
          }
        }

        // 4. Notifier l'AGENT assigné
        if (client.agent_id) {
          const { data: agent } = await supabase
            .from('agents')
            .select('user_id')
            .eq('id', client.agent_id)
            .maybeSingle();

          if (agent?.user_id) {
            await supabase.from('notifications').insert({
              user_id: agent.user_id,
              type: `client_extrait_poursuites_${level}`,
              title: agentTitle,
              message: agentMessage,
              link: `/agent/clients/${client.id}`,
              metadata: { client_id: client.id, level },
            });
          }
        }

        // 5. Notifier les ADMINS uniquement pour le niveau "expired"
        if (level === 'expired') {
          for (const adminUserId of adminUserIds) {
            await supabase.from('notifications').insert({
              user_id: adminUserId,
              type: 'admin_client_extrait_poursuites_expired',
              title: adminTitle,
              message: adminMessage,
              link: `/admin/clients/${client.id}`,
              metadata: { client_id: client.id },
            });
          }
        }

        // 6. MAJ last_reminder_at
        await supabase
          .from('clients')
          .update({ extrait_poursuites_last_reminder_at: today.toISOString() })
          .eq('id', client.id);

        counters[level]++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error for client ${client.id}:`, msg);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...counters }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildContent(
  level: 'missing' | 'warning' | 'expired',
  fullName: string,
  dateEmission: string | null,
  clientId: string
) {
  const dateStr = dateEmission ? formatDateFr(dateEmission) : '';

  if (level === 'missing') {
    return {
      clientTitle: '📋 Renseignez la date de votre extrait de poursuites',
      clientMessage: "Pour maintenir votre dossier complet, indiquez la date d'émission de votre extrait. Vous pouvez l'uploader, l'IA détecte la date automatiquement.",
      agentTitle: `📋 ${fullName} doit renseigner sa date d'extrait`,
      agentMessage: "Aucune date d'extrait de poursuites n'a été enregistrée pour ce client. Aidez-le à le faire.",
      adminTitle: '',
      adminMessage: '',
      emailSubject: '📋 Renseignez la date de votre extrait de poursuites',
      emailHtml: buildEmailHtml({
        title: 'Renseignez la date de votre extrait',
        bodyHtml: `<p>Bonjour ${fullName},</p>
          <p>Pour que votre dossier reste complet, nous devons connaître la <strong>date d'émission</strong> de votre extrait de l'Office des poursuites.</p>
          <p>📤 <strong>Astuce :</strong> uploadez simplement votre PDF, notre IA détecte la date automatiquement.</p>`,
        ctaUrl: `${APP_BASE_URL}/client/documents`,
        ctaLabel: 'Renseigner ma date',
        color: '#1e40af',
      }),
    };
  }

  if (level === 'warning') {
    return {
      clientTitle: '🟡 Votre extrait de poursuites approche les 2 mois',
      clientMessage: `Votre extrait du ${dateStr} a plus de 2 mois. Certaines régies n'acceptent que les extraits de moins de 2 mois — anticipez en commandant un nouvel extrait dès maintenant.`,
      agentTitle: `🟡 Extrait de ${fullName} > 2 mois`,
      agentMessage: `L'extrait de poursuites de ce client date du ${dateStr}. Certaines régies l'exigent < 2 mois. Pensez à le relancer.`,
      adminTitle: '',
      adminMessage: '',
      emailSubject: '🟡 Votre extrait de poursuites approche les 2 mois',
      emailHtml: buildEmailHtml({
        title: 'Anticipez : votre extrait approche les 2 mois',
        bodyHtml: `<p>Bonjour ${fullName},</p>
          <p>Votre extrait de l'Office des poursuites date du <strong>${dateStr}</strong>, soit plus de 2 mois.</p>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin:16px 0;">
            ⚠️ Certaines régies n'acceptent que les extraits de <strong>moins de 2 mois</strong>. Pour ne manquer aucune opportunité, anticipez et commandez un nouvel extrait dès maintenant.
          </div>
          <p>👉 <a href="https://www.eschkg.ch" style="color:#1e40af;">Commander un nouvel extrait en ligne (eSchKG)</a></p>`,
        ctaUrl: `${APP_BASE_URL}/client/documents`,
        ctaLabel: 'Mettre à jour mon dossier',
        color: '#ea580c',
      }),
    };
  }

  // expired
  return {
    clientTitle: '🔴 URGENT — Votre extrait de poursuites est expiré',
    clientMessage: `Votre extrait du ${dateStr} a plus de 3 mois. Votre dossier n'est plus valide. Commandez un nouvel extrait IMMÉDIATEMENT pour ne pas manquer d'opportunités.`,
    agentTitle: `🔴 URGENT — Extrait expiré pour ${fullName}`,
    agentMessage: `L'extrait de ce client (${dateStr}) est expiré depuis plus de 3 mois. Action urgente requise.`,
    adminTitle: `🔴 Extrait poursuites expiré : ${fullName}`,
    adminMessage: `Le dossier de ${fullName} n'est plus complet (extrait du ${dateStr}). Le client et l'agent ont été notifiés.`,
    emailSubject: '🚨 URGENT — Votre extrait de poursuites est expiré',
    emailHtml: buildEmailHtml({
      title: 'URGENT : votre extrait de poursuites est expiré',
      bodyHtml: `<p>Bonjour ${fullName},</p>
        <p>Votre extrait de l'Office des poursuites date du <strong>${dateStr}</strong>, soit plus de 3 mois.</p>
        <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px;border-radius:6px;margin:16px 0;">
          🚨 <strong>Votre dossier n'est plus complet.</strong> Sans extrait à jour, vos candidatures peuvent être refusées par les régies.
        </div>
        <p>Commandez un nouvel extrait dès aujourd'hui :</p>
        <p>👉 <a href="https://www.eschkg.ch" style="color:#dc2626;font-weight:bold;">eSchKG — Commander en ligne</a></p>`,
      ctaUrl: `${APP_BASE_URL}/client/documents`,
      ctaLabel: 'Mettre à jour MAINTENANT',
      color: '#dc2626',
    }),
  };
}

function buildEmailHtml(opts: { title: string; bodyHtml: string; ctaUrl: string; ctaLabel: string; color: string }) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <div style="background:${opts.color};color:white;padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:20px;font-weight:700;">${opts.title}</h1>
      </div>
      <div style="padding:24px;color:#1f2937;font-size:15px;line-height:1.6;">
        ${opts.bodyHtml}
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:${opts.color};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
            ${opts.ctaLabel}
          </a>
        </div>
      </div>
      <div style="background:#f9fafb;padding:14px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
        Immo-rama.ch — Votre partenaire pour trouver votre logement
      </div>
    </div>
  </body></html>`;
}
