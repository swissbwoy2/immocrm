import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Home, Calendar, FileCheck, MessageSquare, File, Bell, Send, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/KPICard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from '@/utils/calculations';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountActivationModal } from '@/components/AccountActivationModal';
import { ClientStatsSection } from '@/components/stats/ClientStatsSection';
import { MissingDocumentsAlert } from '@/components/MissingDocumentsAlert';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { DossierChecklistCard } from '@/components/DossierChecklistCard';
import { useClientCandidates } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { counts } = useNotifications();
  const [client, setClient] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileActif, setProfileActif] = useState<boolean | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  
  // Hooks pour les candidats et solvabilité - DOIVENT être au niveau supérieur
  const { candidates, refresh: refreshCandidates } = useClientCandidates(client?.id);
  const solvabilityResult = useSolvabilityCheck(client, candidates);

  useEffect(() => {
    loadData();
    
    // Écouter les changements en temps réel sur les visites
    const channel = supabase
      .channel('client-visites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites',
        },
        () => {
          // Recharger les données quand une visite est créée/modifiée
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) {
      console.error('LoadData called but user is null');
      setLoading(false);
      return;
    }

    console.log('Loading data for user:', user.id);

    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      matchesUser: session?.user?.id === user.id
    });

    if (!session) {
      console.error('No active session found');
      setLoading(false);
      return;
    }

    try {
      // Check if profile is active
      const { data: profileData } = await supabase
        .from('profiles')
        .select('actif, prenom, nom')
        .eq('id', user.id)
        .single();

      const isActif = profileData?.actif ?? false;
      setProfileActif(isActif);
      setClientProfile(profileData);
      
      // Show activation modal if profile is not active
      if (!isActif) {
        setShowActivationModal(true);
      }

      // Load client avec log détaillé
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Client query result:', {
        found: !!clientData,
        error: clientError,
        userId: user.id
      });

      if (clientError) {
        console.error('Error loading client:', clientError);
        throw clientError;
      }
      
      if (!clientData) {
        console.error('No client data found for user:', user.id);
        setLoading(false);
        return;
      }
      
      setClient(clientData);

      // Load agent if assigned
      if (clientData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select(`
            *,
            profile:profiles!agents_user_id_fkey(
              prenom,
              nom,
              email,
              telephone,
              avatar_url
            )
          `)
          .eq('id', clientData.agent_id)
          .maybeSingle();

        if (agentData?.profile) {
          setAgent({
            ...agentData,
            prenom: agentData.profile.prenom || '',
            nom: agentData.profile.nom || '',
            email: agentData.profile.email || '',
            telephone: agentData.profile.telephone || '',
            avatar_url: agentData.profile.avatar_url || null,
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

      // Load candidatures
      const { data: candidaturesData } = await supabase
        .from('candidatures')
        .select('*, offres(adresse, prix, pieces, surface)')
        .eq('client_id', clientData.id)
        .order('updated_at', { ascending: false });

      setCandidatures(candidaturesData || []);

      // Load documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientData.id);

      setDocuments(docsData || []);
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
      
      // 2. Mettre à jour la date du mandat (réinitialise le compteur à 90 jours)
      const { error: updateError } = await supabase
        .from('clients')
        .update({ date_ajout: newDate })
        .eq('id', client.id);
      
      if (updateError) throw updateError;
      
      // 3. Récupérer le profile du client pour le message
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('nom, prenom')
        .eq('id', user.id)
        .maybeSingle();

      const messageContent = `🔄 Le client ${clientProfile?.prenom} ${clientProfile?.nom} a renouvelé son mandat pour 90 jours supplémentaires. Nouvelle date de début : ${new Date().toLocaleDateString('fr-CH')}`;
      
      // 4. Notifier l'agent
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
        
        if (conversationId) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: client.id,
              sender_type: 'client',
              content: messageContent
            });
        }
      }

      // 5. Notifier tous les admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        // Récupérer les agents correspondants aux admins (si ils existent)
        for (const adminRole of adminRoles) {
          const { data: adminAgent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', adminRole.user_id)
            .maybeSingle();

          if (adminAgent) {
            // Vérifier si une conversation existe déjà
            const { data: existingAdminConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('client_id', client.id)
              .eq('agent_id', adminAgent.id)
              .maybeSingle();

            let adminConversationId = existingAdminConv?.id;

            if (!adminConversationId) {
              const { data: newAdminConv } = await supabase
                .from('conversations')
                .insert({
                  client_id: client.id,
                  agent_id: adminAgent.id,
                  subject: 'Renouvellement de mandat'
                })
                .select('id')
                .maybeSingle();

              adminConversationId = newAdminConv?.id;
            }

            if (adminConversationId) {
              await supabase
                .from('messages')
                .insert({
                  conversation_id: adminConversationId,
                  sender_id: client.id,
                  sender_type: 'client',
                  content: messageContent
                });
            }
          }
        }
      }
      
      // 6. Recharger les données
      await loadData();
      
      toast.success('✅ Votre mandat a été renouvelé pour 90 jours !');
    } catch (error) {
      console.error('Error renewing mandate:', error);
      toast.error('❌ Erreur lors du renouvellement');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleInitializeProfile = async () => {
    if (!user) return;
    
    try {
      // Utiliser upsert pour gérer le cas où le client existe déjà
      const { error } = await supabase
        .from('clients')
        .upsert({
          user_id: user.id,
          date_ajout: new Date().toISOString(),
          statut: 'actif',
          priorite: 'moyenne'
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Votre profil client a été chargé');
      loadData();
    } catch (error) {
      console.error('Error initializing profile:', error);
      toast.error('Impossible de charger votre profil');
    }
  };

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">Profil non chargé</h2>
            <p className="text-muted-foreground mb-4">
              Impossible de charger votre profil client. Cliquez sur le bouton ci-dessous pour réessayer.
            </p>
            <div className="space-y-2">
              <Button onClick={loadData} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Rafraîchir
              </Button>
              <Button onClick={handleInitializeProfile} variant="outline" className="w-full">
                Forcer le chargement
              </Button>
            </div>
          </CardContent>
        </Card>
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

  const clientFullName = clientProfile ? `${clientProfile.prenom} ${clientProfile.nom}` : 'Client';

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mon tableau de bord</h1>
              <p className="text-muted-foreground">Suivez l'avancement de votre recherche</p>
            </div>
            <div className="flex gap-2">
              {counts.new_message > 0 && (
                <Button variant="outline" onClick={() => navigate('/client/messagerie')} className="relative">
                  <Bell className="w-4 h-4 mr-2" />
                  Messages
                  <Badge variant="destructive" className="ml-2">{counts.new_message}</Badge>
                </Button>
              )}
              {counts.new_offer > 0 && (
                <Button variant="outline" onClick={() => navigate('/client/offres-recues')} className="relative">
                  <Send className="w-4 h-4 mr-2" />
                  Offres
                  <Badge variant="destructive" className="ml-2">{counts.new_offer}</Badge>
                </Button>
              )}
            </div>
          </div>

          {/* Alerte compte non actif */}
          {profileActif === false && (
            <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      ⏳ Compte en attente d'activation
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Votre profil n'a pas encore été activé par votre agent. Veuillez patienter ou contacter votre agent pour activer votre compte.
                    </p>
                    {agent && (
                      <Button size="sm" variant="outline" className="mt-4" onClick={() => navigate('/client/messagerie')}>
                        Contacter mon agent
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerte documents manquants */}
          {profileActif !== false && (
            <div className="mb-6">
              <MissingDocumentsAlert 
                documents={documents} 
                candidatureStatut={candidatures[0]?.statut}
                showPostSignature={candidatures.some(c => ['signature_effectuee', 'etat_lieux_fixe'].includes(c.statut))}
              />
            </div>
          )}

          {/* Alerte mandat */}
          {profileActif !== false && daysRemaining > 0 && daysRemaining <= 30 && (
            <Card className="mb-6 border-warning bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Il vous reste {formatTimeRemaining(daysRemaining)} sur votre mandat !
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

          {profileActif !== false && daysRemaining <= 0 && (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
            <KPICard
              title="Offres reçues"
              value={stats.offresRecues}
              icon={Home}
              subtitle={stats.offresNonVues > 0 ? `${stats.offresNonVues} nouvelles` : undefined}
              variant={stats.offresNonVues > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/client/offres-recues')}
            />

            <KPICard
              title="Visites à venir"
              value={stats.visitesAVenir}
              icon={Calendar}
              onClick={() => navigate('/client/visites')}
            />

            <KPICard
              title="Visites effectuées"
              value={stats.visitesEffectuees}
              icon={Calendar}
              variant="success"
              onClick={() => navigate('/client/visites')}
            />

            <KPICard
              title="Candidatures"
              value={stats.candidaturesDeposees}
              icon={FileCheck}
              subtitle={stats.candidaturesEnAttente > 0 ? `${stats.candidaturesEnAttente} en attente` : undefined}
              variant={stats.candidaturesEnAttente > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/client/mes-candidatures')}
            />
          </div>

          {/* Section Statistiques détaillées */}
          <div className="mb-8">
            <ClientStatsSection
              offres={offres}
              visites={visites}
              candidatures={candidatures}
              client={client}
            />
          </div>

          {/* Solvabilité et Candidats */}
          {profileActif !== false && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Alerte de solvabilité */}
              <SolvabilityAlert result={solvabilityResult} />
              
              {/* Checklist du dossier */}
              <DossierChecklistCard
                clientName={clientFullName}
                candidates={candidates}
                documents={documents}
              />
            </div>
          )}

          {/* Gestion des candidats */}
          {profileActif !== false && (
            <div className="mb-8">
              <ClientCandidatesManager
                clientId={client.id}
                clientRevenus={client.revenus_mensuels || 0}
                budgetDemande={client.budget_max || 0}
              />
            </div>
          )}

          {/* Candidatures en cours de traitement */}
          {(() => {
            const statusInProgress = ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises', 'acceptee'];
            const candidaturesEnCours = candidatures.filter(c => statusInProgress.includes(c.statut));
            
            const getStatusInfo = (statut: string) => {
              switch (statut) {
                case 'en_attente': return { label: '⏳ En attente', step: 1, color: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-600 dark:text-gray-400', progress: 10 };
                case 'acceptee': return { label: '✅ Acceptée', step: 2, color: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-600 dark:text-green-400', progress: 20 };
                case 'bail_conclu': return { label: '🎉 Prêt à conclure', step: 3, color: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400', progress: 30 };
                case 'attente_bail': return { label: '📄 Attente bail', step: 4, color: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', progress: 40 };
                case 'bail_recu': return { label: '📋 Bail reçu', step: 5, color: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-600 dark:text-blue-400', progress: 50 };
                case 'signature_planifiee': return { label: '📝 Signature planifiée', step: 6, color: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400', progress: 60 };
                case 'signature_effectuee': return { label: '🖊️ Signature effectuée', step: 7, color: 'bg-indigo-100 dark:bg-indigo-900/30', textColor: 'text-indigo-600 dark:text-indigo-400', progress: 70 };
                case 'etat_lieux_fixe': return { label: '🏠 État des lieux fixé', step: 8, color: 'bg-cyan-100 dark:bg-cyan-900/30', textColor: 'text-cyan-600 dark:text-cyan-400', progress: 85 };
                case 'cles_remises': return { label: '🔑 Clés remises', step: 9, color: 'bg-teal-100 dark:bg-teal-900/30', textColor: 'text-teal-600 dark:text-teal-400', progress: 100 };
                default: return { label: statut, step: 0, color: 'bg-gray-100', textColor: 'text-gray-600', progress: 0 };
              }
            };

            if (candidaturesEnCours.length === 0) return null;

            return (
              <Card className="mb-8 border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
                      <FileCheck className="w-5 h-5" />
                      🚀 Vos candidatures en cours
                    </CardTitle>
                    <Badge variant="default" className="animate-pulse text-lg px-3 py-1">
                      {candidaturesEnCours.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidaturesEnCours.slice(0, 3).map(cand => {
                    const statusInfo = getStatusInfo(cand.statut);
                    
                    return (
                      <div 
                        key={cand.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${statusInfo.color}`}
                        onClick={() => navigate('/client/mes-candidatures')}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{cand.offres?.adresse}</p>
                            <p className="text-sm text-muted-foreground">
                              {cand.offres?.pieces} pièces • {cand.offres?.prix?.toLocaleString()} CHF/mois
                            </p>
                          </div>
                          <Badge className={`${statusInfo.textColor} border-2 font-bold`} variant="outline">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        {/* Barre de progression */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progression du dossier</span>
                            <span className={`font-bold ${statusInfo.textColor}`}>{statusInfo.progress}%</span>
                          </div>
                          <Progress 
                            value={statusInfo.progress} 
                            className="h-2"
                          />
                          <p className={`text-xs mt-2 font-medium ${statusInfo.textColor}`}>
                            Étape {statusInfo.step}/9 : {statusInfo.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <Button 
                    variant="default"
                    size="lg" 
                    className="w-full mt-2"
                    onClick={() => navigate('/client/mes-candidatures')}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Voir toutes mes candidatures
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Mon mandat */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Mon mandat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileActif === false ? (
                  /* État compte non actif */
                  <div className="text-center py-4">
                    <div className="p-4 bg-orange-100 dark:bg-orange-950/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-orange-500" />
                    </div>
                    <p className="font-medium text-foreground mb-2">Compte en attente d'activation</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      La progression de votre mandat sera disponible dès que votre profil sera activé par votre agent.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date d'inscription</p>
                        <p className="font-medium">{new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Statut</p>
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
                          En attente
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progression du mandat</span>
                        <span className="font-medium text-orange-500">En attente</span>
                      </div>
                      <Progress 
                        value={0} 
                        className="h-3 bg-orange-100 dark:bg-orange-950/30"
                      />
                      <p className="text-xs text-orange-500 mt-2 text-center">
                        ⏳ Sera activée dès que votre profil sera validé
                      </p>
                    </div>
                  </div>
                ) : (
                  /* État compte actif */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date de début</p>
                        <p className="font-medium">{new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Temps restant</p>
                        <p className="font-medium">{formatTimeRemaining(daysRemaining)}</p>
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
                        <span className="text-muted-foreground">Progression du mandat (90 jours)</span>
                        <span className="font-medium">{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress 
                        value={progressPercent} 
                        className="h-3"
                        indicatorClassName={
                          daysRemaining > 30 ? 'bg-success' :
                          daysRemaining > 0 ? 'bg-warning' :
                          'bg-destructive'
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Début: {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</span>
                        <span>{daysRemaining > 0 ? `${Math.floor(daysRemaining)} jours restants` : 'Expiré'}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Mon agent */}
            <Card>
              <CardHeader>
                <CardTitle>👤 Mon agent</CardTitle>
              </CardHeader>
              <CardContent>
                {agent ? (
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
                ) : (
                  <div className="text-center py-6">
                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">Aucun agent assigné</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Un agent vous sera bientôt attribué pour vous accompagner dans votre recherche.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* Modal d'activation de compte */}
      <AccountActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        userId={user?.id || ''}
      />
    </>
  );
}