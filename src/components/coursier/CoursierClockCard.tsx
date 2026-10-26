import { Button } from '@/components/ui/button';
import { Loader2, Play, Square, Timer } from 'lucide-react';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import { formatChrono, formatDuration, useCoursierTime } from '@/hooks/useCoursierTime';
import { formatChf } from './coursierModel';

interface Props {
  time: ReturnType<typeof useCoursierTime>;
}

/** Carte de pointage global (arrivée / départ) avec chrono en cours. Bouton pleine largeur sur mobile. */
export function CoursierClockCard({ time }: Props) {
  const { active, elapsedSeconds, clockIn, clockOut, busy, tarifHoraire, minutesThisMonth, earningsThisMonth } = time;

  return (
    <section className={cn(DASH_CARD, 'p-4 md:p-5', active && 'ring-1 ring-emerald-500/40')} aria-label="Pointage">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary',
          )}>
            <Timer className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {active ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatChrono(elapsedSeconds)}</p>
                  <DashBadge tone="success">En service</DashBadge>
                </div>
                <p className="text-sm text-muted-foreground">Session en cours · {formatChf(tarifHoraire)}/h</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-foreground">Pointage</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(minutesThisMonth)} ce mois · {formatChf(earningsThisMonth, 2)} · {formatChf(tarifHoraire)}/h
                </p>
              </>
            )}
          </div>
        </div>

        {active ? (
          <Button onClick={clockOut} disabled={busy} variant="destructive" className="h-12 w-full sm:h-11 sm:w-auto">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
            Pointer mon départ
          </Button>
        ) : (
          <Button onClick={clockIn} disabled={busy} className="h-12 w-full sm:h-11 sm:w-auto">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Pointer mon arrivée
          </Button>
        )}
      </div>
      <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
        Paie au <strong>temps travaillé</strong> : {formatChf(tarifHoraire)} par heure (pas par visite). Pointez votre <strong>arrivée</strong> au début du service, puis votre <strong>départ</strong> à la fin.
      </p>
    </section>
  );
}
