import { useState, useMemo } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3, List, Clock, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}: EventManagerCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate ?? new Date());
  const [view, setView] = useState<ViewMode>(defaultView);
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

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

  const ViewIcon = VIEW_ICONS[view];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg md:text-xl font-bold capitalize truncate">{periodLabel}</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Navigation (hidden in list view) */}
            {view !== 'list' && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleNavigate('prev')}
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => handleNavigate('today')}
                >
                  Aujourd'hui
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleNavigate('next')}
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* View selector */}
            <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <SelectTrigger className="h-9 w-[120px]">
                <div className="flex items-center gap-2">
                  <ViewIcon className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {(['month', 'week', 'day', 'list'] as ViewMode[]).map((v) => {
                  const Icon = VIEW_ICONS[v];
                  return (
                    <SelectItem key={v} value={v}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {VIEW_LABELS[v]}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {headerActions}
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
      <div className="p-3 md:p-4">
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
        <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-border bg-muted/20">
          {[
            { type: 'visite_proposee', label: 'Créneau proposé' },
            { type: 'visite', label: 'Visite confirmée' },
            { type: 'visite_deleguee', label: 'Déléguée' },
            { type: 'signature', label: 'Signature' },
            { type: 'etat_lieux', label: 'État des lieux' },
            { type: 'rdv_telephonique', label: 'RDV tél.' },
            { type: 'rappel', label: 'Rappel' },
            { type: 'rendez_vous', label: 'RDV' },
            { type: 'tache', label: 'Tâche' },
            { type: 'reunion', label: 'Réunion' },
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded', eventTypeCalendarColors[type])} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
