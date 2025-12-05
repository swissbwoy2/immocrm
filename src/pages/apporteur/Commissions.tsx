import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

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
}

export default function Commissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_paye: 0,
    total_en_attente: 0,
    nombre_transactions: 0,
  });

  useEffect(() => {
    if (user) {
      loadCommissions();
    }
  }, [user]);

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
      
      const totalPaye = data?.filter(c => c.statut === 'paye').reduce((sum, c) => sum + (c.montant_commission || 0), 0) || 0;
      const totalEnAttente = data?.filter(c => c.statut === 'conclu').reduce((sum, c) => sum + (c.montant_commission || 0), 0) || 0;
      
      setStats({
        total_paye: totalPaye,
        total_en_attente: totalEnAttente,
        nombre_transactions: data?.filter(c => c.statut === 'paye').length || 0,
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Mes Commissions</h1>
        <p className="text-muted-foreground">
          Historique de vos commissions et paiements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payé</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">CHF {stats.total_paye.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.nombre_transactions} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">CHF {stats.total_en_attente.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">À recevoir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Global</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">CHF {(stats.total_paye + stats.total_en_attente).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Toutes commissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des commissions</CardTitle>
          <CardDescription>
            Détail de toutes vos commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune commission pour le moment</p>
              <p className="text-sm">Vos commissions apparaîtront ici une fois les affaires conclues</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div 
                  key={commission.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {commission.client_prenom} {commission.client_nom}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {typeAffaireLabels[commission.type_affaire] || commission.type_affaire}
                      {commission.montant_frais_agence && (
                        <span> • Frais agence: CHF {commission.montant_frais_agence.toFixed(2)}</span>
                      )}
                    </div>
                    {commission.date_conclusion && (
                      <div className="text-xs text-muted-foreground">
                        Conclu le {format(new Date(commission.date_conclusion), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-lg font-bold">
                      CHF {commission.montant_commission?.toFixed(2) || '0.00'}
                    </div>
                    {commission.statut === 'paye' ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Payé
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        En attente
                      </Badge>
                    )}
                    {commission.date_paiement && (
                      <div className="text-xs text-muted-foreground">
                        Payé le {format(new Date(commission.date_paiement), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    )}
                    {commission.reference_virement && (
                      <div className="text-xs text-muted-foreground">
                        Réf: {commission.reference_virement}
                      </div>
                    )}
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
