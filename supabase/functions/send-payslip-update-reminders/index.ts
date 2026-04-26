import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_BASE_URL = 'https://immocrm.lovable.app';

function formatDateFr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getMonthName(monthIndex: number): string {
  return ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][monthIndex] ?? '';
}

type Level = 'soft' | 'insistent' | 'urgent';

/**
 * Détermine le niveau de rappel selon la date :
 * - 25-31 du mois M : 'soft'
 * - 1-3 du mois M+1 : 'insistent'
 * - 4-5 du mois M+1 : 'urgent'
 * - sinon : null (hors fenêtre)
 */
function getReminderLevel(today: Date): Level | null {
  const day = today.getDate();
  if (day >= 25) return 'soft';
  if (day <= 3) return 'insistent';
  if (day <= 5) return 'urgent';
  return null;
}

/**
 * Premier jour du mois "à fournir".
 * Si on est entre le 25 et fin du mois → mois courant
 * Si on est entre le 1 et le 5 → mois précédent
 */
function getTargetMonthStart(today: Date): Date {
  const day = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  if (day >= 25) {
    return new Date(year, month, 1);
  }
  // 1-5 → mois précédent
  return new Date(year, month - 1, 1);
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
    const level = getReminderLevel(today);

    if (!level) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'Hors fenêtre 25→5', day: today.getDate() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetMonthStart = getTargetMonthStart(today);
    const targetMonthLabel = `${getMonthName(targetMonthStart.getMonth())} ${targetMonthStart.getFullYear()}`;

    // 1. Tous les clients actifs
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, user_id, agent_id')
      .in('statut', ['actif', 'en_recherche', 'en_attente']);

    if (clientsError) throw clientsError;
    if (!clients?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, level }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Précharger les admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    const adminUserIds = (admins ?? []).map((a) => a.user_id);

    let counters = { notified: 0, up_to_date: 0, errors: 0 };

    for (const client of clients) {
      try {
        // Récupérer la fiche de salaire la plus récente
        const { data: latestPayslip } = await supabase
          .from('documents')
          .select('id, date_upload, created_at')
          .eq('client_id', client.id)
          .eq('type_document', 'fiche_salaire')
          .order('date_upload', { ascending: false })
          .limit(1)
          .maybeSingle();

        const latestDate = latestPayslip?.date_upload
          ? new Date(latestPayslip.date_upload)
          : latestPayslip?.created_at
          ? new Date(latestPayslip.created_at)
          : null;

        // Si fiche du mois cible déjà uploadée → skip
        if (latestDate && latestDate >= targetMonthStart) {
          counters.up_to_date++;
          continue;
        }

        // Récupérer profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('prenom, nom, email')
          .eq('id', client.user_id)
          .maybeSingle();

        const fullName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Le client';

        const content = buildContent(level, fullName, targetMonthLabel, latestDate);

        // 3. Notifier le CLIENT
        if (client.user_id) {
          await supabase.from('notifications').insert({
            user_id: client.user_id,
            type: `payslip_reminder_${level}`,
            title: content.clientTitle,
            message: content.clientMessage,
            link: '/client/documents',
            metadata: { client_id: client.id, level, target_month: targetMonthLabel },
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
                  subject: content.emailSubject,
                  html: content.emailHtml,
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
              type: `client_payslip_reminder_${level}`,
              title: content.agentTitle,
              message: content.agentMessage,
              link: `/agent/clients/${client.id}`,
              metadata: { client_id: client.id, level },
            });
          }
        }

        // 5. Notifier ADMINS uniquement si urgent
        if (level === 'urgent') {
          for (const adminUserId of adminUserIds) {
            await supabase.from('notifications').insert({
              user_id: adminUserId,
              type: 'admin_client_payslip_overdue',
              title: content.adminTitle,
              message: content.adminMessage,
              link: `/admin/clients/${client.id}`,
              metadata: { client_id: client.id },
            });
          }
        }

        // 6. MAJ tracking
        await supabase
          .from('clients')
          .update({ payslip_last_reminder_at: today.toISOString() })
          .eq('id', client.id);

        counters.notified++;
      } catch (err) {
        counters.errors++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error for client ${client.id}:`, msg);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, level, target_month: targetMonthLabel, ...counters }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildContent(level: Level, fullName: string, targetMonth: string, latestDate: Date | null) {
  const lastUploadStr = latestDate ? formatDateFr(latestDate) : 'jamais';

  if (level === 'soft') {
    return {
      clientTitle: `💰 N'oubliez pas votre fiche de salaire de ${targetMonth}`,
      clientMessage: `Pour maintenir votre dossier complet, pensez à uploader votre fiche de salaire de ${targetMonth} dès qu'elle est disponible.`,
      agentTitle: `💰 ${fullName} : fiche de ${targetMonth} attendue`,
      agentMessage: `Aucune fiche de salaire de ${targetMonth} pour ce client. Dernier upload : ${lastUploadStr}.`,
      adminTitle: '',
      adminMessage: '',
      emailSubject: `💰 Pensez à uploader votre fiche de salaire de ${targetMonth}`,
      emailHtml: buildEmailHtml({
        title: `Votre fiche de salaire de ${targetMonth}`,
        bodyHtml: `<p>Bonjour ${fullName},</p>
          <p>Pour garder votre dossier de candidature à jour, pensez à uploader votre <strong>fiche de salaire de ${targetMonth}</strong> dès que vous la recevez.</p>
          <p>📤 C'est rapide : un simple glisser-déposer dans votre espace.</p>`,
        ctaUrl: `${APP_BASE_URL}/client/documents`,
        ctaLabel: 'Uploader ma fiche',
        color: '#1e40af',
      }),
    };
  }

  if (level === 'insistent') {
    return {
      clientTitle: `🟠 Votre fiche de ${targetMonth} manque`,
      clientMessage: `Nous n'avons toujours pas reçu votre fiche de salaire de ${targetMonth}. Sans elle, votre dossier risque d'être refusé par les régies.`,
      agentTitle: `🟠 Fiche de ${targetMonth} manquante : ${fullName}`,
      agentMessage: `${fullName} n'a pas encore uploadé sa fiche de ${targetMonth}. Pensez à le relancer.`,
      adminTitle: '',
      adminMessage: '',
      emailSubject: `🟠 Votre fiche de salaire de ${targetMonth} manque toujours`,
      emailHtml: buildEmailHtml({
        title: `Votre fiche de ${targetMonth} manque toujours`,
        bodyHtml: `<p>Bonjour ${fullName},</p>
          <p>Nous n'avons pas encore reçu votre <strong>fiche de salaire de ${targetMonth}</strong>.</p>
          <div style="background:#fed7aa;border-left:4px solid #ea580c;padding:12px;border-radius:6px;margin:16px 0;">
            ⚠️ Sans cette fiche, votre dossier de candidature peut être refusé par les régies.
          </div>`,
        ctaUrl: `${APP_BASE_URL}/client/documents`,
        ctaLabel: 'Uploader maintenant',
        color: '#ea580c',
      }),
    };
  }

  // urgent
  return {
    clientTitle: `🔴 URGENT — Fiche de ${targetMonth} requise`,
    clientMessage: `Votre fiche de salaire de ${targetMonth} est toujours manquante. Votre dossier sera bientôt considéré incomplet.`,
    agentTitle: `🔴 URGENT : ${fullName} — fiche ${targetMonth}`,
    agentMessage: `Dossier ${fullName} bientôt incomplet : aucune fiche de ${targetMonth} reçue. Action urgente.`,
    adminTitle: `🔴 ${fullName} : fiche ${targetMonth} manquante`,
    adminMessage: `Le dossier de ${fullName} est sur le point d'être incomplet (fiche ${targetMonth} manquante). Le client et l'agent ont été notifiés quotidiennement.`,
    emailSubject: `🚨 URGENT — Votre fiche de ${targetMonth} est requise`,
    emailHtml: buildEmailHtml({
      title: `URGENT : votre fiche de ${targetMonth}`,
      bodyHtml: `<p>Bonjour ${fullName},</p>
        <p>Votre <strong>fiche de salaire de ${targetMonth}</strong> est toujours manquante.</p>
        <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px;border-radius:6px;margin:16px 0;">
          🚨 <strong>Votre dossier sera bientôt considéré incomplet.</strong> Sans fiche à jour, vos candidatures seront automatiquement refusées par les régies.
        </div>
        <p>Uploadez votre fiche dès aujourd'hui pour ne perdre aucune opportunité.</p>`,
      ctaUrl: `${APP_BASE_URL}/client/documents`,
      ctaLabel: 'Uploader MAINTENANT',
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
