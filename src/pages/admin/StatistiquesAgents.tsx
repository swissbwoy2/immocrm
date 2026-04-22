import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, DollarSign, TrendingUp, Award, Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';

interface AgentStats {
  agent_id: string;
  agent_name: string;
  total_clients: number;
  total_commissions: number;
  total_transactions: number;
  total_offers: number;
  total_visits: number;
  avg_commission: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function StatistiquesAgents() {
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get all agents with their user profiles
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, user_id, profiles!agents_user_id_fkey(prenom, nom)');

      if (!agentsData) return;

      // Calculate date filter
      const now = new Date();
      let dateFilter: Date | null = null;
      switch (dateRange) {
        case 'month':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          dateFilter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          dateFilter = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const agentStats: AgentStats[] = await Promise.all(
        agentsData.map(async (agent: any) => {
          // Count clients via client_agents - EXCLURE les clients relogés (mandats terminés)
          const { count: clientsCount } = await supabase
            .from('client_agents')
            .select('*, clients!inner(statut)', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .neq('clients.statut', 'reloge');

          // Get transactions
          let transactionsQuery = supabase
            .from('transactions')
            .select('commission_totale, part_agent')
            .eq('agent_id', agent.id);

          if (dateFilter) {
            transactionsQuery = transactionsQuery.gte('date_transaction', dateFilter.toISOString());
          }

          const { data: transactionsData } = await transactionsQuery;

          const totalCommissions = transactionsData?.reduce((sum, t) => sum + (t.part_agent || 0), 0) || 0;
          const totalTransactions = transactionsData?.length || 0;

          // Count offers
          let offersQuery = supabase
            .from('offres')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id);

          if (dateFilter) {
            offersQuery = offersQuery.gte('date_envoi', dateFilter.toISOString());
          }

          const { count: offersCount } = await offersQuery;

          // Count visits
          let visitsQuery = supabase
            .from('visites')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id);

          if (dateFilter) {
            visitsQuery = visitsQuery.gte('date_visite', dateFilter.toISOString());
          }

          const { count: visitsCount } = await visitsQuery;

          return {
            agent_id: agent.id,
            agent_name: `${agent.profiles?.prenom || ''} ${agent.profiles?.nom || ''}`.trim() || 'Agent',
            total_clients: clientsCount || 0,
            total_commissions: totalCommissions,
            total_transactions: totalTransactions,
            total_offers: offersCount || 0,
            total_visits: visitsCount || 0,
            avg_commission: totalTransactions > 0 ? totalCommissions / totalTransactions : 0,
          };
        })
      );

      // Sort by total commissions
      agentStats.sort((a, b) => b.total_commissions - a.total_commissions);
      setStats(agentStats);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Agent', 'Clients', 'Transactions', 'Commissions (CHF)', 'Offres', 'Visites', 'Comm. Moyenne (CHF)'];
    const rows = stats.map(s => [
      s.agent_name,
      s.total_clients,
      s.total_transactions,
      s.total_commissions.toFixed(2),
      s.total_offers,
      s.total_visits,
      s.avg_commission.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-agents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalCommissions = stats.reduce((sum, s) => sum + s.total_commissions, 0);
  const totalTransactions = stats.reduce((sum, s) => sum + s.total_transactions, 0);
  const totalClients = stats.reduce((sum, s) => sum + s.total_clients, 0);

  const chartData = stats.map(s => ({
    name: s.agent_name.split(' ')[0], // First name only for chart
    commissions: s.total_commissions,
    transactions: s.total_transactions,
  }));

  const pieData = stats.map(s => ({
    name: s.agent_name,
    value: s.total_commissions,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-primary">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PremiumPageHeader
        title="Statistiques des Agents"
        subtitle="Performances et commissions par agent"
        icon={BarChart3}
        badge="Analytics"
        action={
          <div className="flex gap-2 flex-wrap">
            {(['month', 'quarter', 'year', 'all'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                onClick={() => setDateRange(range)}
                size="sm"
              >
                {range === 'month' && 'Mois'}
                {range === 'quarter' && 'Trimestre'}
                {range === 'year' && 'Année'}
                {range === 'all' && 'Total'}
              </Button>
            ))}
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PremiumKPICard
          title="Total Clients"
          value={totalClients}
          icon={Users}
          delay={0}
        />
        <PremiumKPICard
          title="Total Transactions"
          value={totalTransactions}
          icon={TrendingUp}
          variant="success"
          delay={50}
        />
        <PremiumKPICard
          title="Total Commissions"
          value={`${totalCommissions.toLocaleString('fr-CH')} CHF`}
          icon={DollarSign}
          variant="success"
          delay={100}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-interactive animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <CardTitle>Commissions par Agent</CardTitle>
            <CardDescription>Comparaison des performances</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="commissions" fill="#8884d8" name="Commissions (CHF)" />
                <Bar dataKey="transactions" fill="#82ca9d" name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-interactive animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Répartition des Commissions</CardTitle>
            <CardDescription>Part de chaque agent</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name.split(' ')[0]}: ${((entry.value / totalCommissions) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card className="card-interactive animate-fade-in" style={{ animationDelay: '250ms' }}>
        <CardHeader>
          <CardTitle>Performances Détaillées</CardTitle>
          <CardDescription>Statistiques complètes par agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rang</th>
                  <th className="text-left p-2">Agent</th>
                  <th className="text-right p-2">Clients</th>
                  <th className="text-right p-2">Transactions</th>
                  <th className="text-right p-2">Offres</th>
                  <th className="text-right p-2">Visites</th>
                  <th className="text-right p-2">Commissions</th>
                  <th className="text-right p-2">Comm. Moy.</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((agent, index) => (
                  <tr key={agent.agent_id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {index === 0 && <Award className="h-5 w-5 text-yellow-500 inline" />}
                      {index === 1 && <Award className="h-5 w-5 text-gray-400 inline" />}
                      {index === 2 && <Award className="h-5 w-5 text-amber-600 inline" />}
                      {index > 2 && <span className="ml-1">{index + 1}</span>}
                    </td>
                    <td className="p-2 font-medium">{agent.agent_name}</td>
                    <td className="text-right p-2">{agent.total_clients}</td>
                    <td className="text-right p-2">
                      <Badge variant="default">{agent.total_transactions}</Badge>
                    </td>
                    <td className="text-right p-2">{agent.total_offers}</td>
                    <td className="text-right p-2">{agent.total_visits}</td>
                    <td className="text-right p-2 font-bold text-green-600">
                      {agent.total_commissions.toLocaleString('fr-CH')} CHF
                    </td>
                    <td className="text-right p-2 text-muted-foreground">
                      {agent.avg_commission.toLocaleString('fr-CH')} CHF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
