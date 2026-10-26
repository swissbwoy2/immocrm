import { useState, useMemo, useEffect } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3, List, Clock, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventTypeCalendarColors } from './types';
import { formatSwissDate } from '@/lib/dateUtils';
import { useNormalizedEvents, NormalizedEvent } from './event-manager/useEventManagerData';
import { MonthView } from './event-manager/MonthView';
import { WeekView } from './event-manager/WeekView';
import { DayView } from './event-manager/DayView';
import { ListView } from './event-manager/ListView';
import { EventFilters } from './event-manager/EventFilters';

type ViewMode = 'month' | 'week' | 'day' | 'list';

interface EventManagerCalendarProps {
  events: CalendarEvent[];
  visites?: any[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  /** Called when an event/visite badge is clicked. Compatible with PremiumCalendarView signature. */
  onEventClick?: (event: any, type: 'event' | 'visite') => void;
  defaultView?: ViewMode;
  /** Optional list of event_type values available in the filter (defaults to all standard types) */
  availableTypes?: string[];
  /** Hide the filter bar (e.g., simple client view) */
  showFilters?: boolean;
  /** Optional title slot at top-right (e.g., a "+ New event" button) */
  headerActions?: React.ReactNode;
  /** Called whenever the displayed period changes (used to fetch only the relevant date window) */
  onVisibleDateChange?: (date: Date) => void;
}

const DEFAULT_TYPES = [
  'visite',
  'visite_proposee',
  'visite_deleguee',
  'signature',
  'etat_lieux',
  'rdv_telephonique',
  'rappel',
  'rendez_vous',
  'tache',
  'reunion',
  'autre',
];

const VIEW_LABELS: Record<ViewMode, string> = {
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  list: 'Liste',
};

const VIEW_ICONS: Record<ViewMode, React.ComponentType<{ className?: string }>> = {
  month: Grid3x3,
  week: LayoutGrid,
  day: Clock,
  list: List,
};

export function EventManagerCalendar({
  events,
  visites = [],
  selectedDate,
  onDateSelect,
  onEventClick,
  defaultView = 'month',
  availableTypes = DEFAULT_TYPES,
  showFilters = true,
  headerActions,
  onVisibleDateChange,
}: EventManagerCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate ?? new Date());
  const [view, setView] = useState<ViewMode>(defaultView);
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    onVisibleDateChange?.(currentDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);


  const normalizedAll = useNormalizedEvents(events, visites);

  const filteredEvents = useMemo(() => {
    return normalizedAll.filter((ev) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(ev.type)) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${ev.title} ${ev.description || ''} ${ev.typeLabel}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [normalizedAll, search, selectedTypes]);

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      onDateSelect(new Date());
      return;
    }
    const factor = direction === 'next' ? 1 : -1;
    setCurrentDate((prev) => {
      if (view === 'month') return factor === 1 ? addMonths(prev, 1) : subMonths(prev, 1);
      if (view === 'week') return factor === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1);
      if (view === 'day') return factor === 1 ? addDays(prev, 1) : subDays(prev, 1);
      return factor === 1 ? addMonths(prev, 1) : subMonths(prev, 1);
    });
  };

  const handleEventClick = (ev: NormalizedEvent) => {
    if (!onEventClick) {
      onDateSelect(ev.date);
      return;
    }
    onEventClick(ev.isVisite ? { ...ev.raw, groupedClients: ev.groupedClients } : ev.raw, ev.isVisite ? 'visite' : 'event');
  };

  const handleDateSelect = (date: Date) => {
    onDateSelect(date);
    if (view === 'day') setCurrentDate(date);
  };

  // Period title
  const periodLabel = useMemo(() => {
    if (view === 'month') return formatSwissDate(currentDate, 'MMMM yyyy');
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${formatSwissDate(start, 'd MMM')} – ${formatSwissDate(end, 'd MMM yyyy')}`;
    }
    if (view === 'day') return formatSwissDate(currentDate, 'EEEE d MMMM yyyy');
    return 'Tous les événements';
  }, [view, currentDate]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/70 bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarIcon className="h-[18px] w-[18px]" />
            </span>
            <h2 className="truncate text-base font-semibold capitalize text-foreground sm:text-lg">{periodLabel}</h2>
          </div>
          {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Navigation (hidden in list view) */}
          {view !== 'list' && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => handleNavigate('prev')}
                aria-label="Précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full px-4"
                onClick={() => handleNavigate('today')}
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => handleNavigate('next')}
                aria-label="Suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* View selector (pastilles) */}
          <div
            className="flex max-w-full gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Affichage du calendrier"
          >
            {(['month', 'week', 'day', 'list'] as ViewMode[]).map((v) => {
              const Icon = VIEW_ICONS[v];
              const active = v === view;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(v)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-foreground hover:border-foreground/60',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {VIEW_LABELS[v]}
                </button>
              );
            })}
          </div>
        </div>

        {showFilters && (
          <EventFilters
            search={search}
            onSearchChange={setSearch}
            selectedTypes={selectedTypes}
            onTypesChange={setSelectedTypes}
            availableTypes={availableTypes.filter((t) => DEFAULT_TYPES.includes(t))}
          />
        )}
      </div>

      {/* Body */}
      <div className="p-2 sm:p-3 md:p-4">
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'list' && (
          <ListView events={filteredEvents} onEventClick={handleEventClick} />
        )}
      </div>

      {/* Legend (only on month view, like the original) */}
      {view === 'month' && (
        <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-border/70 px-4 py-3">
          {[
            { type: 'visite_proposee', label: 'Créneau proposé' },
            { type: 'visite', label: 'Visite confirmée' },
            { type: 'visite_deleguee', label: 'Déléguée' },
            { type: 'visite_auto', label: '🤖 Offre automatique' },
            { type: 'signature', label: 'Signature' },
            { type: 'etat_lieux', label: 'État des lieux' },
            { type: 'rdv_telephonique', label: 'RDV tél.' },
            { type: 'rappel', label: 'Rappel' },
            { type: 'rendez_vous', label: 'RDV' },
            { type: 'tache', label: 'Tâche' },
            { type: 'reunion', label: 'Réunion' },
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', eventTypeCalendarColors[type])} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
