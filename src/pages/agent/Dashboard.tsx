import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Send, MessageSquare, CheckCircle, DollarSign, Bell, FileText, Download } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateDaysElapsed } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { counts } = useRealtimeNotifications(user?.id, userRole);
  
  const [agent, setAgent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [offres, setOffres] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [renouvellements, setRenouvellements] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    
    loadAgentData();
  }, [user, userRole, navigate]);

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

      // Récupérer les clients assignés à cet agent (RLS filtre automatiquement)
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*');
      
      setClients(clientsData || []);

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
      }

      // Récupérer les transactions de l'agent
      if (agentData) {
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('date_transaction', { ascending: false });
        
        setTransactions(transactionsData || []);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Les clients sont déjà filtrés par RLS
  const clientsActifs = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return calculateDaysElapsed(dateAjout) <= 90;
  }).length;
  
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Tableau de bord</h1>
              <p className="text-muted-foreground mt-1">Gérez vos clients et vos offres</p>
            </div>
            {counts.unreadMessages > 0 && (
              <Button variant="outline" onClick={() => navigate('/agent/messagerie')} className="relative">
                <Bell className="w-4 h-4 mr-2" />
                Messages
                <Badge variant="destructive" className="ml-2">{counts.unreadMessages}</Badge>
              </Button>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <KPICard 
              title="Clients actifs" 
              value={clientsActifs} 
              icon={Users}
              onClick={() => navigate('/agent/mes-clients')}
            />
            <KPICard 
              title="Offres envoyées" 
              value={offres.length} 
              icon={Send}
              onClick={() => navigate('/agent/offres-envoyees')}
            />
            <KPICard 
              title="Messages non lus" 
              value={counts.unreadMessages} 
              icon={MessageSquare}
              onClick={() => navigate('/agent/messagerie')}
              variant={counts.unreadMessages > 0 ? 'danger' : 'default'}
            />
            <KPICard 
              title="Deadlines critiques" 
              value={deadlinesCritiques} 
              icon={LayoutDashboard} 
              variant={deadlinesCritiques > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/agent/mes-clients')}
            />
            <KPICard 
              title="Commission pot." 
              value={`${totalCommissionPotentielle.toLocaleString()} CHF`} 
              icon={DollarSign}
              variant="default"
              subtitle="3 derniers mois"
            />
            <KPICard 
              title="Commissions ce mois" 
              value={`${commissionsCeMois.toLocaleString()} CHF`} 
              icon={CheckCircle}
              variant="success"
            />
          </div>

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
              <CardContent className="space-y-3">
                {projectionFinanciere.slice(0, 5).map(proj => {
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
              <CardContent className="space-y-3">
                {clientsCritiques.length > 0 ? (
                  clientsCritiques.slice(0, 5).map(client => {
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

          {/* Documents clients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">📄 Documents clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length > 0 ? (
                <>
                  {documents.slice(0, 5).map(doc => {
                    const getDocIcon = (type: string) => {
                      if (type.includes('pdf')) return '📄';
                      if (type.includes('image')) return '🖼️';
                      if (type.includes('word')) return '📝';
                      return '📎';
                    };

                    return (
                      <div 
                        key={doc.id}
                        className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getDocIcon(doc.type)}</span>
                              <p className="font-medium text-sm truncate">{doc.nom}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploadé le {new Date(doc.created_at).toLocaleDateString('fr-CH')}
                            </p>
                            {doc.taille && (
                              <p className="text-xs text-muted-foreground">
                                {(doc.taille / 1024).toFixed(0)} KB
                              </p>
                            )}
                          </div>
                          {doc.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Télécharger
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium">Aucun document</p>
                  <p className="text-xs mt-1">Les documents des clients apparaîtront ici</p>
                </div>
              )}
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
