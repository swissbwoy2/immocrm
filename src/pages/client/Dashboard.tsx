import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Home, Calendar, FileCheck, MessageSquare, File, Bell, Send, RefreshCw, Sparkles, ChevronRight, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PremiumKPICard, 
  PremiumVisiteCard, 
  PremiumOffreRecueCard, 
  PremiumEmptyState,
  PremiumMandatProgress,
  PremiumAgentCard,
  PremiumStatusCard,
  PremiumDashboardHeader,
  PremiumCandidatureProgressCard,
  PremiumPurchaseCapacityCard,
  PremiumCandidatesCard
} from '@/components/premium';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from '@/utils/calculations';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountActivationModal } from '@/components/AccountActivationModal';
import { ClientStatsSection } from '@/components/stats/ClientStatsSection';
import { MissingDocumentsAlert } from '@/components/MissingDocumentsAlert';

import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { PurchaseSolvabilityAlert } from '@/components/PurchaseSolvabilityAlert';
import { PremiumDossierChecklistCard } from '@/components/premium';
import { useClientCandidates } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';
import { usePurchaseSolvabilityCheck } from '@/hooks/usePurchaseSolvabilityCheck';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

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
  
  // Hooks pour les candidats et solvabilité
  const { candidates, refresh: refreshCandidates } = useClientCandidates(client?.id);
  const solvabilityResult = useSolvabilityCheck(client, candidates);
  const purchaseSolvabilityResult = usePurchaseSolvabilityCheck(client, candidates);
  
  // Détecter si le client est un acheteur
  const isAcheteur = client?.type_recherche === 'Acheter';

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
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadData = async () => {
    if (!user) {
      console.error('LoadData called but user is null');
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session found');
      setLoading(false);
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('actif, prenom, nom')
        .eq('id', user.id)
        .single();

      const isActif = profileData?.actif ?? false;
      setProfileActif(isActif);
      setClientProfile(profileData);
      
      if (!isActif) {
        setShowActivationModal(true);
      }

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        setLoading(false);
        return;
      }
      
      setClient(clientData);

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

      const { data: offresData } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientData.id);

      setOffres(offresData || []);

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .order('date_visite', { ascending: true });

      setVisites(visitesData || []);

      const { data: candidaturesData } = await supabase
        .from('candidatures')
        .select('*, offres(adresse, prix, pieces, surface)')
        .eq('client_id', clientData.id)
        .order('updated_at', { ascending: false });

      setCandidatures(candidaturesData || []);

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
      
      const { error: updateError } = await supabase
        .from('clients')
        .update({ date_ajout: newDate })
        .eq('id', client.id);
      
      if (updateError) throw updateError;
      
      const { data: clientProfileData } = await supabase
        .from('profiles')
        .select('nom, prenom')
        .eq('id', user.id)
        .maybeSingle();

      const messageContent = `🔄 Le client ${clientProfileData?.prenom} ${clientProfileData?.nom} a renouvelé son mandat pour 90 jours supplémentaires. Nouvelle date de début : ${new Date().toLocaleDateString('fr-CH')}`;
      
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

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        for (const adminRole of adminRoles) {
          const { data: adminAgent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', adminRole.user_id)
            .maybeSingle();

          if (adminAgent) {
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
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  const handleInitializeProfile = async () => {
    if (!user) return;
    
    try {
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
        <Card className="max-w-md relative overflow-hidden group hover:shadow-xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-destructive/10" />
          <CardContent className="relative pt-6 text-center">
            <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-950/30 w-16 h-16 mx-auto flex items-center justify-center mb-4 animate-pulse-soft">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Profil non chargé</h2>
            <p className="text-muted-foreground mb-4">
              Impossible de charger votre profil client. Cliquez sur le bouton ci-dessous pour réessayer.
            </p>
            <div className="space-y-2">
              <Button onClick={loadData} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300">
                <RefreshCw className="w-4 h-4 mr-2" />
                Rafraîchir
              </Button>
              <Button onClick={handleInitializeProfile} variant="outline" className="w-full hover:scale-[1.02] transition-transform">
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

  // Candidatures en cours de traitement
  const statusInProgress = ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises', 'acceptee'];
  const candidaturesEnCours = candidatures.filter(c => statusInProgress.includes(c.statut));

  return (
    <>
      <div className="flex-1 overflow-y-auto relative">
        {/* Global floating particles */}
        <FloatingParticles count={12} className="fixed inset-0 pointer-events-none z-0 opacity-30" />
        
        <div className="relative z-10 p-4 md:p-8">
          {/* Premium Dashboard Header */}
          <PremiumDashboardHeader
            userName={clientProfile?.prenom}
            isAcheteur={isAcheteur}
            messageCount={counts.new_message}
            offerCount={counts.new_offer}
            onMessagesClick={() => navigate('/client/messagerie')}
            onOffersClick={() => navigate('/client/offres-recues')}
          />

          {/* Alerte compte non actif */}
          {profileActif === false && (
            <div className="mb-6 animate-fade-in">
              <PremiumStatusCard
                variant="waiting"
                title="Compte en attente d'activation"
                description="Votre profil n'a pas encore été activé par votre agent. Veuillez patienter ou contacter votre agent pour activer votre compte."
                action={agent ? {
                  label: 'Contacter mon agent',
                  onClick: () => navigate('/client/messagerie')
                } : undefined}
              />
            </div>
          )}

          {/* Alerte documents manquants */}
          {profileActif !== false && (
            <div className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <MissingDocumentsAlert 
                documents={documents} 
                candidatureStatut={candidatures[0]?.statut}
                showPostSignature={candidatures.some(c => ['signature_effectuee', 'etat_lieux_fixe'].includes(c.statut))}
              />
            </div>
          )}

          {/* Alerte mandat expirant */}
          {profileActif !== false && daysRemaining > 0 && daysRemaining <= 30 && (
            <div className="mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
              <PremiumStatusCard
                variant="warning"
                title={`Il vous reste ${formatTimeRemaining(daysRemaining)} sur votre mandat !`}
                description="Souhaitez-vous renouveler ou avez-vous des questions ?"
                action={{
                  label: 'Renouveler mon mandat',
                  onClick: handleRenewMandat
                }}
              >
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => navigate('/client/messagerie')}
                  className="mt-2"
                >
                  Contacter mon agent
                </Button>
              </PremiumStatusCard>
            </div>
          )}

          {/* Alerte mandat expiré */}
          {profileActif !== false && daysRemaining <= 0 && (
            <div className="mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
              <PremiumStatusCard
                variant="warning"
                icon={AlertTriangle}
                title="Votre mandat a expiré"
                description="Contactez-nous pour renouveler ou demander un remboursement."
                action={{
                  label: 'Contacter mon agent',
                  onClick: () => navigate('/client/messagerie')
                }}
              />
            </div>
          )}

          {/* KPIs avec effets premium */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
            <PremiumKPICard
              title="Offres reçues"
              value={stats.offresRecues}
              icon={Home}
              subtitle={stats.offresNonVues > 0 ? `${stats.offresNonVues} nouvelles` : undefined}
              variant={stats.offresNonVues > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/client/offres-recues')}
            />
            <PremiumKPICard
              title="Visites à venir"
              value={stats.visitesAVenir}
              icon={Calendar}
              onClick={() => navigate('/client/visites')}
            />
            <PremiumKPICard
              title="Visites effectuées"
              value={stats.visitesEffectuees}
              icon={Calendar}
              variant="success"
              onClick={() => navigate('/client/visites')}
            />
            <PremiumKPICard
              title="Candidatures"
              value={stats.candidaturesDeposees}
              icon={FileCheck}
              subtitle={stats.candidaturesEnAttente > 0 ? `${stats.candidaturesEnAttente} en attente` : undefined}
              variant={stats.candidaturesEnAttente > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/client/mes-candidatures')}
            />
          </div>

          {/* Section Statistiques détaillées */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Card className="relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-500 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
              <CardContent className="relative p-0">
                <ClientStatsSection
                  offres={offres}
                  visites={visites}
                  candidatures={candidatures}
                  client={client}
                />
              </CardContent>
            </Card>
          </div>

          {/* Solvabilité et Checklist */}
          {profileActif !== false && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="animate-fade-in group" style={{ animationDelay: '220ms' }}>
                <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                  <div className="relative">
                    {isAcheteur ? (
                      <PurchaseSolvabilityAlert result={purchaseSolvabilityResult} />
                    ) : (
                      <SolvabilityAlert result={solvabilityResult} />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="animate-fade-in" style={{ animationDelay: '280ms' }}>
                <PremiumDossierChecklistCard
                  clientName={clientFullName}
                  candidates={candidates}
                  documents={documents}
                />
              </div>
            </div>
          )}

          {/* Gestion des candidats - Premium */}
          {profileActif !== false && (
            <div className="mb-8 animate-fade-in" style={{ animationDelay: '340ms' }}>
              <PremiumCandidatesCard
                clientId={client.id}
                clientRevenus={client.revenus_mensuels || 0}
                budgetDemande={client.budget_max || 0}
              />
            </div>
          )}

          {/* Candidatures en cours - Premium Section */}
          {candidaturesEnCours.length > 0 && (
            <div className="mb-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-xl border-2 border-primary/30 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10" />
                <div className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg shadow-primary/10">
                          <FileCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                          {candidaturesEnCours.length}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                          🚀 Vos candidatures en cours
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Suivez la progression de vos dossiers
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                      onClick={() => navigate('/client/mes-candidatures')}
                    >
                      <FileCheck className="w-4 h-4" />
                      Tout voir
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {candidaturesEnCours.slice(0, 3).map((cand, index) => (
                      <PremiumCandidatureProgressCard
                        key={cand.id}
                        candidature={cand}
                        index={index}
                        onClick={() => navigate('/client/mes-candidatures')}
                      />
                    ))}
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] transition-all duration-300 group/btn"
                    onClick={() => navigate('/client/mes-candidatures')}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Voir toutes mes candidatures
                    <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Mon mandat & Mon agent - Grid Premium */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Mon mandat - PremiumMandatProgress */}
            <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
              {profileActif === false ? (
                <PremiumStatusCard
                  variant="waiting"
                  title="Compte en attente d'activation"
                  description="La progression de votre mandat sera disponible dès que votre profil sera activé par votre agent."
                >
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-sm text-muted-foreground">Date d'inscription</p>
                      <p className="font-medium">{new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">En attente</Badge>
                    </div>
                  </div>
                </PremiumStatusCard>
              ) : (
                <PremiumMandatProgress
                  daysElapsed={daysElapsed}
                  daysRemaining={daysRemaining}
                  totalDays={90}
                  startDate={client.date_ajout || client.created_at}
                />
              )}
            </div>

            {/* Mon agent - PremiumAgentCard */}
            <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
              {agent ? (
                <PremiumAgentCard
                  agent={agent}
                  onMessage={() => navigate('/client/messagerie')}
                />
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Mon agent</h3>
                    </div>
                    
                    <div className="text-center py-6">
                      <div className="relative inline-block">
                        <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4 shadow-inner">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/30 animate-spin" style={{ animationDuration: '10s' }} />
                      </div>
                      <p className="text-muted-foreground font-medium">Aucun agent assigné</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Un agent vous sera bientôt attribué pour vous accompagner dans votre recherche.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section financière acheteurs - Premium */}
          {isAcheteur && profileActif !== false && (
            <div className="mb-8 animate-fade-in" style={{ animationDelay: '550ms' }}>
              <PremiumPurchaseCapacityCard
                result={purchaseSolvabilityResult}
                apportPersonnel={client.apport_personnel || 0}
              />
            </div>
          )}

          {/* Prochaines visites - Premium Section */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-xl border border-border/50 group">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
              </div>
              
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg shadow-primary/10">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      {visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now).length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                          {visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now).length}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Prochaines visites
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Vos rendez-vous à venir
                      </p>
                    </div>
                  </div>
                  
                  {visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now).length > 0 && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                      onClick={() => navigate('/client/visites')}
                    >
                      <Calendar className="w-4 h-4" />
                      Tout voir
                    </Button>
                  )}
                </div>
                
                {visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now).length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {visites
                        .filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now)
                        .slice(0, 3)
                        .map((visite, index) => (
                          <PremiumVisiteCard
                            key={visite.id}
                            visite={visite}
                            index={index}
                            onClick={() => navigate('/client/visites')}
                          />
                        ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full text-sm text-primary hover:bg-primary/10 hover:scale-[1.01] transition-all duration-300 group/btn"
                      onClick={() => navigate('/client/visites')}
                    >
                      <span>Voir toutes les visites</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </div>
                ) : (
                  <PremiumEmptyState
                    icon={Calendar}
                    title="Aucune visite planifiée"
                    description="Vos prochaines visites de logements apparaîtront ici dès qu'elles seront programmées."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mes offres reçues - Premium Section */}
          <div className="animate-fade-in" style={{ animationDelay: '650ms' }}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-xl border border-border/50 group">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
              </div>
              
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 shadow-lg shadow-accent/10">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      {offres.filter(o => o.statut === 'envoyee').length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                          {offres.filter(o => o.statut === 'envoyee').length}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Mes offres reçues
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {offres.length} offre{offres.length > 1 ? 's' : ''} • {offres.filter(o => o.statut === 'envoyee').length} nouvelle{offres.filter(o => o.statut === 'envoyee').length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {offres.length > 0 && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                      onClick={() => navigate('/client/offres-recues')}
                    >
                      <FileText className="w-4 h-4" />
                      Tout voir
                    </Button>
                  )}
                </div>
                
                {offres.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {offres.slice(0, 3).map((offre, index) => (
                        <PremiumOffreRecueCard
                          key={offre.id}
                          offre={offre}
                          index={index}
                          onClick={() => navigate(`/client/offres-recues?offre=${offre.id}`)}
                        />
                      ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full text-sm text-primary hover:bg-primary/10 hover:scale-[1.01] transition-all duration-300 group/btn"
                      onClick={() => navigate('/client/offres-recues')}
                    >
                      <span>Voir toutes mes offres</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </div>
                ) : (
                  <PremiumEmptyState
                    icon={FileText}
                    title="Aucune offre reçue"
                    description="Les offres de logements correspondant à vos critères apparaîtront ici."
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {user && (
        <AccountActivationModal 
          isOpen={showActivationModal} 
          onClose={() => setShowActivationModal(false)}
          userId={user.id}
        />
      )}
    </>
  );
}
