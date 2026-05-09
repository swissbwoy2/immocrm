// Génération des créneaux de rendez-vous AU BUREAU (Logisorama, Crissier).
// Lundi → Samedi (dimanche fermé), 08h30→12h00 et 13h30→16h30, par tranches de 30 min.
// Toute manipulation est en heure locale (Europe/Zurich).

export type Slot = {
  start: Date;
  end: Date;
  key: string; // ISO string of slot_start (used as unique key + for query matching)
  label: string; // "08h30"
};

export const SLOT_DURATION_MIN = 30;

// Plage matin
export const MORNING_START_HOUR = 8;
export const MORNING_START_MIN = 30;
export const MORNING_END_HOUR = 12;
export const MORNING_END_MIN = 0;

// Plage après-midi
export const AFTERNOON_START_HOUR = 13;
export const AFTERNOON_START_MIN = 30;
export const AFTERNOON_END_HOUR = 16;
export const AFTERNOON_END_MIN = 30;

export type DayPart = 'matin' | 'apres-midi';

export function getDayPart(slot: Slot): DayPart {
  const h = slot.start.getHours();
  return h < 12 ? 'matin' : 'apres-midi';
}

function buildRange(
  date: Date,
  startH: number,
  startM: number,
  endH: number,
  endM: number
): Slot[] {
  const slots: Slot[] = [];
  const start = new Date(date);
  start.setHours(startH, startM, 0, 0);
  const end = new Date(date);
  end.setHours(endH, endM, 0, 0);

  let cursor = new Date(start);
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

export function generateSlotsForDay(date: Date): Slot[] {
  return [
    ...buildRange(date, MORNING_START_HOUR, MORNING_START_MIN, MORNING_END_HOUR, MORNING_END_MIN),
    ...buildRange(date, AFTERNOON_START_HOUR, AFTERNOON_START_MIN, AFTERNOON_END_HOUR, AFTERNOON_END_MIN),
  ];
}

// Available days: tomorrow → +21 jours calendaires, exclut les dimanches.
export function getAvailableDays(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue; // dimanche fermé
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

// Adresse du bureau Logisorama (utilisée dans UI + emails + ICS)
export const OFFICE_ADDRESS = "Chemin de l'Esparsette 5, 1023 Crissier";
export const OFFICE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent("Chemin de l'Esparsette 5, 1023 Crissier");
