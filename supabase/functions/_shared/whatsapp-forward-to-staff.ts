// Forward client replies to assigned agent + admin (via WhatsApp + in-app notification)
import { sendWhatsAppText, normalizePhoneE164 } from "./whatsapp-send-text.ts";

interface ForwardArgs {
  supabase: any;
  clientId: string;
  agentId?: string | null;
  summary: string; // free text summary (used when no template provided)
  templateKey?: string; // if set → use template via send-whatsapp-notification
  variables?: string[];
  notifTitle?: string;
  notifLink?: string;
}

const ADMIN_PHONE_RAW = Deno.env.get("WHATSAPP_ADMIN_PHONE") || "";

export async function forwardClientReplyToStaff(args: ForwardArgs): Promise<void> {
  const { supabase, clientId, agentId, summary, templateKey, variables, notifTitle, notifLink } = args;

  // Resolve agent phone + user_id
  let agentPhone: string | null = null;
  let agentUserId: string | null = null;
  if (agentId) {
    const { data: agent } = await supabase
      .from("agents")
      .select("user_id")
      .eq("id", agentId)
      .maybeSingle();
    if (agent?.user_id) {
      agentUserId = agent.user_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("whatsapp_phone, telephone, whatsapp_opt_in")
        .eq("id", agent.user_id)
        .maybeSingle();
      if (profile?.whatsapp_opt_in !== false) {
        agentPhone = normalizePhoneE164(profile?.whatsapp_phone || profile?.telephone || "");
      }
    }
  }

  const adminPhone = normalizePhoneE164(ADMIN_PHONE_RAW);

  // === Send WhatsApp ===
  // Strategy: use template if provided (works outside 24h window); otherwise free text (requires open window).
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  async function sendTemplateTo(phone: string) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          event_type: `forward_${templateKey}`,
          template_key: templateKey,
          recipient_phone_override: phone,
          variables: variables || [],
        }),
      });
    } catch (e) {
      console.error("forward template failed", e);
    }
  }

  for (const phone of [agentPhone, adminPhone].filter(Boolean) as string[]) {
    if (templateKey) {
      await sendTemplateTo(phone);
    } else {
      // Free text — requires open 24h window (true when triggered by client reply)
      await sendWhatsAppText(phone, summary).catch((e) => console.error("forward text failed", e));
    }
  }

  // === In-app notification ===
  const title = notifTitle || "📱 Réponse client WhatsApp";
  const link = notifLink || "/agent/messagerie";
  const recipients: string[] = [];
  if (agentUserId) recipients.push(agentUserId);
  // All admins
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  for (const a of admins || []) {
    if (!recipients.includes(a.user_id)) recipients.push(a.user_id);
  }

  for (const userId of recipients) {
    try {
      await supabase.rpc("create_notification", {
        p_user_id: userId,
        p_type: "whatsapp_client_reply",
        p_title: title,
        p_message: summary.slice(0, 250),
        p_link: link,
        p_data: { client_id: clientId },
      });
    } catch (e) {
      console.error("notif failed", e);
    }
  }
}
