import { useMemo, useState } from 'react';
import { History, Wallet, Clock, TrendingUp, Timer, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCoursierTime, formatDuration } from '@/hooks/useCoursierTime';
import { CoursierClockCard } from '@/components/coursier/CoursierClockCard';
import { cleMois, libelleMois } from '@/components/coursier/coursierModel';
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
    { icon: Timer, label: 'Temps ce mois', value: formatDuration(minutesThisMonth) },
    { icon: Wallet, label: 'Gains ce mois', value: `${earningsThisMonth.toFixed(0)} CHF` },
    { icon: Clock, label: 'Temps total', value: formatDuration(minutesTotal) },
    { icon: TrendingUp, label: 'Gains totaux', value: `${earningsTotal.toFixed(0)} CHF` },
  ];

  return (
    <DashPage className="space-y-6">
      <DashPageHeader
        title="Historique & Gains"
        subtitle={`Temps de travail pointé et gains (${tarifHoraire} CHF/heure) · ${earningsThisMonth.toFixed(0)} CHF ce mois`}
      />

      <CoursierClockCard time={time} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn(DASH_CARD, 'flex min-h-[96px] flex-col justify-between p-3 sm:p-4')}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <k.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="mt-2 block">
              <span className="block truncate text-lg font-semibold text-foreground">{k.value}</span>
              <span className="block truncate text-xs text-muted-foreground">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      <DashSection title="Gains par mois">
        {mois.length === 0 ? (
          <DashEmptyState icon={History} title="Aucune session de travail enregistrée pour le moment" />
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
                      <span className="block text-xs text-muted-foreground">
                        {m.entries.length} session{m.entries.length > 1 ? 's' : ''} · {formatDuration(m.minutes)}
                      </span>
                    </span>
                    <span className="shrink-0 text-base font-semibold text-emerald-700 dark:text-emerald-400">{montantMois.toFixed(2)} CHF</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', ouvert && 'rotate-180')} />
                  </button>
                  {ouvert && (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                      {m.entries.map((entry) => {
                        const minutes = entry.duration_minutes || 0;
                        const montant = (minutes / 60) * tarifHoraire;
                        return (
                          <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium capitalize text-foreground">
                                {format(new Date(entry.started_at), 'EEEE d MMM yyyy', { locale: fr })}
                              </p>
                              <p className="text-xs tabular-nums text-muted-foreground">
                                {format(new Date(entry.started_at), 'HH:mm')}
                                {entry.ended_at && ` → ${format(new Date(entry.ended_at), 'HH:mm')}`}
                                {' · '}{formatDuration(minutes)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{montant.toFixed(2)} CHF</span>
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
