import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText, normalizePhoneE164 } from "../_shared/whatsapp-send-text.ts";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-reply-text');
  if (_deny) return _deny;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const conversationId = body.conversation_id ? String(body.conversation_id) : "";
    const unknownConvId = body.unknown_conversation_id ? String(body.unknown_conversation_id) : "";
    const text = String(body.text || "").trim();
    if ((!conversationId && !unknownConvId) || !text) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 4000) {
      return new Response(JSON.stringify({ error: "text_too_long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === UNKNOWN conversation branch ===
    if (unknownConvId) {
      const { data: uconv } = await admin
        .from("whatsapp_unknown_conversations")
        .select("id, phone_e164")
        .eq("id", unknownConvId)
        .maybeSingle();
      if (!uconv) {
        return new Response(JSON.stringify({ error: "conversation_not_found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const phone = normalizePhoneE164(uconv.phone_e164);
      if (!phone) {
        return new Response(JSON.stringify({ error: "invalid_phone" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 24h window check on unknown_messages
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: recent } = await admin
        .from("whatsapp_unknown_messages")
        .select("id")
        .eq("conversation_id", unknownConvId)
        .eq("direction", "in")
        .gte("created_at", since)
        .limit(1);
      if (!recent || recent.length === 0) {
        return new Response(JSON.stringify({ error: "window_closed" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await sendWhatsAppText(phone, text);
      if (!result.ok) {
        return new Response(JSON.stringify({ error: "send_failed", details: result.error }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("whatsapp_unknown_messages").insert({
        conversation_id: unknownConvId,
        direction: "out",
        content: text,
        meta_message_id: result.meta_message_id || null,
        read: true,
      });
      await admin.from("whatsapp_unknown_conversations")
        .update({ last_message_at: new Date().toISOString(), status: "en_cours" })
        .eq("id", unknownConvId);

      return new Response(JSON.stringify({ ok: true, meta_message_id: result.meta_message_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === KNOWN client conversation branch ===
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id, client_id, agent_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "conversation_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await admin
      .from("clients")
      .select("id, whatsapp_phone, telephone, user_id")
      .eq("id", conv.client_id)
      .maybeSingle();

    const rawPhone = client?.whatsapp_phone || client?.telephone || "";
    const phone = normalizePhoneE164(rawPhone);
    if (!phone) {
      return new Response(JSON.stringify({ error: "invalid_phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recentInbound } = await admin
      .from("messages")
      .select("id, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "client")
      .ilike("content", "📱 [WhatsApp]%")
      .gte("created_at", since)
      .limit(1);

    if (!recentInbound || recentInbound.length === 0) {
      return new Response(JSON.stringify({ error: "window_closed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendWhatsAppText(phone, text);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: "send_failed", details: result.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: user.id,
      content: `📱 [WhatsApp →] ${text}`,
      read: true,
    });

    return new Response(JSON.stringify({ ok: true, meta_message_id: result.meta_message_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", details: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
