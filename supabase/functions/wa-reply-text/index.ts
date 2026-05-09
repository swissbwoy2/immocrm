import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText, normalizePhoneE164 } from "../_shared/whatsapp-send-text.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const conversationId = String(body.conversation_id || "");
    const text = String(body.text || "").trim();
    if (!conversationId || !text) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 4000) {
      return new Response(JSON.stringify({ error: "text_too_long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Check 24h window: latest inbound from client
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
      return new Response(JSON.stringify({ error: "window_closed", message: "Fenêtre 24h Meta fermée — utilisez un template." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendWhatsAppText(phone, text);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: "send_failed", details: result.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find agent's user_id (sender)
    let senderId: string | null = user.id;
    const { data: agent } = await admin
      .from("agents")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const agentRowId = agent?.id || conv.agent_id || null;

    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: senderId,
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
