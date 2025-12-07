import { useState, useMemo } from 'react';
import { isWithinInterval, differenceInDays } from 'date-fns';
import { Home, Calendar, FileCheck, CheckCircle, Clock, TrendingUp, Mail, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { StatsCard } from './StatsCard';
import { PremiumPerformanceChart } from './PremiumPerformanceChart';

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
      <div className="animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <Card className={`group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${daysRemaining <= 30 ? 'border-warning/50 bg-warning/5' : 'border-primary/10 hover:border-primary/30'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="transition-transform duration-300 group-hover:scale-[1.02] origin-left">Durée du mandat</span>
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
      </div>

      {/* Stats Cards with staggered animations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Offres reçues"
            value={stats.offresRecues}
            icon={Home}
            description={`${stats.tauxVue}% consultées`}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Visites effectuées"
            value={stats.visitesEffectuees}
            icon={Calendar}
            description={`${stats.visitesAVenir} à venir`}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Candidatures"
            value={stats.candidaturesDeposees}
            icon={FileCheck}
            description={`${stats.candidaturesEnCours} en cours`}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Acceptées"
            value={stats.candidaturesAcceptees}
            icon={CheckCircle}
            variant={stats.candidaturesAcceptees > 0 ? 'success' : 'default'}
          />
        </div>
      </div>

      {/* Premium Charts with staggered animations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
          <PremiumPerformanceChart
            title="Offres reçues"
            data={offresChartData}
            dateRange={dateRange}
            valueLabel="offres"
            icon={Mail}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <PremiumPerformanceChart
            title="Visites"
            data={visitesChartData}
            dateRange={dateRange}
            color="hsl(142, 76%, 36%)"
            valueLabel="visites"
            icon={Eye}
          />
        </div>
      </div>

      {/* Search Progress Funnel */}
      <div className="animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
        <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-primary/10 hover:border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
              <span className="transition-transform duration-300 group-hover:scale-[1.02] origin-left">Progression de votre recherche</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchPhases.map((phase, index) => {
                const progress = Math.min((phase.value / phase.target) * 100, 100);
                const isComplete = phase.value >= phase.target;
                
                return (
                  <div 
                    key={phase.name} 
                    className="space-y-2 animate-fade-in" 
                    style={{ animationDelay: `${400 + index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {isComplete && <CheckCircle className="h-4 w-4 text-success" />}
                        <span className={isComplete ? 'text-success font-medium' : ''}>
                          {index + 1}. {phase.name}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {phase.value} / {phase.target}
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={`h-2 ${isComplete ? '[&>div]:bg-success' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
