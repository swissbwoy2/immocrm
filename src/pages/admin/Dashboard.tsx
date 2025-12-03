import { useEffect, useState } from 'react';
import { Users, UserCog, Clock, CheckCircle, AlertTriangle, DollarSign, Send, Bell, Power } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
          actif: profile?.actif ?? false, // Utiliser profiles.actif comme source de vérité
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
        };
      }) || [];
      
      setAgents(transformedAgents);

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) throw clientsError;
      
      const transformedClients = clientsData?.map(client => ({
        ...client,
        // Utiliser date_ajout pour le calcul du mandat (se remet à jour lors des renouvellements)
        dateInscription: client.date_ajout || client.created_at,
        agentId: client.agent_id,
        budgetMax: client.budget_max || 0,
        notificationJ60Envoyee: false,
      })) || [];
      
      setClients(transformedClients);

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*');

      if (transactionsError) throw transactionsError;

      const transformedTransactions = transactionsData?.map(t => ({
        ...t,
        dateConclusion: t.date_transaction,
        partAgence: t.part_agence,
        commissionTotale: t.commission_totale,
      })) || [];

      setTransactions(transformedTransactions);

      // Load offres
      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*');

      if (offresError) throw offresError;

      setOffres(offresData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
                <p className="text-muted-foreground">Vue d'ensemble de l'activité</p>
              </div>
              {counts.new_message > 0 && (
                <Button variant="outline" onClick={() => navigate('/admin/messagerie')} className="relative">
                  <Bell className="w-4 h-4 mr-2" />
                  Messages
                  <Badge variant="destructive" className="ml-2">{counts.new_message}</Badge>
                </Button>
              )}
            </div>
          </div>

          {/* KPIs - Optimisé pour tablette */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4 mb-8">
            <KPICard 
              title="Clients actifs" 
              value={clientsActifs} 
              icon={Users}
              onClick={() => navigate('/admin/clients')}
            />
            <KPICard 
              title="Agents" 
              value={totalAgents}
              subtitle={`${agentsActifs} actif(s)`}
              icon={UserCog}
              onClick={() => navigate('/admin/agents')}
            />
            <KPICard 
              title="Offres" 
              value={totalOffresEnvoyees} 
              icon={Send}
              onClick={() => navigate('/admin/offres-envoyees')}
            />
            <KPICard 
              title="Affaires conclues" 
              value={transactions.filter(t => t.statut === 'conclue').length} 
              icon={CheckCircle} 
              variant="success"
              subtitle={`${transactionsConcluesMois} ce mois`}
              onClick={() => navigate('/admin/transactions')}
            />
            <KPICard 
              title="Critiques" 
              value={clientsCritiques.length} 
              icon={Clock} 
              variant={clientsCritiques.length > 0 ? 'warning' : 'default'}
              subtitle="≤30j restants"
              onClick={() => navigate('/admin/mandats')}
            />
            <KPICard 
              title="Expirés" 
              value={clientsExpires.length} 
              icon={AlertTriangle} 
              variant={clientsExpires.length > 0 ? 'danger' : 'default'}
              subtitle=">90 jours"
              onClick={() => navigate('/admin/mandats')}
            />
            <KPICard 
              title="Revenus agence" 
              value={`${revenusAgenceMois.toLocaleString()}`} 
              icon={DollarSign} 
              variant="success"
              subtitle="CHF ce mois"
              onClick={() => navigate('/admin/transactions')}
            />
            <KPICard 
              title="Commission totale" 
              value={`${transactions.filter(t => t.statut === 'conclue').reduce((sum, t) => sum + (t.part_agence || 0), 0).toLocaleString()}`} 
              icon={DollarSign} 
              subtitle="CHF total"
              onClick={() => navigate('/admin/transactions')}
            />
          </div>

          {/* Section Statistiques détaillées */}
          <div className="mb-8">
            <AdminStatsSection
              agents={agents}
              clients={clients}
              transactions={transactions}
              offres={offres}
            />
          </div>

          {/* Répartition des agents */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg">Répartition des clients</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Critique = ≤30 jours restants
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Vue tableau sur desktop, vue cartes sur mobile/tablette */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b">
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

          {/* Alertes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Alertes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {clientsSansAgent > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm md:text-base">{clientsSansAgent} client(s) sans agent</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Assignez un agent pour démarrer le suivi</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto" onClick={() => navigate('/admin/assignations')}>
                    Assigner
                  </Button>
                </div>
              )}

              {clientsCritiques.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm md:text-base">{clientsCritiques.length} mandat(s) critique(s)</p>
                      <p className="text-xs md:text-sm text-muted-foreground">30 jours ou moins avant expiration</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto" onClick={() => navigate('/admin/mandats')}>
                    Voir les mandats
                  </Button>
                </div>
              )}

              {clientsExpires.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm md:text-base">{clientsExpires.length} mandat(s) expiré(s)</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Plus de 90 jours - renouvellement requis</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto text-destructive hover:text-destructive" onClick={() => navigate('/admin/mandats')}>
                    Gérer
                  </Button>
                </div>
              )}

              {clientsSansAgent === 0 && clientsCritiques.length === 0 && clientsExpires.length === 0 && (
                <div className="flex items-center gap-3 p-3 md:p-4 bg-success/10 rounded-lg border border-success/20">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Aucune alerte - tout est en ordre</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
