import { useState, useMemo } from 'react';
import { subDays, isWithinInterval } from 'date-fns';
import { Send, CheckCircle, DollarSign, Users, Target, TrendingUp, Calendar, FileCheck, Sparkles, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { StatsCard } from './StatsCard';
import { GoalProgress } from './GoalProgress';
import { useAgentGoals } from '@/hooks/useAgentGoals';
import { Skeleton } from '@/components/ui/skeleton';
import { getUniqueOffres, getUniqueVisites } from '@/utils/visitesCalculator';
import { PremiumMultiSeriesChart } from './PremiumMultiSeriesChart';
import { PremiumCommissionsChart } from './PremiumCommissionsChart';

interface AgentStatsSectionProps {
  offres: any[];
  transactions: any[];
  candidatures: any[];
  clients: any[];
  agentId: string;
}

const goalTypeToIcon: Record<string, 'target' | 'trophy' | 'flame' | 'star'> = {
  offres: 'flame',
  transactions: 'trophy',
  commissions: 'star',
  clients: 'target',
  visites: 'target',
  candidatures: 'target',
};

const periodLabels: Record<string, string> = {
  daily: 'du jour',
  weekly: 'de la semaine',
  monthly: 'du mois',
  quarterly: 'du trimestre',
  yearly: "de l'année",
};

export function AgentStatsSection({
  offres,
  transactions,
  candidatures,
  clients,
  agentId,
}: AgentStatsSectionProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  
  // Fetch personalized goals
  const { data: personalizedGoals = [], isLoading: goalsLoading } = useAgentGoals(agentId);

  // Calculate previous period for comparison
  const periodLength = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const previousPeriod = {
    from: subDays(dateRange.from, periodLength + 1),
    to: subDays(dateRange.from, 1),
  };

  // Filter data by date range
  const filterByDateRange = (items: any[], dateField: string, range: { from: Date; to: Date }) => {
    return items.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return isWithinInterval(itemDate, { start: range.from, end: range.to });
    });
  };

  // Current period data - deduplicated
  const currentOffresRaw = filterByDateRange(offres, 'date_envoi', dateRange);
  const currentOffres = getUniqueOffres(currentOffresRaw);
  const currentTransactions = filterByDateRange(transactions, 'date_transaction', dateRange);
  const currentCandidatures = filterByDateRange(candidatures, 'created_at', dateRange);

  // Previous period data for comparison - deduplicated
  const previousOffresRaw = filterByDateRange(offres, 'date_envoi', previousPeriod);
  const previousOffres = getUniqueOffres(previousOffresRaw);
  const previousTransactions = filterByDateRange(transactions, 'date_transaction', previousPeriod);

  // Calculate stats
  const stats = useMemo(() => {
    const offresEnvoyees = currentOffres.length;
    const previousOffresEnvoyees = previousOffres.length;

    const affairesConclues = currentTransactions.filter(t => t.statut === 'conclue').length;
    const previousAffairesConclues = previousTransactions.filter(t => t.statut === 'conclue').length;

    const commissionsGagnees = currentTransactions
      .filter(t => t.statut === 'conclue')
      .reduce((sum, t) => sum + (t.part_agent || 0), 0);
    const previousCommissions = previousTransactions
      .filter(t => t.statut === 'conclue')
      .reduce((sum, t) => sum + (t.part_agent || 0), 0);

    const tauxConversion = offresEnvoyees > 0 
      ? Math.round((affairesConclues / offresEnvoyees) * 100) 
      : 0;

    const candidaturesAcceptees = currentCandidatures.filter(c => c.statut === 'acceptee').length;
    const candidaturesEnCours = currentCandidatures.filter(c => 
      ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee'].includes(c.statut)
    ).length;

    return {
      offresEnvoyees,
      previousOffresEnvoyees,
      affairesConclues,
      previousAffairesConclues,
      commissionsGagnees,
      previousCommissions,
      tauxConversion,
      candidaturesAcceptees,
      candidaturesEnCours,
      clientsActifs: clients.length,
    };
  }, [currentOffres, previousOffres, currentTransactions, previousTransactions, currentCandidatures, clients]);

  // Chart data - offres over time
  const offresChartData = useMemo(() => {
    return currentOffres.map((o) => ({
      date: new Date(o.date_envoi),
      value: 1,
    }));
  }, [currentOffres]);

  // Chart data - transactions over time
  const transactionsChartData = useMemo(() => {
    return currentTransactions
      .filter(t => t.statut === 'conclue')
      .map((t) => ({
        date: new Date(t.date_transaction),
        value: 1,
      }));
  }, [currentTransactions]);

  // Chart data - commissions over time
  const commissionsChartData = useMemo(() => {
    return currentTransactions
      .filter(t => t.statut === 'conclue')
      .map((t) => ({
        date: new Date(t.date_transaction),
        value: t.part_agent || 0,
      }));
  }, [currentTransactions]);

  // Multi-series chart for activity comparison
  const activitySeries = useMemo(() => [
    {
      key: 'offres',
      label: 'Offres envoyées',
      color: 'hsl(var(--primary))',
      data: currentOffres.map(o => ({ date: new Date(o.date_envoi), value: 1 })),
    },
    {
      key: 'candidatures',
      label: 'Candidatures',
      color: 'hsl(142, 76%, 36%)',
      data: currentCandidatures.map(c => ({ date: new Date(c.created_at), value: 1 })),
    },
    {
      key: 'transactions',
      label: 'Affaires conclues',
      color: 'hsl(45, 93%, 47%)',
      data: currentTransactions.filter(t => t.statut === 'conclue').map(t => ({ date: new Date(t.date_transaction), value: 1 })),
    },
  ], [currentOffres, currentCandidatures, currentTransactions]);

  // Fallback monthly goals if no personalized goals
  const currentMonth = new Date();
  const monthlyOffresRaw = offres.filter(o => {
    const date = new Date(o.date_envoi);
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
  });
  const monthlyOffres = getUniqueOffres(monthlyOffresRaw).length;

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date_transaction);
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear() &&
           t.statut === 'conclue';
  }).length;

  const monthlyCommissions = transactions
    .filter(t => {
      const date = new Date(t.date_transaction);
      return date.getMonth() === currentMonth.getMonth() && 
             date.getFullYear() === currentMonth.getFullYear() &&
             t.statut === 'conclue';
    })
    .reduce((sum, t) => sum + (t.part_agent || 0), 0);

  const hasPersonalizedGoals = personalizedGoals.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Mes performances
          </h2>
          <p className="text-sm text-muted-foreground">Suivez vos statistiques et atteignez vos objectifs</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Personalized Goals or Default Goals */}
      <div className="animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <Card className="group bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {hasPersonalizedGoals ? (
                <>
                  <Sparkles className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="transition-transform duration-300 group-hover:scale-[1.02] origin-left">Mes objectifs personnalisés</span>
                </>
              ) : (
                <>
                  <Target className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <span className="transition-transform duration-300 group-hover:scale-[1.02] origin-left">Objectifs du mois</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goalsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : hasPersonalizedGoals ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalizedGoals.map((goal, index) => (
                  <div key={goal.id} className="animate-fade-in" style={{ animationDelay: `${50 + index * 50}ms`, animationFillMode: 'both' }}>
                    <GoalProgress
                      title={`${goal.title} (${periodLabels[goal.period]})`}
                      current={goal.current}
                      goal={goal.target_value}
                      unit={goal.goal_type === 'commissions' ? 'CHF' : ''}
                      icon={goalTypeToIcon[goal.goal_type] || 'target'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
                  <GoalProgress
                    title="Offres envoyées"
                    current={monthlyOffres}
                    goal={20}
                    unit="offres"
                    icon="flame"
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                  <GoalProgress
                    title="Affaires conclues"
                    current={monthlyTransactions}
                    goal={3}
                    unit="affaires"
                    icon="trophy"
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
                  <GoalProgress
                    title="Commissions"
                    current={monthlyCommissions}
                    goal={5000}
                    unit="CHF"
                    icon="star"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards with staggered animations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Offres envoyées"
            value={stats.offresEnvoyees}
            previousValue={stats.previousOffresEnvoyees}
            currentValue={stats.offresEnvoyees}
            icon={Send}
            description={`${dateRange.label}`}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Affaires conclues"
            value={stats.affairesConclues}
            previousValue={stats.previousAffairesConclues}
            currentValue={stats.affairesConclues}
            icon={CheckCircle}
            variant="success"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Commissions"
            value={`${stats.commissionsGagnees.toLocaleString()} CHF`}
            previousValue={stats.previousCommissions}
            currentValue={stats.commissionsGagnees}
            icon={DollarSign}
            variant="success"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Taux conversion"
            value={`${stats.tauxConversion}%`}
            icon={Target}
            description="Offres → Affaires"
          />
        </div>
      </div>

      {/* Premium Charts with staggered animations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <PremiumMultiSeriesChart
            title="Activité"
            series={activitySeries}
            dateRange={dateRange}
            icon={Activity}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
          <PremiumCommissionsChart
            title="Commissions gagnées"
            data={commissionsChartData}
            dateRange={dateRange}
            color="hsl(142, 76%, 36%)"
            valueLabel="CHF"
            icon={DollarSign}
          />
        </div>
      </div>

      {/* Candidatures stats with staggered animations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Candidatures totales"
            value={currentCandidatures.length}
            icon={FileCheck}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '550ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Acceptées"
            value={stats.candidaturesAcceptees}
            icon={CheckCircle}
            variant="success"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
          <StatsCard
            title="En cours"
            value={stats.candidaturesEnCours}
            icon={Calendar}
            variant="warning"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '650ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Clients actifs"
            value={stats.clientsActifs}
            icon={Users}
          />
        </div>
      </div>
    </div>
  );
}
