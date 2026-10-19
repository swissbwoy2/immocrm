// Envoi ciblé (admin) : notification in-app + e-mail de service à une liste d'utilisateurs.
// Idempotent via broadcast_campaign_log (campaign_key + user_id).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { canSendNotificationEmail } from "../_shared/notificationEmailOptOut.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { logEmailSend } from "../_shared/email-send-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const TEMPLATE = "admin-notice";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const caller = await verifyInternalCaller(req);
  const isAdmin = caller.ok &&
    (caller.kind === "service" || caller.kind === "secret" || (caller.roles || []).includes("admin"));
  if (!isAdmin) return json({ error: "Non autorisé" }, caller.userId ? 403 : 401);

  let input: any;
  try { input = await req.json(); } catch { return json({ error: "Corps JSON invalide" }, 400); }

  const campaignKey = typeof input?.campaign_key === "string" ? input.campaign_key.trim() : "";
  const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
  const body = typeof input?.body === "string" ? input.body : "";
  const inAppTitle = typeof input?.in_app_title === "string" && input.in_app_title.trim() ? input.in_app_title.trim() : subject;
  const dryRun = input?.dry_run === true;
  const rawIds = Array.isArray(input?.user_ids) ? input.user_ids : null;

  const errs: string[] = [];
  if (!campaignKey || campaignKey.length > 200) errs.push("campaign_key requis (≤ 200)");
  if (!subject || subject.length > 300) errs.push("subject requis (≤ 300)");
  if (!body.trim() || body.length > 20000) errs.push("body requis (≤ 20000)");
  if (!rawIds || rawIds.length === 0 || rawIds.length > 5000) errs.push("user_ids requis (1..5000)");
  else if (rawIds.some((id: any) => typeof id !== "string" || !UUID_RE.test(id))) errs.push("user_ids doit contenir des UUID");
  if (errs.length) return json({ error: errs }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userIds: string[] = Array.from(new Set(rawIds as string[]));

  const { data: profiles, error: pErr } = await supabase
    .from("profiles").select("id, prenom, email").in("id", userIds);
  if (pErr) return json({ error: "Lecture des profils impossible" }, 500);
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

  const { data: already, error: aErr } = await supabase
    .from("broadcast_campaign_log").select("user_id").eq("campaign_key", campaignKey).in("user_id", userIds);
  if (aErr) return json({ error: "Lecture du journal impossible" }, 500);
  const alreadyDone = new Set((already || []).map((r: any) => r.user_id));

  const pending = userIds.filter((id) => !alreadyDone.has(id));

  if (dryRun) {
    const valides = userIds.filter((id) => profileById.get(id)?.email).length;
    return json({
      success: true, dry_run: true, campaign_key: campaignKey,
      demandes: userIds.length, destinataires_valides: valides,
      deja_traites: alreadyDone.size, a_traiter: pending.length,
      sans_profil: userIds.filter((id) => !profileById.has(id)).length,
    });
  }

  let notifs = 0, emails = 0, ignored = 0;
  const errors: string[] = [];

  for (let i = 0; i < pending.length; i++) {
    const userId = pending[i];
    const profile: any = profileById.get(userId);
    let emailStatus = "skipped";
    let errorMessage: string | null = null;
    try {
      if (!profile) throw new Error("profil introuvable");

      const { error: nErr } = await supabase.rpc("create_notification", {
        p_user_id: userId, p_type: "admin_notice", p_title: inAppTitle, p_message: body,
        p_link: null, p_metadata: { campaign_key: campaignKey },
      });
      if (nErr) throw new Error(`notification: ${nErr.message}`);
      notifs += 1;

      const gate = await canSendNotificationEmail(supabase as any, { userId, email: profile.email ?? null });
      if (gate.allowed && gate.email) {
        const recipient = gate.email;
        try {
          const result = await sendTemplateEmail(TEMPLATE, recipient, {
            idempotencyKey: `${campaignKey}-${userId}`,
            templateData: { prenom: profile.prenom || undefined, subject, body },
          });
          emailStatus = result.sent ? "sent" : "suppressed";
          if (result.sent) emails += 1; else ignored += 1;
          await logEmailSend(supabase as any, { templateName: TEMPLATE, recipientEmail: recipient, status: emailStatus as any });
        } catch (sendError) {
          const m = sendError instanceof Error ? sendError.message : String(sendError);
          await logEmailSend(supabase as any, { templateName: TEMPLATE, recipientEmail: recipient, status: "failed", errorMessage: m });
          throw new Error(`email: ${m}`);
        }
      } else {
        ignored += 1;
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
      emailStatus = "failed";
      errors.push(`${userId}: ${errorMessage}`);
      console.error("admin-targeted-notice: échec pour", userId, errorMessage);
    }

    await supabase.from("broadcast_campaign_log").insert({
      campaign_key: campaignKey, user_id: userId, ticket_id: null,
      email_status: emailStatus, error_message: errorMessage ? errorMessage.slice(0, 500) : null,
    });

    if (i < pending.length - 1) await new Promise((r) => setTimeout(r, 250));
  }

  return json({
    success: true, campaign_key: campaignKey, demandes: userIds.length, traites: pending.length,
    notifications_creees: notifs, emails_envoyes: emails, emails_ignores: ignored,
    erreurs: errors.length, details_erreurs: errors.slice(0, 10),
  });
});
