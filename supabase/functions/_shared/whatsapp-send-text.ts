// Shared helper: send free-form WhatsApp text or interactive buttons
// Only usable inside an open 24h customer service window (e.g. after a button click)

const GRAPH_VERSION = "v21.0";

export interface InteractiveButton {
  id: string;
  title: string; // max 20 chars
}

export async function sendWhatsAppText(toPhoneE164: string, body: string): Promise<{ ok: boolean; error?: string; meta_message_id?: string }> {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!phoneNumberId || !accessToken) return { ok: false, error: "credentials_missing" };

  const payload = {
    messaging_product: "whatsapp",
    to: toPhoneE164.replace("+", ""),
    type: "text",
    text: { body },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(json).slice(0, 500) };
    return { ok: true, meta_message_id: json?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message || err) };
  }
}

export async function sendWhatsAppButtons(
  toPhoneE164: string,
  bodyText: string,
  buttons: InteractiveButton[],
): Promise<{ ok: boolean; error?: string; meta_message_id?: string }> {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!phoneNumberId || !accessToken) return { ok: false, error: "credentials_missing" };

  const payload = {
    messaging_product: "whatsapp",
    to: toPhoneE164.replace("+", ""),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(json).slice(0, 500) };
    return { ok: true, meta_message_id: json?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message || err) };
  }
}

export function normalizePhoneE164(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    if (p.startsWith("0")) p = "+41" + p.slice(1);
    else p = "+" + p;
  }
  if (!/^\+\d{8,15}$/.test(p)) return null;
  return p;
}
