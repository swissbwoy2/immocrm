import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { check } from "./newsletter-infomaniak.ts";
import { syncCommunications } from "./communication-sync.ts";
export async function connectReceipts(db: SupabaseClient) {
  const { data: secret } = check(await db.rpc("communication_webhook_secret"));
  if (secret) {
    return { ready: true, message: "Accusés de réception configurés" };
  }
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    throw new Error("Clé Resend indisponible pour les accusés de réception");
  }
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const endpoint = `${
    Deno.env.get("SUPABASE_URL")
  }/functions/v1/communication-webhook`;
  const current = await fetch("https://api.resend.com/webhooks", {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!current.ok) {
    throw new Error(
      `Configuration des accusés de réception refusée par Resend (${current.status}). Une clé avec accès aux webhooks est nécessaire.`,
    );
  }
  const list = await current.json();
  const existing = (list.data || []).find((w: { endpoint: string }) =>
    w.endpoint === endpoint
  );
  if (existing) {
    throw new Error(
      "Le webhook existe déjà : son secret doit être enregistré côté serveur. Aucun doublon créé.",
    );
  }
  const response = await fetch("https://api.resend.com/webhooks", {
    method: "POST",
    headers,
    body: JSON.stringify({
      endpoint,
      events: [
        "email.delivered",
        "email.bounced",
        "email.complained",
        "email.delivery_delayed",
        "email.failed",
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(
      `Création des accusés de réception indisponible (${response.status})`,
    );
  }
  const created = await response.json();
  if (typeof created.signing_secret !== "string") {
    throw new Error("Resend n’a pas retourné le secret de validation");
  }
  check(
    await db.rpc("communication_webhook_secret", {
      p_secret: created.signing_secret,
    }),
  );
  return { ready: true, message: "Accusés de réception configurés" };
}
export async function communicationAction(
  db: SupabaseClient,
  b: Record<string, unknown>,
) {
  switch (b.action) {
    case "tracking-connect":
      return connectReceipts(db);
    case "tracking-sync":
      return syncCommunications(db);
    case "tracking-report": {
      const [report, secret, states, campaigns] = await Promise.all([
        db.rpc("communication_report", {
          p_days: Number(b.days) || 30,
          p_channel: String(b.channel || ""),
          p_search: String(b.search || "").slice(0, 200),
          p_status: String(b.status || ""),
          p_campaign: String(b.campaign || ""),
          p_page: Math.max(0, Math.floor(Number(b.page) || 0)),
        }),
        db.rpc("communication_webhook_secret"),
        db.from("communication_sync_state").select(
          "id,last_synced_at,error,cursor",
        ),
        db.from("newsletters").select(
          "id,name,tracking_synced_at,tracking_error,tracking_enabled",
        ).eq("status", "completed").order("updated_at", { ascending: false })
          .limit(100),
      ]);
      return {
        ...check(report).data,
        health: {
          receipts_configured: !!check(secret).data,
          system: (check(states).data || []).map(({ cursor, ...r }) => ({
            ...r,
            more: !!cursor,
          })),
          campaigns: check(campaigns).data || [],
        },
      };
    }
    case "tracking-detail": {
      if (
        !/^(email|newsletter|notification|smtp|managed):[0-9a-f-]{36}$/i.test(
          String(b.id),
        )
      ) throw new Error("Identifiant invalide");
      const row = check(
        await db.from("communication_tracking").select("*").eq("id", b.id)
          .single(),
      ).data;
      const events = check(
        await db.from("communication_events").select(
          "id,event_type,occurred_at,url,provider,time_basis",
          { count: "exact" },
        ).eq("source_id", b.id).order("occurred_at", { ascending: false })
          .range(0, 199),
      );
      return { row, events: events.data || [], event_count: events.count };
    }
    default:
      throw new Error("Action de suivi inconnue");
  }
}
