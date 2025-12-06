import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, Clock, CheckCircle, Copy, Link, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApporteurStats {
  total_referrals: number;
  referrals_en_attente: number;
  referrals_valides: number;
  referrals_payes: number;
  total_commissions: number;
  commissions_en_attente: number;
}

interface ApporteurData {
  id: string;
  code_parrainage: string;
  date_expiration: string | null;
  statut: string;
  contrat_signe: boolean;
  taux_commission: number | null;
  minimum_vente: number | null;
  minimum_location: number | null;
}

export default function ApporteurDashboard() {
  const { user } = useAuth();
  const [apporteur, setApporteur] = useState<ApporteurData | null>(null);
  const [stats, setStats] = useState<ApporteurStats>({
    total_referrals: 0,
    referrals_en_attente: 0,
    referrals_valides: 0,
    referrals_payes: 0,
    total_commissions: 0,
    commissions_en_attente: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApporteurData();
    }
  }, [user]);

  const loadApporteurData = async () => {
    try {
      // Load apporteur data
      const { data: apporteurData, error: apporteurError } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (apporteurError) throw apporteurError;
      setApporteur(apporteurData);

      // Load referrals stats
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('apporteur_id', apporteurData.id);

      if (referralsError) throw referralsError;

      const statsData: ApporteurStats = {
        total_referrals: referrals?.length || 0,
        referrals_en_attente: referrals?.filter(r => r.statut === 'soumis' || r.statut === 'valide').length || 0,
        referrals_valides: referrals?.filter(r => r.statut === 'valide' || r.statut === 'conclu').length || 0,
        referrals_payes: referrals?.filter(r => r.statut === 'paye').length || 0,
        total_commissions: referrals?.filter(r => r.statut === 'paye').reduce((sum, r) => sum + (r.montant_commission || 0), 0) || 0,
        commissions_en_attente: referrals?.filter(r => r.statut === 'conclu').reduce((sum, r) => sum + (r.montant_commission || 0), 0) || 0,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error loading apporteur data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier !');
  };

  const referralLink = apporteur ? `${window.location.origin}/nouveau-mandat?ref=${apporteur.code_parrainage}` : '';

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
        <h1 className="text-3xl font-bold">Tableau de bord Apporteur</h1>
        <p className="text-muted-foreground">
          Bienvenue dans votre espace apporteur d'affaires
        </p>
      </div>

      {/* Code Parrainage */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 card-interactive animate-fade-in" style={{ animationDelay: '0ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 transition-transform duration-300 group-hover:translate-x-1">
            <Link className="h-5 w-5" />
            Votre lien de parrainage
          </CardTitle>
          <CardDescription>
            Partagez ce lien avec vos contacts pour référer de nouveaux clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Code parrainage</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-background px-4 py-2 rounded-lg font-mono text-lg flex-1">
                  {apporteur?.code_parrainage}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apporteur?.code_parrainage || '')}
                  className="hover:scale-110 transition-transform"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground">Lien complet</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-background px-4 py-2 rounded-lg text-sm border"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralLink)}
                className="hover:scale-110 transition-transform"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {apporteur?.date_expiration && (
            <p className="text-sm text-muted-foreground">
              Contrat valide jusqu'au {format(new Date(apporteur.date_expiration), 'dd MMMM yyyy', { locale: fr })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group card-interactive animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold transition-transform duration-300 group-hover:scale-105 origin-left">{stats.total_referrals}</div>
            <p className="text-xs text-muted-foreground">Clients référés</p>
          </CardContent>
        </Card>

        <Card className="group card-interactive animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <div className="p-2 rounded-lg bg-warning/10 transition-transform duration-300 group-hover:scale-110">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold transition-transform duration-300 group-hover:scale-105 origin-left">{stats.referrals_en_attente}</div>
            <p className="text-xs text-muted-foreground">Referrals en cours</p>
          </CardContent>
        </Card>

        <Card className="group card-interactive animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commissions gagnées</CardTitle>
            <div className="p-2 rounded-lg bg-success/10 transition-transform duration-300 group-hover:scale-110">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success transition-transform duration-300 group-hover:scale-105 origin-left">CHF {stats.total_commissions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total versé</p>
          </CardContent>
        </Card>

        <Card className="group card-interactive animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente paiement</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold transition-transform duration-300 group-hover:scale-105 origin-left">CHF {stats.commissions_en_attente.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">À recevoir</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-interactive animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CardHeader>
            <CardTitle className="transition-transform duration-300 group-hover:translate-x-1">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start hover:scale-[1.02] transition-transform" asChild>
              <a href="/apporteur/soumettre-client">
                <Users className="mr-2 h-4 w-4" />
                Soumettre un nouveau client
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start hover:scale-[1.02] transition-transform" asChild>
              <a href="/apporteur/mes-referrals">
                <CheckCircle className="mr-2 h-4 w-4" />
                Voir mes referrals
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start hover:scale-[1.02] transition-transform" asChild>
              <a href="/apporteur/commissions">
                <DollarSign className="mr-2 h-4 w-4" />
                Historique des commissions
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-interactive animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="transition-transform duration-300 group-hover:translate-x-1">Rappel des conditions</CardTitle>
            <CardDescription>Article 2 de votre contrat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Commission : <strong>{apporteur?.taux_commission ?? 10}%</strong> des frais d'agence</p>
            <p>• Minimum vente : <strong>CHF {apporteur?.minimum_vente ?? 0}</strong></p>
            <p>• Minimum location : <strong>CHF {apporteur?.minimum_location ?? 0}</strong></p>
            <p className="text-muted-foreground mt-4">
              La commission est payable dès la conclusion de la vente ou du bail.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
