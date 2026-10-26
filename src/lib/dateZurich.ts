import { fromZonedTime } from 'date-fns-tz';

/**
 * Dates et heures de visite — toujours en heure suisse (Europe/Zurich),
 * quel que soit le fuseau de l'appareil.
 *
 * Règles :
 * - Une colonne `timestamptz` (ex. `visites.date_visite`) est un instant : on l'affiche
 *   en fr-CH avec `timeZone: 'Europe/Zurich'`.
 * - Une colonne `date` (ex. `immeubles.date_visite_initiale`) est un jour
 *   civil "AAAA-MM-JJ" : elle n'est JAMAIS convertie en heure (sinon 00:00 / 01:00 / 02:00).
 * - Un champ `datetime-local` ("AAAA-MM-JJTHH:mm") est saisi en heure suisse et doit être
 *   converti en ISO UTC avant l'enregistrement (sinon Postgres le lit comme de l'UTC).
 */

export const ZURICH_TZ = 'Europe/Zurich';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Date-heure sans fuseau (valeur de `datetime-local`, ou "AAAA-MM-JJ HH:mm[:ss]"). */
const NAIVE_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Vrai si la valeur est un jour civil seul ("AAAA-MM-JJ"), sans heure. */
export function isDateOnly(value?: string | null): boolean {
  return typeof value === 'string' && DATE_ONLY_RE.test(value.trim());
}

/** Vrai si la valeur contient une date-heure sans fuseau (pas de Z ni ±HH:mm). */
export function isNaiveDateTime(value?: string | null): boolean {
  return typeof value === 'string' && NAIVE_DATETIME_RE.test(value.trim());
}

/**
 * Convertit une valeur en Date :
 * - jour seul → midi heure suisse (évite tout glissement de jour) ;
 * - date-heure sans fuseau → interprétée en heure suisse ;
 * - ISO avec fuseau → tel quel.
 */
export function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const v = value.trim();
  let d: Date;
  if (DATE_ONLY_RE.test(v)) d = fromZonedTime(`${v}T12:00:00`, ZURICH_TZ);
  else if (NAIVE_DATETIME_RE.test(v)) d = fromZonedTime(v.replace(' ', 'T'), ZURICH_TZ);
  else d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ */
/* Saisie (formulaires)                                                 */
/* ------------------------------------------------------------------ */

function parts(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZURICH_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value || '';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

/** ISO (UTC) → "AAAA-MM-JJTHH:mm" en heure suisse, pour un champ `datetime-local`. */
export function isoToZurichInput(iso?: string | null): string {
  if (!iso) return '';
  if (isDateOnly(iso)) return '';
  const d = toDate(iso);
  if (!d) return '';
  const x = parts(d);
  return `${x.y}-${x.m}-${x.d}T${x.h}:${x.min}`;
}

/** ISO → "AAAA-MM-JJ" (jour suisse), pour un champ `date`. Un jour seul est renvoyé tel quel. */
export function isoToZurichDateInput(iso?: string | null): string {
  if (!iso) return '';
  if (isDateOnly(iso)) return iso.trim();
  const d = toDate(iso);
  if (!d) return '';
  const x = parts(d);
  return `${x.y}-${x.m}-${x.d}`;
}

/** ISO → "HH:mm" (heure suisse), pour un champ `time`. Vide pour un jour seul. */
export function isoToZurichTimeInput(iso?: string | null): string {
  if (!iso || isDateOnly(iso)) return '';
  const d = toDate(iso);
  if (!d) return '';
  const x = parts(d);
  return `${x.h}:${x.min}`;
}

/**
 * Valeur `datetime-local` ("AAAA-MM-JJTHH:mm", heure suisse) → ISO UTC.
 * Une valeur déjà ISO avec fuseau est renvoyée normalisée. Sans heure → null
 * (on ne fabrique jamais une visite à minuit).
 */
export function zurichInputToIso(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || DATE_ONLY_RE.test(v)) return null;
  const d = toDate(v);
  return d ? d.toISOString() : null;
}

/** Jour "AAAA-MM-JJ" + heure "HH:mm" (heure suisse) → ISO UTC. Heure vide → null. */
export function zurichDateTimeToIso(date?: string | null, time?: string | null): string | null {
  if (!date || !time) return null;
  const day = date.trim().slice(0, 10);
  const t = time.trim().slice(0, 5);
  if (!DATE_ONLY_RE.test(day) || !/^\d{2}:\d{2}$/.test(t)) return null;
  return zurichInputToIso(`${day}T${t}`);
}

/** Valeur `min` d'un champ `datetime-local` = maintenant, en heure suisse. */
export function zurichNowInput(): string {
  return isoToZurichInput(new Date().toISOString());
}

/* ------------------------------------------------------------------ */
/* Affichage                                                            */
/* ------------------------------------------------------------------ */

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-CH', { timeZone: ZURICH_TZ, ...opts }).format(d);
}

/** "Lundi 26 octobre 2026" (jour seul : pas de conversion d'heure). */
export function formatZurichDay(value?: string | Date | null, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = toDate(value as any);
  if (!d) return '';
  return cap(fmt(d, {
    weekday: opts.weekday === false ? undefined : 'long',
    day: 'numeric', month: 'long',
    year: opts.year === false ? undefined : 'numeric',
  }));
}

/** "26.10.2026" */
export function formatZurichShortDate(value?: string | Date | null): string {
  const d = toDate(value as any);
  return d ? fmt(d, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

/** "14:30" — vide pour un jour seul (colonne DATE). */
export function formatZurichTime(value?: string | Date | null): string {
  if (typeof value === 'string' && isDateOnly(value)) return '';
  const d = toDate(value as any);
  return d ? fmt(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '';
}

/**
 * "Lundi 26 octobre 2026 à 14:30" ; pour un jour seul : "Lundi 26 octobre 2026".
 * `short` : "lun. 26 oct. à 14:30".
 */
export function formatZurichDateTime(value?: string | Date | null, opts: { short?: boolean; year?: boolean; weekday?: boolean } = {}): string {
  const d = toDate(value as any);
  if (!d) return '';
  const day = opts.short
    ? fmt(d, { weekday: opts.weekday === false ? undefined : 'short', day: 'numeric', month: 'short', year: opts.year ? 'numeric' : undefined })
    : formatZurichDay(d, { weekday: opts.weekday, year: opts.year });
  if (typeof value === 'string' && isDateOnly(value)) return cap(day);
  return `${cap(day)} à ${formatZurichTime(d)}`;
}

/** Plage horaire "14:30 – 15:00" (fin optionnelle). */
export function formatZurichTimeRange(start?: string | null, end?: string | null): string {
  const s = formatZurichTime(start);
  if (!s) return '';
  const e = formatZurichTime(end);
  return e ? `${s} – ${e}` : s;
}

/** Clé de jour "AAAA-MM-JJ" en heure suisse (regroupement par jour, calendrier). */
export function zurichDayKey(value?: string | Date | null): string {
  if (typeof value === 'string' && isDateOnly(value)) return value.trim();
  const d = toDate(value as any);
  if (!d) return '';
  const x = parts(d);
  return `${x.y}-${x.m}-${x.d}`;
}
