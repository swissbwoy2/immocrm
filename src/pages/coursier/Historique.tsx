import { useMemo, useState } from 'react';
import { History, Wallet, Clock, TrendingUp, Timer, ChevronDown } from 'lucide-react';
import { useCoursierTime, formatDuration } from '@/hooks/useCoursierTime';
import { CoursierClockCard } from '@/components/coursier/CoursierClockCard';
import { cleMois, formatChf, libelleMois } from '@/components/coursier/coursierModel';
import { formatZurichDay, formatZurichTime } from '@/lib/dateZurich';
import { DASH_CARD, DashEmptyState, DashPage, DashPageHeader, DashSection } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';

export default function CoursierHistorique() {
  const time = useCoursierTime();
  const { closedEntries, loading, tarifHoraire, minutesThisMonth, minutesTotal, earningsThisMonth, earningsTotal } = time;
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  /** Sessions de pointage regroupées par mois (le plus récent d'abord). */
  const mois = useMemo(() => {
    const map = new Map<string, { cle: string; minutes: number; entries: typeof closedEntries }>();
    for (const e of closedEntries) {
      const cle = cleMois(e.started_at);
      const cur = map.get(cle) ?? { cle, minutes: 0, entries: [] };
      cur.minutes += e.duration_minutes || 0;
      cur.entries.push(e);
      map.set(cle, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.cle.localeCompare(a.cle));
  }, [closedEntries]);

  if (loading) {
    return (
      <DashPage>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-lg bg-muted" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted" />)}
        </div>
      </DashPage>
    );
  }

  const kpis = [
    { icon: Clock, label: 'Temps total', value: formatDuration(minutesTotal) },
    { icon: TrendingUp, label: 'Gains totaux', value: formatChf(earningsTotal, 2) },
  ];
  const moisCourant = libelleMois(cleMois(new Date().toISOString()));

  return (
    <DashPage className="space-y-6">
      <DashPageHeader
        title="Historique & gains"
        subtitle={`Temps de travail pointé, payé ${formatChf(tarifHoraire)} par heure`}
      />

      {/* Total du mois, mis en avant */}
      <section className={cn(DASH_CARD, 'grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6')} aria-label="Gains du mois">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" /> Gains du mois · <span className="capitalize">{moisCourant}</span>
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground md:text-5xl">{formatChf(earningsThisMonth, 2)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" /> {formatDuration(minutesThisMonth)} pointées ce mois
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          {kpis.map((k) => (
            <div key={k.label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground"><k.icon className="h-4 w-4 shrink-0" />{k.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{k.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <CoursierClockCard time={time} />

      <DashSection title="Gains par mois">
        {mois.length === 0 ? (
          <DashEmptyState icon={History} title="Aucune session de travail enregistrée" description="Pointez votre arrivée au début du service : vos sessions et vos gains apparaîtront ici." />
        ) : (
          <div className="space-y-3">
            {mois.map((m, idx) => {
              const ouvert = ouverts[m.cle] ?? idx === 0;
              const montantMois = (m.minutes / 60) * tarifHoraire;
              return (
                <section key={m.cle} className={cn(DASH_CARD, 'overflow-hidden')}>
                  <button
                    type="button"
                    onClick={() => setOuverts((o) => ({ ...o, [m.cle]: !ouvert }))}
                    aria-expanded={ouvert}
                    className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left md:p-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold capitalize text-foreground">{libelleMois(m.cle)}</span>
                      <span className="block text-sm text-muted-foreground">
                        {m.entries.length} session{m.entries.length > 1 ? 's' : ''} · {formatDuration(m.minutes)}
                      </span>
                    </span>
                    <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">{formatChf(montantMois, 2)}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', ouvert && 'rotate-180')} />
                  </button>
                  {ouvert && (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                      {m.entries.map((entry) => {
                        const minutes = entry.duration_minutes || 0;
                        const montant = (minutes / 60) * tarifHoraire;
                        return (
                          <li key={entry.id} className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 md:px-5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {formatZurichDay(entry.started_at)}
                              </p>
                              <p className="text-sm tabular-nums text-muted-foreground">
                                {formatZurichTime(entry.started_at)}
                                {entry.ended_at && ` → ${formatZurichTime(entry.ended_at)}`}
                                {' · '}{formatDuration(minutes)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatChf(montant, 2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </DashSection>
    </DashPage>
  );
}
