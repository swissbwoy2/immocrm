// Dates du mandat client : copie fidèle de src/utils/mandatDates.ts (source unique côté interface).
// Toute évolution de la règle doit être faite dans les deux fichiers.

export const MANDAT_DURATION_DAYS = 90;
export const REFUND_ELIGIBILITY_DAY = 80;

export interface MandatClientLike {
  mandat_date_signature?: string | null;
  date_ajout?: string | null;
  created_at?: string | null;
  mandate_pause_days?: number | null;
  mandate_paused_at?: string | null;
  mandate_official_end_date?: string | null;
  mandat_renewal_count?: number | null;
  refund_status?: string | null;
  statut?: string | null;
  cancellation_requested_at?: string | null;
}

export interface MandatDates {
  start: Date | null;
  end: Date | null;
  daysSinceSignature: number;
  daysRemaining: number;
  isAutoRenewed: boolean;
  renewalCount: number;
}

export function getMandatDates(client: MandatClientLike | null | undefined, now: Date = new Date()): MandatDates {
  if (!client) {
    return { start: null, end: null, daysSinceSignature: 0, daysRemaining: 0, isAutoRenewed: false, renewalCount: 0 };
  }
  const startRaw = client.mandat_date_signature || client.date_ajout || client.created_at;
  if (!startRaw) {
    return { start: null, end: null, daysSinceSignature: 0, daysRemaining: 0, isAutoRenewed: false, renewalCount: 0 };
  }

  const start = new Date(startRaw);
  const pauseDays = client.mandate_pause_days ?? 0;
  const baseEnd = new Date(start);
  baseEnd.setDate(baseEnd.getDate() + MANDAT_DURATION_DAYS + pauseDays);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const blockRenewal =
    client.refund_status === 'pending' ||
    client.refund_status === 'processed' ||
    !!client.cancellation_requested_at ||
    client.statut === 'inactif' ||
    client.statut === 'reloge' ||
    client.statut === 'stoppe' ||
    client.statut === 'suspendu';

  const officialEndRaw = client.mandate_official_end_date;
  const officialEnd = officialEndRaw ? new Date(officialEndRaw) : null;
  let end =
    officialEnd && !isNaN(officialEnd.getTime()) && officialEnd.getTime() > baseEnd.getTime()
      ? officialEnd
      : baseEnd;
  let renewalCount = 0;
  if (!blockRenewal) {
    while (now.getTime() > end.getTime()) {
      end = new Date(end);
      end.setDate(end.getDate() + MANDAT_DURATION_DAYS);
      renewalCount += 1;
      if (renewalCount > 50) break;
    }
  }

  const currentCycleStart = new Date(end);
  currentCycleStart.setDate(currentCycleStart.getDate() - MANDAT_DURATION_DAYS);
  const rawDaysSince = Math.floor((now.getTime() - currentCycleStart.getTime()) / MS_PER_DAY);
  const daysSinceSignature = Math.max(0, Math.min(MANDAT_DURATION_DAYS, rawDaysSince));
  const daysRemaining = Math.max(0, MANDAT_DURATION_DAYS - daysSinceSignature);

  return { start, end, daysSinceSignature, daysRemaining, isAutoRenewed: renewalCount > 0, renewalCount };
}
