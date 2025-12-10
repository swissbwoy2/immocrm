import { useState, useMemo } from 'react';
import { isWithinInterval, differenceInDays } from 'date-fns';
import { Home, Calendar, FileCheck, CheckCircle, Clock, TrendingUp, Mail, Eye, Target, Sparkles, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { StatsCard } from './StatsCard';
import { PremiumPerformanceChart } from './PremiumPerformanceChart';
import { cn } from '@/lib/utils';

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
    { name: 'Offres reçues', value: offres.length, target: 10, icon: Home, color: 'primary' },
    { name: 'Visites effectuées', value: visites.filter(v => v.statut === 'effectuee').length, target: 5, icon: Eye, color: 'blue' },
    { name: 'Candidatures', value: candidatures.length, target: 3, icon: FileCheck, color: 'amber' },
    { name: 'Acceptées', value: candidatures.filter(c => c.statut === 'acceptee').length, target: 1, icon: Trophy, color: 'emerald' },
  ];

  const totalProgress = searchPhases.reduce((acc, phase) => {
    return acc + Math.min((phase.value / phase.target) * 100, 100);
  }, 0) / searchPhases.length;

  return (
    <div className="space-y-6 p-6">
      {/* Premium Header with date filter */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 p-6">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${2 + i * 0.3}s`
              }}
            />
          ))}
        </div>

        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-2xl blur-xl opacity-50" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Ma recherche en chiffres
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {client?.type_recherche === 'Acheter' 
                  ? 'Suivez l\'avancement de votre projet d\'achat immobilier'
                  : 'Suivez l\'avancement de votre recherche d\'appartement'}
              </p>
            </div>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      </div>

      {/* Premium Mandate Progress Card */}
      <div className="animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <Card className={cn(
          "group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1",
          daysRemaining <= 30 
            ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5' 
            : 'border-primary/20 hover:border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10'
        )}>
          {/* Glassmorphism effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Glow effect */}
          <div className={cn(
            "absolute -inset-1 rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500",
            daysRemaining <= 30 ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20' : 'bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20'
          )} />

          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg transition-colors duration-300",
                daysRemaining <= 30 ? 'bg-amber-500/10 group-hover:bg-amber-500/20' : 'bg-primary/10 group-hover:bg-primary/20'
              )}>
                <Clock className={cn(
                  "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                  daysRemaining <= 30 ? 'text-amber-500' : 'text-primary'
                )} />
              </div>
              <CardTitle className="text-base font-semibold transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                Durée du mandat
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Jour {daysElapsed} / 90</span>
                <span className={cn(
                  "font-medium",
                  daysRemaining <= 30 ? 'text-amber-500' : 'text-muted-foreground'
                )}>
                  {daysRemaining > 0 ? `${daysRemaining} jours restants` : 'Mandat expiré'}
                </span>
              </div>
              <div className="relative">
                <Progress 
                  value={mandatProgress} 
                  className={cn(
                    "h-3 rounded-full",
                    daysRemaining <= 30 && "[&>div]:bg-amber-500"
                  )} 
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-primary shadow-lg"
                  style={{ left: `calc(${mandatProgress}% - 8px)` }}
                />
              </div>
            </div>
          </CardContent>

          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
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

      {/* Premium Search Progress Funnel */}
      <div className="animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
        <Card className="group relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
          {/* Glassmorphism effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary/20 animate-pulse"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${25 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${2 + i * 0.5}s`
                }}
              />
            ))}
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <Target className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold transition-transform duration-300 group-hover:scale-[1.02] origin-left flex items-center gap-2">
                    Progression de votre recherche
                    <Sparkles className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Étapes vers votre nouveau logement</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{Math.round(totalProgress)}%</p>
                <p className="text-xs text-muted-foreground">Complété</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-5">
              {searchPhases.map((phase, index) => {
                const progress = Math.min((phase.value / phase.target) * 100, 100);
                const isComplete = phase.value >= phase.target;
                const PhaseIcon = phase.icon;
                
                const colorClasses = {
                  primary: {
                    bg: 'bg-primary/10',
                    text: 'text-primary',
                    progress: '',
                    border: 'border-primary/30'
                  },
                  blue: {
                    bg: 'bg-blue-500/10',
                    text: 'text-blue-500',
                    progress: '[&>div]:bg-blue-500',
                    border: 'border-blue-500/30'
                  },
                  amber: {
                    bg: 'bg-amber-500/10',
                    text: 'text-amber-500',
                    progress: '[&>div]:bg-amber-500',
                    border: 'border-amber-500/30'
                  },
                  emerald: {
                    bg: 'bg-emerald-500/10',
                    text: 'text-emerald-500',
                    progress: '[&>div]:bg-emerald-500',
                    border: 'border-emerald-500/30'
                  }
                };
                
                const colors = colorClasses[phase.color as keyof typeof colorClasses];
                
                return (
                  <div 
                    key={phase.name} 
                    className={cn(
                      "relative p-4 rounded-xl border transition-all duration-300 hover:shadow-md",
                      isComplete ? 'bg-emerald-500/5 border-emerald-500/30' : `bg-muted/20 ${colors.border}`
                    )}
                    style={{ animationDelay: `${400 + index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors duration-300",
                          isComplete ? 'bg-emerald-500/20' : colors.bg
                        )}>
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <PhaseIcon className={cn("h-4 w-4", colors.text)} />
                          )}
                        </div>
                        <div>
                          <span className={cn(
                            "font-medium text-sm",
                            isComplete && 'text-emerald-600 dark:text-emerald-400'
                          )}>
                            {phase.name}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Étape {index + 1} sur {searchPhases.length}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-lg font-bold",
                          isComplete ? 'text-emerald-500' : colors.text
                        )}>
                          {phase.value}
                        </span>
                        <span className="text-sm text-muted-foreground"> / {phase.target}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={progress} 
                        className={cn(
                          "h-2 rounded-full",
                          isComplete ? '[&>div]:bg-emerald-500' : colors.progress
                        )}
                      />
                      {isComplete && (
                        <div className="absolute -right-1 -top-1">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center animate-bounce-subtle">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall progress indicator */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression globale</span>
                <span className="text-sm font-bold text-primary">{Math.round(totalProgress)}%</span>
              </div>
              <div className="relative">
                <Progress value={totalProgress} className="h-3" />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center"
                  style={{ left: `calc(${totalProgress}% - 10px)` }}
                >
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            </div>
          </CardContent>

          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
        </Card>
      </div>
    </div>
  );
}
