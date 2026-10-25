/**
 * Date / time formatting for e-mails, notifications and messages.
 *
 * Edge functions run in UTC: every output is rendered in Europe/Zurich with the
 * fr-CH locale. Safe by design:
 *  - only ISO-like strings (YYYY-MM-DD…), Date objects or epoch numbers are
 *    parsed — any other text ("le jour 90", "30 jours après…") is returned
 *    unchanged instead of being guessed by `new Date()` (V8 reads "le jour 90"
 *    as 1 January 1990);
 *  - a date-only value ("2026-12-14", DATE column) is treated as a calendar
 *    day: no time is ever displayed and no timezone shift can move the day.
 *
 * Self-contained (no imports) so it can be used from any function.
 */

export const EMAIL_TZ = "Europe/Zurich";
export const EMAIL_LOCALE = "fr-CH";

type DateInput = string | number | Date | null | undefined;

const ISO_RE = /^\d{4}-\d{2}-\d{2}/;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MIDNIGHT_UTC_RE =
  /^(\d{4}-\d{2}-\d{2})[T ]00:00(?::00(?:\.0+)?)?(?:Z|[+-]00(?::?00)?)?$/;

/**
 * True when the value is a calendar date without a meaningful time:
 * "2026-12-14" (DATE column) or a day stored at exactly midnight UTC in a
 * timestamptz column ("2026-12-14T00:00:00+00:00" — date picker saved as-is).
 * Such values never display a time (no fake 00:00 / 01:00 / 02:00).
 */
export function isDateOnly(value: DateInput): boolean {
  if (typeof value !== "string") return false;
  const s = value.trim();
  return DATE_ONLY_RE.test(s) || MIDNIGHT_UTC_RE.test(s);
}

function dayPart(value: DateInput): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (DATE_ONLY_RE.test(s)) return s;
  const m = s.match(MIDNIGHT_UTC_RE);
  return m ? m[1] : null;
}

/**
 * Parse a value into a Date, or null when it is not a real date.
 * Date-only strings become noon UTC of that day (never shifts the day in Zurich).
 */
export function parseDateSafe(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = dayPart(value) ?? String(value).trim();
  if (!ISO_RE.test(s)) return null;
  const m = s.match(DATE_ONLY_RE);
  const d = m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0))
    : new Date(
      s.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"),
    );
  return isNaN(d.getTime()) ? null : d;
}

function fallback(value: DateInput, fb?: string): string {
  if (fb !== undefined) return fb;
  if (typeof value === "string") return value;
  return "";
}

/** « 14 décembre 2026 » (or « lundi 14 décembre 2026 » with weekday). */
export function formatDateFR(
  value: DateInput,
  opts: { weekday?: boolean; fallback?: string; short?: boolean } = {},
): string {
  const d = parseDateSafe(value);
  if (!d) return fallback(value, opts.fallback);
  if (opts.short) {
    return d.toLocaleDateString(EMAIL_LOCALE, {
      timeZone: EMAIL_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const parts = new Intl.DateTimeFormat(EMAIL_LOCALE, {
    timeZone: EMAIL_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const day = get("day") === "1" ? "1er" : get("day");
  const core = `${day} ${get("month")} ${get("year")}`;
  return opts.weekday ? `${get("weekday")} ${core}` : core;
}

/** « 14:30 » in Zurich time. Empty for date-only values. */
export function formatTimeFR(value: DateInput): string {
  if (isDateOnly(value)) return "";
  // Bare time from a TIME / text column ("14:30", "14:30:00")
  if (typeof value === "string") {
    const t = value.trim().match(/^(\d{1,2})[:hH](\d{2})(?::\d{2})?$/);
    if (t) return `${t[1].padStart(2, "0")}:${t[2]}`;
  }
  const d = parseDateSafe(value);
  if (!d) return "";
  return d.toLocaleTimeString(EMAIL_LOCALE, {
    timeZone: EMAIL_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * « lundi 14 décembre 2026 à 14:30 » in Zurich time.
 * A date-only value gives just the date (no fake 00:00 / 02:00).
 * `time` (separate TIME column, "14:30") is appended to a date-only value.
 */
export function formatDateTimeFR(
  value: DateInput,
  opts: { weekday?: boolean; time?: string | null; fallback?: string } = {},
): string {
  const d = parseDateSafe(value);
  if (!d) return fallback(value, opts.fallback);
  const weekday = opts.weekday ?? true;
  const datePart = formatDateFR(d, { weekday });
  if (isDateOnly(value)) {
    const t = opts.time ? formatTimeFR(opts.time) : "";
    return t ? `${datePart} à ${t}` : formatDateFR(value, { weekday });
  }
  return `${datePart} à ${formatTimeFR(d)}`;
}

/** Add days to a date (date-only aware); returns "YYYY-MM-DD" or null. */
export function addDaysISO(value: DateInput, days: number): string | null {
  const d = parseDateSafe(value);
  if (!d) return null;
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return toZurichISODate(r);
}

/** Calendar day in Zurich, "YYYY-MM-DD". */
export function toZurichISODate(value: DateInput): string | null {
  const day = dayPart(value);
  if (day) return day;
  const d = parseDateSafe(value);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EMAIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts; // en-CA -> YYYY-MM-DD
}

/**
 * Replace raw ISO dates ("2026-12-14" or full timestamps) inside a free text by
 * « 14 décembre 2026 » (used for in-app / WhatsApp messages).
 */
export function humanizeISODates(text: string): string {
  return String(text ?? "").replace(
    /\b(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?\b/g,
    (match, day, time) => {
      if (!time) return formatDateFR(day);
      return formatDateTimeFR(match, { weekday: false });
    },
  );
}

/** Swiss currency: « CHF 2'400 » (« CHF 2'400.50 » when there are cents). */
export function formatCHF(value: unknown, opts: { suffix?: string } = {}): string {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (value === null || value === undefined || value === "" || !isFinite(n)) return "";
  const hasCents = Math.round(n * 100) % 100 !== 0;
  const [int, dec] = Math.abs(n).toFixed(hasCents ? 2 : 0).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `CHF ${n < 0 ? "-" : ""}${grouped}${dec ? "." + dec : ""}${opts.suffix ?? ""}`;
}

/** « Bonjour Marie, » or « Bonjour, » when the first name is empty. */
export function greetingFR(prenom?: string | null): string {
  const p = String(prenom ?? "").trim();
  return p ? `Bonjour ${p},` : "Bonjour,";
}
