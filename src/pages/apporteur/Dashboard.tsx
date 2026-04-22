import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, Clock, CheckCircle, Copy, Link, TrendingUp, Sparkles } from 'lucide-react';
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
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  const handleRefresh = useCallback(async () => {
    await loadApporteurData();
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh} className="space-y-6 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      {/* Header avec dégradé animé */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 animate-fade-in">
        {/* Particules flottantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-float-particle" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-4 left-20 w-16 h-16 bg-accent/10 rounded-full blur-2xl animate-float-particle" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-primary/5 rounded-full blur-xl animate-float-particle" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
            <span className="text-sm font-medium text-primary/80 uppercase tracking-wider">Espace Apporteur</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Bienvenue dans votre espace apporteur d'affaires. Suivez vos referrals et commissions.
          </p>
        </div>
      </div>

      {/* Code Parrainage avec glassmorphism */}
      <Card className="relative overflow-hidden border-primary/20 animate-fade-in group" style={{ animationDelay: '100ms' }}>
        {/* Effet shine au hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
        
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:scale-110 transition-transform duration-300">
              <Link className="h-5 w-5 text-primary" />
            </div>
            <span className="group-hover:translate-x-1 transition-transform duration-300">Votre lien de parrainage</span>
          </CardTitle>
          <CardDescription>
            Partagez ce lien avec vos contacts pour référer de nouveaux clients
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Code parrainage</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="glass-morphism px-4 py-2 rounded-lg font-mono text-lg flex-1 border border-primary/20 animate-glow-breathe">
                  {apporteur?.code_parrainage}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apporteur?.code_parrainage || '')}
                  className="hover:scale-110 hover:bg-primary/10 transition-all duration-300"
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
                className="flex-1 glass-morphism px-4 py-2 rounded-lg text-sm border border-border/50 focus:border-primary/50 transition-colors"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralLink)}
                className="hover:scale-110 hover:bg-primary/10 transition-all duration-300"
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

      {/* Stats Cards avec effets modernes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden animate-fade-in hover:shadow-lg hover:shadow-primary/10 transition-all duration-500" style={{ animationDelay: '150ms' }}>
          {/* Bordure gradient animée */}
          <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-border-gradient bg-[length:200%_100%]" />
          <div className="absolute inset-[1px] rounded-lg bg-card" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold group-hover:scale-105 transition-transform duration-300 origin-left animate-glow-breathe">{stats.total_referrals}</div>
            <p className="text-xs text-muted-foreground mt-1">Clients référés</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden animate-fade-in hover:shadow-lg hover:shadow-warning/10 transition-all duration-500" style={{ animationDelay: '200ms' }}>
          <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-r from-warning/50 via-orange-400/50 to-warning/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-border-gradient bg-[length:200%_100%]" />
          <div className="absolute inset-[1px] rounded-lg bg-card" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-warning/20 to-warning/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold group-hover:scale-105 transition-transform duration-300 origin-left">{stats.referrals_en_attente}</div>
            <p className="text-xs text-muted-foreground mt-1">Referrals en cours</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden animate-fade-in hover:shadow-lg hover:shadow-success/10 transition-all duration-500" style={{ animationDelay: '250ms' }}>
          <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-r from-success/50 via-emerald-400/50 to-success/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-border-gradient bg-[length:200%_100%]" />
          <div className="absolute inset-[1px] rounded-lg bg-card" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commissions gagnées</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-success/20 to-success/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-success group-hover:scale-105 transition-transform duration-300 origin-left">CHF {stats.total_commissions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total versé</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden animate-fade-in hover:shadow-lg hover:shadow-primary/10 transition-all duration-500" style={{ animationDelay: '300ms' }}>
          <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-r from-primary/50 via-blue-400/50 to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-border-gradient bg-[length:200%_100%]" />
          <div className="absolute inset-[1px] rounded-lg bg-card" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente paiement</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold group-hover:scale-105 transition-transform duration-300 origin-left">CHF {stats.commissions_en_attente.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">À recevoir</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions avec glassmorphism */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="group relative overflow-hidden animate-fade-in hover:shadow-xl transition-all duration-500" style={{ animationDelay: '350ms' }}>
          {/* Effet shine */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
          
          <CardHeader className="relative">
            <CardTitle className="group-hover:translate-x-1 transition-transform duration-300">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-2">
            <Button className="w-full justify-start bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-primary/20" asChild>
              <a href="/apporteur/soumettre-client">
                <Users className="mr-2 h-4 w-4" />
                Soumettre un nouveau client
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start hover:scale-[1.02] hover:bg-muted/50 transition-all duration-300" asChild>
              <a href="/apporteur/mes-referrals">
                <CheckCircle className="mr-2 h-4 w-4" />
                Voir mes referrals
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start hover:scale-[1.02] hover:bg-muted/50 transition-all duration-300" asChild>
              <a href="/apporteur/commissions">
                <DollarSign className="mr-2 h-4 w-4" />
                Historique des commissions
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden animate-fade-in hover:shadow-xl transition-all duration-500" style={{ animationDelay: '400ms' }}>
          {/* Background gradient subtil */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="relative">
            <CardTitle className="group-hover:translate-x-1 transition-transform duration-300">Rappel des conditions</CardTitle>
            <CardDescription>Article 2 de votre contrat</CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-2 text-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span>Commission</span>
                <span className="font-bold text-primary">{apporteur?.taux_commission ?? 10}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span>Minimum vente</span>
                <span className="font-bold">CHF {apporteur?.minimum_vente ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span>Minimum location</span>
                <span className="font-bold">CHF {apporteur?.minimum_location ?? 0}</span>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 pt-3 border-t border-border/50">
              La commission est payable dès la conclusion de la vente ou du bail.
            </p>
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}
