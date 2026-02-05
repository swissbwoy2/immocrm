import { useState, useMemo } from 'react';
import { subDays, isWithinInterval } from 'date-fns';
import { Send, CheckCircle, DollarSign, Users, Target, TrendingUp, Calendar, FileCheck, Sparkles, Activity, Home } from 'lucide-react';
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

  // Current period data - raw and deduplicated
  const currentOffresRaw = filterByDateRange(offres, 'date_envoi', dateRange);
  const currentOffresUniques = getUniqueOffres(currentOffresRaw);
  const currentTransactions = filterByDateRange(transactions, 'date_transaction', dateRange);
  const currentCandidatures = filterByDateRange(candidatures, 'created_at', dateRange);

  // Filter paid transactions by payment date (for commission calculations)
  const filterPaidByPaymentDate = (items: any[], range: { from: Date; to: Date }) => {
    return items.filter((item) => {
      if (item.statut !== 'conclue' || !item.commission_payee) return false;
      const paymentDate = item.date_paiement_commission || item.date_transaction;
      if (!paymentDate) return false;
      const itemDate = new Date(paymentDate);
      return isWithinInterval(itemDate, { start: range.from, end: range.to });
    });
  };

  const currentPaidTransactions = filterPaidByPaymentDate(transactions, dateRange);
  const previousPaidTransactions = filterPaidByPaymentDate(transactions, previousPeriod);

  // Previous period data for comparison - raw and deduplicated
  const previousOffresRaw = filterByDateRange(offres, 'date_envoi', previousPeriod);
  const previousOffresUniques = getUniqueOffres(previousOffresRaw);
  const previousTransactions = filterByDateRange(transactions, 'date_transaction', previousPeriod);

  // Calculate stats
  const stats = useMemo(() => {
    // Total offers (raw count)
    const offresEnvoyeesTotal = currentOffresRaw.length;
    const previousOffresTotal = previousOffresRaw.length;
    
    // Unique offers (deduplicated by date + address)
    const offresUniques = currentOffresUniques.length;
    const previousOffresUniques = previousOffresRaw.length;

    // Activity metric: Affaires conclues (based on date_transaction)
    const affairesConclues = currentTransactions.filter(t => t.statut === 'conclue').length;
    const previousAffairesConclues = previousTransactions.filter(t => t.statut === 'conclue').length;

    // Revenue metric: Commissions (based on date_paiement_commission)
    const commissionsGagnees = currentPaidTransactions.reduce((sum, t) => sum + (t.part_agent || 0), 0);
    const previousCommissions = previousPaidTransactions.reduce((sum, t) => sum + (t.part_agent || 0), 0);

    const tauxConversion = offresUniques > 0 
      ? Math.round((affairesConclues / offresUniques) * 100) 
      : 0;

    const candidaturesAcceptees = currentCandidatures.filter(c => c.statut === 'acceptee').length;
    const candidaturesEnCours = currentCandidatures.filter(c => 
      ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee'].includes(c.statut)
    ).length;

    return {
      offresEnvoyeesTotal,
      previousOffresTotal,
      offresUniques,
      previousOffresUniques,
      affairesConclues,
      previousAffairesConclues,
      commissionsGagnees,
      previousCommissions,
      tauxConversion,
      candidaturesAcceptees,
      candidaturesEnCours,
      clientsActifs: clients.length,
    };
  }, [currentOffresRaw, currentOffresUniques, previousOffresRaw, currentTransactions, previousTransactions, currentPaidTransactions, previousPaidTransactions, currentCandidatures, clients]);

  // Chart data - offres over time (use raw for timeline)
  const offresChartData = useMemo(() => {
    return currentOffresRaw.map((o) => ({
      date: new Date(o.date_envoi),
      value: 1,
    }));
  }, [currentOffresRaw]);

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
    return currentPaidTransactions.map((t) => ({
      date: new Date(t.date_paiement_commission || t.date_transaction),
      value: t.part_agent || 0,
    }));
  }, [currentPaidTransactions]);

  // Multi-series chart for activity comparison (use raw for timeline)
  const activitySeries = useMemo(() => [
    {
      key: 'offres',
      label: 'Offres envoyées',
      color: 'hsl(var(--primary))',
      data: currentOffresRaw.map(o => ({ date: new Date(o.date_envoi), value: 1 })),
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
  ], [currentOffresRaw, currentCandidatures, currentTransactions]);

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

  // Monthly commissions based on payment date
  const monthlyCommissions = transactions.filter(t => {
    if (t.statut !== 'conclue' || !t.commission_payee) return false;
    const paymentDate = t.date_paiement_commission || t.date_transaction;
    if (!paymentDate) return false;
    const date = new Date(paymentDate);
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  }).reduce((sum, t) => sum + (t.part_agent || 0), 0);

  const hasPersonalizedGoals = personalizedGoals.length > 0;

  return (
    <div className="space-y-6">
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
                Mes performances
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Suivez vos statistiques et atteignez vos objectifs</p>
            </div>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      </div>

      {/* Premium Goals Card */}
      <div className="animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
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

          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                {hasPersonalizedGoals ? (
                  <Sparkles className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                ) : (
                  <Target className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                )}
              </div>
              <CardTitle className="text-base font-semibold transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                {hasPersonalizedGoals ? 'Mes objectifs personnalisés' : 'Objectifs du mois'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {goalsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
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

          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
        </Card>
      </div>

      {/* Stats Cards with staggered animations */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Offres envoyées"
            value={stats.offresEnvoyeesTotal}
            previousValue={stats.previousOffresTotal}
            currentValue={stats.offresEnvoyeesTotal}
            icon={Send}
            description={`${dateRange.label}`}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '225ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Biens proposés"
            value={stats.offresUniques}
            icon={Home}
            description="Offres uniques"
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
