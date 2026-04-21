import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarIcon, Clock, CheckCircle2, Sun, Sunset, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  generateSlotsForDay,
  getAvailableDays,
  type Slot,
  type DayPart,
  getDayPart,
} from '@/lib/phoneSlots';

interface PhoneSlotPickerProps {
  selected: Slot | null;
  onSelect: (slot: Slot | null) => void;
}

const DAY_PARTS: { key: DayPart; label: string; icon: typeof Sun; range: string }[] = [
  { key: 'matin', label: 'Matin', icon: Sun, range: '7h30 → 12h00' },
  { key: 'apres-midi', label: 'Après-midi', icon: Sunset, range: '12h00 → 18h00' },
  { key: 'soir', label: 'Soir', icon: Moon, range: '18h00 → 22h00' },
];

export function PhoneSlotPicker({ selected, onSelect }: PhoneSlotPickerProps) {
  const availableDays = useMemo(() => getAvailableDays(), []);
  const [date, setDate] = useState<Date>(availableDays[0]);
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const [activeDayPart, setActiveDayPart] = useState<DayPart>('matin');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Load taken slots (from now to +14d) and subscribe to realtime
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 15);
      const { data } = await supabase
        .from('available_phone_slots' as any)
        .select('slot_start, status')
        .gte('slot_start', start.toISOString())
        .lte('slot_start', end.toISOString());
      if (!mounted) return;
      const set = new Set<string>();
      (data || []).forEach((row: any) => {
        // Match by ISO string
        set.add(new Date(row.slot_start).toISOString());
      });
      setTakenSlots(set);
    };

    load();

    const channel = supabase
      .channel('phone-slots-availability')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_phone_appointments' },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const slots = useMemo(() => generateSlotsForDay(date), [date]);
  const filteredSlots = useMemo(
    () => slots.filter((s) => getDayPart(s) === activeDayPart),
    [slots, activeDayPart]
  );

  const isSameSlot = (a: Slot | null, b: Slot) =>
    !!a && a.start.getTime() === b.start.getTime();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Clock className="h-3.5 w-3.5" />
          Étape finale
        </div>
        <h3 className="text-lg md:text-xl font-bold text-foreground">
          Choisis un créneau d'appel téléphonique
        </h3>
        <p className="text-sm text-muted-foreground">
          15 minutes — 7j/7 entre 7h30 et 22h00
        </p>
      </div>

      {/* Date picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 justify-start text-left font-medium bg-background/80 border-border/60 hover:border-primary/50"
          >
            <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                setDate(d);
                setCalendarOpen(false);
                onSelect(null);
              }
            }}
            disabled={(d) => {
              const day = new Date(d);
              day.setHours(0, 0, 0, 0);
              const min = availableDays[0];
              const max = availableDays[availableDays.length - 1];
              return day < min || day > max;
            }}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>

      {/* Day part tabs */}
      <div className="grid grid-cols-3 gap-2">
        {DAY_PARTS.map(({ key, label, icon: Icon, range }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveDayPart(key)}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-3 rounded-xl border transition-all',
              activeDayPart === key
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border/40 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-[10px] opacity-70">{range}</span>
          </button>
        ))}
      </div>

      {/* Slots grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${date.toDateString()}-${activeDayPart}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-4 sm:grid-cols-6 gap-2"
        >
          {filteredSlots.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-6">
              Aucun créneau dans cette tranche.
            </div>
          )}
          {filteredSlots.map((slot) => {
            const taken = takenSlots.has(slot.key);
            const isSelected = isSameSlot(selected, slot);
            const isPast = slot.start.getTime() < Date.now();
            const disabled = taken || isPast;
            return (
              <motion.button
                key={slot.key}
                type="button"
                whileHover={disabled ? {} : { scale: 1.04 }}
                whileTap={disabled ? {} : { scale: 0.96 }}
                onClick={() => !disabled && onSelect(slot)}
                disabled={disabled}
                className={cn(
                  'relative h-11 rounded-lg text-sm font-semibold border transition-all',
                  isSelected &&
                    'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30',
                  !isSelected &&
                    !disabled &&
                    'bg-background/80 border-border/50 text-foreground hover:border-primary hover:bg-primary/5',
                  disabled && 'bg-muted text-muted-foreground border-border/30 opacity-50 cursor-not-allowed line-through'
                )}
              >
                {slot.label}
                {isSelected && (
                  <CheckCircle2 className="absolute -top-1.5 -right-1.5 h-4 w-4 text-primary-foreground bg-primary rounded-full" />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Selected summary */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/30"
        >
          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              Créneau sélectionné : {format(selected.start, 'EEEE d MMMM', { locale: fr })} à {selected.label}
            </p>
            <p className="text-xs text-muted-foreground">
              Notre équipe te rappellera à ce moment précis (15 min).
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
