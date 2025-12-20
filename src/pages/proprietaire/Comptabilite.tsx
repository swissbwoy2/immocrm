import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, Download, Filter, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumTransactionComptableCard } from '@/components/premium/PremiumTransactionComptableCard';
import { AddTransactionDialog } from '@/components/proprietaire/AddTransactionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Comptabilite() {
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [selectedImmeuble, setSelectedImmeuble] = useState<string>('all');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('year');
  
  const [stats, setStats] = useState({
    totalRecettes: 0,
    totalCharges: 0,
    solde: 0
  });

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get proprietaire
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!proprio) {
        setLoading(false);
        return;
      }

      // Load immeubles
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id);

      setImmeubles(immeublesData || []);

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Build query
      const immeublesIds = (immeublesData || []).map(i => i.id);
      if (immeublesIds.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('transactions_comptables')
        .select('*')
        .in('immeuble_id', immeublesIds)
        .gte('date_transaction', startDate.toISOString().split('T')[0])
        .order('date_transaction', { ascending: false });

      if (selectedImmeuble !== 'all') {
        query = query.eq('immeuble_id', selectedImmeuble);
      }

      if (selectedCategorie !== 'all') {
        query = query.eq('categorie', selectedCategorie);
      }

      const { data: transactionsData, error } = await query;

      if (error) throw error;

      // Enrich with immeuble names
      const enrichedTransactions = (transactionsData || []).map(t => ({
        ...t,
        immeuble_nom: immeublesData?.find(i => i.id === t.immeuble_id)?.nom
      }));

      setTransactions(enrichedTransactions);

      // Calculate stats
      let totalRecettes = 0;
      let totalCharges = 0;

      for (const t of enrichedTransactions) {
        totalRecettes += t.credit || 0;
        totalCharges += t.debit || 0;
      }

      setStats({
        totalRecettes,
        totalCharges,
        solde: totalRecettes - totalCharges
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user, selectedImmeuble, selectedCategorie, selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Comptabilité"
        subtitle="Suivi financier de votre patrimoine immobilier"
        icon={DollarSign}
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle écriture
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recettes</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRecettes)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/20">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-transparent border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Charges</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalCharges)}</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/20">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${stats.solde >= 0 ? 'from-primary/10 border-primary/20' : 'from-orange-500/10 border-orange-200/50'} to-transparent`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Solde</p>
                <p className={`text-2xl font-bold ${stats.solde >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                  {formatCurrency(stats.solde)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stats.solde >= 0 ? 'bg-primary/20' : 'bg-orange-500/20'}`}>
                <DollarSign className={`w-6 h-6 ${stats.solde >= 0 ? 'text-primary' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full md:w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedImmeuble} onValueChange={setSelectedImmeuble}>
              <SelectTrigger className="w-full md:w-48">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Immeuble" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les immeubles</SelectItem>
                {immeubles.map(imm => (
                  <SelectItem key={imm.id} value={imm.id}>{imm.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="recette">Recettes</SelectItem>
                <SelectItem value="charge_courante">Charges courantes</SelectItem>
                <SelectItem value="charge_entretien">Entretien</SelectItem>
                <SelectItem value="charge_financiere">Charges financières</SelectItem>
                <SelectItem value="investissement">Investissements</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <PremiumEmptyState
          icon={DollarSign}
          title="Aucune transaction"
          description="Aucune écriture comptable pour la période sélectionnée."
          action={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une écriture
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Transactions ({transactions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {transactions.map((transaction) => (
                <PremiumTransactionComptableCard
                  key={transaction.id}
                  transaction={transaction}
                  immeubleName={transaction.immeuble_nom}
                  onClick={() => navigate(`/proprietaire/comptabilite/${transaction.id}`)}
                  className="rounded-none border-0"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AddTransactionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadData}
      />
    </div>
  );
}
