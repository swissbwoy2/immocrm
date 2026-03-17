import { useEffect, useState, useCallback } from 'react';
import { Users, UserCog, Clock, CheckCircle, AlertTriangle, DollarSign, Send, Bell, Power, Sparkles } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { calculateDaysElapsed } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { AdminStatsSection } from '@/components/stats/AdminStatsSection';
import { RecommendationStats } from '@/components/stats/RecommendationStats';
import { PremiumKPICard } from '@/components/premium';
import { AgencyProjectionSection } from '@/components/admin/AgencyProjectionSection';

const adminMenu = [
  { name: 'Tableau de bord', icon: Users, path: '/admin' },
  { name: 'Agents', icon: UserCog, path: '/admin/agents' },
  { name: 'Clients', icon: Users, path: '/admin/clients' },
  { name: 'Transactions', icon: DollarSign, path: '/admin/transactions' },
  { name: 'Assignations', icon: AlertTriangle, path: '/admin/assignations' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { counts } = useNotifications();

  const [agents, setAgents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [offres, setOffres] = useState<any[]>([]);
  const [clientAgents, setClientAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load agents (tous les agents)
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id, statut');

      if (agentsError) throw agentsError;

      // Load profiles separately (inclure actif)
      const userIds = agentsData?.map(a => a.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, actif')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      
      const transformedAgents = agentsData?.map(agent => {
        const profile = profilesMap.get(agent.user_id);
        return {
          id: agent.id,
          user_id: agent.user_id,
          actif: profile?.actif ?? false,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
        };
      }) || [];
      
      setAgents(transformedAgents);

      // === PARALLEL: Load clients, client_agents, transactions, offres simultaneously ===
      const [clientsResult, clientAgentsResult, transactionsCountResult, transactionsRecentResult, offresCountResult] = await Promise.all([
        // Clients with reduced columns
        supabase
          .from('clients')
          .select('id, user_id, agent_id, statut, budget_max, date_ajout, created_at, demande_mandat_id, type_recherche, pieces, region_recherche, commission_split'),
        // Client agents
        supabase
          .from('client_agents')
          .select('client_id, agent_id, commission_split, is_primary'),
        // Transactions: count-only for stats
        supabase
          .from('transactions')
          .select('*', { count: 'exact', head: false }),
        // Transactions: recent 50 for UI display
        supabase
          .from('transactions')
          .select('*')
          .order('date_transaction', { ascending: false })
          .limit(200),
        // Offres: count-only — we only need the total count for dashboard KPI
        supabase
          .from('offres')
          .select('*', { count: 'exact', head: true }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (clientAgentsResult.error) throw clientAgentsResult.error;
      if (transactionsCountResult.error) throw transactionsCountResult.error;

      // Process clients
      const clientsData = clientsResult.data || [];
      const clientUserIds = clientsData.map(c => c.user_id).filter(Boolean);
      
      const [clientProfilesResult, demandesResult] = await Promise.all([
        clientUserIds.length > 0
          ? supabase.from('profiles').select('id, nom, prenom').in('id', clientUserIds)
          : Promise.resolve({ data: [], error: null }),
        (() => {
          const demandeIds = clientsData.map(c => c.demande_mandat_id).filter(Boolean) as string[];
          return demandeIds.length > 0
            ? supabase.from('demandes_mandat').select('id, prenom, nom').in('id', demandeIds)
            : Promise.resolve({ data: [], error: null });
        })(),
      ]);

      const clientProfilesMap = new Map((clientProfilesResult.data || []).map(p => [p.id, p]));
      const demandesMap = new Map((demandesResult.data || []).map(d => [d.id, d]));

      const transformedClients = clientsData.map(client => {
        const profile = clientProfilesMap.get(client.user_id);
        const demande = client.demande_mandat_id ? demandesMap.get(client.demande_mandat_id) : undefined;
        return {
          ...client,
          prenom: profile?.prenom || demande?.prenom || '',
          nom: profile?.nom || demande?.nom || '',
          dateInscription: client.date_ajout || client.created_at,
          agentId: client.agent_id,
          budgetMax: client.budget_max || 0,
          notificationJ60Envoyee: false,
        };
      });

      setClients(transformedClients);
      setClientAgents(clientAgentsResult.data || []);

      // Use all transactions data (the non-head query returns actual rows)
      const transactionsData = transactionsCountResult.data || [];
      const transformedTransactions = transactionsData.map(t => ({
        ...t,
        dateConclusion: t.date_transaction,
        partAgence: t.part_agence,
        commissionTotale: t.commission_totale,
      }));
      setTransactions(transformedTransactions);

      // For offres, we only store the count — create a minimal array for length checks
      const offresCount = offresCountResult.count || 0;
      setOffres(new Array(offresCount) as any[]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAgentStatus = async (agentUserId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ actif: !currentStatus })
        .eq('id', agentUserId);

      if (error) throw error;

      // Mettre à jour l'état local
      setAgents(prev => prev.map(agent => 
        agent.user_id === agentUserId 
          ? { ...agent, actif: !currentStatus }
          : agent
      ));

      toast.success(`Agent ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  const clientsActifs = clients.filter(c => calculateDaysElapsed(c.dateInscription) <= 90).length;
  const totalAgents = agents.length;
  const agentsActifs = agents.filter(a => a.actif).length;
  const totalOffresEnvoyees = offres.length;
  const transactionsEnCours = transactions.filter(t => t.statut === 'en_cours').length;
  const transactionsConcluesMois = transactions.filter(t => {
    if (t.statut !== 'conclue' || !t.date_transaction) return false;
    const conclusionDate = new Date(t.date_transaction);
    const now = new Date();
    return conclusionDate.getMonth() === now.getMonth() && conclusionDate.getFullYear() === now.getFullYear();
  }).length;
  
  // Clients critiques = 30 jours ou moins restants avant expiration (60-89 jours écoulés)
  const clientsCritiques = clients.filter(c => {
    const days = calculateDaysElapsed(c.dateInscription);
    return days >= 60 && days < 90;
  });
  
  // Clients expirés = mandat dépassé (90+ jours)
  const clientsExpires = clients.filter(c => calculateDaysElapsed(c.dateInscription) >= 90);
  
  const revenusAgenceMois = transactions
    .filter(t => {
      if (t.statut !== 'conclue' || !t.date_transaction) return false;
      const conclusionDate = new Date(t.date_transaction);
      const now = new Date();
      return conclusionDate.getMonth() === now.getMonth() && conclusionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + (t.part_agence || 0), 0);

  const clientsSansAgent = clients.filter(c => !c.agentId).length;

  // Calcul de la projection financière de l'agence
  const clientsActifsPourProjection = clients.filter(c => {
    const dateAjout = c.dateInscription;
    return c.statut !== 'reloge' && calculateDaysElapsed(dateAjout) <= 90;
  });

  const agencyProjections = clientsActifsPourProjection.map(client => {
    // Chercher le split dans client_agents, sinon utiliser celui du client, sinon 45% par défaut
    const clientAgent = clientAgents.find(ca => ca.client_id === client.id && ca.is_primary);
    const splitAgent = clientAgent?.commission_split || client.commission_split || 45;
    const budgetMax = client.budgetMax || 0;
    const partAgence = Math.round(budgetMax * ((100 - splitAgent) / 100));
    
    // Trouver le nom de l'agent
    const agent = agents.find(a => a.id === client.agentId);
    const agentName = agent ? `${agent.prenom} ${agent.nom}` : 'Non assigné';
    
    // Nom du client depuis le profil (on utilise les données disponibles)
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client';
    
    return {
      clientId: client.id,
      clientName,
      agentName,
      budgetMax,
      commissionSplit: splitAgent,
      partAgence,
    };
  });

  const totalCommissionAgence = agencyProjections.reduce((sum, p) => sum + p.partAgence, 0);

  return (
    <PullToRefresh onRefresh={loadData} className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8">
        {/* Header avec dégradé animé */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 mb-8 animate-fade-in">
          {/* Particules flottantes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-float-particle" style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-4 left-20 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-float-particle" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-primary/5 rounded-full blur-xl animate-float-particle" style={{ animationDelay: '2s' }} />
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
                <span className="text-sm font-medium text-primary/80 uppercase tracking-wider">Administration</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
                Tableau de bord
              </h1>
              <p className="text-muted-foreground mt-2">Vue d'ensemble de l'activité</p>
            </div>
            {counts.new_message > 0 && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/messagerie')} 
                className="relative glass-morphism border-primary/20 hover:scale-105 transition-all duration-300"
              >
                <Bell className="w-4 h-4 mr-2" />
                Messages
                <Badge variant="destructive" className="ml-2 animate-bounce-soft">{counts.new_message}</Badge>
              </Button>
            )}
          </div>
        </div>

        {/* KPIs avec composants Premium */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4 mb-8">
          <PremiumKPICard 
            title="Clients actifs" 
            value={clientsActifs} 
            icon={Users}
            onClick={() => navigate('/admin/clients')}
            delay={0}
          />
          <PremiumKPICard 
            title="Agents" 
            value={totalAgents}
            subtitle={`${agentsActifs} actif(s)`}
            icon={UserCog}
            onClick={() => navigate('/admin/agents')}
            delay={50}
          />
          <PremiumKPICard 
            title="Offres" 
            value={totalOffresEnvoyees} 
            icon={Send}
            onClick={() => navigate('/admin/offres-envoyees')}
            delay={100}
          />
          <PremiumKPICard 
            title="Affaires conclues" 
            value={transactions.filter(t => t.statut === 'conclue').length} 
            icon={CheckCircle} 
            variant="success"
            subtitle={`${transactionsConcluesMois} ce mois`}
            onClick={() => navigate('/admin/transactions')}
            delay={150}
          />
          <PremiumKPICard 
            title="Critiques" 
            value={clientsCritiques.length} 
            icon={Clock} 
            variant={clientsCritiques.length > 0 ? 'warning' : 'default'}
            subtitle="≤30j restants"
            onClick={() => navigate('/admin/mandats')}
            delay={200}
          />
          <PremiumKPICard 
            title="Expirés" 
            value={clientsExpires.length} 
            icon={AlertTriangle} 
            variant={clientsExpires.length > 0 ? 'danger' : 'default'}
            subtitle=">90 jours"
            onClick={() => navigate('/admin/mandats')}
            delay={250}
          />
          <PremiumKPICard 
            title="Revenus agence" 
            value={revenusAgenceMois} 
            icon={DollarSign} 
            variant="success"
            subtitle="CHF ce mois"
            onClick={() => navigate('/admin/transactions')}
            delay={300}
          />
          <PremiumKPICard 
            title="Commission totale" 
            value={transactions.filter(t => t.statut === 'conclue').reduce((sum, t) => sum + (t.part_agence || 0), 0)} 
            icon={DollarSign} 
            subtitle="CHF total"
            onClick={() => navigate('/admin/transactions')}
            delay={350}
          />
        </div>

        {/* Section Statistiques détaillées avec glassmorphism */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <Card className="relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
            <CardContent className="relative p-0">
              <AdminStatsSection
                agents={agents}
                clients={clients}
                transactions={transactions}
                offres={offres}
              />
            </CardContent>
          </Card>
        </div>

        {/* Statistiques de recommandation */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '450ms' }}>
          <Card className="relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-50" />
            <CardContent className="relative p-0">
              <RecommendationStats />
            </CardContent>
          </Card>
        </div>

        {/* Projection financière agence */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '475ms' }}>
          <AgencyProjectionSection 
            projections={agencyProjections}
            totalCommissionAgence={totalCommissionAgence}
          />
        </div>

        {/* Répartition des agents avec effets modernes */}
        <Card className="mb-8 animate-fade-in group relative overflow-hidden hover:shadow-xl transition-all duration-500" style={{ animationDelay: '500ms' }}>
            {/* Effet shine au hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  Répartition des clients
                </CardTitle>
                <Badge variant="outline" className="text-xs glass-morphism">
                  Critique = ≤30 jours restants
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Vue tableau sur desktop avec effets de survol */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Statut</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Clients</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Critiques (≤30j)</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Commission pot.</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => {
                      const agentClients = clients.filter(c => c.agentId === agent.id);
                      // Critique = 60-89 jours écoulés (30 jours ou moins restants)
                      const critiquesClients = agentClients.filter(c => {
                        const days = calculateDaysElapsed(c.dateInscription);
                        return days >= 60 && days < 90;
                      });
                      const commissionPot = agentClients.reduce((sum, c) => sum + c.budgetMax, 0);

                      return (
                        <tr key={agent.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm">
                            <button 
                              onClick={() => navigate(`/admin/agents/${agent.id}`)}
                              className="hover:underline text-left"
                            >
                              {agent.prenom} {agent.nom}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <Badge variant={agent.actif ? 'default' : 'secondary'}>
                              {agent.actif ? 'Actif' : 'Inactif'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">{agentClients.length}</td>
                          <td className="py-3 px-4 text-sm">
                            {critiquesClients.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-warning font-medium">{critiquesClients.length}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs text-warning"
                                  onClick={() => navigate('/admin/mandats')}
                                >
                                  Voir
                                </Button>
                              </div>
                            ) : (
                              <span className="text-success">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">{commissionPot.toLocaleString()} CHF</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={agent.actif}
                                onCheckedChange={() => toggleAgentStatus(agent.user_id, agent.actif)}
                              />
                              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/assignations')}>
                                Redistribuer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Vue cartes pour mobile/tablette */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agents.map(agent => {
                  const agentClients = clients.filter(c => c.agentId === agent.id);
                  // Critique = 60-89 jours écoulés (30 jours ou moins restants)
                  const critiquesClients = agentClients.filter(c => {
                    const days = calculateDaysElapsed(c.dateInscription);
                    return days >= 60 && days < 90;
                  });
                  const commissionPot = agentClients.reduce((sum, c) => sum + c.budgetMax, 0);

                  return (
                    <div 
                      key={agent.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <button 
                          onClick={() => navigate(`/admin/agents/${agent.id}`)}
                          className="font-medium hover:underline text-left text-sm"
                        >
                          {agent.prenom} {agent.nom}
                        </button>
                        <Badge variant={agent.actif ? 'default' : 'secondary'} className="text-xs">
                          {agent.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div>
                          <p className="text-muted-foreground">Clients</p>
                          <p className="font-semibold">{agentClients.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Critiques (≤30j)</p>
                          {critiquesClients.length > 0 ? (
                            <button 
                              onClick={() => navigate('/admin/mandats')}
                              className="font-semibold text-warning hover:underline"
                            >
                              {critiquesClients.length}
                            </button>
                          ) : (
                            <p className="text-success">0</p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Commission</p>
                          <p className="font-semibold">{commissionPot.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Power className="w-3 h-3 text-muted-foreground" />
                          <Switch
                            checked={agent.actif}
                            onCheckedChange={() => toggleAgentStatus(agent.user_id, agent.actif)}
                          />
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/admin/assignations')}>
                          Redistribuer
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Alertes avec design moderne */}
        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="relative">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-warning/20 to-warning/10 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3 md:space-y-4">
            {clientsSansAgent > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-warning/10 rounded-lg border border-warning/20 hover:shadow-lg hover:shadow-warning/10 transition-all duration-300 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-warning/20 animate-pulse-soft">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">{clientsSansAgent} client(s) sans agent</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Assignez un agent pour démarrer le suivi</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto hover:scale-105 transition-transform" onClick={() => navigate('/admin/assignations')}>
                  Assigner
                </Button>
              </div>
            )}

            {clientsCritiques.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-warning/10 rounded-lg border border-warning/20 hover:shadow-lg hover:shadow-warning/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '50ms' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-warning/20 animate-pulse-soft">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">{clientsCritiques.length} mandat(s) critique(s)</p>
                    <p className="text-xs md:text-sm text-muted-foreground">30 jours ou moins avant expiration</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto hover:scale-105 transition-transform" onClick={() => navigate('/admin/mandats')}>
                  Voir les mandats
                </Button>
              </div>
            )}

            {clientsExpires.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-destructive/10 rounded-lg border border-destructive/20 hover:shadow-lg hover:shadow-destructive/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/20 animate-pulse-soft">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-destructive flex-shrink-0" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">{clientsExpires.length} mandat(s) expiré(s)</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Plus de 90 jours - renouvellement requis</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto text-destructive hover:text-destructive hover:scale-105 transition-transform" onClick={() => navigate('/admin/mandats')}>
                  Gérer
                </Button>
              </div>
            )}

            {clientsSansAgent === 0 && clientsCritiques.length === 0 && clientsExpires.length === 0 && (
              <div className="flex items-center gap-3 p-3 md:p-4 bg-success/10 rounded-lg border border-success/20 animate-fade-in">
                <div className="p-2 rounded-full bg-success/20">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground">Aucune alerte - tout est en ordre</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}
