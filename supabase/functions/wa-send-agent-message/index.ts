// T14 — wa-send-agent-message
// Now supports media attachments:
//   - Native WhatsApp media (image/video/audio/document) when 24h session open + format/size OK
//   - Fallback to template `agent_message_alert` with public link when out of session or unsupported
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadAgentName, callSendWhatsApp } from "../_shared/wa-helpers.ts";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_VERSION = "v21.0";

// Meta media size limits (bytes)
const MAX_IMG = 5 * 1024 * 1024;
const MAX_AUDIO = 16 * 1024 * 1024;
const MAX_VIDEO = 16 * 1024 * 1024;
const MAX_DOC = 100 * 1024 * 1024;

const VIDEO_MIMES = new Set(["video/mp4", "video/3gpp", "video/3gp"]);
const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const AUDIO_MIMES = new Set(["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg", "audio/opus"]);

interface Attachment {
  url?: string;
  type?: string; // 'image' | 'video' | 'audio' | 'document'
  mime?: string;
  name?: string;
  size?: number;
  thumbnail_url?: string; // miniature pour vidéos (envoyée en image native si fenêtre 24h ouverte)
}

function pickMediaKind(att: Attachment): "image" | "video" | "audio" | "document" | null {
  const t = (att.type || "").toLowerCase();
  if (t === "image" || t === "video" || t === "audio" || t === "document") return t as any;
  const m = (att.mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m) return "document";
  return null;
}

function inferMime(att: Attachment): string {
  if (att.mime) return att.mime.toLowerCase();
  const name = (att.name || att.url || "").toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".3gp") || name.endsWith(".3gpp")) return "video/3gpp";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".m4a")) return "audio/mp4";
  if (name.endsWith(".aac")) return "audio/aac";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".ogg") || name.endsWith(".opus")) return "audio/ogg";
  return "";
}

function isMediaSendable(att: Attachment, kind: string): boolean {
  const size = att.size || 0;
  const mime = inferMime(att);
  if (!att.url) return false;
  if (kind === "video") return size > 0 && size <= MAX_VIDEO && VIDEO_MIMES.has(mime);
  if (kind === "image") return size > 0 && size <= MAX_IMG && IMAGE_MIMES.has(mime);
  if (kind === "audio") return size > 0 && size <= MAX_AUDIO && AUDIO_MIMES.has(mime);
  if (kind === "document") return size > 0 && size <= MAX_DOC;
  return false;
}

async function isWindowOpen(supabase: any, clientId: string): Promise<boolean> {
  // 24h window: a message inserted by webhook has sender_type='client' and content starts with '📱 [WhatsApp]'
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("messages")
    .select("id, created_at")
    .gte("created_at", since)
    .eq("sender_type", "client")
    .ilike("content", "📱 [WhatsApp]%")
    .limit(50);
  if (!data || !data.length) return false;
  // Confirm at least one belongs to a conversation owned by this client
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId);
  const ids = new Set((convs || []).map((c: any) => c.id));
  // We need conversation_id on messages; refetch with conv id
  const { data: msgs2 } = await supabase
    .from("messages")
    .select("id, conversation_id")
    .in("id", data.map((d: any) => d.id));
  return (msgs2 || []).some((m: any) => ids.has(m.conversation_id));
}

async function sendNativeMedia(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  kind: "image" | "video" | "audio" | "document";
  link: string;
  filename?: string;
  caption?: string;
}): Promise<{ ok: boolean; meta_message_id?: string; error?: any }> {
  const mediaObj: any = { link: opts.link };
  if ((opts.kind === "image" || opts.kind === "video" || opts.kind === "document") && opts.caption) {
    if (opts.kind !== "document") mediaObj.caption = opts.caption;
  }
  if (opts.kind === "document") {
    if (opts.filename) mediaObj.filename = opts.filename;
    if (opts.caption) mediaObj.caption = opts.caption;
  }
  const payload: any = {
    messaging_product: "whatsapp",
    to: opts.to.replace("+", ""),
    type: opts.kind,
    [opts.kind]: mediaObj,
  };
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${opts.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json };
  return { ok: true, meta_message_id: json?.messages?.[0]?.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-agent-message');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const { client_id, agent_id, message_extract, contexte, attachment, context_type, context_ref } = body || {};
  if (!client_id) {
    return new Response(JSON.stringify({ error: "client_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: client } = await supabase.from("clients").select("user_id, agent_id").eq("id", client_id).maybeSingle();
  const { data: profile } = await supabase
    .from("profiles")
    .select("prenom, telephone, whatsapp_phone, whatsapp_opt_in")
    .eq("id", client?.user_id).maybeSingle();
  // Bug fix: priorité au vrai agent du client (clients.agent_id) plutôt qu'à
  // l'agent figé sur la conversation, qui peut être obsolète après réassignation.
  const agentName = await loadAgentName(supabase, client?.agent_id || agent_id);
  const recipient = profile?.whatsapp_phone || profile?.telephone;

  const att: Attachment | null = attachment && typeof attachment === "object" ? attachment : null;
  const kind = att ? pickMediaKind(att) : null;
  const hasMedia = !!(att && kind && att.url);

  let nativeMode: "sent" | "skipped" | "failed" = "skipped";
  let nativeMetaId: string | undefined;
  let nativeError: any = null;
  let deliveryMode: "media_native" | "link_with_thumbnail" | "link_fallback" = "link_fallback";

  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const open = hasMedia && recipient ? await isWindowOpen(supabase, client_id) : false;

  // 1) VIDEO: jamais en natif (limite 16 MB peu utile pour vidéos mobiles).
  //    Si fenêtre 24h ouverte ET miniature disponible: envoyer la miniature en image native + texte avec lien.
  if (hasMedia && kind === "video" && open && phoneNumberId && accessToken && att!.thumbnail_url) {
    const result = await sendNativeMedia({
      phoneNumberId, accessToken, to: recipient!,
      kind: "image", link: att!.thumbnail_url,
      caption: `📹 Vidéo de ${agentName} — Cliquez sur le lien pour la regarder : ${att!.url}`,
    });
    if (result.ok) {
      nativeMode = "sent";
      nativeMetaId = result.meta_message_id;
      deliveryMode = "link_with_thumbnail";
      await supabase.from("whatsapp_notification_logs").insert({
        client_id, agent_id: agent_id || client?.agent_id || null,
        event_type: "agent_message_media", template_key: null,
        recipient_phone: recipient,
        payload_json: { kind: "video", url: att!.url, thumbnail_url: att!.thumbnail_url, name: att!.name, size: att!.size, mime: att!.mime },
        status: "sent", meta_message_id: nativeMetaId || null,
        sent_at: new Date().toISOString(),
        delivery_mode: "link_with_thumbnail",
        context_type: context_type ?? "agent_message",
        context_ref: context_ref ?? null,
      });
    } else {
      nativeMode = "failed";
      nativeError = result.error;
    }
  }
  // 2) Autres médias (image/audio/document): tenter natif si éligible et fenêtre ouverte
  else if (hasMedia && kind !== "video" && open && isMediaSendable(att!, kind!) && phoneNumberId && accessToken) {
    const caption = (message_extract && String(message_extract).trim())
      ? String(message_extract).slice(0, 900) : undefined;
    const result = await sendNativeMedia({
      phoneNumberId, accessToken, to: recipient!,
      kind: kind!, link: att!.url!, filename: att!.name, caption,
    });
    if (result.ok) {
      nativeMode = "sent";
      nativeMetaId = result.meta_message_id;
      deliveryMode = "media_native";
      await supabase.from("whatsapp_notification_logs").insert({
        client_id, agent_id: agent_id || client?.agent_id || null,
        event_type: "agent_message_media", template_key: null,
        recipient_phone: recipient,
        payload_json: { kind, url: att!.url, name: att!.name, size: att!.size, mime: att!.mime, caption },
        status: "sent", meta_message_id: nativeMetaId || null,
        sent_at: new Date().toISOString(),
        delivery_mode: "media_native",
        context_type: context_type ?? "agent_message",
        context_ref: context_ref ?? null,
      });
    } else {
      nativeMode = "failed";
      nativeError = result.error;
    }
  }

  // 3) Fallback / always: send template alert (with link inside extract if media not natively sent)
  let extract = String(message_extract ?? "").trim();
  if (hasMedia && nativeMode !== "sent") {
    const emoji =
      kind === "video" ? "📹" : kind === "image" ? "🖼️" : kind === "audio" ? "🎙️" : "📎";
    const linkSuffix = `${emoji} ${kind === "video" ? "Vidéo" : kind === "image" ? "Photo" : kind === "audio" ? "Message vocal" : "Document"} : ${att!.url}`;
    extract = extract ? `${extract} — ${linkSuffix}` : linkSuffix;
  }
  if (!extract) extract = hasMedia ? "Pièce jointe" : "Nouveau message";
  if (extract.length > 200) extract = extract.slice(0, 200) + "…";

  // Si on a déjà envoyé le média en natif (image/audio/doc) ou la miniature vidéo,
  // pas besoin du template d'alerte (le message est déjà arrivé sur WhatsApp).
  const tplResult = nativeMode === "sent" ? { skipped: true, reason: "media_already_delivered" } : await callSendWhatsApp({
    event_type: "agent_message",
    template_key: "agent_message_alert",
    client_id,
    agent_id: agent_id || client?.agent_id || null,
    preference_key: "agent_messages_enabled",
    variables: [
      profile?.prenom || "Client",
      agentName,
      extract,
      contexte || "votre dossier",
    ],
    context_type: context_type ?? "agent_message",
    context_ref: context_ref ?? null,
  });

  return new Response(JSON.stringify({
    ok: true,
    delivery_mode: deliveryMode,
    media: { mode: nativeMode, meta_message_id: nativeMetaId, error: nativeError },
    template: tplResult,
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
