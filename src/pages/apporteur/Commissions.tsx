import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfYear, endOfYear, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DollarSign, TrendingUp, Clock, CheckCircle, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ReferralTimeline } from '@/components/ReferralTimeline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CommissionData {
  id: string;
  client_nom: string;
  client_prenom: string | null;
  type_affaire: string;
  montant_frais_agence: number | null;
  montant_commission: number | null;
  statut: string;
  date_conclusion: string | null;
  date_paiement: string | null;
  reference_virement: string | null;
  created_at: string;
}

interface MonthlyData {
  month: string;
  amount: number;
}

export default function Commissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState({
    total_paye: 0,
    total_en_attente: 0,
    nombre_transactions: 0,
    last_year_total: 0,
  });

  useEffect(() => {
    if (user) {
      loadCommissions();
    }
  }, [user, yearFilter]);

  const loadCommissions = async () => {
    try {
      const { data: apporteur } = await supabase
        .from('apporteurs')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!apporteur) return;

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('apporteur_id', apporteur.id)
        .in('statut', ['conclu', 'paye'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCommissions(data || []);
      
      // Calculate stats
      const currentYearStart = startOfYear(new Date(parseInt(yearFilter), 0, 1));
      const currentYearEnd = endOfYear(new Date(parseInt(yearFilter), 0, 1));
      const lastYearStart = startOfYear(subYears(currentYearStart, 1));
      const lastYearEnd = endOfYear(subYears(currentYearStart, 1));

      const currentYearData = data?.filter(c => {
        const date = c.date_paiement ? parseISO(c.date_paiement) : parseISO(c.created_at);
        return date >= currentYearStart && date <= currentYearEnd;
      }) || [];

      const lastYearData = data?.filter(c => {
        const date = c.date_paiement ? parseISO(c.date_paiement) : parseISO(c.created_at);
        return date >= lastYearStart && date <= lastYearEnd && c.statut === 'paye';
      }) || [];

      const totalPaye = currentYearData.filter(c => c.statut === 'paye').reduce((sum, c) => sum + (c.montant_commission || 0), 0);
      const totalEnAttente = currentYearData.filter(c => c.statut === 'conclu').reduce((sum, c) => sum + (c.montant_commission || 0), 0);
      const lastYearTotal = lastYearData.reduce((sum, c) => sum + (c.montant_commission || 0), 0);
      
      setStats({
        total_paye: totalPaye,
        total_en_attente: totalEnAttente,
        nombre_transactions: currentYearData.filter(c => c.statut === 'paye').length,
        last_year_total: lastYearTotal,
      });

      // Calculate monthly data for chart
      const monthlyCommissions: Record<string, number> = {};
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      months.forEach(m => monthlyCommissions[m] = 0);

      currentYearData.filter(c => c.statut === 'paye' && c.date_paiement).forEach(c => {
        const date = parseISO(c.date_paiement!);
        const monthIndex = date.getMonth();
        monthlyCommissions[months[monthIndex]] += c.montant_commission || 0;
      });

      setMonthlyData(months.map(month => ({
        month,
        amount: monthlyCommissions[month],
      })));

    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const typeAffaireLabels: Record<string, string> = {
    vente: 'Vente',
    achat: 'Achat',
    location: 'Location',
    mise_en_location: 'Mise en location',
  };

  const yearChange = stats.last_year_total > 0 
    ? ((stats.total_paye - stats.last_year_total) / stats.last_year_total * 100).toFixed(1)
    : '0';

  const filteredCommissions = commissions.filter(c => {
    const date = c.date_paiement ? parseISO(c.date_paiement) : parseISO(c.created_at);
    return date.getFullYear().toString() === yearFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes Commissions</h1>
          <p className="text-muted-foreground">
            Historique de vos commissions et paiements
          </p>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[120px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payé</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              <AnimatedCounter value={stats.total_paye} prefix="CHF " decimals={0} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.nombre_transactions} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              <AnimatedCounter value={stats.total_en_attente} prefix="CHF " decimals={0} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">À recevoir</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Global</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <AnimatedCounter value={stats.total_paye + stats.total_en_attente} prefix="CHF " decimals={0} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{yearFilter}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">vs Année précédente</CardTitle>
            {parseFloat(yearChange) >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${parseFloat(yearChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(yearChange) >= 0 ? '+' : ''}{yearChange}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {parseInt(yearFilter) - 1}: CHF {stats.last_year_total.toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution mensuelle {yearFilter}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`CHF ${value.toFixed(2)}`, 'Commission']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Commissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des commissions</CardTitle>
          <CardDescription>
            Détail de toutes vos commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune commission pour {yearFilter}</p>
              <p className="text-sm">Vos commissions apparaîtront ici une fois les affaires conclues</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCommissions.map((commission) => (
                <div 
                  key={commission.id} 
                  className="p-4 border rounded-lg hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-lg">
                          {commission.client_prenom} {commission.client_nom}
                        </span>
                        <Badge variant="outline">
                          {typeAffaireLabels[commission.type_affaire] || commission.type_affaire}
                        </Badge>
                      </div>
                      
                      {commission.montant_frais_agence && (
                        <p className="text-sm text-muted-foreground">
                          Frais agence: CHF {commission.montant_frais_agence.toFixed(2)}
                        </p>
                      )}
                      
                      {commission.date_conclusion && (
                        <p className="text-xs text-muted-foreground">
                          Conclu le {format(new Date(commission.date_conclusion), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      )}

                      <div className="max-w-xs mt-2">
                        <ReferralTimeline statut={commission.statut} compact />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-2xl font-bold text-primary">
                        CHF {commission.montant_commission?.toFixed(2) || '0.00'}
                      </div>
                      {commission.statut === 'paye' ? (
                        <Badge className="bg-green-500 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Payé
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          En attente
                        </Badge>
                      )}
                      {commission.date_paiement && (
                        <span className="text-xs text-muted-foreground">
                          Payé le {format(new Date(commission.date_paiement), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                      {commission.reference_virement && (
                        <span className="text-xs text-muted-foreground font-mono">
                          Réf: {commission.reference_virement}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
