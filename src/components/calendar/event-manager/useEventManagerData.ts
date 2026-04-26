import { useMemo } from 'react';
import { CalendarEvent, eventTypeCalendarColors, eventTypeLabels } from '../types';
import { getSwissDateString } from '@/lib/dateUtils';

export interface NormalizedEvent {
  id: string;
  type: string;            // event_type or 'visite' / 'visite_proposee' / 'visite_deleguee'
  typeLabel: string;       // FR label
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  allDay: boolean;
  isVisite: boolean;
  raw: any;                // original event or visite
  groupedClients?: any[];  // for grouped visites
  colorClass: string;      // tailwind bg color
}

const visiteTypeLabels: Record<string, string> = {
  visite: 'Visite confirmée',
  visite_proposee: 'Créneau proposé',
  visite_deleguee: 'Visite déléguée',
};

/**
 * Normalize calendar_events + visites into a unified list of events
 * with consistent color, type and date semantics.
 */
export function useNormalizedEvents(
  events: CalendarEvent[],
  visites: any[] = [],
): NormalizedEvent[] {
  return useMemo(() => {
    const result: NormalizedEvent[] = [];

    // Calendar events
    events.forEach((e) => {
      if (!e.event_date) return;
      const date = new Date(e.event_date);
      const endDate = e.end_date ? new Date(e.end_date) : undefined;
      result.push({
        id: e.id,
        type: e.event_type,
        typeLabel: eventTypeLabels[e.event_type] || e.event_type,
        title: e.title || '(Sans titre)',
        description: e.description,
        date,
        endDate,
        allDay: !!e.all_day,
        isVisite: false,
        raw: e,
        colorClass: eventTypeCalendarColors[e.event_type] || 'bg-gray-500',
      });
    });

    // Visites — group by adresse + date
    const visiteGroups = new Map<string, any[]>();
    visites.forEach((v) => {
      if (!v.date_visite) return;
      const key = `${v.adresse || ''}__${v.date_visite}`;
      if (!visiteGroups.has(key)) visiteGroups.set(key, []);
      visiteGroups.get(key)!.push(v);
    });

    visiteGroups.forEach((group, key) => {
      const v = group[0];
      let visiteType = 'visite';
      if (v.est_deleguee || v.source === 'deleguee') visiteType = 'visite_deleguee';
      else if (v.statut === 'proposee') visiteType = 'visite_proposee';

      result.push({
        id: `visite-${key}`,
        type: visiteType,
        typeLabel: visiteTypeLabels[visiteType] || 'Visite',
        title: v.adresse || 'Visite',
        description: group.length > 1 ? `${group.length} client(s)` : undefined,
        date: new Date(v.date_visite),
        allDay: false,
        isVisite: true,
        raw: v,
        groupedClients: group,
        colorClass: eventTypeCalendarColors[visiteType] || 'bg-blue-500',
      });
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, visites]);
}

export function indexByDay(items: NormalizedEvent[]): Map<string, NormalizedEvent[]> {
  const map = new Map<string, NormalizedEvent[]>();
  items.forEach((item) => {
    const key = getSwissDateString(item.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return map;
}
