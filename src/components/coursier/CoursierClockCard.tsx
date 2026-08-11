import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Square, Timer } from 'lucide-react';
import { formatChrono, formatDuration, useCoursierTime } from '@/hooks/useCoursierTime';

interface Props {
  time: ReturnType<typeof useCoursierTime>;
}

/** Carte de pointage global (arrivée / départ) avec chrono en cours. */
export function CoursierClockCard({ time }: Props) {
  const { active, elapsedSeconds, clockIn, clockOut, busy, tarifHoraire, minutesThisMonth, earningsThisMonth } = time;

  return (
    <Card className={active ? 'border-green-500/40 bg-green-500/5' : 'border-border/50'}>
      <CardContent className="pt-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-3 rounded-xl ${active ? 'bg-green-500/15' : 'bg-primary/10'}`}>
              <Timer className={`h-5 w-5 ${active ? 'text-green-600' : 'text-primary'}`} />
            </div>
            <div className="min-w-0">
              {active ? (
                <>
                  <p className="text-2xl font-bold tabular-nums text-green-600">{formatChrono(elapsedSeconds)}</p>
                  <p className="text-xs text-muted-foreground">Session en cours · {tarifHoraire} CHF/h</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">Pointage</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(minutesThisMonth)} ce mois · {earningsThisMonth.toFixed(0)} CHF · {tarifHoraire} CHF/h
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {active && <Badge className="bg-green-500/15 text-green-600 border-green-500/30">En service</Badge>}
            {active ? (
              <Button onClick={clockOut} disabled={busy} variant="destructive">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                Pointer mon départ
              </Button>
            ) : (
              <Button onClick={clockIn} disabled={busy} className="bg-green-600 hover:bg-green-700">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Pointer mon arrivée
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
