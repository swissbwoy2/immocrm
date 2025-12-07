import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Send, MessageSquare, CheckCircle, DollarSign, Bell, FileText, Download, Calendar, FileCheck, Home, Key, Sparkles } from 'lucide-react';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateDaysElapsed } from '@/utils/calculations';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { AgentStatsSection } from '@/components/stats/AgentStatsSection';
import { DefaultGoalsSection } from '@/components/stats/DefaultGoalsSection';
import { AgentBadges } from '@/components/stats/AgentBadges';
import { countUniqueOffres } from '@/utils/visitesCalculator';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth();
  const { counts } = useNotifications();
  
  const [agent, setAgent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [offres, setOffres] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [renouvellements, setRenouvellements] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [visitesDelegues, setVisitesDelegues] = useState<any[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    
    loadAgentData();
  }, [user?.id, userRole, location.key]);

  const loadAgentData = async () => {
    if (!user) return;
    
    try {
      // Récupérer l'agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (agentError) {
        console.error('Erreur récupération agent:', agentError);
      }
      
      setAgent(agentData);

      // Récupérer les clients via client_agents (source de vérité)
      let clientsData: any[] = [];
      if (agentData) {
        const { data: clientAgentsData } = await supabase
          .from('client_agents')
          .select('client_id')
          .eq('agent_id', agentData.id);

        const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

        if (clientIds.length > 0) {
          const { data } = await supabase
            .from('clients')
            .select('*')
            .in('id', clientIds);
          clientsData = data || [];
        }
      }
      
      setClients(clientsData);

      // Récupérer les profils des clients
      if (clientsData && clientsData.length > 0) {
        const clientUserIds = clientsData.map(c => c.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', clientUserIds);
        
        if (profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]));
          setProfiles(profilesMap);
        }
      }

      // Récupérer les offres de l'agent
      if (agentData) {
        const { data: offresData } = await supabase
          .from('offres')
          .select('*, clients(user_id)')
          .eq('agent_id', agentData.id)
          .order('date_envoi', { ascending: false });
        
        setOffres(offresData || []);
      }

      // Récupérer les documents des clients
      const clientUserIds = clientsData?.map(c => c.user_id) || [];
      if (clientUserIds.length > 0) {
        const { data: documentsData } = await supabase
          .from('documents')
          .select('*, clients!documents_client_id_fkey(*)')
          .in('user_id', clientUserIds)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setDocuments(documentsData || []);

        // Récupérer les renouvellements
        const clientIds = clientsData?.map(c => c.id) || [];
        const { data: renouvData } = await supabase
          .from('renouvellements_mandat')
          .select('*')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false });
        
        setRenouvellements(renouvData || []);

        // Récupérer les candidatures des clients
        const { data: candidaturesData } = await supabase
          .from('candidatures')
          .select('*, offres(adresse, prix, pieces)')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false });
        
        setCandidatures(candidaturesData || []);
      }

      // Récupérer les transactions de l'agent
      if (agentData) {
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('date_transaction', { ascending: false });
        
        setTransactions(transactionsData || []);

        // Récupérer toutes les visites de l'agent
        const { data: allVisitesData } = await supabase
          .from('visites')
          .select('*')
          .eq('agent_id', agentData.id);
        
        setVisites(allVisitesData || []);

        // Récupérer les visites déléguées
        const { data: visitesData } = await supabase
          .from('visites')
          .select(`
            *,
            offres (
              adresse,
              prix,
              pieces,
              surface
            ),
            clients (
              user_id
            )
          `)
          .eq('agent_id', agentData.id)
          .eq('est_deleguee', true)
          .eq('statut', 'planifiee')
          .order('date_visite', { ascending: true });
        
        setVisitesDelegues(visitesData || []);
      }
    } catch (error) {
      console.error('Erreur chargement données agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agentFound = clients.find(c => c.agent_id === agentId);
    if (!agentFound) return "Agent";
    return "Agent";
  };

  if (loading || !agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  // Les clients sont déjà filtrés par RLS
  const clientsActifs = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return calculateDaysElapsed(dateAjout) <= 90;
  }).length;
  
  // Clients par type
  const clientsLocation = clients.filter(c => c.type_recherche !== 'Acheter').length;
  const clientsAchat = clients.filter(c => c.type_recherche === 'Acheter').length;
  
  const deadlinesCritiques = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return calculateDaysElapsed(dateAjout) >= 90;
  }).length;

  // Filtrer uniquement les clients des 3 derniers mois pour la projection financière
  const clientsActifs3Mois = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return calculateDaysElapsed(dateAjout) <= 90;
  });

  const projectionFinanciere = clientsActifs3Mois.map(client => {
    const commissionBrute = client.budget_max || 0;
    const splitAgent = client.commission_split || 50;
    const partAgent = Math.round(commissionBrute * (splitAgent / 100));
    return {
      clientId: client.id,
      budgetMax: commissionBrute,
      splitAgent,
      partAgent,
    };
  });

  const totalCommissionPotentielle = projectionFinanciere.reduce((sum, p) => sum + p.partAgent, 0);

  // Calculer les commissions du mois en cours
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactionsCeMois = transactions.filter(t => 
    new Date(t.date_transaction) >= startOfMonth && t.statut === 'conclue'
  );
  const commissionsCeMois = transactionsCeMois.reduce((sum, t) => sum + (t.part_agent || 0), 0);

  const clientsCritiques = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    const days = calculateDaysElapsed(dateAjout);
    return days >= 60;
  }).sort((a, b) => {
    const dateA = a.date_ajout || a.created_at;
    const dateB = b.date_ajout || b.created_at;
    return calculateDaysElapsed(dateB) - calculateDaysElapsed(dateA);
  });

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header avec dégradé animé */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 animate-fade-in">
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
                  <span className="text-sm font-medium text-primary/80 uppercase tracking-wider">Espace Agent</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
                  Tableau de bord
                </h1>
                <p className="text-muted-foreground mt-2">Gérez vos clients et vos offres</p>
              </div>
              {counts.new_message > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/agent/messagerie')} 
                  className="relative glass-morphism border-primary/20 hover:scale-105 transition-all duration-300"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Messages
                  <Badge variant="destructive" className="ml-2 animate-bounce-soft">{counts.new_message}</Badge>
                </Button>
              )}
            </div>
          </div>

          {/* KPIs avec effets modernes */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-4 2xl:grid-cols-5">
            <PremiumKPICard 
              title="Clients actifs" 
              value={clientsActifs} 
              icon={Users}
              onClick={() => navigate('/agent/mes-clients')}
            />
            <PremiumKPICard 
              title="Location" 
              value={clientsLocation} 
              icon={Key}
              onClick={() => navigate('/agent/mes-clients')}
              subtitle="clients"
            />
            <PremiumKPICard 
              title="Achat" 
              value={clientsAchat} 
              icon={Home}
              onClick={() => navigate('/agent/mes-clients')}
              variant={clientsAchat > 0 ? 'success' : 'default'}
              subtitle="clients"
            />
            <PremiumKPICard 
              title="Offres envoyées" 
              value={countUniqueOffres(offres)} 
              icon={Send}
              onClick={() => navigate('/agent/offres-envoyees')}
            />
            <PremiumKPICard 
              title="Candidatures" 
              value={candidatures.length} 
              icon={FileCheck}
              onClick={() => navigate('/agent/candidatures')}
              variant={candidatures.filter(c => c.statut === 'en_attente').length > 0 ? 'warning' : 'default'}
              subtitle={`${candidatures.filter(c => c.statut === 'en_attente').length} en attente`}
            />
            <PremiumKPICard 
              title="Messages non lus" 
              value={counts.new_message} 
              icon={MessageSquare}
              onClick={() => navigate('/agent/messagerie')}
              variant={counts.new_message > 0 ? 'danger' : 'default'}
            />
            <PremiumKPICard 
              title="Affaires conclues" 
              value={transactions.filter(t => t.statut === 'conclue').length} 
              icon={CheckCircle}
              variant="success"
              subtitle="total"
              onClick={() => navigate('/agent/transactions')}
            />
            <PremiumKPICard 
              title="Commission pot." 
              value={`${totalCommissionPotentielle.toLocaleString()}`} 
              icon={DollarSign}
              variant="default"
              subtitle="CHF (3 mois)"
            />
            <PremiumKPICard 
              title="Ce mois" 
              value={`${commissionsCeMois.toLocaleString()}`} 
              icon={DollarSign}
              variant="success"
              subtitle={`CHF (${transactionsCeMois.length} affaire${transactionsCeMois.length > 1 ? 's' : ''})`}
              onClick={() => navigate('/agent/transactions')}
            />
          </div>

          {/* Section Statistiques détaillées avec glassmorphism */}
          <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
            <Card className="relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
              <CardContent className="relative p-0">
                <AgentStatsSection
                  offres={offres}
                  transactions={transactions}
                  candidatures={candidatures}
                  clients={clients}
                  agentId={agent?.id || ''}
                />
              </CardContent>
            </Card>
          </div>

          {/* Objectifs journaliers par défaut */}
          <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
            <Card className="relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-50" />
              <CardContent className="relative p-0">
                <DefaultGoalsSection
                  agentId={agent?.id || ''}
                  offres={offres}
                  visites={visites}
                  candidatures={candidatures}
                  clients={clients}
                />
              </CardContent>
            </Card>
          </div>

          {/* Badges et récompenses */}
          <div className="animate-fade-in" style={{ animationDelay: '550ms' }}>
            <Card className="relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-success/5 opacity-50" />
              <CardContent className="relative p-0">
                <AgentBadges agentId={agent?.id || ''} />
              </CardContent>
            </Card>
          </div>

          {/* Visites déléguées */}
          {visitesDelegues.length > 0 && (
            <Card className="border-primary/20 bg-primary/5 animate-fade-in card-interactive" style={{ animationDelay: '600ms' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    🤝 Visites déléguées par vos clients
                  </CardTitle>
                  <Badge variant="default" className="animate-pulse">
                    {visitesDelegues.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visitesDelegues.slice(0, 3).map(visite => {
                  const client = clients.find(c => c.id === visite.client_id);
                  const profile = client ? profiles.get(client.user_id) : null;
                  const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                  const dateVisite = new Date(visite.date_visite);
                  const isToday = dateVisite.toDateString() === new Date().toDateString();
                  const isPast = dateVisite < new Date();
                  
                  return (
                    <div 
                      key={visite.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        isToday 
                          ? 'bg-warning/10 border-warning/30' 
                          : isPast
                          ? 'bg-destructive/10 border-destructive/30'
                          : 'bg-muted/30 border-border'
                      }`}
                      onClick={() => navigate('/agent/visites')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{visite.offres?.adresse}</p>
                            {isToday && <Badge variant="outline" className="text-xs">Aujourd'hui</Badge>}
                            {isPast && <Badge variant="destructive" className="text-xs">En retard</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {visite.offres?.pieces} pièces • {visite.offres?.surface} m² • {visite.offres?.prix?.toLocaleString()} CHF
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            📅 {dateVisite.toLocaleDateString('fr-CH')} à {dateVisite.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-primary font-medium mt-1">
                            👤 Délégué par {clientName}
                          </p>
                        </div>
                      </div>
                      {visite.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground italic">"{visite.notes}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => navigate('/agent/visites')}
                >
                  Voir toutes les visites déléguées
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Candidatures nécessitant une action */}
          {(() => {
            const statusActionRequired = ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe'];
            const candidaturesAction = candidatures.filter(c => statusActionRequired.includes(c.statut));
            
            const getStatusInfo = (statut: string) => {
              switch (statut) {
                case 'bail_conclu': return { label: '🎉 Client prêt à conclure', color: 'border-green-500 bg-green-50 dark:bg-green-950/30', badge: 'bg-green-600', textColor: 'text-green-700 dark:text-green-300' };
                case 'attente_bail': return { label: '📄 En attente du bail', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30', badge: 'bg-amber-600', textColor: 'text-amber-700 dark:text-amber-300' };
                case 'bail_recu': return { label: '✅ Bail reçu', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30', badge: 'bg-blue-600', textColor: 'text-blue-700 dark:text-blue-300' };
                case 'signature_planifiee': return { label: '📝 Signature planifiée', color: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30', badge: 'bg-purple-600', textColor: 'text-purple-700 dark:text-purple-300' };
                case 'signature_effectuee': return { label: '🖊️ Signature effectuée', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', badge: 'bg-emerald-600', textColor: 'text-emerald-700 dark:text-emerald-300' };
                case 'etat_lieux_fixe': return { label: '🏠 État des lieux fixé', color: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30', badge: 'bg-cyan-600', textColor: 'text-cyan-700 dark:text-cyan-300' };
                default: return { label: 'En cours', color: 'border-gray-500 bg-gray-50 dark:bg-gray-950/30', badge: 'bg-gray-600', textColor: 'text-gray-700 dark:text-gray-300' };
              }
            };

            if (candidaturesAction.length === 0) return null;

            return (
              <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
                      <FileCheck className="w-5 h-5" />
                      🚀 Candidatures en cours de traitement
                    </CardTitle>
                    <Badge variant="default" className="animate-pulse text-lg px-3 py-1">
                      {candidaturesAction.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {candidaturesAction.slice(0, 5).map(cand => {
                    const client = clients.find(c => c.id === cand.client_id);
                    const profile = client ? profiles.get(client.user_id) : null;
                    const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                    const statusInfo = getStatusInfo(cand.statut);
                    
                    return (
                      <div 
                        key={cand.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${statusInfo.color}`}
                        onClick={() => navigate('/agent/candidatures')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-sm truncate">{cand.offres?.adresse}</p>
                              <Badge className={`text-xs ${statusInfo.badge} text-white`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cand.offres?.pieces} pièces • {cand.offres?.prix?.toLocaleString()} CHF/mois
                            </p>
                            <p className={`text-sm font-bold mt-2 ${statusInfo.textColor}`}>
                              👤 {clientName}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button 
                    variant="default"
                    size="lg" 
                    className="w-full mt-3"
                    onClick={() => navigate('/agent/candidatures')}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Gérer toutes les candidatures
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Bouton Conclure une affaire */}
          <div className="flex justify-end">
            <Button 
              onClick={() => navigate('/agent/conclure-affaire')}
              size="lg"
              className="gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Conclure une affaire
            </Button>
          </div>

          {/* Projection financière & Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projection financière */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">💰 Projection financière (3 derniers mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {projectionFinanciere.map(proj => {
                    const client = clients.find(c => c.id === proj.clientId);
                    const profile = client ? profiles.get(client.user_id) : null;
                    const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                    
                    return (
                      <div key={proj.clientId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{clientName}</p>
                          <p className="text-xs text-muted-foreground">Budget: {proj.budgetMax.toLocaleString()} CHF</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="font-bold text-success">{proj.partAgent.toLocaleString()} CHF</p>
                          <p className="text-xs text-muted-foreground">{proj.splitAgent}%</p>
                        </div>
                      </div>
                    );
                  })}
                  {projectionFinanciere.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Aucune projection disponible
                    </div>
                  )}
                </div>
                {projectionFinanciere.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Total potentiel</p>
                      <p className="text-xl font-bold text-success">{totalCommissionPotentielle.toLocaleString()} CHF</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deadlines critiques */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">⚠️ Deadlines critiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {clientsCritiques.length > 0 ? (
                    clientsCritiques.map(client => {
                      const dateAjout = client.date_ajout || client.created_at;
                      const daysElapsed = calculateDaysElapsed(dateAjout);
                      const daysRemaining = 90 - daysElapsed;
                      const isExpired = daysRemaining <= 0;
                      const isWarning = daysRemaining > 0 && daysRemaining <= 30;
                      const profile = profiles.get(client.user_id);
                      const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';

                      return (
                        <div 
                          key={client.id}
                          className={`p-3 rounded-lg border ${
                            isExpired 
                              ? 'bg-destructive/10 border-destructive/20' 
                              : isWarning 
                              ? 'bg-warning/10 border-warning/20'
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{clientName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Inscrit le {new Date(dateAjout).toLocaleDateString('fr-CH')}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold ${
                                isExpired ? 'text-destructive' : isWarning ? 'text-warning' : 'text-foreground'
                              }`}>
                                {isExpired ? 'Expiré' : `${daysRemaining}j`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isExpired ? 'J+90' : 'restants'}
                              </p>
                            </div>
                          </div>
                          {isExpired && (
                            <div className="mt-2 pt-2 border-t border-destructive/20">
                              <p className="text-xs text-destructive font-medium">⚠️ Mandat expiré - Action requise</p>
                            </div>
                          )}
                          {isWarning && !isExpired && (
                            <div className="mt-2 pt-2 border-t border-warning/20">
                              <p className="text-xs text-warning font-medium">⏰ Moins de 30 jours restants</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium">Aucune deadline critique</p>
                      <p className="text-xs mt-1">Tous vos clients sont à jour</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Affaires conclues ce mois */}
          {transactionsCeMois.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">✅ Affaires conclues ce mois</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transactionsCeMois.map(transaction => {
                  const client = clients.find(c => c.id === transaction.client_id);
                  const profile = client ? profiles.get(client.user_id) : null;
                  const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                  
                  return (
                    <div 
                      key={transaction.id}
                      className="p-3 bg-success/10 border border-success/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{clientName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Loyer: {transaction.montant_total.toLocaleString()} CHF/an
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Conclue le {new Date(transaction.date_transaction).toLocaleDateString('fr-CH')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-success">{transaction.part_agent.toLocaleString()} CHF</p>
                          <p className="text-xs text-muted-foreground">Votre part</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Total ce mois</p>
                    <p className="text-xl font-bold text-success">{commissionsCeMois.toLocaleString()} CHF</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dernières offres */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">📤 Dernières offres envoyées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {offres.length > 0 ? (
                <>
                  {offres.slice(0, 5).map(offre => {
                    const client = clients.find(c => c.id === offre.client_id);
                    return (
                      <div 
                        key={offre.id}
                        className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/agent/offres-envoyees')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{offre.adresse}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {offre.pieces} pièces • {offre.surface} m² • {offre.prix.toLocaleString()} CHF
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                            </p>
                          </div>
                          <Badge variant={offre.statut === 'envoyee' ? 'default' : 'secondary'}>
                            {offre.statut}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => navigate('/agent/offres-envoyees')}
                  >
                    Voir toutes les offres
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Send className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium">Aucune offre envoyée</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/agent/envoyer-offre')}
                  >
                    Envoyer une offre
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents clients - Amélioré */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">📄 Documents clients</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate('/agent/documents')}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // Regrouper les documents par client
                const documentsByClient: Record<string, any[]> = documents.reduce((acc: Record<string, any[]>, doc) => {
                  const clientId = doc.user_id;
                  if (!acc[clientId]) {
                    acc[clientId] = [];
                  }
                  acc[clientId].push(doc);
                  return acc;
                }, {});

                // Types de documents requis
                const requiredTypes = ['fiche_salaire', 'extrait_poursuites', 'piece_identite'];
                
                // Calculer la complétude par client
                const clientsWithDocs = Object.entries(documentsByClient).map(([userId, docs]: [string, any[]]) => {
                  const client = clients.find(c => c.user_id === userId);
                  const profile = profiles.get(userId);
                  const uploadedTypes = [...new Set(docs.map((d: any) => d.type_document).filter(Boolean))] as string[];
                  const completeness = Math.round((uploadedTypes.filter((t: string) => requiredTypes.includes(t)).length / requiredTypes.length) * 100);
                  const recentDocs = docs.filter((d: any) => {
                    const uploadDate = new Date(d.created_at);
                    const daysSince = Math.floor((Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
                    return daysSince <= 7;
                  });
                  
                  return {
                    userId,
                    client,
                    profile,
                    docs,
                    completeness,
                    recentDocs,
                    latestUpload: docs[0]?.created_at
                  };
                }).sort((a, b) => {
                  // Trier par uploads récents d'abord, puis par complétude
                  if (a.recentDocs.length !== b.recentDocs.length) {
                    return b.recentDocs.length - a.recentDocs.length;
                  }
                  return a.completeness - b.completeness;
                });

                const getDocIcon = (type: string) => {
                  if (type?.includes('pdf')) return '📄';
                  if (type?.includes('image')) return '🖼️';
                  if (type?.includes('word')) return '📝';
                  return '📎';
                };

                const getTypeLabel = (type: string) => {
                  const labels: Record<string, string> = {
                    'fiche_salaire': 'Fiche salaire',
                    'extrait_poursuites': 'Extrait poursuites',
                    'piece_identite': 'Pièce ID',
                    'autre': 'Autre'
                  };
                  return labels[type] || type || 'Autre';
                };

                const getTypeColor = (type: string) => {
                  const colors: Record<string, string> = {
                    'fiche_salaire': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                    'extrait_poursuites': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                    'piece_identite': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
                    'autre': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  };
                  return colors[type] || colors['autre'];
                };

                if (clientsWithDocs.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium">Aucun document</p>
                      <p className="text-xs mt-1">Les documents des clients apparaîtront ici</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Résumé global */}
                    <div className="grid grid-cols-3 gap-3 pb-3 border-b">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{documents.length}</p>
                        <p className="text-xs text-muted-foreground">Documents</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {clientsWithDocs.filter(c => c.completeness === 100).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Dossiers complets</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {documents.filter(d => {
                            const days = Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
                            return days <= 7;
                          }).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Cette semaine</p>
                      </div>
                    </div>

                    {/* Liste par client */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {clientsWithDocs.slice(0, 5).map(({ userId, client, profile, docs, completeness, recentDocs }) => {
                        const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                        const isComplete = completeness === 100;
                        const hasRecentUploads = recentDocs.length > 0;
                        
                        return (
                          <div 
                            key={userId}
                            className={`p-3 rounded-lg border transition-colors ${
                              hasRecentUploads 
                                ? 'bg-primary/5 border-primary/30' 
                                : isComplete 
                                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                                : 'bg-muted/30 border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{clientName}</p>
                                  {hasRecentUploads && (
                                    <Badge variant="default" className="text-xs animate-pulse">
                                      Nouveau
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {docs.length} document{docs.length > 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-bold ${
                                  isComplete ? 'text-green-600' : completeness >= 66 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {completeness}%
                                </div>
                                <p className="text-xs text-muted-foreground">complet</p>
                              </div>
                            </div>

                            {/* Barre de progression */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                              <div 
                                className={`h-full transition-all ${
                                  isComplete ? 'bg-green-500' : completeness >= 66 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${completeness}%` }}
                              />
                            </div>

                            {/* Types de documents */}
                            <div className="flex flex-wrap gap-1">
                              {([...new Set(docs.map((d: any) => d.type_document).filter(Boolean))] as string[]).slice(0, 4).map((type: string, i: number) => (
                                <Badge key={i} variant="outline" className={`text-xs ${getTypeColor(type)}`}>
                                  {getTypeLabel(type)}
                                </Badge>
                              ))}
                              {docs.filter((d: any) => !d.type_document || d.type_document === 'autre').length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  +{docs.filter((d: any) => !d.type_document || d.type_document === 'autre').length} autre
                                </Badge>
                              )}
                            </div>

                            {/* Documents récents */}
                            {recentDocs.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs text-muted-foreground mb-1">Récemment ajoutés:</p>
                                {recentDocs.slice(0, 2).map(doc => (
                                  <div key={doc.id} className="flex items-center gap-2 text-xs py-0.5">
                                    <span>{getDocIcon(doc.type)}</span>
                                    <span className="truncate flex-1">{doc.nom}</span>
                                    <span className="text-muted-foreground">
                                      {new Date(doc.created_at).toLocaleDateString('fr-CH')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Bouton voir détails */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2 h-7 text-xs"
                              onClick={() => navigate(`/agent/clients/${client?.id}`)}
                            >
                              Voir le profil client
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    {clientsWithDocs.length > 5 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate('/agent/documents')}
                      >
                        Voir tous les documents ({documents.length})
                      </Button>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Renouvellements récents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">🔄 Renouvellements récents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const recentRenewals = clients
                  .map(client => {
                    const renewal = renouvellements.find(r => r.client_id === client.id);
                    if (!renewal) return null;
                    const daysSince = Math.floor((Date.now() - new Date(renewal.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    if (daysSince > 30) return null;
                    return { ...renewal, client, daysSince };
                  })
                  .filter(Boolean)
                  .sort((a, b) => a.daysSince - b.daysSince)
                  .slice(0, 5);

                return recentRenewals.length > 0 ? (
                  recentRenewals.map(renewal => (
                    <div 
                      key={renewal.id}
                      className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Client renouvelé</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {renewal.daysSince === 0 ? "Aujourd'hui" : `Il y a ${renewal.daysSince} jour${renewal.daysSince > 1 ? 's' : ''}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Agent: {getAgentName(renewal.client.agent_id)}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                          +90 jours
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Aucun renouvellement récent</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
      </div>
    </main>
  );
}
