export type TrackingRow = {
  id: string;
  channel: "email" | "newsletter" | "notification";
  recipient: string;
  subject: string;
  campaign: string;
  provider: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  last_opened_at: string | null;
  opens_count: number | null;
  clicked_at: string | null;
  last_clicked_at: string | null;
  clicks_count: number | null;
  read_at: string | null;
  is_read: boolean;
  bounced_at: string | null;
  complained_at: string | null;
  unsubscribed_at: string | null;
  tracking_enabled: boolean;
  tracking_note: string | null;
  error: string | null;
  synced_at: string | null;
};
export type TrackingEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
  url: string | null;
  provider: string;
  time_basis: "event" | "observed";
};
export function trackingStatus(r: TrackingRow): string {
  if (r.complained_at || r.status === "complained") return "Signalé comme spam";
  if (r.bounced_at || r.status === "bounced") return "Rejeté";
  if (["failed", "attention", "dlq"].includes(r.status)) {
    return "Échec / à vérifier";
  }
  if (r.unsubscribed_at || r.status === "unsubscribed") return "Désinscrit";
  if (r.status === "delayed") return "Distribution retardée";
  if ((r.clicks_count || 0) > 0) return "Cliqué";
  if (r.is_read) return "Marquée lue";
  if ((r.opens_count || 0) > 0) return "Ouvert";
  if (r.delivered_at) return "Reçu par le serveur";
  if (r.sent_at) return "Envoyé";
  if (r.status === "skipped" || r.status === "suppressed") return "Non envoyé";
  if (r.channel === "notification") return "Disponible dans l’application";
  return "En attente";
}
export function elapsed(start: string | null, end: string | null): string {
  if (!start || !end) return "Non disponible";
  const seconds = Math.floor((Date.parse(end) - Date.parse(start)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return "Non disponible";
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} h ${
      Math.floor(seconds % 3600 / 60)
    } min`;
  }
  return `${Math.floor(seconds / 86400)} j ${
    Math.floor(seconds % 86400 / 3600)
  } h`;
}
export function rate(n: number, d: number): string {
  return d > 0 ? `${Math.round(100 * n / d)} %` : "Non mesuré";
}
