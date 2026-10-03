import type { TrackingRow } from "../../../src/features/newsletter/tracking-model";
const now = Date.now(),
  at = (seconds: number) => new Date(now - seconds * 1000).toISOString();
const base: TrackingRow = {
  id: "email:00000000-0000-4000-8000-000000000001",
  channel: "email",
  recipient: "anne@example.test",
  subject: "Votre prochaine visite à Lausanne",
  campaign: "Confirmation de visite",
  provider: "resend",
  status: "sent",
  created_at: at(3600),
  sent_at: at(3600),
  delivered_at: at(3595),
  opened_at: at(3300),
  last_opened_at: at(1800),
  opens_count: 3,
  clicked_at: at(3000),
  last_clicked_at: at(3000),
  clicks_count: 1,
  read_at: null,
  is_read: false,
  bounced_at: null,
  complained_at: null,
  unsubscribed_at: null,
  tracking_enabled: true,
  tracking_note: null,
  error: null,
  synced_at: at(60),
};
const rows: TrackingRow[] = [base, {
  ...base,
  id: "newsletter:00000000-0000-4000-8000-000000000002",
  channel: "newsletter",
  recipient: "marc@example.test",
  subject: "Passez au compte Premium",
  campaign: "Compte Premium",
  provider: "infomaniak",
  opens_count: 2,
  clicks_count: 0,
  clicked_at: null,
  last_clicked_at: null,
  opened_at: null,
  last_opened_at: null,
  delivered_at: null,
}, {
  ...base,
  id: "notification:00000000-0000-4000-8000-000000000003",
  channel: "notification",
  recipient: "lea@example.test",
  subject: "Nouvelle offre disponible",
  campaign: "Offres de logement",
  provider: "application",
  sent_at: null,
  delivered_at: null,
  opened_at: null,
  last_opened_at: null,
  opens_count: null,
  clicks_count: 1,
  read_at: at(2900),
  is_read: true,
}, {
  ...base,
  id: "email:00000000-0000-4000-8000-000000000004",
  recipient: "paul@example.test",
  opens_count: 0,
  clicks_count: 0,
  opened_at: null,
  last_opened_at: null,
  clicked_at: null,
  last_clicked_at: null,
  delivered_at: null,
  bounced_at: at(3500),
  error: "Adresse refusée par le serveur destinataire",
}];
export function trackingFixture(b: Record<string, unknown>): unknown {
  if (b.action === "tracking-detail") {
    const row = rows.find((r) => r.id === b.id) || base;
    return {
      row,
      event_count: 2,
      events: [{
        id: "e1",
        event_type: row.channel === "notification" ? "read" : "clicked",
        occurred_at: at(3000),
        url: "https://logisorama.ch/login",
        provider: row.provider,
        time_basis: "event",
      }, {
        id: "e2",
        event_type: "opened",
        occurred_at: at(3300),
        url: null,
        provider: row.provider,
        time_basis: row.provider === "infomaniak" ? "observed" : "event",
      }],
    };
  }
  if (b.action === "tracking-sync") return { infomaniak: { campaigns: 1 } };
  const filtered = rows.filter((r) =>
    (!b.channel || r.channel === b.channel) &&
    (!b.search ||
      (r.recipient + " " + r.subject).toLowerCase().includes(
        String(b.search).toLowerCase(),
      )) &&
    (!b.campaign || r.campaign === b.campaign) &&
    (!b.status || b.status === "clicked" && (r.clicks_count || 0) > 0 ||
      b.status === "opened" && (r.opens_count || 0) > 0 ||
      b.status === "read" && r.is_read ||
      b.status === "failed" && !!r.bounced_at ||
      b.status === "delivered" && !!r.delivered_at ||
      b.status === "sent" && !!r.sent_at)
  );
  return {
    rows: filtered,
    summary: {
      total: filtered.length,
      sent: filtered.filter((r) => r.sent_at).length,
      delivered: filtered.filter((r) => r.delivered_at).length,
      opened: filtered.filter((r) => (r.opens_count || 0) > 0).length,
      clicked: filtered.filter((r) => (r.clicks_count || 0) > 0).length,
      read: filtered.filter((r) => r.is_read).length,
      failed: filtered.filter((r) => r.bounced_at).length,
      tracked_emails:
        filtered.filter((r) => r.channel !== "notification").length,
      opened_emails:
        filtered.filter((r) =>
          r.channel !== "notification" && (r.opens_count || 0) > 0
        ).length,
      clicked_emails:
        filtered.filter((r) =>
          r.channel !== "notification" && (r.clicks_count || 0) > 0
        ).length,
    },
    campaigns: [...new Set(rows.map((r) => r.campaign))],
    health: { receipts_configured: true, system: [], campaigns: [] },
  };
}
