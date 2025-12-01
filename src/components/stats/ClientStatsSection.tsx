import { useState, useMemo } from 'react';
import { subDays, isWithinInterval, differenceInDays } from 'date-fns';
import { Home, Calendar, FileCheck, Eye, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from './PerformanceChart';

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
    
    const visitesEffectuees = currentVisites.filter(v => 
      v.statut === 'effectuee' || new Date(v.date_visite) < new Date()
    ).length;
    const visitesAVenir = currentVisites.filter(v => 
      v.statut === 'planifiee' && new Date(v.date_visite) >= new Date()
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
  }, [currentOffres, currentVisites, currentCandidatures]);

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

  // Mandate progress
  const mandatStartDate = new Date(client?.date_ajout || client?.created_at);
  const daysElapsed = differenceInDays(new Date(), mandatStartDate);
  const daysRemaining = Math.max(90 - daysElapsed, 0);
  const mandatProgress = Math.min((daysElapsed / 90) * 100, 100);

  // Search progress (fun visualization)
  const searchPhases = [
    { name: 'Offres reçues', value: offres.length, target: 10 },
    { name: 'Visites effectuées', value: visites.filter(v => v.statut === 'effectuee').length, target: 5 },
    { name: 'Candidatures', value: candidatures.length, target: 3 },
    { name: 'Acceptées', value: candidatures.filter(c => c.statut === 'acceptee').length, target: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Ma recherche en chiffres
          </h2>
          <p className="text-sm text-muted-foreground">
            {client?.type_recherche === 'Acheter' 
              ? 'Suivez l\'avancement de votre projet d\'achat immobilier'
              : 'Suivez l\'avancement de votre recherche d\'appartement'}
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Mandate Progress */}
      <Card className={daysRemaining <= 30 ? 'border-warning/50 bg-warning/5' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Durée du mandat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Jour {daysElapsed} / 90</span>
              <span className={daysRemaining <= 30 ? 'text-warning font-medium' : ''}>
                {daysRemaining > 0 ? `${daysRemaining} jours restants` : 'Mandat expiré'}
              </span>
            </div>
            <Progress value={mandatProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Offres reçues"
          value={stats.offresRecues}
          icon={Home}
          description={`${stats.tauxVue}% consultées`}
        />
        <StatsCard
          title="Visites effectuées"
          value={stats.visitesEffectuees}
          icon={Calendar}
          description={`${stats.visitesAVenir} à venir`}
        />
        <StatsCard
          title="Candidatures"
          value={stats.candidaturesDeposees}
          icon={FileCheck}
          description={`${stats.candidaturesEnCours} en cours`}
        />
        <StatsCard
          title="Acceptées"
          value={stats.candidaturesAcceptees}
          icon={CheckCircle}
          variant={stats.candidaturesAcceptees > 0 ? 'success' : 'default'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart
          title="Offres reçues"
          data={offresChartData}
          dateRange={dateRange}
          valueLabel="offres"
        />
        <PerformanceChart
          title="Visites"
          data={visitesChartData}
          dateRange={dateRange}
          color="hsl(142, 76%, 36%)"
          valueLabel="visites"
        />
      </div>

      {/* Search Progress Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progression de votre recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {searchPhases.map((phase, index) => {
              const progress = Math.min((phase.value / phase.target) * 100, 100);
              const isComplete = phase.value >= phase.target;
              
              return (
                <div key={phase.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {isComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                      <span className={isComplete ? 'text-green-600 font-medium' : ''}>
                        {index + 1}. {phase.name}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {phase.value} / {phase.target}
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
