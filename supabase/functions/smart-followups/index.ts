import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const results: { type: string; count: number; details: string[] }[] = [];

    // ============================================
    // 1. COLD LEADS - Not converted after 1, 3, 7 days
    // ============================================
    const now = new Date();
    const relanceDays = [1, 3, 7];

    for (const days of relanceDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - days);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Find leads created exactly X days ago that don't have a mandat
      const { data: coldLeads } = await supabase
        .from('leads')
        .select('id, email, prenom, nom, telephone, created_at')
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      if (!coldLeads || coldLeads.length === 0) continue;

      // Check which emails already have a mandat
      const leadEmails = coldLeads.map(l => l.email?.toLowerCase()).filter(Boolean);
      const { data: existingMandats } = await supabase
        .from('demandes_mandat')
        .select('email')
        .in('email', leadEmails);

      const mandatEmails = new Set((existingMandats || []).map(m => m.email?.toLowerCase()));
      const unconverted = coldLeads.filter(l => l.email && !mandatEmails.has(l.email.toLowerCase()));

      const details: string[] = [];

      for (const lead of unconverted) {
        if (!lead.email) continue;

        // Send follow-up email
        if (resendApiKey) {
          const subjectMap: Record<number, string> = {
            1: '🏠 Votre recherche immobilière - Prochaine étape',
            3: '⏰ Ne manquez pas votre opportunité immobilière',
            7: '🔑 Dernière chance - Lancez votre recherche',
          };

          const ctaUrl = `https://immocrm.lovable.app/mandat?email=${encodeURIComponent(lead.email)}`;

          const html = `
            <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#1e40af;">Bonjour ${lead.prenom || ''} ${lead.nom || ''},</h2>
              <p>Vous avez manifesté votre intérêt pour nos services de recherche immobilière il y a ${days} jour${days > 1 ? 's' : ''}.</p>
              <p>${days === 1 ? 'Nos chasseurs immobiliers sont prêts à vous accompagner.' : days === 3 ? 'Chaque jour compte sur le marché immobilier suisse.' : 'Les meilleurs biens partent vite. Ne tardez pas !'}</p>
              <div style="text-align:center;margin:30px 0;">
                <a href="${ctaUrl}" style="background:#1e40af;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">
                  Lancer ma recherche →
                </a>
              </div>
              <p style="color:#666;font-size:12px;">Immo-rama.ch - Votre partenaire immobilier</p>
            </body></html>
          `;

          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: fromEmail, to: lead.email, subject: subjectMap[days], html }),
            });
            details.push(`Email J+${days} → ${lead.email}`);
          } catch (e) {
            details.push(`ERREUR J+${days} → ${lead.email}: ${e}`);
          }
        }
      }

      results.push({ type: `cold_leads_J+${days}`, count: unconverted.length, details });
    }

    // ============================================
    // 2. INACTIVE CLIENTS - No offer reaction in 7+ days
    // ============================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeClients } = await supabase
      .from('clients')
      .select('id, user_id, agent_id, updated_at')
      .eq('statut', 'actif')
      .lt('updated_at', sevenDaysAgo.toISOString());

    const inactiveDetails: string[] = [];

    if (activeClients) {
      for (const client of activeClients) {
        // Check if they have recent candidatures
        const { count: recentActivity } = await supabase
          .from('candidatures')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', sevenDaysAgo.toISOString());

        if ((recentActivity || 0) === 0 && client.agent_id) {
          // Get agent user_id
          const { data: agent } = await supabase
            .from('agents').select('user_id').eq('id', client.agent_id).single();

          // Get client name
          const { data: profile } = await supabase
            .from('profiles').select('prenom, nom, email').eq('id', client.user_id).single();

          if (agent && profile) {
            // Notify agent
            await supabase.from('notifications').insert({
              user_id: agent.user_id,
              type: 'client_inactive',
              title: '⚠️ Client inactif depuis 7 jours',
              message: `${profile.prenom || ''} ${profile.nom || profile.email} n'a eu aucune activité depuis 7 jours. Pensez à le relancer !`,
              link: '/agent/mes-clients',
              metadata: { client_id: client.id },
            });
            inactiveDetails.push(`Alerte agent pour ${profile.email}`);
          }
        }
      }
    }

    results.push({ type: 'inactive_clients', count: inactiveDetails.length, details: inactiveDetails });

    // ============================================
    // 3. EXPIRING MANDATES - 15 days before expiry
    // ============================================
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
    const sixteenDaysFromNow = new Date();
    sixteenDaysFromNow.setDate(sixteenDaysFromNow.getDate() + 16);

    // Check mandats table for expiring entries (if date_fin exists)
    const { data: expiringMandats } = await supabase
      .from('mandats')
      .select('id, client_id, date_fin')
      .gte('date_fin', fifteenDaysFromNow.toISOString().split('T')[0])
      .lt('date_fin', sixteenDaysFromNow.toISOString().split('T')[0])
      .eq('statut', 'actif');

    const expiringDetails: string[] = [];

    if (expiringMandats) {
      for (const mandat of expiringMandats) {
        // Notify admins
        const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        if (admins) {
          for (const admin of admins) {
            await supabase.from('notifications').insert({
              user_id: admin.user_id,
              type: 'mandate_expiring',
              title: '⏰ Mandat expire dans 15 jours',
              message: `Un mandat expire le ${mandat.date_fin}. Pensez au renouvellement.`,
              link: '/admin/mandats',
              metadata: { mandat_id: mandat.id },
            });
          }
        }
        expiringDetails.push(`Mandat ${mandat.id} expire le ${mandat.date_fin}`);
      }
    }

    results.push({ type: 'expiring_mandates', count: expiringDetails.length, details: expiringDetails });

    // ============================================
    // 4. AGENT PERFORMANCE ALERTS
    // ============================================
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: allAgents } = await supabase
      .from('agents').select('id, user_id').eq('statut', 'actif');

    const agentAlertDetails: string[] = [];

    if (allAgents) {
      for (const agent of allAgents) {
        // Check offers sent in last 3 days
        const { count: recentOffers } = await supabase
          .from('offres')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .gte('created_at', threeDaysAgo.toISOString());

        // Check assigned clients count
        const { count: clientCount } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .eq('statut', 'actif');

        if ((recentOffers || 0) === 0 && (clientCount || 0) > 0) {
          const { data: agentProfile } = await supabase
            .from('profiles').select('prenom, nom, email').eq('id', agent.user_id).single();

          const agentName = agentProfile ? `${agentProfile.prenom || ''} ${agentProfile.nom || agentProfile.email}` : 'Un agent';

          // Notify admins
          const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
          if (admins) {
            for (const admin of admins) {
              await supabase.from('notifications').insert({
                user_id: admin.user_id,
                type: 'agent_low_activity',
                title: '🚨 Agent inactif',
                message: `${agentName} n'a envoyé aucune offre depuis 3 jours (${clientCount} clients actifs)`,
                link: '/admin/statistiques-agents',
                metadata: { agent_id: agent.id },
              });
            }
          }
          agentAlertDetails.push(`${agentName}: 0 offres / 3 jours`);
        }
      }
    }

    results.push({ type: 'agent_performance_alerts', count: agentAlertDetails.length, details: agentAlertDetails });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in smart-followups:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
