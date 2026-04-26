import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANDAT_DURATION_DAYS = 90;
const REMINDER_WINDOW_DAYS = 30; // À partir de J+60 (= 30 jours restants)
const APP_BASE_URL = "https://immocrm.lovable.app";

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function buildEmailHtml(opts: {
  prenom: string;
  nom: string;
  daysRemaining: number;
  endDate: Date;
  renewUrl: string;
  cancelUrl: string;
}): string {
  const { prenom, nom, daysRemaining, endDate, renewUrl, cancelUrl } = opts;
  const endDateStr = endDate.toLocaleDateString("fr-CH", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;
  const headerColor = isCritical ? "#dc2626" : isUrgent ? "#ea580c" : "#1e40af";
  const emoji = isCritical ? "🚨" : isUrgent ? "⚠️" : "⏰";

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <div style="background:${headerColor};color:white;padding:30px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">${emoji}</div>
        <h1 style="margin:0;font-size:24px;font-weight:700;">Votre mandat se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}</h1>
      </div>
      <div style="padding:30px 24px;color:#1f2937;">
        <p style="font-size:16px;margin:0 0 16px;">Bonjour ${prenom} ${nom},</p>
        <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 24px;">
          Votre mandat de recherche immobilière arrive à échéance le <strong>${endDateStr}</strong>.
        </p>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:0 0 28px;">
          <p style="margin:0;font-size:14px;color:#92400e;">
            <strong>Sans action de votre part</strong>, votre mandat sera <strong>renouvelé automatiquement</strong> pour 90 jours supplémentaires à l'échéance.
          </p>
        </div>
        <p style="font-size:15px;color:#374151;margin:0 0 16px;font-weight:600;">Que souhaitez-vous faire ?</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 24px;">
          <tr>
            <td style="padding:0 6px 12px 0;width:50%;">
              <a href="${renewUrl}" style="display:block;background:#1e40af;color:white;text-align:center;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                ✓ Renouveler maintenant
              </a>
            </td>
            <td style="padding:0 0 12px 6px;width:50%;">
              <a href="${cancelUrl}" style="display:block;background:#f3f4f6;color:#374151;text-align:center;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;border:1px solid #d1d5db;">
                ✗ Annuler ma recherche
              </a>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 8px;">
          Vous pouvez aussi gérer votre mandat depuis votre espace client.
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0;">
          <a href="${APP_BASE_URL}/client/mon-contrat" style="color:#1e40af;">Accéder à mon espace</a>
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
        Immo-rama.ch — Votre partenaire pour trouver votre logement
      </div>
    </div>
  </body></html>`;
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

    // 1. Récupérer tous les clients actifs avec un mandat signé
    const { data: clients, error: clientsErr } = await supabase
      .from("clients")
      .select("id, user_id, agent_id, mandat_date_signature, mandat_renewal_count")
      .eq("statut", "actif")
      .not("mandat_date_signature", "is", null);

    if (clientsErr) throw clientsErr;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let remindersSent = 0;
    let autoRenewed = 0;
    const errors: string[] = [];

    for (const client of clients) {
      try {
        const signatureDate = new Date(client.mandat_date_signature);
        const daysElapsed = daysBetween(signatureDate, today);
        const daysRemaining = MANDAT_DURATION_DAYS - daysElapsed;

        // === A. Renouvellement automatique si échéance dépassée ===
        if (daysRemaining < 0) {
          const newSignatureDate = new Date();
          await supabase
            .from("clients")
            .update({
              mandat_date_signature: newSignatureDate.toISOString(),
              mandat_renewal_count: (client.mandat_renewal_count ?? 0) + 1,
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
              message: `Votre mandat de recherche a été renouvelé pour 90 jours supplémentaires. Vous pouvez l'annuler à tout moment depuis votre espace.`,
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
        const endDate = new Date(signatureDate);
        endDate.setDate(endDate.getDate() + MANDAT_DURATION_DAYS);

        // === F. Notification in-app ===
        if (client.user_id) {
          await supabase.from("notifications").insert({
            user_id: client.user_id,
            type: "mandate_expiring",
            title: `⏰ Votre mandat se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`,
            message: `Sans action, il sera renouvelé automatiquement le ${endDate.toLocaleDateString("fr-CH")}.`,
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
            endDate,
            renewUrl,
            cancelUrl,
          });
          await fetch("https://api.resend.com/emails", {
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
        const msg = err instanceof Error ? err.message : String(err);
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
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("mandate-expiry-reminders fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
