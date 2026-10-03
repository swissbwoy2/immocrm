import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:svix@2.6.1";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const raw = await req.text();
  if (raw.length > 100000) return new Response("Too large", { status: 413 });
  const { data: secret, error } = await db.rpc("communication_webhook_secret");
  if (error || !secret) return new Response("Not configured", { status: 503 });
  let event: {
    type: string;
    created_at: string;
    data: { email_id: string; to?: string[] };
  };
  try {
    new Webhook(secret).verify(raw, Object.fromEntries(req.headers));
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
  const types: Record<string, string> = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.delivery_delayed": "delayed",
    "email.failed": "failed",
  };
  const type = types[event.type];
  if (!type) return Response.json({ ignored: true });
  if (!event.data?.email_id || !Number.isFinite(Date.parse(event.created_at))) {
    return new Response("Invalid event", { status: 400 });
  }
  // Resend delivery events identify the message; individual To recipients are scoped when supplied.
  const recipients = event.data.to?.length ? event.data.to : [null];
  for (const recipient of recipients) {
    const { error } = await db.rpc("communication_receipt", {
      p_event_id: `resend:${req.headers.get("svix-id")}:${recipient || ""}`,
      p_provider: "resend",
      p_message_id: event.data.email_id,
      p_recipient: recipient,
      p_type: type,
      p_at: event.created_at,
    });
    if (error) return new Response("Persistence failed", { status: 503 });
  }
  return Response.json({ received: true });
});
