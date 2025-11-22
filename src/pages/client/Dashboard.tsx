import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Home, Calendar, FileCheck, MessageSquare, File, Bell, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDaysElapsed, calculateDaysRemaining } from '@/utils/calculations';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { toast } from 'sonner';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { counts, markOffersAsViewed } = useRealtimeNotifications(user?.id, userRole);
  const [client, setClient] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!clientData) return;
      setClient(clientData);

      // Load agent if assigned
      if (clientData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*, profiles!agents_user_id_fkey(*)')
          .eq('id', clientData.agent_id)
          .single();

        if (agentData) {
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', agentData.user_id)
            .single();

          setAgent({
            ...agentData,
            prenom: agentProfile?.prenom || '',
            nom: agentProfile?.nom || '',
            email: agentProfile?.email || '',
            telephone: agentProfile?.telephone || '',
          });
        }
      }

      // Load offres
      const { data: offresData } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientData.id);

      setOffres(offresData || []);

      // Load visites depuis la table visites
      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .order('date_visite', { ascending: true });

      setVisites(visitesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewMandat = async () => {
    if (!client || !user) return;
    
    try {
      const oldDate = client.date_ajout || client.created_at;
      const newDate = new Date().toISOString();
      
      // 1. Créer l'historique du renouvellement
      const { error: historyError } = await supabase
        .from('renouvellements_mandat')
        .insert({
          client_id: client.id,
          agent_id: client.agent_id,
          date_ancien_mandat: oldDate,
          date_nouveau_mandat: newDate,
          raison: 'Renouvellement demandé par le client'
        });
      
      if (historyError) throw historyError;
      
      // 2. Mettre à jour la date du mandat
      const { error: updateError } = await supabase
        .from('clients')
        .update({ date_ajout: newDate })
        .eq('id', client.id);
      
      if (updateError) throw updateError;
      
      // 3. Trouver ou créer une conversation avec l'agent
      if (client.agent_id) {
        let conversationId: string | null = null;
        
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', client.id)
          .eq('agent_id', client.agent_id)
          .maybeSingle();
        
        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: client.id,
              agent_id: client.agent_id,
              subject: 'Renouvellement de mandat'
            })
            .select('id')
            .maybeSingle();
          
          conversationId = newConv?.id || null;
        }
        
        // 4. Envoyer un message à l'agent
        if (conversationId) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: client.id,
              sender_type: 'client',
              content: `🔄 J'ai renouvelé mon mandat pour 90 jours supplémentaires. Nouvelle date de début : ${new Date().toLocaleDateString('fr-CH')}`
            });
        }
      }
      
      // 5. Recharger les données
      await loadData();
      
      toast.success('✅ Votre mandat a été renouvelé pour 90 jours !');
    } catch (error) {
      console.error('Error renewing mandate:', error);
      toast.error('❌ Erreur lors du renouvellement');
    }
  };

  if (loading || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
  const progressPercent = Math.min((daysElapsed / 90) * 100, 100);

  // Calculate stats
  const now = new Date();
  const stats = {
    offresRecues: offres.length,
    offresNonVues: offres.filter(o => o.statut === 'envoyee').length,
    visitesAVenir: visites.filter(v => 
      v.statut === 'planifiee' && new Date(v.date_visite) >= now
    ).length,
    visitesEffectuees: visites.filter(v => 
      v.statut === 'effectuee' || (v.statut === 'planifiee' && new Date(v.date_visite) < now)
    ).length,
    candidaturesDeposees: offres.filter(o => o.statut === 'candidature_deposee').length,
    candidaturesEnAttente: offres.filter(o => ['candidature_deposee', 'visite_effectuee'].includes(o.statut)).length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mon tableau de bord</h1>
              <p className="text-muted-foreground">Suivez l'avancement de votre recherche</p>
            </div>
            <div className="flex gap-2">
              {counts.unreadMessages > 0 && (
                <Button variant="outline" onClick={() => navigate('/client/messagerie')} className="relative">
                  <Bell className="w-4 h-4 mr-2" />
                  Messages
                  <Badge variant="destructive" className="ml-2">{counts.unreadMessages}</Badge>
                </Button>
              )}
              {counts.newOffers > 0 && (
                <Button variant="outline" onClick={() => { navigate('/client/offres-recues'); markOffersAsViewed(); }} className="relative">
                  <Send className="w-4 h-4 mr-2" />
                  Offres
                  <Badge variant="destructive" className="ml-2">{counts.newOffers}</Badge>
                </Button>
              )}
            </div>
          </div>

          {/* Alerte mandat */}
          {daysRemaining > 0 && daysRemaining <= 30 && (
            <Card className="mb-6 border-warning bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Il vous reste {daysRemaining} jours sur votre mandat !
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Souhaitez-vous renouveler ou avez-vous des questions ?
                    </p>
                    <div className="flex gap-3 mt-4">
                      <Button size="sm" variant="default" onClick={handleRenewMandat}>
                        Renouveler mon mandat
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate('/client/messagerie')}>
                        Contacter mon agent
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {daysRemaining <= 0 && (
            <Card className="mb-6 border-destructive bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">❌ Votre mandat a expiré</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Contactez-nous pour renouveler ou demander un remboursement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Offres reçues</p>
                <h3 className="text-2xl font-bold mt-2">{stats.offresRecues}</h3>
                {stats.offresNonVues > 0 && (
                  <p className="text-xs text-primary font-medium mt-1">{stats.offresNonVues} nouvelles</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Visites à venir</p>
                <h3 className="text-2xl font-bold mt-2">{stats.visitesAVenir}</h3>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Visites effectuées</p>
                <h3 className="text-2xl font-bold mt-2">{stats.visitesEffectuees}</h3>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Candidatures</p>
                <h3 className="text-2xl font-bold mt-2">{stats.candidaturesDeposees}</h3>
                {stats.candidaturesEnAttente > 0 && (
                  <p className="text-xs text-warning font-medium mt-1">{stats.candidaturesEnAttente} en attente</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Mon mandat */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Mon mandat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">{new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jours restants</p>
                    <p className="font-medium">{daysRemaining > 0 ? daysRemaining : 0} jours</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      daysRemaining > 30 ? 'bg-success/10 text-success' :
                      daysRemaining > 0 ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {daysRemaining > 0 ? 'Actif' : 'Expiré'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget recherché</p>
                    <p className="font-medium">{client.budget_max} CHF</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Mon agent */}
            {agent && (
              <Card>
                <CardHeader>
                  <CardTitle>👤 Mon agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{agent.prenom} {agent.nom}</p>
                      <p className="text-sm text-muted-foreground mt-1">{agent.email}</p>
                      <p className="text-sm text-muted-foreground">{agent.telephone}</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate('/client/messagerie')}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Prochaines visites */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>📅 Prochaines visites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now).length > 0 ? (
                <>
                  {visites
                    .filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now)
                    .slice(0, 3)
                    .map(visite => (
                      <div 
                        key={visite.id} 
                        className="p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate('/client/visites')}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{visite.adresse}</p>
                            {visite.offres && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {visite.offres.pieces} pièces • {visite.offres.surface}m² • {visite.offres.prix} CHF/mois
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              📅 {new Date(visite.date_visite).toLocaleDateString('fr-CH')} à {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm text-primary"
                    onClick={() => navigate('/client/visites')}
                  >
                    Voir toutes les visites →
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune visite planifiée</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Candidatures récentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>📝 Mes candidatures récentes</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/client/mes-candidatures')}
                >
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {offres.length > 0 ? (
                <>
                  {offres.slice(0, 3).map(offre => {
                    const getStatutLabel = (statut: string) => {
                      switch (statut) {
                        case 'envoyee': return 'Envoyée';
                        case 'vue': return 'Vue';
                        case 'interesse': return 'Intéressé';
                        case 'visite_planifiee': return 'Visite planifiée';
                        case 'visite_effectuee': return 'Visite effectuée';
                        case 'candidature_deposee': return 'Candidature déposée';
                        case 'acceptee': return 'Acceptée ✓';
                        case 'refusee': return 'Refusée';
                        default: return statut;
                      }
                    };

                    const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
                      switch (statut) {
                        case 'envoyee': return 'secondary';
                        case 'vue': return 'outline';
                        case 'interesse': return 'default';
                        case 'visite_planifiee': return 'default';
                        case 'visite_effectuee': return 'default';
                        case 'candidature_deposee': return 'default';
                        case 'acceptee': return 'default';
                        case 'refusee': return 'destructive';
                        default: return 'secondary';
                      }
                    };

                    return (
                      <div 
                        key={offre.id} 
                        className="p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate('/client/mes-candidatures')}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium">{offre.adresse}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {offre.pieces} pièces • {offre.surface}m² • {offre.prix?.toLocaleString('fr-CH')} CHF/mois
                            </p>
                          </div>
                          <Badge variant={getStatutBadgeVariant(offre.statut)} className="ml-2">
                            {getStatutLabel(offre.statut)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                        </p>
                      </div>
                    );
                  })}
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm text-primary"
                    onClick={() => navigate('/client/mes-candidatures')}
                  >
                    Voir toutes les candidatures →
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune candidature déposée</p>
                  <p className="text-xs mt-1">Votre agent vous enverra des offres bientôt</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}