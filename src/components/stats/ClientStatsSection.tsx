import { useState, useMemo } from 'react';
import { isWithinInterval } from 'date-fns';
import { Home, Calendar, FileCheck, CheckCircle, Mail, Eye, Target, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { PremiumPerformanceChart } from './PremiumPerformanceChart';
import { cn } from '@/lib/utils';
import { isVisiteReelle } from '@/lib/visitDecision';

interface ClientStatsSectionProps {
  offres: any[];
  visites: any[];
  candidatures: any[];
  client: any;
}

export function ClientStatsSection({
  offres,
  visites,
  candidatures,
  client,
}: ClientStatsSectionProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const filterByDateRange = (items: any[], dateField: string, range: { from: Date; to: Date }) => {
    return items.filter((item) => {
      const date = item[dateField];
      if (!date) return false;
      const itemDate = new Date(date);
      return isWithinInterval(itemDate, { start: range.from, end: range.to });
    });
  };

  // Current period data
  const currentOffres = filterByDateRange(offres, 'date_envoi', dateRange);
  const currentVisites = filterByDateRange(visites, 'date_visite', dateRange);
  const currentCandidatures = filterByDateRange(candidatures, 'created_at', dateRange);

  const stats = useMemo(() => {
    const offresRecues = currentOffres.length;
    const offresVues = currentOffres.filter(o => o.statut !== 'envoyee').length;
    
    // Statut de l'offre liée : une date d'annonce n'est une visite que si le client a dit oui.
    const statutOffre = new globalThis.Map<string, string>(offres.map((o: any) => [o.id, o.statut] as [string, string]));
    const reelle = (v: any) => isVisiteReelle(v, v.offre_id ? statutOffre.get(v.offre_id) : null);
    const visitesEffectuees = currentVisites.filter(v => 
      v.statut === 'effectuee' || (new Date(v.date_visite) < new Date() && reelle(v))
    ).length;
    const visitesAVenir = currentVisites.filter(v => 
      ['planifiee', 'confirmee'].includes(v.statut) && new Date(v.date_visite) >= new Date() && reelle(v)
    ).length;

    const candidaturesDeposees = currentCandidatures.length;
    const candidaturesEnCours = currentCandidatures.filter(c => 
      !['refusee', 'cles_remises', 'annulee'].includes(c.statut)
    ).length;
    const candidaturesAcceptees = currentCandidatures.filter(c => 
      c.statut === 'acceptee'
    ).length;

    return {
      offresRecues,
      offresVues,
      tauxVue: offresRecues > 0 ? Math.round((offresVues / offresRecues) * 100) : 0,
      visitesEffectuees,
      visitesAVenir,
      candidaturesDeposees,
      candidaturesEnCours,
      candidaturesAcceptees,
    };
  }, [currentOffres, currentVisites, currentCandidatures, offres]);

  // Chart data
  const offresChartData = useMemo(() => {
    return currentOffres.map((o) => ({
      date: new Date(o.date_envoi),
      value: 1,
    }));
  }, [currentOffres]);

  const visitesChartData = useMemo(() => {
    return currentVisites.map((v) => ({
      date: new Date(v.date_visite),
      value: 1,
    }));
  }, [currentVisites]);

  // Entonnoir de la recherche : de l'offre reçue jusqu'au bail.
  const searchPhases = [
    { name: 'Offres reçues', value: offres.length, target: 10, icon: Home },
    { name: 'Visites effectuées', value: visites.filter(v => v.statut === 'effectuee').length, target: 5, icon: Eye },
    { name: 'Candidatures', value: candidatures.length, target: 3, icon: FileCheck },
    { name: 'Acceptées', value: candidatures.filter(c => c.statut === 'acceptee').length, target: 1, icon: Trophy },
  ];

  const totalProgress = searchPhases.reduce((acc, phase) => {
    return acc + Math.min((phase.value / phase.target) * 100, 100);
  }, 0) / searchPhases.length;

  const kpis = [
    { label: 'Offres reçues', value: stats.offresRecues, sub: `${stats.tauxVue}% consultées`, icon: Home, tone: 'primary' as const },
    { label: 'Visites effectuées', value: stats.visitesEffectuees, sub: `${stats.visitesAVenir} à venir`, icon: Calendar, tone: 'primary' as const },
    { label: 'Candidatures', value: stats.candidaturesDeposees, sub: `${stats.candidaturesEnCours} en cours`, icon: FileCheck, tone: 'primary' as const },
    { label: 'Acceptées', value: stats.candidaturesAcceptees, sub: stats.candidaturesAcceptees > 0 ? 'Bravo !' : 'Pas encore', icon: CheckCircle, tone: stats.candidaturesAcceptees > 0 ? 'success' as const : 'primary' as const },
  ];

  return (
    <div className="space-y-4">
      {/* Période */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {client?.type_recherche === 'Acheter'
            ? "L'avancement de votre projet d'achat, sur la période choisie."
            : "L'avancement de votre recherche d'appartement, sur la période choisie."}
        </p>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const KIcon = k.icon;
          return (
            <div key={k.label} className={`${DASH_CARD} flex min-h-[112px] flex-col justify-between p-3 sm:p-4`}>
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                k.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary',
              )}>
                <KIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="mt-3">
                <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">{k.value}</p>
                <p className="mt-1.5 truncate text-[13px] font-semibold text-foreground sm:text-sm">{k.label}</p>
                <p className="truncate text-xs text-muted-foreground">{k.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Courbes */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <PremiumPerformanceChart
          title="Offres reçues"
          data={offresChartData}
          dateRange={dateRange}
          valueLabel="offres"
          icon={Mail}
        />
        <PremiumPerformanceChart
          title="Visites"
          data={visitesChartData}
          dateRange={dateRange}
          color="hsl(142, 76%, 36%)"
          valueLabel="visites"
          icon={Eye}
        />
      </div>

      {/* Progression de la recherche */}
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Target className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Progression de votre recherche</h3>
              <p className="text-xs text-muted-foreground">Étapes vers votre nouveau logement</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">{Math.round(totalProgress)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">complété</p>
          </div>
        </div>

        <ol className="space-y-4">
          {searchPhases.map((phase, index) => {
            const progress = Math.min((phase.value / phase.target) * 100, 100);
            const isComplete = phase.value >= phase.target;
            const PhaseIcon = isComplete ? CheckCircle : phase.icon;
            return (
              <li key={phase.name}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      isComplete ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-foreground',
                    )}>
                      <PhaseIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">{phase.name}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">· étape {index + 1}/{searchPhases.length}</span>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    <span className={cn('font-semibold', isComplete ? 'text-emerald-600' : 'text-foreground')}>{phase.value}</span> / {phase.target}
                  </span>
                </div>
                <Progress value={progress} className={cn('h-1.5', isComplete && '[&>div]:bg-emerald-500')} />
              </li>
            );
          })}
        </ol>

        <div className="mt-5 border-t border-border/70 pt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progression globale</span>
            <span className="font-semibold text-foreground">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>
      </div>
    </div>
  );
}
