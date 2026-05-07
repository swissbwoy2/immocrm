// Send WhatsApp notification via Meta Cloud API
// Lot 1: never blocks calling action; logs every attempt.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_VERSION = "v21.0";

interface ReqBody {
  event_type: string;
  template_key: string;
  client_id?: string | null;
  agent_id?: string | null;
  // Pour test admin direct sans client_id : recipient_phone
  recipient_phone_override?: string | null;
  // Variables pour body components, ordre = ordre {{1}}, {{2}}, ...
  variables: string[];
  // Catégorie de préférence à vérifier
  preference_key?:
    | "offer_alerts_enabled"
    | "visit_reminders_enabled"
    | "document_alerts_enabled"
    | "agent_messages_enabled"
    | "candidature_updates_enabled"
    | null;
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    // CH default
    if (p.startsWith("0")) p = "+41" + p.slice(1);
    else p = "+" + p;
  }
  // E.164 basic check
  if (!/^\+\d{8,15}$/.test(p)) return null;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { event_type, template_key, client_id, agent_id, recipient_phone_override, variables, preference_key } = body;

  if (!event_type || !template_key || !Array.isArray(variables)) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let recipientPhone: string | null = null;
  let resolvedAgentId: string | null = agent_id ?? null;

  try {
    // Cas 1: envoi à un client identifié
    if (client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, agent_id, user_id")
        .eq("id", client_id)
        .maybeSingle();

      if (!client) {
        return new Response(JSON.stringify({ skipped: true, reason: "client_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!resolvedAgentId) resolvedAgentId = client.agent_id ?? null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("whatsapp_phone, telephone, whatsapp_opt_in")
        .eq("id", client.user_id)
        .maybeSingle();

      if (!profile?.whatsapp_opt_in) {
        return new Response(JSON.stringify({ skipped: true, reason: "no_opt_in" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      recipientPhone = normalizePhone(profile.whatsapp_phone || profile.telephone || "");
      if (!recipientPhone) {
        return new Response(JSON.stringify({ skipped: true, reason: "no_phone" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vérifier préférences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("whatsapp_enabled, offer_alerts_enabled, visit_reminders_enabled, document_alerts_enabled, agent_messages_enabled, candidature_updates_enabled")
        .eq("client_id", client_id)
        .maybeSingle();

      if (prefs && prefs.whatsapp_enabled === false) {
        return new Response(JSON.stringify({ skipped: true, reason: "whatsapp_disabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (prefs && preference_key && (prefs as any)[preference_key] === false) {
        return new Response(JSON.stringify({ skipped: true, reason: "category_disabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (recipient_phone_override) {
      recipientPhone = normalizePhone(recipient_phone_override);
      if (!recipientPhone) {
        return new Response(JSON.stringify({ error: "invalid_phone" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "client_id or recipient_phone_override required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charger template actif
    const { data: tpl } = await supabase
      .from("whatsapp_message_templates")
      .select("template_name_meta, language, is_active")
      .eq("template_key", template_key)
      .maybeSingle();

    if (!tpl || !tpl.is_active) {
      return new Response(JSON.stringify({ skipped: true, reason: "template_inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    if (!phoneNumberId || !accessToken) {
      throw new Error("WhatsApp credentials missing");
    }

    // Sanitize: Meta refuse \n, \t, U+202F, U+00A0, et plus de 4 espaces consécutifs
    const sanitizeVar = (raw: any): string => {
      let s = String(raw ?? "");
      // Replace all whitespace control chars + non-breaking spaces with regular space
      s = s.replace(/[\r\n\t\v\f]+/g, " ");
      s = s.replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]/g, " ");
      // Collapse 5+ spaces to single space (Meta hard limit = 4)
      s = s.replace(/ {2,}/g, " ");
      s = s.trim();
      if (!s) s = "—";
      // Hard cap to avoid Meta length errors
      if (s.length > 900) s = s.slice(0, 897) + "...";
      return s;
    };

    const cleanVars = variables.map(sanitizeVar);

    const payload = {
      messaging_product: "whatsapp",
      to: recipientPhone.replace("+", ""),
      type: "template",
      template: {
        name: tpl.template_name_meta,
        language: { code: tpl.language || "fr" },
        components: cleanVars.length > 0
          ? [
              {
                type: "body",
                parameters: cleanVars.map((v) => ({ type: "text", text: v })),
              },
            ]
          : [],
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const responseJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      await supabase.from("whatsapp_notification_logs").insert({
        client_id: client_id ?? null,
        agent_id: resolvedAgentId,
        event_type,
        template_key,
        recipient_phone: recipientPhone,
        payload_json: payload,
        status: "failed",
        error_message: JSON.stringify(responseJson).slice(0, 1000),
        failed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: false, error: responseJson }), {
        status: 200, // never block calling action
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaMessageId = responseJson?.messages?.[0]?.id ?? null;
    await supabase.from("whatsapp_notification_logs").insert({
      client_id: client_id ?? null,
      agent_id: resolvedAgentId,
      event_type,
      template_key,
      recipient_phone: recipientPhone,
      payload_json: payload,
      status: "sent",
      meta_message_id: metaMessageId,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, meta_message_id: metaMessageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-whatsapp-notification error", err);
    try {
      await supabase.from("whatsapp_notification_logs").insert({
        client_id: client_id ?? null,
        agent_id: resolvedAgentId,
        event_type,
        template_key,
        recipient_phone: recipientPhone || "unknown",
        status: "failed",
        error_message: String(err?.message || err).slice(0, 1000),
        failed_at: new Date().toISOString(),
      });
    } catch (_) { /* swallow */ }
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
