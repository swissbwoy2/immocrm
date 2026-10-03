import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { listEmailLogs } from "npm:@lovable.dev/email-js@0.1.0";
import { check, infomaniak } from "./newsletter-infomaniak.ts";

export function activityRows(
  data: unknown,
): { email: string; open_count: number; click_count: number }[] {
  if (!Array.isArray(data)) throw new Error("Rapport Infomaniak inattendu");
  return data.map((row) => {
    if (!row || typeof row.email !== "string" || !row.email.includes("@")) {
      throw new Error("Destinataire du rapport Infomaniak invalide");
    }
    const count = (value: unknown) => {
      const n = typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : value;
      if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
        throw new Error("Compteur Infomaniak indisponible");
      }
      return n;
    };
    return {
      email: row.email.trim().toLowerCase(),
      open_count: count(row.open_count),
      click_count: count(row.click_count),
    };
  });
}
export async function syncInfomaniak(db: SupabaseClient) {
  const { data: campaigns } = check(
    await db.from("newsletters").select(
      "id,provider_campaign_id,provider_domain_id",
    ).eq("provider", "infomaniak").eq("status", "completed").not(
      "provider_campaign_id",
      "is",
      null,
    ).gte("scheduled_at", new Date(Date.now() - 90 * 86400000).toISOString())
      .order("tracking_synced_at", { nullsFirst: true }).limit(1),
  );
  if (!campaigns?.length) return { campaigns: 0 };
  const c = campaigns[0];
  try {
    const provider = await infomaniak(db);
    if (provider.config.domain_id !== c.provider_domain_id) {
      throw new Error("Domaine de campagne différent du domaine connecté");
    }
    const { data: remote } = await provider.call<
      { tracking_link: boolean; tracking_opening: boolean }
    >(`/campaigns/${c.provider_campaign_id}`);
    const enabled = remote.tracking_link === true ||
      remote.tracking_opening === true;
    const rows: ReturnType<typeof activityRows> = [];
    for (let page = 1; enabled && page <= 20; page++) {
      const result = await provider.call<unknown>(
        `/campaigns/${c.provider_campaign_id}/report/activity?page=${page}&per_page=1000&order_by=email`,
      );
      if (
        result.page !== page || !Number.isInteger(result.pages) ||
        !Number.isInteger(result.total) || result.pages! > 20
      ) {
        throw new Error(
          "Pagination Infomaniak invalide ou rapport trop volumineux",
        );
      }
      rows.push(...activityRows(result.data));
      if (page >= result.pages!) {
        if (rows.length !== result.total) {
          throw new Error("Rapport Infomaniak incomplet");
        }
        break;
      }
    }
    // Timestamps are observation times: the report documents counters, not exact reading times.
    for (let i = 0; i < rows.length; i += 500) {
      check(
        await db.rpc("communication_newsletter_activity", {
          p_campaign: c.id,
          p_rows: rows.slice(i, i + 500),
        }),
      );
    }
    for (
      const [action, type] of [
        ["bounce", "bounced"],
        ["complaint", "complained"],
        ["unsub", "unsubscribed"],
        ["sbounce", "delayed"],
      ]
    ) {
      const emails: string[] = [];
      for (let page = 1; page <= 20; page++) {
        const result = await provider.call<{ email: string }[]>(
          `/campaigns/${c.provider_campaign_id}/report/activity?page=${page}&per_page=1000&filter[action]=${action}&order_by=email`,
        );
        if (
          !Array.isArray(result.data) || result.page !== page ||
          !Number.isInteger(result.pages) || !Number.isInteger(result.total) ||
          result.pages! > 20
        ) throw new Error("Rapport de distribution Infomaniak incomplet");
        for (const row of result.data) {
          if (typeof row.email !== "string") {
            throw new Error("Destinataire Infomaniak indisponible");
          }
          emails.push(row.email.trim().toLowerCase());
        }
        if (page >= result.pages!) {
          if (emails.length !== result.total) {
            throw new Error("Rapport de distribution Infomaniak incomplet");
          }
          break;
        }
      }
      for (let i = 0; i < emails.length; i += 500) {
        check(
          await db.rpc("communication_newsletter_outcomes", {
            p_campaign: c.id,
            p_type: type,
            p_emails: emails.slice(i, i + 500),
          }),
        );
      }
    }
    check(
      await db.from("newsletters").update({
        tracking_enabled: enabled,
        tracking_synced_at: new Date().toISOString(),
        tracking_error: null,
      }).eq("id", c.id),
    );
    return { campaigns: 1, recipients: rows.length };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Rapport Infomaniak indisponible";
    await db.from("newsletters").update({ tracking_error: message }).eq(
      "id",
      c.id,
    );
    throw error;
  }
}
export async function syncManagedEmail(db: SupabaseClient) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { available: false };
  const { data: state } = check(
    await db.from("communication_sync_state").select("*").eq("id", "lovable")
      .maybeSingle(),
  );
  const since = state?.cursor ? state.since : new Date(
    state?.last_synced_at
      ? Date.parse(state.last_synced_at) - 300000
      : Date.now() - 30 * 86400000,
  ).toISOString();
  const until = state?.cursor ? state.until : new Date().toISOString();
  let cursor = state?.cursor || undefined, count = 0;
  try {
    for (let page = 0; page < 3; page++) {
      const result = await listEmailLogs({ since, until, limit: 100, cursor }, {
        apiKey,
      });
      for (const event of result.data) {
        if (
          !event.message_id || !event.recipient ||
          !Number.isFinite(Date.parse(event.timestamp))
        ) continue;
        const type = event.event_type.replace(/^email\./, "").toLowerCase();
        const types: Record<string, string> = {
          delivered: "delivered",
          delivery: "delivered",
          bounced: "bounced",
          bounce: "bounced",
          complaint: "complained",
          complained: "complained",
          failed: "failed",
          unsubscribed: "unsubscribed",
        };
        const status = ["sent", "send", "delivered", "delivery"].includes(type)
          ? "sent"
          : ["failed", "bounced", "bounce"].includes(type)
          ? "failed"
          : "pending";
        const { data: existing } = check(
          await db.from("lead_email_logs").select("id").eq(
            "tracking_provider",
            "lovable",
          ).eq("provider_message_id", event.message_id).eq(
            "recipient_email",
            event.recipient.toLowerCase(),
          ).limit(1),
        );
        if (!existing?.length) {
          const { error } = await db.from("lead_email_logs").insert({
            recipient_email: event.recipient.toLowerCase(),
            subject: event.tags?.[0] || "Email système",
            campaign_key: event.tags?.[0] || "Email système",
            tracking_provider: "lovable",
            provider_message_id: event.message_id,
            tracking_key:
              `lovable-log:${event.message_id}:${event.recipient.toLowerCase()}`,
            status,
            created_at: event.timestamp,
            sent_at: ["sent", "send"].includes(type) ? event.timestamp : null,
            tracking_note:
              "Historique fournisseur : ouvertures et clics non mesurés",
          });
          if (error && error.code !== "23505") throw error;
        } else if (["sent", "send"].includes(type)) {
          check(
            await db.from("lead_email_logs").update({
              status: "sent",
              sent_at: event.timestamp,
            }).eq("id", existing[0].id).is("sent_at", null),
          );
        }
        if (types[type]) {
          check(
            await db.rpc("communication_receipt", {
              p_event_id:
                `lovable:${event.message_id}:${event.recipient}:${type}:${event.timestamp}`,
              p_provider: "lovable",
              p_message_id: event.message_id,
              p_recipient: event.recipient,
              p_type: types[type],
              p_at: event.timestamp,
            }),
          );
        }
        count++;
      }
      cursor = result.pagination.has_more
        ? result.pagination.next_cursor || undefined
        : undefined;
      if (result.pagination.has_more && !cursor) {
        throw new Error("Pagination des emails système incomplète");
      }
      if (!cursor) break;
    }
    check(
      await db.from("communication_sync_state").upsert({
        id: "lovable",
        cursor: cursor || null,
        since,
        until,
        last_synced_at: cursor ? state?.last_synced_at || null : until,
        error: null,
      }),
    );
    return { events: count, more: !!cursor };
  } catch (error) {
    await db.from("communication_sync_state").upsert({
      id: "lovable",
      error: "Synchronisation des emails système indisponible",
    });
    throw error;
  }
}
export async function syncCommunications(db: SupabaseClient) {
  const result: Record<string, unknown> = {};
  for (
    const [key, run] of [["infomaniak", syncInfomaniak], [
      "lovable",
      syncManagedEmail,
    ]] as const
  ) {
    try {
      result[key] = await run(db);
    } catch (error) {
      result[key] = {
        error: error instanceof Error
          ? error.message
          : "Synchronisation indisponible",
      };
    }
  }
  return result;
}
