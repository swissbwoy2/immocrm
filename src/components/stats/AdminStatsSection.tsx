import { useState, useMemo } from 'react';
import { subDays, isWithinInterval } from 'date-fns';
import { Send, CheckCircle, DollarSign, Users, UserCog, TrendingUp, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter, DateRange, getDefaultDateRange } from './DateRangeFilter';
import { StatsCard } from './StatsCard';
import { PerformanceChart, MultiSeriesChart } from './PerformanceChart';
import { Leaderboard } from './Leaderboard';
import { getUniqueOffres } from '@/utils/visitesCalculator';

interface AdminStatsSectionProps {
  agents: any[];
  clients: any[];
  transactions: any[];
  offres: any[];
  profiles?: Map<string, any>;
}

export function AdminStatsSection({
  agents,
  clients,
  transactions,
  offres,
  profiles,
}: AdminStatsSectionProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const periodLength = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const previousPeriod = {
    from: subDays(dateRange.from, periodLength + 1),
    to: subDays(dateRange.from, 1),
  };

  const filterByDateRange = (items: any[], dateField: string, range: { from: Date; to: Date }, fallbackField?: string) => {
    return items.filter((item) => {
      const date = item[dateField] || (fallbackField ? item[fallbackField] : null);
      if (!date) return false;
      const itemDate = new Date(date);
      return isWithinInterval(itemDate, { start: range.from, end: range.to });
    });
  };

  // Current period data
  const currentOffres = filterByDateRange(offres, 'date_envoi', dateRange);
  const currentTransactions = filterByDateRange(transactions, 'date_transaction', dateRange);
  const currentClients = filterByDateRange(clients, 'date_ajout', dateRange);

  // Transactions filtered by payment date (for revenue calculations)
  const currentPaidTransactions = filterByDateRange(
    transactions.filter(t => t.statut === 'conclue' && t.commission_payee === true),
    'date_paiement_commission',
    dateRange,
    'date_transaction' // fallback if date_paiement_commission is missing
  );

  // Previous period data
  const previousOffres = filterByDateRange(offres, 'date_envoi', previousPeriod);
  const previousTransactions = filterByDateRange(transactions, 'date_transaction', previousPeriod);
  const previousClients = filterByDateRange(clients, 'date_ajout', previousPeriod);

  // Previous period paid transactions
  const previousPaidTransactions = filterByDateRange(
    transactions.filter(t => t.statut === 'conclue' && t.commission_payee === true),
    'date_paiement_commission',
    previousPeriod,
    'date_transaction'
  );

  // Deduplicated offers
  const currentOffresUniques = getUniqueOffres(currentOffres);
  const previousOffresUniques = getUniqueOffres(previousOffres);

  const stats = useMemo(() => {
    // Total offers (raw count)
    const offresEnvoyeesTotal = currentOffres.length;
    const previousOffresTotal = previousOffres.length;
    
    // Unique offers (deduplicated)
    const offresUniques = currentOffresUniques.length;
    const previousOffresUniquesCount = previousOffresUniques.length;

    // Activity metric: Affaires conclues (based on date_transaction)
    const transactionsConclues = currentTransactions.filter(t => t.statut === 'conclue');
    const previousTransactionsConclues = previousTransactions.filter(t => t.statut === 'conclue');

    // Revenue metrics: based on payment date (date_paiement_commission)
    const revenusAgence = currentPaidTransactions.reduce((sum, t) => sum + (t.part_agence || 0), 0);
    const previousRevenus = previousPaidTransactions.reduce((sum, t) => sum + (t.part_agence || 0), 0);

    const commissionsAgents = currentPaidTransactions.reduce((sum, t) => sum + (t.part_agent || 0), 0);

    const nouveauxClients = currentClients.length;
    const previousNouveauxClients = previousClients.length;

    return {
      offresEnvoyeesTotal,
      previousOffresTotal,
      offresUniques,
      previousOffresUniquesCount,
      affairesConclues: transactionsConclues.length,
      previousAffaires: previousTransactionsConclues.length,
      revenusAgence,
      previousRevenus,
      commissionsAgents,
      nouveauxClients,
      previousNouveauxClients,
      totalAgents: agents.length,
      agentsActifs: agents.filter(a => a.actif).length,
    };
  }, [currentOffres, previousOffres, currentOffresUniques, previousOffresUniques, currentTransactions, previousTransactions, currentPaidTransactions, previousPaidTransactions, currentClients, previousClients, agents]);

  // Agent leaderboard
  const agentLeaderboard = useMemo(() => {
    return agents.map((agent) => {
      // Use paid transactions for commission leaderboard
      const agentTransactions = currentPaidTransactions.filter(t => 
        t.agent_id === agent.id
      );
      const totalCommission = agentTransactions.reduce((sum, t) => sum + (t.part_agent || 0), 0);
      
      return {
        id: agent.id,
        name: `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'Agent',
        value: totalCommission,
        subtitle: `${agentTransactions.length} affaire${agentTransactions.length > 1 ? 's' : ''} conclue${agentTransactions.length > 1 ? 's' : ''}`,
      };
    }).filter(a => a.value > 0);
  }, [agents, currentPaidTransactions]);

  // Agent offres leaderboard
  const agentOffresLeaderboard = useMemo(() => {
    return agents.map((agent) => {
      const agentOffres = currentOffres.filter(o => o.agent_id === agent.id);
      
      return {
        id: agent.id,
        name: `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'Agent',
        value: agentOffres.length,
      };
    }).filter(a => a.value > 0);
  }, [agents, currentOffres]);

  // Charts data
  const revenusChartData = useMemo(() => {
    return currentPaidTransactions.map((t) => ({
      date: new Date(t.date_paiement_commission || t.date_transaction),
      value: t.part_agence || 0,
    }));
  }, [currentPaidTransactions]);

  const activitySeries = useMemo(() => [
    {
      key: 'offres',
      label: 'Offres envoyées',
      color: 'hsl(var(--primary))',
      data: currentOffres.map(o => ({ date: new Date(o.date_envoi), value: 1 })),
    },
    {
      key: 'transactions',
      label: 'Affaires conclues',
      color: 'hsl(142, 76%, 36%)',
      data: currentTransactions.filter(t => t.statut === 'conclue').map(t => ({ date: new Date(t.date_transaction), value: 1 })),
    },
    {
      key: 'clients',
      label: 'Nouveaux clients',
      color: 'hsl(45, 93%, 47%)',
      data: currentClients.map(c => ({ date: new Date(c.date_ajout), value: 1 })),
    },
  ], [currentOffres, currentTransactions, currentClients]);

  return (
    <div className="space-y-6">
      {/* Header with date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Statistiques globales
          </h2>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité de l'agence</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Cards with staggered animations */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Revenus agence"
            value={`${stats.revenusAgence.toLocaleString()} CHF`}
            previousValue={stats.previousRevenus}
            currentValue={stats.revenusAgence}
            icon={DollarSign}
            variant="success"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Comm. agents"
            value={`${stats.commissionsAgents.toLocaleString()} CHF`}
            icon={DollarSign}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Affaires conclues"
            value={stats.affairesConclues}
            previousValue={stats.previousAffaires}
            currentValue={stats.affairesConclues}
            icon={CheckCircle}
            variant="success"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Offres envoyées"
            value={stats.offresEnvoyeesTotal}
            previousValue={stats.previousOffresTotal}
            currentValue={stats.offresEnvoyeesTotal}
            icon={Send}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '175ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Biens proposés"
            value={stats.offresUniques}
            icon={Home}
            description="Offres uniques"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Nouveaux clients"
            value={stats.nouveauxClients}
            previousValue={stats.previousNouveauxClients}
            currentValue={stats.nouveauxClients}
            icon={Users}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
          <StatsCard
            title="Agents"
            value={stats.totalAgents}
            description={`${stats.agentsActifs} actif(s)`}
            icon={UserCog}
          />
        </div>
      </div>

      {/* Charts with staggered animations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <MultiSeriesChart
            title="Activité globale"
            series={activitySeries}
            dateRange={dateRange}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
          <PerformanceChart
            title="Revenus de l'agence"
            data={revenusChartData}
            dateRange={dateRange}
            color="hsl(142, 76%, 36%)"
            valueLabel="CHF"
          />
        </div>
      </div>

      {/* Leaderboards with staggered animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <Leaderboard
            title="Top agents - Commissions"
            entries={agentLeaderboard}
            valueLabel="CHF"
            maxEntries={5}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
          <Leaderboard
            title="Top agents - Offres envoyées"
            entries={agentOffresLeaderboard}
            valueLabel="offres"
            maxEntries={5}
          />
        </div>
      </div>
    </div>
  );
}
