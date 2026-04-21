// Génération des créneaux téléphoniques 7j/7, de 7h30 à 22h00, par tranches de 15 min.
// Toute manipulation est en heure locale (Europe/Zurich = heure du navigateur du prospect suisse).

export type Slot = {
  start: Date;
  end: Date;
  key: string; // ISO string of slot_start (used as unique key + for query matching)
  label: string; // "07h30"
};

export const SLOT_DURATION_MIN = 15;
export const SLOT_START_HOUR = 7;
export const SLOT_START_MIN = 30;
export const SLOT_END_HOUR = 22;
export const SLOT_END_MIN = 0;

export type DayPart = 'matin' | 'apres-midi' | 'soir';

export function getDayPart(slot: Slot): DayPart {
  const h = slot.start.getHours();
  if (h < 12) return 'matin';
  if (h < 18) return 'apres-midi';
  return 'soir';
}

export function generateSlotsForDay(date: Date): Slot[] {
  const slots: Slot[] = [];
  const day = new Date(date);
  day.setHours(SLOT_START_HOUR, SLOT_START_MIN, 0, 0);

  const end = new Date(date);
  end.setHours(SLOT_END_HOUR, SLOT_END_MIN, 0, 0);

  let cursor = new Date(day);
  while (cursor < end) {
    const slotEnd = new Date(cursor.getTime() + SLOT_DURATION_MIN * 60_000);
    if (slotEnd > end) break;
    slots.push({
      start: new Date(cursor),
      end: slotEnd,
      key: cursor.toISOString(),
      label: `${String(cursor.getHours()).padStart(2, '0')}h${String(cursor.getMinutes()).padStart(2, '0')}`,
    });
    cursor = new Date(slotEnd);
  }
  return slots;
}

// Available days: tomorrow → today + 14 (inclusive), 7d/7
export function getAvailableDays(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('fr-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
