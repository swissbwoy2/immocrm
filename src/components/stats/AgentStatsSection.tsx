import { useState, useMemo } from 'react';
import { subDays, isWithinInterval } from 'date-fns';
import { Send, CheckCircle, DollarSign, Users, Target, Calendar, FileCheck, Sparkles, Activity, Home } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { chfSuisse } from './statsFormat';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { StatsCard } from './StatsCard';
import { GoalProgress } from './GoalProgress';
import { useAgentGoals } from '@/hooks/useAgentGoals';
import { Skeleton } from '@/components/ui/skeleton';
import { getUniqueOffres, getUniqueVisites } from '@/utils/visitesCalculator';
import { PremiumMultiSeriesChart } from './PremiumMultiSeriesChart';
import { isClientActif, useUsersAvecCreditsMandat } from '@/lib/activeClients';
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
  const usersAvecCreditsMandat = useUsersAvecCreditsMandat();
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

    // Commissions dues (concluded but not yet paid) — based on date_transaction
    const commissionsDues = currentTransactions
      .filter(t => t.statut === 'conclue' && !t.commission_payee)
      .reduce((sum, t) => sum + (t.part_agent || 0), 0);

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
      commissionsDues,
      tauxConversion,
      candidaturesAcceptees,
      candidaturesEnCours,
      clientsActifs: clients.filter((c: any) => isClientActif(c, usersAvecCreditsMandat)).length,
    };
  }, [currentOffresRaw, currentOffresUniques, previousOffresRaw, currentTransactions, previousTransactions, currentPaidTransactions, previousPaidTransactions, currentCandidatures, clients, usersAvecCreditsMandat]);

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
    <div className="space-y-4 md:space-y-5">
      {/* En-tête : titre, phrase, période */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Mes performances</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Suivez vos statistiques et atteignez vos objectifs</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
      </div>

      {/* Objectifs */}
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {hasPersonalizedGoals ? (
              <Sparkles className="h-[18px] w-[18px]" />
            ) : (
              <Target className="h-[18px] w-[18px]" />
            )}
          </span>
          <h3 className="min-w-0 truncate text-base font-semibold text-foreground">
            {hasPersonalizedGoals ? 'Mes objectifs personnalisés' : 'Objectifs du mois'}
          </h3>
        </div>
        {goalsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : hasPersonalizedGoals ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {personalizedGoals.map((goal) => (
              <GoalProgress
                key={goal.id}
                title={`${goal.title} (${periodLabels[goal.period]})`}
                current={goal.current}
                goal={goal.target_value}
                unit={goal.goal_type === 'commissions' ? 'CHF' : ''}
                icon={goalTypeToIcon[goal.goal_type] || 'target'}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GoalProgress
              title="Offres envoyées"
              current={monthlyOffres}
              goal={20}
              unit="offres"
              icon="flame"
            />
            <GoalProgress
              title="Affaires conclues"
              current={monthlyTransactions}
              goal={3}
              unit="affaires"
              icon="trophy"
            />
            <GoalProgress
              title="Commissions"
              current={monthlyCommissions}
              goal={5000}
              unit="CHF"
              icon="star"
            />
          </div>
        )}
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        <StatsCard
          title="Offres envoyées"
          value={stats.offresEnvoyeesTotal}
          previousValue={stats.previousOffresTotal}
          currentValue={stats.offresEnvoyeesTotal}
          icon={Send}
          description={`${dateRange.label}`}
        />
        <StatsCard
          title="Biens proposés"
          value={stats.offresUniques}
          icon={Home}
          description="Offres uniques"
        />
        <StatsCard
          title="Affaires conclues"
          value={stats.affairesConclues}
          previousValue={stats.previousAffairesConclues}
          currentValue={stats.affairesConclues}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Commissions encaissées"
          value={chfSuisse(stats.commissionsGagnees)}
          previousValue={stats.previousCommissions}
          currentValue={stats.commissionsGagnees}
          icon={DollarSign}
          variant="success"
          description={stats.commissionsDues > 0 ? `+${chfSuisse(stats.commissionsDues)} en attente` : undefined}
        />
        <StatsCard
          title="Taux conversion"
          value={`${stats.tauxConversion} %`}
          icon={Target}
          description="Offres → Affaires"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Graphiques : côte à côte sur PC, empilés sur mobile */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <PremiumMultiSeriesChart
          title="Activité"
          series={activitySeries}
          dateRange={dateRange}
          icon={Activity}
        />
        <PremiumCommissionsChart
          title="Commissions gagnées"
          data={commissionsChartData}
          dateRange={dateRange}
          color="hsl(142, 76%, 36%)"
          valueLabel="CHF"
          icon={DollarSign}
        />
      </div>

      {/* Candidatures et clients */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatsCard
          title="Candidatures totales"
          value={currentCandidatures.length}
          icon={FileCheck}
        />
        <StatsCard
          title="Acceptées"
          value={stats.candidaturesAcceptees}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="En cours"
          value={stats.candidaturesEnCours}
          icon={Calendar}
          variant="warning"
        />
        <StatsCard
          title="Clients actifs"
          value={stats.clientsActifs}
          icon={Users}
        />
      </div>
    </div>
  );
}
