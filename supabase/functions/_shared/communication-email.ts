import { createClient } from "npm:@supabase/supabase-js@2";
import {
  emailLinks,
  stripLegacyTracking,
  trackedHtml,
} from "./communication-html.ts";

type Mail = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
};
const list = (value?: string | string[]) =>
  (Array.isArray(value) ? value : value ? [value] : []).map((x) =>
    (x.match(/<([^>]+)>/)?.[1] || x).trim().toLowerCase()
  ).filter(Boolean);
export async function prepareEmailTracking(
  mail: Mail,
  provider: string,
  source: string,
  key?: string,
) {
  const original = mail.html;
  let html = original;
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const ids: string[] = [];
  try {
    const recipients = [
      ...new Set([...list(mail.to), ...list(mail.cc), ...list(mail.bcc)]),
    ];
    const single = recipients.length === 1 && !!original;
    let existing = original?.match(/track-email-open\?id=([0-9a-f-]{36})/i)
      ?.[1];
    if (existing) {
      const { data } = await db.from("lead_email_logs").select("id").eq(
        "id",
        existing,
      ).eq("recipient_email", list(mail.to)[0]).maybeSingle();
      if (!data) existing = undefined;
    }
    if (!single || !existing) {
      html = original ? stripLegacyTracking(original) : original;
    }
    for (const recipient of recipients) {
      let id: string | undefined;
      if (existing && recipient === list(mail.to)[0]) id = existing;
      if (!id && key) {
        const { data, error } = await db.from("lead_email_logs").select("id")
          .eq("tracking_key", `${provider}:${key}:${recipient}`).maybeSingle();
        if (error) throw error;
        id = data?.id;
      }
      const patch = {
        tracking_enabled: single,
        tracking_provider: provider,
        tracking_note: single
          ? null
          : "Envoi groupé : interactions non attribuables à une personne",
      };
      if (id) {
        const { error } = await db.from("lead_email_logs").update(patch).eq(
          "id",
          id,
        );
        if (error) throw error;
      } else {
        const { data, error } = await db.from("lead_email_logs").insert({
          recipient_email: recipient,
          subject: mail.subject,
          campaign_key: source,
          status: "pending",
          sent_at: null,
          tracking_key: key ? `${provider}:${key}:${recipient}` : null,
          ...patch,
        }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      ids.push(id!);
    }
    if (single && ids.length === 1 && html) {
      const urls = emailLinks(html);
      const links = new Map<string, string>();
      if (urls.length) {
        const { data, error } = await db.from("communication_links").upsert(
          urls.map((url) => ({ log_id: ids[0], url })),
          { onConflict: "log_id,url" },
        ).select("id,url");
        if (error) throw error;
        for (const row of data || []) links.set(row.url, row.id);
      }
      html = trackedHtml(
        html,
        `${Deno.env.get("SUPABASE_URL")}/functions/v1`,
        ids[0],
        links,
      );
    }
  } catch {
    // Observability must never suppress an otherwise valid transactional email.
    console.error("Communication tracking setup failed");
    if (ids.length) {
      await db.from("lead_email_logs").update({
        tracking_enabled: false,
        tracking_note: "Instrumentation indisponible lors de cet envoi",
      }).in("id", ids);
    }
    html = original;
  }
  return {
    html,
    ids,
    async finish(
      status: "sent" | "failed" | "skipped",
      messageId?: string | null,
      error?: string | null,
    ) {
      if (!ids.length) return;
      try {
        const { error: err } = await db.from("lead_email_logs").update({
          status,
          provider_message_id: messageId || null,
          sent_at: status === "sent" ? new Date().toISOString() : null,
          error_message: error?.slice(0, 500) || null,
        }).in("id", ids);
        if (err) console.error("Communication tracking outcome failed");
      } catch {
        console.error("Communication tracking outcome unavailable");
      }
    },
  };
}
