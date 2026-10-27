import { useMemo, useState } from 'react';
import { History, Wallet, Clock, TrendingUp, Timer, ChevronDown, CheckCircle } from 'lucide-react';
import { useCoursierTime, formatDuration } from '@/hooks/useCoursierTime';
import { CoursierClockCard } from '@/components/coursier/CoursierClockCard';
import { cleMois, formatChf, libelleMois } from '@/components/coursier/coursierModel';
import { formatZurichDay, formatZurichTime } from '@/lib/dateZurich';
import { DASH_CARD, DashBadge, DashEmptyState, DashPage, DashPageHeader, DashSection } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';

export default function CoursierHistorique() {
  const time = useCoursierTime();
  const { allEntries, loading, tarifHoraire, minutesThisMonth, minutesTotal, earningsThisMonth, earningsTotal, earningsAPayer, earningsPaid, minutesAPayer } = time;
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  /** Sessions de pointage regroupées par mois (le plus récent d'abord). */
  const mois = useMemo(() => {
    const map = new Map<string, { cle: string; minutes: number; montant: number; entries: typeof allEntries }>();
    for (const e of allEntries.filter((x) => x.ended_at)) {
      const cle = cleMois(e.started_at);
      const cur = map.get(cle) ?? { cle, minutes: 0, montant: 0, entries: [] };
      if (!e.exclue) {
        cur.minutes += e.duration_minutes || 0;
        cur.montant += ((e.duration_minutes || 0) / 60) * (e.paye && e.tarif_paye != null ? Number(e.tarif_paye) : tarifHoraire);
      }
      cur.entries.push(e);
      map.set(cle, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.cle.localeCompare(a.cle));
  }, [allEntries, tarifHoraire]);

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
    { icon: Wallet, label: 'À recevoir', value: formatChf(earningsAPayer, 2), sub: `${formatDuration(minutesAPayer)} pas encore payées` },
    { icon: CheckCircle, label: 'Déjà payé', value: formatChf(earningsPaid, 2) },
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
              {'sub' in k && k.sub && <dd className="text-xs text-muted-foreground">{k.sub}</dd>}
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
              const montantMois = m.montant;
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
                        const montant = (minutes / 60) * (entry.paye && entry.tarif_paye != null ? Number(entry.tarif_paye) : tarifHoraire);
                        const corrige = !!entry.corrige_at && (entry.original_started_at || entry.original_ended_at);
                        return (
                          <li key={entry.id} className={cn('flex min-h-[56px] items-start justify-between gap-3 px-4 py-3 md:px-5', entry.exclue && 'opacity-60')}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-medium text-foreground">{formatZurichDay(entry.started_at)}</p>
                                {entry.paye ? <DashBadge tone="success">Payé</DashBadge> : !entry.exclue && <DashBadge tone="warning">À recevoir</DashBadge>}
                                {entry.exclue && <DashBadge tone="muted">Non compté</DashBadge>}
                                {corrige && <DashBadge tone="primary">Corrigé</DashBadge>}
                                {entry.ajoute_par_admin && <DashBadge tone="primary">Ajouté par l'équipe</DashBadge>}
                              </div>
                              <p className="text-sm tabular-nums text-muted-foreground">
                                {formatZurichTime(entry.started_at)}
                                {entry.ended_at && ` → ${formatZurichTime(entry.ended_at)}`}
                                {' · '}{formatDuration(minutes)}
                              </p>
                              {corrige && (
                                <p className="text-xs text-muted-foreground">
                                  Vous aviez pointé {entry.original_started_at ? formatZurichTime(entry.original_started_at) : '—'} → {entry.original_ended_at ? formatZurichTime(entry.original_ended_at) : 'sans départ'}
                                </p>
                              )}
                              {entry.motif_correction && <p className="text-xs text-muted-foreground">Motif : {entry.motif_correction}</p>}
                            </div>
                            <span className={cn('shrink-0 text-sm font-semibold tabular-nums', entry.exclue ? 'text-muted-foreground line-through' : 'text-foreground')}>{formatChf(montant, 2)}</span>
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
