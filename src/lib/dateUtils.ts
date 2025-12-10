import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

const SWISS_TIMEZONE = 'Europe/Zurich';

/**
 * Converts a date to Swiss timezone (Europe/Zurich)
 */
export function toSwissTime(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  const d = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(d, SWISS_TIMEZONE);
}

/**
 * Formats a date with Swiss timezone
 */
export function formatSwissDate(date: Date | string | null | undefined, formatStr: string = 'dd MMMM yyyy'): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  return format(swissDate, formatStr, { locale: fr });
}

/**
 * Formats time only with Swiss timezone (HH:mm)
 */
export function formatSwissTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  return format(swissDate, 'HH:mm', { locale: fr });
}

/**
 * Formats date and time with Swiss timezone
 */
export function formatSwissDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  return format(swissDate, "dd MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Formats a short date (dd/MM/yyyy) with Swiss timezone
 */
export function formatSwissShortDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  return format(swissDate, 'dd/MM/yyyy', { locale: fr });
}

/**
 * Formats relative date label (Aujourd'hui, Hier, day name, or full date)
 */
export function formatSwissRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  
  if (isToday(swissDate)) {
    return "Aujourd'hui";
  }
  
  if (isYesterday(swissDate)) {
    return "Hier";
  }
  
  if (isThisWeek(swissDate)) {
    return format(swissDate, 'EEEE', { locale: fr });
  }
  
  return format(swissDate, 'd MMMM yyyy', { locale: fr });
}

/**
 * Formats message time for conversation list (HH:mm for today, Hier, or dd/MM/yyyy)
 */
export function formatSwissMessageTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  
  if (isToday(swissDate)) {
    return format(swissDate, 'HH:mm', { locale: fr });
  }
  
  if (isYesterday(swissDate)) {
    return 'Hier';
  }
  
  return format(swissDate, 'dd/MM/yyyy', { locale: fr });
}

/**
 * Gets Swiss date string for comparison (YYYY-MM-DD)
 */
export function getSwissDateString(date: Date | string | null | undefined): string {
  if (!date) return '';
  const swissDate = toSwissTime(date);
  return format(swissDate, 'yyyy-MM-dd');
}
