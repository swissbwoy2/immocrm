import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Wrench, TrendingUp, FileText, Plus, AlertTriangle, ArrowRight, HardHat, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { 
  PremiumKPICard, 
  PremiumAgentCard,
  PremiumEmptyState 
} from '@/components/premium';
import { PremiumProprietaireDashboardHeader } from '@/components/premium/PremiumProprietaireDashboardHeader';
import { PremiumImmeubleCard } from '@/components/premium/PremiumImmeubleCard';
import { PremiumTicketTechniqueCard } from '@/components/premium/PremiumTicketTechniqueCard';
import { PremiumProjetCard } from '@/components/premium/PremiumProjetCard';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { AddImmeubleDialog } from '@/components/proprietaire/AddImmeubleDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
export default function ProprietaireDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { counts } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [proprietaire, setProprietaire] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [projets, setProjets] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalImmeubles: 0,
    totalLots: 0,
    totalLocataires: 0,
    ticketsOuverts: 0,
    etatLocatifTotal: 0,
    tauxVacanceMoyen: 0,
    projetsEnCours: 0
  });
  const [showAddImmeubleDialog, setShowAddImmeubleDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      // Load proprietaire
      const { data: proprioData, error: proprioError } = await supabase
        .from('proprietaires')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (proprioError) throw proprioError;
      
      if (!proprioData) {
        setLoading(false);
        return;
      }
      
      setProprietaire(proprioData);

      // Load agent dédié
      if (proprioData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select(`
            *,
            profile:profiles!agents_user_id_fkey(
              prenom, nom, email, telephone, avatar_url
            )
          `)
          .eq('id', proprioData.agent_id)
          .maybeSingle();

        if (agentData?.profile) {
          setAgent({
            ...agentData,
            prenom: agentData.profile.prenom,
            nom: agentData.profile.nom,
            email: agentData.profile.email,
            telephone: agentData.profile.telephone,
            avatar_url: agentData.profile.avatar_url
          });
        }
      }

      // Load immeubles
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('*')
        .eq('proprietaire_id', proprioData.id)
        .order('created_at', { ascending: false });

      setImmeubles(immeublesData || []);

      // Calculate stats
      let totalLots = 0;
      let totalLocataires = 0;
      let etatLocatifTotal = 0;
      let tauxVacanceSum = 0;

      for (const immeuble of immeublesData || []) {
        etatLocatifTotal += immeuble.etat_locatif_annuel || 0;
        tauxVacanceSum += immeuble.taux_vacance || 0;

        // Count lots
        const { count: lotsCount } = await supabase
          .from('lots')
          .select('*', { count: 'exact', head: true })
          .eq('immeuble_id', immeuble.id);
        totalLots += lotsCount || 0;

        // Count locataires
        const { data: lotsData } = await supabase
          .from('lots')
          .select('id')
          .eq('immeuble_id', immeuble.id);

        if (lotsData) {
          for (const lot of lotsData) {
            const { count: locCount } = await supabase
              .from('locataires_immeuble')
              .select('*', { count: 'exact', head: true })
              .eq('lot_id', lot.id)
              .eq('statut', 'actif');
            totalLocataires += locCount || 0;
          }
        }
      }

      // Load tickets ouverts
      const immeublesIds = (immeublesData || []).map(i => i.id);
      let ticketsData: any[] = [];
      if (immeublesIds.length > 0) {
        const { data } = await supabase
          .from('tickets_techniques')
          .select('*')
          .in('immeuble_id', immeublesIds)
          .not('statut', 'in', '("clos","annule","resolu")')
          .order('created_at', { ascending: false })
          .limit(5);
        ticketsData = data || [];
      }
      setTickets(ticketsData);

      // Load projets de développement
      const { data: projetsData } = await supabase
        .from('projets_developpement')
        .select('*')
        .eq('proprietaire_id', proprioData.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setProjets(projetsData || []);

      const projetsEnCours = (projetsData || []).filter(
        p => !['termine', 'projet_refuse'].includes(p.statut)
      ).length;

      setStats({
        totalImmeubles: (immeublesData || []).length,
        totalLots,
        totalLocataires,
        ticketsOuverts: ticketsData.length,
        etatLocatifTotal,
        tauxVacanceMoyen: (immeublesData || []).length > 0 
          ? tauxVacanceSum / (immeublesData || []).length 
          : 0,
        projetsEnCours
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  if (!proprietaire) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-950/30 w-16 h-16 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Profil non configuré</h2>
            <p className="text-muted-foreground mb-4">
              Votre compte propriétaire n'est pas encore configuré. Veuillez contacter l'administration.
            </p>
            <Button onClick={loadData}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto relative">
      <FloatingParticles count={10} className="fixed inset-0 pointer-events-none z-0 opacity-20" />
      
      <div className="relative z-10 p-4 md:p-8">
        {/* Header */}
        <PremiumProprietaireDashboardHeader
          userName={profile?.prenom}
          immeubleCount={stats.totalImmeubles}
          ticketCount={stats.ticketsOuverts}
          messageCount={counts.new_message}
          onMessagesClick={() => navigate('/proprietaire/messagerie')}
          onTicketsClick={() => navigate('/proprietaire/tickets')}
          onCalendarClick={() => navigate('/proprietaire/calendrier')}
        />

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <PremiumKPICard
            title="Immeubles"
            value={stats.totalImmeubles}
            icon={Building2}
            onClick={() => navigate('/proprietaire/immeubles')}
          />
          <PremiumKPICard
            title="Lots"
            value={stats.totalLots}
            icon={Building2}
            onClick={() => navigate('/proprietaire/immeubles')}
          />
          <PremiumKPICard
            title="Locataires"
            value={stats.totalLocataires}
            icon={Users}
            onClick={() => navigate('/proprietaire/locataires')}
          />
          <PremiumKPICard
            title="Projets"
            value={stats.projetsEnCours}
            icon={HardHat}
            variant={stats.projetsEnCours > 0 ? 'success' : 'default'}
            onClick={() => navigate('/proprietaire/projets-developpement')}
          />
          <PremiumKPICard
            title="Tickets ouverts"
            value={stats.ticketsOuverts}
            icon={Wrench}
            variant={stats.ticketsOuverts > 0 ? 'warning' : 'default'}
            onClick={() => navigate('/proprietaire/tickets')}
          />
        </div>

        {/* Financial Summary */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">État locatif annuel</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(stats.etatLocatifTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Taux de vacance moyen</p>
                <p className={`text-2xl font-bold ${stats.tauxVacanceMoyen > 10 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {stats.tauxVacanceMoyen.toFixed(1)}%
                </p>
              </div>
              <Button onClick={() => navigate('/proprietaire/comptabilite')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Voir comptabilité
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Vente Section - visible if properties in sale mode */}
          {immeubles.filter(i => i.mode_exploitation === 'vente' || i.mode_exploitation === 'les_deux').length > 0 && (
            <div className="lg:col-span-3 mb-2">
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background dark:border-emerald-800/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <Tag className="w-5 h-5" />
                      Vente de votre bien
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => navigate('/proprietaire/vente')}>
                      Suivre ma vente
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Vous avez {immeubles.filter(i => i.mode_exploitation === 'vente' || i.mode_exploitation === 'les_deux').length} bien(s) en cours de vente. 
                    Consultez l'avancement et les offres reçues.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Immeubles */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Mes biens
              </h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/proprietaire/immeubles')}>
                Voir tout
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {immeubles.length === 0 ? (
              <PremiumEmptyState
                icon={Building2}
                title="Aucun immeuble"
                description="Vous n'avez pas encore d'immeuble enregistré."
                action={
                <Button onClick={() => setShowAddImmeubleDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un immeuble
                  </Button>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {immeubles.slice(0, 4).map((immeuble) => (
                  <PremiumImmeubleCard
                    key={immeuble.id}
                    immeuble={immeuble}
                    lotsCount={immeuble.nb_unites || 0}
                    onView={() => navigate(`/proprietaire/immeubles/${immeuble.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent dédié */}
            {agent && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Mon agent
                </h3>
                <PremiumAgentCard
                  agent={agent}
                  onMessage={() => navigate('/proprietaire/messagerie')}
                />
              </div>
            )}

            {/* Tickets récents */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Tickets récents
                </h3>
                {tickets.length > 0 && (
                  <Badge variant="secondary">{tickets.length}</Badge>
                )}
              </div>

              {tickets.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">Aucun ticket en cours</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tickets.slice(0, 3).map((ticket) => (
                    <PremiumTicketTechniqueCard
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() => navigate(`/proprietaire/tickets?ticketId=${ticket.id}`)}
                    />
                  ))}
                  {tickets.length > 3 && (
                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => navigate('/proprietaire/tickets')}
                    >
                      Voir tous les tickets ({tickets.length})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Projets de développement */}
            {projets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-primary" />
                    Projets
                  </h3>
                  <Badge variant="secondary">{projets.length}</Badge>
                </div>
                <div className="space-y-3">
                  {projets.slice(0, 2).map((projet) => (
                    <PremiumProjetCard
                      key={projet.id}
                      projet={projet}
                      onClick={() => navigate(`/proprietaire/projets-developpement/${projet.id}`)}
                    />
                  ))}
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => navigate('/proprietaire/projets-developpement')}
                  >
                    Voir tous les projets
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/proprietaire/projets-developpement')}
                >
                  <HardHat className="w-4 h-4 mr-2" />
                  Nouveau projet
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowAddImmeubleDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un immeuble
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/proprietaire/tickets/nouveau')}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Créer un ticket
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/proprietaire/documents')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Mes documents
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog pour ajouter un bien */}
      {proprietaire && (
        <AddImmeubleDialog
          open={showAddImmeubleDialog}
          onOpenChange={setShowAddImmeubleDialog}
          proprietaireId={proprietaire.id}
          onSuccess={() => {
            setShowAddImmeubleDialog(false);
            loadData();
          }}
        />
      )}
    </PullToRefresh>
  );
}
