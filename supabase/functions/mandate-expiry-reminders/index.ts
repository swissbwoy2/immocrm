import { trackedResendFetch } from "../_shared/tracked-resend.ts";
const sendTrackedEmail = trackedResendFetch("mandate-expiry-reminders");
import { renderCorporateEmail, emailButton, emailButtons, emailNotice, emailParagraph, escapeEmailHtml } from '../_shared/email-shell.ts';
import { formatDateFR } from '../_shared/date-fr.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANDAT_DURATION_DAYS = 90;
const REMINDER_WINDOW_DAYS = 30; // À partir de J+60 (= 30 jours restants)
const REFUND_ELIGIBILITY_DAY = 80;
const APP_BASE_URL = "https://logisorama.ch";

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function buildEmailHtml(opts: {
  prenom: string;
  nom: string;
  daysRemaining: number;
  daysSinceSignature: number;
  endDate: Date;
  renewUrl: string;
  cancelUrl: string;
  refundUrl: string;
  pauseUrl: string;
}): string {
  const { prenom, nom, daysRemaining, daysSinceSignature, endDate, renewUrl, cancelUrl, refundUrl, pauseUrl } = opts;
  const refundEligible = daysSinceSignature >= REFUND_ELIGIBILITY_DAY;
  const endDateStr = formatDateFR(endDate);
  const fullName = `${prenom ?? ""} ${nom ?? ""}`.trim();

  return renderCorporateEmail({
    title: `Votre mandat se termine dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`,
    preview: `Votre mandat arrive à échéance le ${endDateStr}. Sans action, il sera renouvelé automatiquement.`,
    category: 'VOTRE MANDAT',
    bodyHtml:
      emailParagraph(fullName ? `Bonjour ${escapeEmailHtml(fullName)},` : "Bonjour,") +
      emailParagraph(`Votre mandat de recherche immobilière arrive à échéance le <strong>${escapeEmailHtml(endDateStr)}</strong>.`) +
      emailNotice("<strong>Sans action de votre part</strong>, votre mandat sera <strong>renouvelé automatiquement</strong> pour 90 jours supplémentaires à l'échéance.", "warning") +
      `<p style="margin:0 0 6px;font-size:16px;line-height:24px;font-weight:600;color:#15261d;">Que souhaitez-vous faire ?</p>` +
      emailButtons([
        { label: "✓ Renouveler maintenant", url: renewUrl, variant: "primary" },
        ...(refundEligible ? [{ label: "Annuler + Demander mon remboursement", url: refundUrl, variant: "secondary" as const }] : []),
        { label: `✗ Annuler ma recherche${!refundEligible ? " (sans remboursement)" : ""}`, url: cancelUrl, variant: "secondary" },
        { label: "Mettre en pause", url: pauseUrl, variant: "secondary" },
      ]) +
      (!refundEligible
        ? emailNotice(`Le remboursement deviendra disponible à partir du <strong>${REFUND_ELIGIBILITY_DAY}ème jour</strong> de votre mandat (jour actuel : ${daysSinceSignature}).`, "info")
        : emailNotice("✅ Vous êtes <strong>éligible au remboursement</strong> (sauf si vous avez trouvé par vos propres moyens).", "info")) +
      emailParagraph(`Vous pouvez aussi gérer votre mandat depuis votre espace client : <a href="${APP_BASE_URL}/client/mon-contrat" style="color:#205a43;text-decoration:underline;">Accéder à mon espace</a>`, true),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@immo-rama.ch";
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const todayDateStr = today.toISOString().split("T")[0];

    // 1. Récupérer tous les clients actifs avec un mandat signé (skip ceux en pause)
    const { data: clients, error: clientsErr } = await supabase
      .from("clients")
      .select("id, user_id, agent_id, mandat_date_signature, mandat_renewal_count, mandate_pause_days, mandate_paused_at, mandate_official_end_date, cancellation_requested_at, cancellation_reason, refund_status")
      .eq("statut", "actif")
      .is("mandate_paused_at", null)
      .not("mandat_date_signature", "is", null);

    if (clientsErr) throw clientsErr;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let remindersSent = 0;
    let autoRenewed = 0;
    let autoStopped = 0;
    const errors: string[] = [];

    for (const client of clients) {
      try {
        const signatureDate = new Date(client.mandat_date_signature);
        const rawDaysElapsed = daysBetween(signatureDate, today);
        const pauseDays = client.mandate_pause_days ?? 0;
        const daysSinceSignature = Math.max(0, rawDaysElapsed - pauseDays);
        const daysRemaining = MANDAT_DURATION_DAYS - daysSinceSignature;

        // === 0. Arrêt automatique si une demande d'annulation/remboursement a été faite ===
        // Lorsque l'échéance est atteinte, on passe le mandat en 'stoppe' (mode gelé)
        // sans action manuelle requise de l'admin/agent.
        const hasCancellationRequest =
          !!client.cancellation_requested_at ||
          client.refund_status === "pending" ||
          client.refund_status === "processed";

        const officialEnd = client.mandate_official_end_date
          ? new Date(client.mandate_official_end_date)
          : null;
        const endReached = officialEnd
          ? today >= officialEnd
          : daysRemaining <= 0;

        if (hasCancellationRequest && endReached) {
          await supabase
            .from("clients")
            .update({
              statut: "stoppe",
              date_changement_statut: new Date().toISOString(),
            })
            .eq("id", client.id);

          await supabase.from("mandate_renewal_actions").insert({
            client_id: client.id,
            action: "auto_stopped",
            triggered_by: "system",
            metadata: {
              reason: client.cancellation_reason ?? null,
              refund_status: client.refund_status ?? null,
              official_end: client.mandate_official_end_date ?? null,
            },
          });

          // Notification client
          if (client.user_id) {
            await supabase.from("notifications").insert({
              user_id: client.user_id,
              type: "mandate_auto_stopped",
              title: "⏹ Mandat clôturé",
              message:
                "Votre mandat est arrivé à échéance suite à votre demande d'annulation/remboursement et a été clôturé automatiquement. Votre espace reste accessible. Pour toute question, contactez un administrateur.",
              link: "/client/mon-contrat",
              metadata: { client_id: client.id },
            });
          }
          // Notification agent
          if (client.agent_id) {
            const { data: agent } = await supabase
              .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
            if (agent?.user_id) {
              await supabase.from("notifications").insert({
                user_id: agent.user_id,
                type: "mandate_auto_stopped_agent",
                title: "⏹ Mandat client clôturé automatiquement",
                message:
                  "Un de vos clients a vu son mandat clôturé automatiquement à échéance suite à sa demande d'annulation/remboursement.",
                link: "/agent/mes-clients",
                metadata: { client_id: client.id },
              });
            }
          }
          // Notification admins
          const { data: admins } = await supabase
            .from("user_roles").select("user_id").eq("role", "admin");
          if (admins) {
            for (const a of admins) {
              await supabase.from("notifications").insert({
                user_id: a.user_id,
                type: "mandate_auto_stopped_admin",
                title: "⏹ Mandat clôturé automatiquement",
                message: `Le mandat du client ${client.id} a été clôturé automatiquement à échéance (demande d'annulation/remboursement reçue).`,
                link: `/admin/clients/${client.id}`,
                metadata: { client_id: client.id },
              });
            }
          }

          autoStopped += 1;
          continue; // ne pas tenter de renouveler ce client
        }


        // === A. Renouvellement automatique si échéance dépassée ===
        if (daysRemaining < 0) {
          const newSignatureDate = new Date();
          const newOfficialEnd = new Date(newSignatureDate);
          newOfficialEnd.setDate(newOfficialEnd.getDate() + MANDAT_DURATION_DAYS);
          await supabase
            .from("clients")
            .update({
              mandat_date_signature: newSignatureDate.toISOString(),
              mandat_renewal_count: (client.mandat_renewal_count ?? 0) + 1,
              mandate_pause_days: 0,
              mandate_official_end_date: newOfficialEnd.toISOString().split("T")[0],
            })
            .eq("id", client.id);

          await supabase.from("mandate_renewal_actions").insert({
            client_id: client.id,
            action: "auto_renewed",
            triggered_by: "system",
            previous_signature_date: signatureDate.toISOString(),
            new_signature_date: newSignatureDate.toISOString(),
            metadata: { days_overdue: Math.abs(daysRemaining) },
          });

          // Notifications client + agent
          if (client.user_id) {
            await supabase.from("notifications").insert({
              user_id: client.user_id,
              type: "mandate_auto_renewed",
              title: "🔄 Mandat renouvelé automatiquement",
              message: `Votre mandat a été renouvelé pour 90 jours. Aucun remboursement n'est possible sur cette période. Pour redevenir éligible, attendez 90 jours : un rappel vous sera envoyé au 80ème jour.`,
              link: "/client/mon-contrat",
              metadata: { client_id: client.id },
            });
          }
          if (client.agent_id) {
            const { data: agent } = await supabase
              .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
            if (agent?.user_id) {
              await supabase.from("notifications").insert({
                user_id: agent.user_id,
                type: "mandate_auto_renewed_agent",
                title: "🔄 Mandat renouvelé automatiquement",
                message: `Le mandat d'un de vos clients a été renouvelé automatiquement pour 90 jours.`,
                link: "/agent/mes-clients",
                metadata: { client_id: client.id },
              });
            }
          }

          // Email de confirmation du renouvellement automatique
          if (resendApiKey && client.user_id) {
            const { data: profile } = await supabase
              .from("profiles").select("prenom, nom, email").eq("id", client.user_id).maybeSingle();
            if (profile?.email) {
              const newEndStr = formatDateFR(newOfficialEnd);
              const refundWindowStart = new Date(newSignatureDate);
              refundWindowStart.setDate(refundWindowStart.getDate() + REFUND_ELIGIBILITY_DAY);
              const refundWindowEnd = new Date(newSignatureDate);
              refundWindowEnd.setDate(refundWindowEnd.getDate() + MANDAT_DURATION_DAYS);
              const refundStartStr = formatDateFR(refundWindowStart);
              const refundEndStr = formatDateFR(refundWindowEnd);
              const renewName = `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim();
              const autoRenewHtml = renderCorporateEmail({
                title: 'Votre mandat a été renouvelé automatiquement pour 90 jours',
                preview: `Votre mandat est renouvelé jusqu'au ${newEndStr}.`,
                category: 'VOTRE MANDAT',
                bodyHtml:
                  emailParagraph(renewName ? `Bonjour ${escapeEmailHtml(renewName)},` : "Bonjour,") +
                  emailParagraph(`Votre mandat de recherche a été <strong>renouvelé automatiquement pour une nouvelle période de 90 jours</strong>, jusqu'au <strong>${escapeEmailHtml(newEndStr)}</strong>. Nous continuons activement les recherches pour vous.`) +
                  emailNotice("<strong>Aucun remboursement n'est possible pendant cette période.</strong>", "danger") +
                  emailNotice(`Pour bénéficier d'un remboursement, vous devez en faire la demande pendant la <strong>fenêtre de 10 jours</strong>, valable du <strong>80ème au 90ème jour</strong> de votre mandat de recherche — soit entre le <strong>${escapeEmailHtml(refundStartStr)}</strong> et le <strong>${escapeEmailHtml(refundEndStr)}</strong>. Un rappel automatique vous sera envoyé au 80ème jour.`, "info", "Fenêtre de remboursement") +
                  emailNotice("Sans action de votre part, le mandat se renouvelle automatiquement de 90 jours en 90 jours.", "neutral") +
                  emailButton("Accéder à mon espace", `${APP_BASE_URL}/client/mon-contrat`),
              });
              await sendTrackedEmail("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: fromEmail,
                  to: profile.email,
                  subject: "🔄 Votre mandat a été renouvelé automatiquement pour 90 jours",
                  html: autoRenewHtml,
                }),
              });

            }
          }

          autoRenewed++;
          continue;
        }

        // === B. Hors fenêtre de relance ===
        if (daysRemaining > REMINDER_WINDOW_DAYS) continue;

        // === C. Anti-doublon (1 relance / jour max) ===
        const { data: existingLog } = await supabase
          .from("mandate_renewal_reminders_log")
          .select("id")
          .eq("client_id", client.id)
          .eq("reminder_date", todayDateStr)
          .maybeSingle();
        if (existingLog) continue;

        // === D. Récupérer profil client ===
        const { data: profile } = await supabase
          .from("profiles").select("prenom, nom, email").eq("id", client.user_id).maybeSingle();
        if (!profile?.email) continue;

        // === E. Créer ou réutiliser un token ===
        let token: string;
        const { data: existingToken } = await supabase
          .from("mandate_renewal_tokens")
          .select("token, expires_at, used_at")
          .eq("client_id", client.id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingToken?.token) {
          token = existingToken.token;
        } else {
          token = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
          await supabase.from("mandate_renewal_tokens").insert({
            client_id: client.id,
            token,
          });
        }

        const renewUrl = `${APP_BASE_URL}/mandat/renouvellement?token=${token}&action=renew`;
        const cancelUrl = `${APP_BASE_URL}/mandat/renouvellement?token=${token}&action=cancel`;
        const refundUrl = `${APP_BASE_URL}/mandat/renouvellement?token=${token}&action=cancel_with_refund`;
        const pauseUrl = `${APP_BASE_URL}/mandat/renouvellement?token=${token}&action=pause`;
        const endDate = new Date(signatureDate);
        endDate.setDate(endDate.getDate() + MANDAT_DURATION_DAYS + pauseDays);

        // === F. Notification in-app ===
        if (client.user_id) {
          await supabase.from("notifications").insert({
            user_id: client.user_id,
            type: "mandate_expiring",
            title: `⏰ Votre mandat se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`,
            message: `Sans action, il sera renouvelé automatiquement le ${formatDateFR(endDate)}.`,
            link: "/client/mon-contrat",
            metadata: { client_id: client.id, days_remaining: daysRemaining, token },
          });
        }

        // === G. Notification agent à J-7 ===
        if (daysRemaining === 7 && client.agent_id) {
          const { data: agent } = await supabase
            .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
          if (agent?.user_id) {
            await supabase.from("notifications").insert({
              user_id: agent.user_id,
              type: "client_mandate_expiring",
              title: "⚠️ Mandat client expire dans 7 jours",
              message: `Le mandat de ${profile.prenom ?? ""} ${profile.nom ?? ""} expire dans 7 jours. Aucune action client à ce jour.`,
              link: "/agent/mes-clients",
              metadata: { client_id: client.id },
            });
          }
        }

        // === H. Email de relance ===
        if (resendApiKey) {
          const html = buildEmailHtml({
            prenom: profile.prenom ?? "",
            nom: profile.nom ?? "",
            daysRemaining,
            daysSinceSignature,
            endDate,
            renewUrl,
            cancelUrl,
            refundUrl,
            pauseUrl,
          });
          await sendTrackedEmail("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: profile.email,
              subject: `⏰ Votre mandat se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`,
              html,
            }),
          });
        }

        // === I. Log anti-doublon ===
        await supabase.from("mandate_renewal_reminders_log").insert({
          client_id: client.id,
          reminder_date: todayDateStr,
          days_remaining: daysRemaining,
          channel: "both",
        });

        remindersSent++;
      } catch (err) {
        const msg = err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err);
        errors.push(`Client ${client.id}: ${msg}`);
        console.error(`Error processing client ${client.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: clients.length,
        reminders_sent: remindersSent,
        auto_renewed: autoRenewed,
        auto_stopped: autoStopped,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    console.error("mandate-expiry-reminders fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
