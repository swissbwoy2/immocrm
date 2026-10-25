import { useState, useMemo } from 'react';
import { subDays, isWithinInterval, startOfDay, startOfWeek, startOfMonth, addDays, addWeeks, addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, CheckCircle, DollarSign, Users, UserCog, Home, Wallet, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { chfSuisse } from './statsFormat';
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
  registreCommissions?: any[];
  mandates?: any[];
  candidatures?: any[];
  profiles?: Map<string, any>;
}

export function AdminStatsSection({
  agents,
  clients,
  transactions,
  offres,
  registreCommissions = [],
  mandates = [],
  candidatures = [],
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

  // Acomptes encaissés (mandats avec acompte_montant > 0), séparés des revenus
  const acomptes = useMemo(() => {
    const paid = mandates.filter((m) => Number(m.acompte_montant) > 0);
    const cur = filterByDateRange(paid, 'created_at', dateRange);
    const prev = filterByDateRange(paid, 'created_at', previousPeriod);
    const sum = (a: any[]) => a.reduce((s, m) => s + Number(m.acompte_montant || 0), 0);
    return { total: sum(cur), prevTotal: sum(prev), count: cur.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandates, dateRange]);

  // Candidatures / postulations
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const isSigned = (c: any) =>
    c.signature_effectuee === true || ['signature_effectuee', 'bail_conclu', 'cles_remises'].includes(c.statut);
  const candStats = useMemo(() => {
    const depots = filterByDateRange(candidatures, 'date_depot', dateRange, 'created_at');
    const signatures = filterByDateRange(candidatures.filter(isSigned), 'signature_effectuee_at', dateRange, 'date_depot')
      .length || 0;
    const sigFallback = filterByDateRange(
      candidatures.filter((c) => isSigned(c) && !c.signature_effectuee_at && !c.date_depot),
      'created_at',
      dateRange,
    ).length;
    const sig = signatures + sigFallback;
    return {
      depots: depots.length,
      signatures: sig,
      taux: depots.length > 0 ? (sig / depots.length) * 100 : 0,
      cles: depots.filter((c) => c.cles_remises === true || c.statut === 'cles_remises').length,
      refus: depots.filter((c) => c.statut === 'refusee').length,
      attente: depots.filter((c) => c.statut === 'en_attente').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatures, dateRange]);

  const fluxData = useMemo(() => {
    const bucketStart = (d: Date) =>
      granularity === 'day'
        ? startOfDay(d)
        : granularity === 'week'
        ? startOfWeek(d, { weekStartsOn: 1 })
        : startOfMonth(d);
    const fmt = granularity === 'month' ? 'MMM yy' : 'dd.MM';
    const map = new Map<number, { label: string; depots: number; signatures: number }>();
    let cursor = bucketStart(dateRange.from);
    let guard = 0;
    while (cursor <= dateRange.to && guard++ < 800) {
      map.set(cursor.getTime(), { label: format(cursor, fmt, { locale: fr }), depots: 0, signatures: 0 });
      cursor = granularity === 'day' ? addDays(cursor, 1) : granularity === 'week' ? addWeeks(cursor, 1) : addMonths(cursor, 1);
    }
    filterByDateRange(candidatures, 'date_depot', dateRange, 'created_at').forEach((c) => {
      const b = map.get(bucketStart(new Date(c.date_depot || c.created_at)).getTime());
      if (b) b.depots++;
    });
    filterByDateRange(candidatures.filter(isSigned), 'signature_effectuee_at', dateRange).forEach((c) => {
      const b = map.get(bucketStart(new Date(c.signature_effectuee_at)).getTime());
      if (b) b.signatures++;
    });
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatures, dateRange, granularity]);


  // Current period data
  const currentOffres = filterByDateRange(offres, 'date_envoi', dateRange, 'created_at');
  const currentTransactions = filterByDateRange(transactions, 'date_transaction', dateRange);
  const currentClients = filterByDateRange(clients, 'date_ajout', dateRange);
  // Registre des commissions: source de vérité pour revenus et affaires conclues
  const currentRegistre = filterByDateRange(registreCommissions, 'date_conclusion', dateRange);

  // Transactions filtered by payment date (for revenue calculations)
  const currentPaidTransactions = filterByDateRange(
    transactions.filter(t => t.statut === 'conclue' && t.commission_payee === true),
    'date_paiement_commission',
    dateRange,
    'date_transaction' // fallback if date_paiement_commission is missing
  );

  // Previous period data
  const previousOffres = filterByDateRange(offres, 'date_envoi', previousPeriod, 'created_at');
  const previousTransactions = filterByDateRange(transactions, 'date_transaction', previousPeriod);
  const previousClients = filterByDateRange(clients, 'date_ajout', previousPeriod);
  const previousRegistre = filterByDateRange(registreCommissions, 'date_conclusion', previousPeriod);

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

    // Affaires conclues + revenus: registre_commissions filtré sur date_conclusion
    const partAgenceOf = (r: any) =>
      r.commission_agence ?? Math.max((r.honoraire_total || 0) - (r.commission_agent || 0), 0);

    const revenusAgence = currentRegistre.reduce((sum, r) => sum + partAgenceOf(r), 0);
    const previousRevenus = previousRegistre.reduce((sum, r) => sum + partAgenceOf(r), 0);

    const commissionsAgents = currentRegistre.reduce((sum, r) => sum + (r.commission_agent || 0), 0);

    const nouveauxClients = currentClients.length;
    const previousNouveauxClients = previousClients.length;

    return {
      offresEnvoyeesTotal,
      previousOffresTotal,
      offresUniques,
      previousOffresUniquesCount,
      affairesConclues: currentRegistre.length,
      previousAffaires: previousRegistre.length,
      revenusAgence,
      previousRevenus,
      commissionsAgents,
      nouveauxClients,
      previousNouveauxClients,
      totalAgents: agents.length,
      agentsActifs: agents.filter(a => a.actif).length,
    };
  }, [currentOffres, previousOffres, currentOffresUniques, previousOffresUniques, currentTransactions, previousTransactions, currentPaidTransactions, previousPaidTransactions, currentClients, previousClients, currentRegistre, previousRegistre, agents]);

  // Agent leaderboard (basé sur le registre des commissions)
  const agentLeaderboard = useMemo(() => {
    const byAgent = new Map<string, { name: string; value: number; count: number }>();
    currentRegistre.forEach((r) => {
      const key = r.agent_id || `${r.agent_prenom || ''} ${r.agent_nom || ''}`.trim() || 'inconnu';
      const agent = agents.find(a => a.id === r.agent_id);
      const name = agent
        ? `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'Agent'
        : `${r.agent_prenom || ''} ${r.agent_nom || ''}`.trim() || 'Agent';
      const entry = byAgent.get(key) || { name, value: 0, count: 0 };
      entry.value += r.commission_agent || 0;
      entry.count += 1;
      byAgent.set(key, entry);
    });
    return Array.from(byAgent.entries()).map(([id, e]) => ({
      id,
      name: e.name,
      value: e.value,
      subtitle: `${e.count} affaire${e.count > 1 ? 's' : ''} conclue${e.count > 1 ? 's' : ''}`,
    })).filter(a => a.value > 0);
  }, [agents, currentRegistre]);

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

  // Charts data: revenus de l'agence par date de conclusion (registre)
  const revenusChartData = useMemo(() => {
    return currentRegistre.map((r) => ({
      date: new Date(r.date_conclusion),
      value: r.commission_agence ?? Math.max((r.honoraire_total || 0) - (r.commission_agent || 0), 0),
    }));
  }, [currentRegistre]);

  const activitySeries = useMemo(() => [
    {
      key: 'offres',
      label: 'Offres envoyées',
      color: 'hsl(var(--primary))',
      data: currentOffres.map(o => ({ date: new Date(o.date_envoi || o.created_at), value: 1 })),
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
    <div className="space-y-4 md:space-y-5">
      {/* En-tête : titre, phrase, période */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Statistiques globales</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Vue d'ensemble de l'activité de l'agence</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatsCard
          title="Revenus agence"
          value={chfSuisse(stats.revenusAgence)}
          previousValue={stats.previousRevenus}
          currentValue={stats.revenusAgence}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Acomptes encaissés"
          value={chfSuisse(acomptes.total)}
          previousValue={acomptes.prevTotal}
          currentValue={acomptes.total}
          icon={Wallet}
          variant="success"
          description={`${acomptes.count} mandat${acomptes.count > 1 ? 's' : ''}`}
        />
        <StatsCard
          title="Comm. agents"
          value={chfSuisse(stats.commissionsAgents)}
          icon={DollarSign}
        />
        <StatsCard
          title="Affaires conclues"
          value={stats.affairesConclues}
          previousValue={stats.previousAffaires}
          currentValue={stats.affairesConclues}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Offres envoyées"
          value={stats.offresEnvoyeesTotal}
          previousValue={stats.previousOffresTotal}
          currentValue={stats.offresEnvoyeesTotal}
          icon={Send}
        />
        <StatsCard
          title="Biens proposés"
          value={stats.offresUniques}
          icon={Home}
          description="Offres uniques"
        />
        <StatsCard
          title="Nouveaux clients"
          value={stats.nouveauxClients}
          previousValue={stats.previousNouveauxClients}
          currentValue={stats.nouveauxClients}
          icon={Users}
        />
        <StatsCard
          title="Agents"
          value={stats.totalAgents}
          description={`${stats.agentsActifs} actif(s)`}
          icon={UserCog}
        />
      </div>

      {/* Candidatures / Postulations */}
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">Candidatures / Postulations</h3>
              <p className="text-xs text-muted-foreground">sur la période</p>
            </div>
          </div>
          <div className="flex gap-1.5" role="tablist" aria-label="Granularité">
            {(['day', 'week', 'month'] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? 'default' : 'outline'}
                className="h-9 flex-1 rounded-full px-4 sm:flex-none"
                onClick={() => setGranularity(g)}
              >
                {g === 'day' ? 'Jour' : g === 'week' ? 'Semaine' : 'Mois'}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Dépôts', value: candStats.depots },
            { label: 'Signatures', value: candStats.signatures },
            { label: 'Taux conversion', value: `${candStats.taux.toFixed(1)} %` },
            { label: 'Clés remises', value: candStats.cles },
            { label: 'Refus', value: candStats.refus },
            { label: 'En attente', value: candStats.attente },
          ].map((k) => (
            <div key={k.label} className="min-w-0 rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="truncate text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-border/70 pt-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Flux de postulations</p>
          <div className="h-[240px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={8}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="depots" name="Dépôts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="signatures" name="Signatures" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Graphiques : côte à côte sur PC, empilés sur mobile */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <MultiSeriesChart
          title="Activité globale"
          series={activitySeries}
          dateRange={dateRange}
        />
        <PerformanceChart
          title="Revenus de l'agence"
          data={revenusChartData}
          dateRange={dateRange}
          color="hsl(142, 76%, 36%)"
          valueLabel="CHF"
        />
      </div>

      {/* Classements */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <Leaderboard
          title="Top agents - Commissions"
          entries={agentLeaderboard}
          valueLabel="CHF"
          maxEntries={5}
        />
        <Leaderboard
          title="Top agents - Offres envoyées"
          entries={agentOffresLeaderboard}
          valueLabel="offres"
          maxEntries={5}
        />
      </div>
    </div>
  );
}
