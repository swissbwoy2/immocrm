// Source unique de vérité pour les dates du mandat client
// Aligne Dashboard et "Mon contrat" sur la même base (mandat_date_signature).

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
  /** Jours écoulés depuis la dernière date d'effet (modulo renouvellement auto), borné [0, 90]. */
  daysSinceSignature: number;
  /** Jours restants jusqu'à la prochaine échéance (0 si dépassé). */
  daysRemaining: number;
  /** True si la fin du mandat initial est dépassée et qu'on projette un cycle suivant. */
  isAutoRenewed: boolean;
  /** Nombre de renouvellements automatiques projetés depuis la signature. */
  renewalCount: number;
}

export function getMandatDates(client: MandatClientLike | null | undefined): MandatDates {
  if (!client) {
    return { start: null, end: null, daysSinceSignature: 0, daysRemaining: 0, isAutoRenewed: false, renewalCount: 0 };
  }

  const startRaw = client.mandat_date_signature || client.date_ajout || client.created_at;
  if (!startRaw) {
    return { start: null, end: null, daysSinceSignature: 0, daysRemaining: 0, isAutoRenewed: false, renewalCount: 0 };
  }

  const start = new Date(startRaw);
  const pauseDays = client.mandate_pause_days ?? 0;

  // Fin du premier cycle
  const baseEnd = new Date(start);
  baseEnd.setDate(baseEnd.getDate() + MANDAT_DURATION_DAYS + pauseDays);

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Pas de renouvellement auto si remboursement en cours / traité, demande d'annulation reçue,
  // ou client inactif/relogé/stoppé/suspendu
  const blockRenewal =
    client.refund_status === 'pending' ||
    client.refund_status === 'processed' ||
    !!client.cancellation_requested_at ||
    client.statut === 'inactif' ||
    client.statut === 'reloge' ||
    client.statut === 'stoppe' ||
    client.statut === 'suspendu';

  // Une échéance officielle (renouvellement manuel persisté) prime si elle est postérieure
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
      if (renewalCount > 50) break; // garde-fou
    }
  }

  // Date d'effet du cycle courant
  const currentCycleStart = new Date(end);
  currentCycleStart.setDate(currentCycleStart.getDate() - MANDAT_DURATION_DAYS);

  const rawDaysSince = Math.floor((now.getTime() - currentCycleStart.getTime()) / MS_PER_DAY);
  const daysSinceSignature = Math.max(0, Math.min(MANDAT_DURATION_DAYS, rawDaysSince));
  const daysRemaining = Math.max(0, MANDAT_DURATION_DAYS - daysSinceSignature);

  return {
    start,
    end,
    daysSinceSignature,
    daysRemaining,
    isAutoRenewed: renewalCount > 0,
    renewalCount,
  };
}
