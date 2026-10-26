// Dates en heure suisse, sans dépendance (partagé par la lecture des e-mails, le copilote et les outils client).

/** « 2026-10-30T18:00 » heure suisse → instant (hiver +01:00, été +02:00). */
export function zurichToUtc(local: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const guess = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  for (const offset of [1, 2]) {
    const d = new Date(guess.getTime() - offset * 3600_000);
    const z = new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    if (z.replace(/\D/g, '') === `${m[4]}${m[5]}`) return d;
  }
  return null;
}
