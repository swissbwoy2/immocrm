import { useEffect, useState, useCallback } from 'react';
import { isVisiteReelle } from '@/lib/visitDecision';
import { LayoutDashboard, FileText, Home, Calendar, FileCheck, MessageSquare, File, Bell, Send, RefreshCw, Sparkles, ChevronRight, User, FolderOpen, Map } from 'lucide-react';
import { MesVisitesAVenirBand } from '@/components/client/dashboard/MesVisitesAVenirBand';
import { OffresRecuesCarousel } from '@/components/client/dashboard/OffresRecuesCarousel';

import { PullToRefresh } from '@/components/ui/pull-to-refresh';
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
  PremiumCandidatesCard
} from '@/components/premium';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDemoAccount } from '@/hooks/useIsDemoAccount';
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from '@/utils/calculations';
import { getMandatDates, MANDAT_DURATION_DAYS } from '@/utils/mandatDates';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountActivationModal } from '@/components/AccountActivationModal';
import { ClientStatsSection } from '@/components/stats/ClientStatsSection';
import { MissingDocumentsAlert } from '@/components/MissingDocumentsAlert';
import { MustChangePasswordBanner } from '@/components/MustChangePasswordBanner';

import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { DocumentUpdateReminder } from '@/components/DocumentUpdateReminder';
import { ExtraitPoursuitesHeroCard } from '@/components/ExtraitPoursuitesHeroCard';
import { PremiumDossierChecklistCard } from '@/components/premium';
import { useClientCandidates } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { MesCreditsCard } from '@/components/credits/MesCreditsCard';
import { MandatCreditsGate } from '@/components/credits/MandatCreditsGate';
import { DASH_CARD, DashSection, DashSectionLink, StatTile, LinkRow, TodoCard } from '@/components/client/dashboard/DashPrimitives';

import RenovationClientDashboard from './dashboards/RenovationClientDashboard';
import VenteClientDashboard from './dashboards/VenteClientDashboard';
import RelocationClientDashboard from './dashboards/RelocationClientDashboard';
import DashboardRelouer from './DashboardRelouer';
import DashboardAchat from './DashboardAchat';
import DashboardAchatEnAttente from './DashboardAchatEnAttente';
import { resolveClientParcours } from '@/lib/journey';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';
import { MaJourneeBanner } from '@/components/dashboard/MaJourneeBanner';

export default function ClientDashboardDispatcher() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ prenom?: string; nom?: string; parcours_type?: string } | null>(null);
  const [journeyType, setJourneyType] = useState<string | null>(null);
  const [typeRecherche, setTypeRecherche] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [hasPurchaseProject, setHasPurchaseProject] = useState<boolean>(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) { setResolved(true); return; }
      const [{ data: prof }, { data: client }] = await Promise.all([
        supabase.from('profiles').select('prenom, nom, parcours_type').eq('id', user.id).maybeSingle(),
        supabase.from('clients').select('id, user_id, journey_type, type_recherche').eq('user_id', user.id).maybeSingle(),
      ]);
      let pp: any = null;
      const { data: byUser } = await supabase.from('purchase_projects').select('id, client_id, user_id, statut').eq('user_id', user.id).maybeSingle();
      pp = byUser;
      if (!pp && client?.id) {
        const { data: byClient } = await supabase.from('purchase_projects').select('id, client_id, user_id, statut').eq('client_id', client.id).maybeSingle();
        pp = byClient;
      }
      setProfile(prof || null);
      setJourneyType(client?.journey_type || null);
      setTypeRecherche(client?.type_recherche || null);
      setPurchaseStatus(pp?.statut || null);
      setHasPurchaseProject(!!pp);
      setResolved(true);
    };
    load();
  }, [user]);

  if (!resolved) {
    return (
      <div className="p-4 md:p-8" role="status" aria-label="Chargement du tableau de bord">
        <div className="h-7 w-48 rounded bg-muted/60" />
        <div className="mt-6 h-24 max-w-xl rounded bg-muted/40" />
      </div>
    );
  }

  // Règle unique de parcours (identique au menu latéral et à la barre du bas).
  const parcours = resolveClientParcours(
    { journey_type: journeyType, type_recherche: typeRecherche },
    hasPurchaseProject ? { id: 'projet' } : null,
    profile?.parcours_type ?? null,
  );

  if (parcours === 'achat') {
    // Distinction "en attente d'activation" vs "actif" ; acheteur sans projet = en attente.
    if (hasPurchaseProject && purchaseStatus !== 'en_attente_activation') {
      return <DashboardAchat profile={profile} />;
    }
    return <DashboardAchatEnAttente profile={profile} />;
  }
  // Reloueur pur — dashboard dédié, jamais de badges chercheur
  if (parcours === 'relouer') return <DashboardRelouer />;
  if (parcours === 'renovation') return <RenovationClientDashboard profile={profile} />;
  if (parcours === 'vente') return <VenteClientDashboard profile={profile} />;
  if (parcours === 'relocation') return <RelocationClientDashboard profile={profile} />;
  return <ClientDashboardLocation />;
}


function ClientDashboardLocation() {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const isDemo = useIsDemoAccount();
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
  // Les acheteurs ont leur propre tableau de bord (DashboardAchat) : celui-ci ne sert que la location.

  // Définir loadData comme useCallback AVANT les returns conditionnels
  const loadData = useCallback(async () => {
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
        .select('actif, prenom, nom, parcours_type')
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

      // === PARALLEL: Load offres, visites, candidatures, documents simultaneously ===
      const [offresResult, visitesResult, candidaturesResult, docsResult] = await Promise.all([
        supabase
          .from('offres')
          .select('id, adresse, prix, pieces, surface, etage, date_envoi, created_at, lien_annonce, medias_galerie, statut, client_id, titre, type_bien')
          .eq('client_id', clientData.id)
          .limit(15000),
        supabase
          .from('visites')
          .select('*, offres(*)')
          .eq('client_id', clientData.id)
          .order('date_visite', { ascending: true })
          .limit(15000),
        supabase
          .from('candidatures')
          .select('*, offres(adresse, prix, pieces, surface)')
          .eq('client_id', clientData.id)
          .order('updated_at', { ascending: false })
          .limit(15000),
        supabase
          .from('documents')
          .select('*')
          .eq('client_id', clientData.id),
      ]);

      // Error logging for silent query failures
      if (offresResult.error) console.error('Offres query error:', offresResult.error);
      if (visitesResult.error) console.error('Visites query error:', visitesResult.error);
      if (candidaturesResult.error) console.error('Candidatures query error:', candidaturesResult.error);
      if (docsResult.error) console.error('Documents query error:', docsResult.error);

      setOffres(offresResult.data || []);
      setVisites(visitesResult.data || []);
      setCandidatures(candidaturesResult.data || []);
      setDocuments(docsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Définir handleRefresh AVANT les returns conditionnels
  const handleRefresh = useCallback(async () => {
    await loadData();
    refreshCandidates();
  }, [loadData, refreshCandidates]);

  useEffect(() => {
    loadData();
    
    // Écouter les changements en temps réel sur les visites (scoped by client)
    const channel = supabase
      .channel('client-visites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites',
          filter: client ? `client_id=eq.${client.id}` : undefined,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);


  const handleRenewMandat = async () => {
    if (!client || !user) return;
    
    try {
      const oldDate = client.date_ajout || client.created_at;
      const newDate = new Date().toISOString();

      // Nouvelle échéance = (échéance courante si future, sinon aujourd'hui) + 90 jours
      const currentEnd = getMandatDates(client as any).end;
      const base = currentEnd && currentEnd.getTime() > Date.now() ? new Date(currentEnd) : new Date();
      const newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + MANDAT_DURATION_DAYS);
      
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
      
      const { data: updatedRows, error: updateError } = await supabase
        .from('clients')
        .update({
          mandate_official_end_date: newEnd.toISOString(),
          mandat_renewal_count: (client.mandat_renewal_count ?? 0) + 1,
        })
        .eq('id', client.id)
        .select('id, mandate_official_end_date, mandat_renewal_count');
      
      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("Le renouvellement n'a pas pu être enregistré (accès refusé).");
      }
      
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
      toast.success(`✅ Mandat renouvelé jusqu'au ${newEnd.toLocaleDateString('fr-CH')}`);
    } catch (error: any) {
      console.error('Error renewing mandate:', error);
      toast.error(`❌ Erreur lors du renouvellement${error?.message ? ` : ${error.message}` : ''}`);
    }
  };

  if (loading) {
    return (
      <PremiumPageShellV2>
        <div className="p-4 md:p-8" role="status" aria-label="Chargement du tableau de bord">
          <div className="h-7 w-48 rounded bg-muted/60" />
          <div className="mt-6 h-24 max-w-xl rounded bg-muted/40" />
        </div>
      </PremiumPageShellV2>
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
              <Button onClick={loadData} className="w-full">
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

  // Déterminer la date de fin du mandat si le client est relogé
  const reloggedCandidatureForCalc = candidatures.find(c => 
    ['signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut)
  );
  const reloggedEndDate = reloggedCandidatureForCalc?.cles_remises_at || 
                        reloggedCandidatureForCalc?.signature_effectuee_at || 
                        reloggedCandidatureForCalc?.date_etat_lieux || null;

  // Source unique de vérité (alignée avec "Mon contrat")
  const mandatInfo = getMandatDates(client as any);
  const daysElapsed = reloggedEndDate
    ? calculateDaysElapsed(client.date_ajout || client.created_at || new Date().toISOString(), reloggedEndDate)
    : mandatInfo.daysSinceSignature;
  const daysRemaining = reloggedEndDate
    ? calculateDaysRemaining(client.date_ajout || client.created_at || new Date().toISOString(), reloggedEndDate)
    : mandatInfo.daysRemaining;

  // Calculate stats
  const now = new Date();
  const statutOffre = new globalThis.Map<string, string>(offres.map((o: any) => [o.id, o.statut] as [string, string]));
  const reelle = (v: any) => isVisiteReelle(v, v.offre_id ? statutOffre.get(v.offre_id) : null);
  const stats = {
    offresRecues: offres.length,
    offresNonVues: offres.filter(o => o.statut === 'envoyee').length,
    visitesAVenir: visites.filter(v => 
      ['planifiee', 'confirmee'].includes(v.statut) && new Date(v.date_visite) >= now && reelle(v)
    ).length,
    visitesEffectuees: visites.filter(v => 
      v.statut === 'effectuee' || (['planifiee', 'confirmee'].includes(v.statut) && new Date(v.date_visite) < now && reelle(v))
    ).length,
    candidaturesDeposees: offres.filter(o => o.statut === 'candidature_deposee').length,
    candidaturesEnAttente: offres.filter(o => ['candidature_deposee', 'visite_effectuee'].includes(o.statut)).length,
  };

  const clientFullName = clientProfile ? `${clientProfile.prenom} ${clientProfile.nom}` : 'Client';

  // Candidatures en cours de traitement
  const statusInProgress = ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises', 'acceptee'];
  const candidaturesEnCours = candidatures.filter(c => statusInProgress.includes(c.statut));


  // Rang de tri : les compteurs qui demandent une action passent en tête.
  const visitesLabel = stats.visitesAVenir > 0
    ? `${stats.visitesAVenir} à venir`
    : 'Aucune prévue';
  const offresLabel = stats.offresNonVues > 0
    ? `${stats.offresNonVues} à traiter`
    : `${stats.offresRecues} au total`;
  const candidaturesLabel = stats.candidaturesEnAttente > 0
    ? `${stats.candidaturesEnAttente} en attente`
    : `${candidaturesEnCours.length} en cours`;
  const rienARegarder = offres.length === 0 && stats.visitesAVenir === 0;

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto relative">
        <PremiumPageShellV2 className="relative z-10 mx-auto w-full max-w-6xl">
          {/* Bannière : tout en haut de l'accueil */}
          <DashboardAdBanner />

          <MustChangePasswordBanner />

          {/* 1. Accueil */}
          <SectionErrorBoundary sectionName="DashboardHeader">
            <PremiumDashboardHeader
              userName={clientProfile?.prenom}
              parcoursType={
                (['location','achat','vente','renovation','relocation'] as const).includes(clientProfile?.parcours_type)
                  ? clientProfile.parcours_type
                  : undefined
              }
              messageCount={counts.new_message}
              offerCount={counts.new_offer}
              onMessagesClick={() => navigate('/client/messagerie')}
              onOffersClick={() => navigate('/client/offres-recues')}
            />
          </SectionErrorBoundary>
          {/* Ma journée : visites du jour */}
          <MaJourneeBanner role="client" prenom={clientProfile?.prenom ?? null} visites={visites} />

          {/* 2. À faire : tout ce qui bloque ou demande une action */}
          <div className="space-y-3">
            <MandatCreditsGate />

            {profileActif === false && (
              <PremiumStatusCard
                variant="waiting"
                title="Compte en attente d'activation"
                description="Votre profil n'a pas encore été activé par votre agent. Veuillez patienter ou contacter votre agent pour activer votre compte."
                action={agent ? {
                  label: 'Contacter mon agent',
                  onClick: () => navigate('/client/messagerie')
                } : undefined}
              />
            )}

            {client && !client.mandat_signature_data && !client.demande_mandat_id && (
              <TodoCard
                icon={FileText}
                title="Période d'essai"
                description="Votre compte est en période d'essai. Pour l'activer officiellement et profiter de tous les services, complétez votre dossier."
                action={
                  <Button
                    size="sm"
                    data-demo-allow
                    className="rounded-full"
                    onClick={() => {
                      if (isDemo) {
                        void signOut().catch(() => {});
                        window.location.assign('/nouveau-mandat');
                      } else {
                        navigate('/nouveau-mandat');
                      }
                    }}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Compléter mon dossier
                  </Button>
                }
              />
            )}

            {profileActif !== false && <ExtraitPoursuitesHeroCard />}

            {profileActif !== false && (
              <MissingDocumentsAlert
                documents={documents}
                candidatureStatut={candidatures[0]?.statut}
                showPostSignature={candidatures.some(c => ['signature_effectuee', 'etat_lieux_fixe'].includes(c.statut))}
              />
            )}

            {profileActif !== false && daysRemaining > 0 && daysRemaining <= 30 && (
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
                  className="mt-2 rounded-full"
                >
                  Contacter mon agent
                </Button>
              </PremiumStatusCard>
            )}

            {profileActif !== false && daysRemaining <= 0 && (
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
            )}
          </div>

          {/* 3. Ma recherche : offres, visites, candidatures (même ordre que la barre du bas) */}
          <DashSection title="Ma recherche">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatTile
                icon={Home}
                label="Offres reçues"
                value={offresLabel}
                count={stats.offresNonVues}
                onClick={() => navigate('/client/offres-recues')}
              />
              <StatTile
                icon={FileCheck}
                label="Candidatures"
                value={candidaturesLabel}
                count={stats.candidaturesEnAttente}
                onClick={() => navigate('/client/mes-candidatures')}
              />
              <StatTile
                icon={Calendar}
                label="Agenda"
                value={visitesLabel}
                count={stats.visitesAVenir}
                onClick={() => navigate('/client/calendrier')}
              />
            </div>

            <SectionErrorBoundary sectionName="OffresRecuesCarousel">
              {offres.length > 0 && (
                <div className={`${DASH_CARD} p-4 md:p-5`}>
                  <OffresRecuesCarousel offres={offres} />
                </div>
              )}
            </SectionErrorBoundary>

            <SectionErrorBoundary sectionName="MesVisitesAVenirBand">
              <MesVisitesAVenirBand visites={visites} />
            </SectionErrorBoundary>

            {rienARegarder && (
              <div className={`${DASH_CARD} p-5 text-center`}>
                <p className="font-semibold text-foreground">Aucune offre pour le moment</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Chaque bien que votre agent sélectionne pour vous arrive ici, avec les visites qu'il organise.
                </p>
              </div>
            )}

            {candidaturesEnCours.length > 0 && (
              <div className={`${DASH_CARD} p-4 md:p-5`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Vos candidatures en cours</h3>
                    <p className="text-sm text-muted-foreground">Suivez la progression de vos dossiers</p>
                  </div>
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                    {candidaturesEnCours.length}
                  </span>
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
                  variant="outline"
                  className="mt-4 h-11 w-full rounded-full"
                  onClick={() => navigate('/client/mes-candidatures')}
                >
                  Voir toutes mes candidatures
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </DashSection>

          {/* 4. Mon dossier */}
          {profileActif !== false && (
            <DashSection
              title="Mon dossier"
              action={<DashSectionLink onClick={() => navigate('/client/dossier')} />}
            >
              {/* Gauche : solvabilité. Droite : pièces du dossier puis candidats (garant, colocataire). */}
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <SectionErrorBoundary sectionName="Solvability">
                  <SolvabilityAlert result={solvabilityResult} appearance="client" />
                </SectionErrorBoundary>
                <div className="flex min-w-0 flex-col gap-4">
                  <SectionErrorBoundary sectionName="DossierChecklist">
                    <PremiumDossierChecklistCard
                      clientName={clientFullName}
                      candidates={candidates}
                      documents={documents}
                    />
                  </SectionErrorBoundary>
                  <SectionErrorBoundary sectionName="Candidates">
                    <PremiumCandidatesCard
                      clientId={client.id}
                      clientRevenus={client.revenus_mensuels || 0}
                      budgetDemande={client.budget_max || 0}
                    />
                  </SectionErrorBoundary>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                <LinkRow icon={FolderOpen} label="Mes documents" sub={`${documents.length} document${documents.length > 1 ? 's' : ''}`} onClick={() => navigate('/client/documents')} />
                <LinkRow icon={FileText} label="Mon contrat" sub="Mandat et conditions" onClick={() => navigate('/client/mon-contrat')} />
              </div>
            </DashSection>
          )}

          {/* 5. Mon mandat et mon agent */}
          <DashSection title="Mon mandat et mon agent">
            <MesCreditsCard />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                {profileActif === false ? (
                  <PremiumStatusCard
                    variant="waiting"
                    title="Compte en attente d'activation"
                    description="La progression de votre mandat sera disponible dès que votre profil sera activé par votre agent."
                  >
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="imr-lg-glass rounded-2xl p-3">
                        <p className="text-sm text-muted-foreground">Date d'inscription</p>
                        <p className="font-medium">{new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</p>
                      </div>
                      <div className="imr-lg-glass rounded-2xl p-3">
                        <p className="text-sm text-muted-foreground">Statut</p>
                        <Badge variant="outline" className="text-amber-600 border-amber-300">En attente</Badge>
                      </div>
                    </div>
                  </PremiumStatusCard>
                ) : (() => {
                  const reloggedCandidature = candidatures.find(c =>
                    ['signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut)
                  );
                  const isRelogged = client.statut === 'reloge' || !!reloggedCandidature;
                  const reloggedStatus = reloggedCandidature?.statut as 'signature_effectuee' | 'etat_lieux_fixe' | 'cles_remises' | null;
                  const reloggedDate = reloggedCandidature?.signature_effectuee_at ||
                                      reloggedCandidature?.cles_remises_at ||
                                      reloggedCandidature?.date_etat_lieux;

                  return (
                    <PremiumMandatProgress
                      daysElapsed={daysElapsed}
                      daysRemaining={daysRemaining}
                      totalDays={90}
                      startDate={reloggedEndDate
                        ? (client.date_ajout || client.created_at)
                        : (mandatInfo.cycleStart ? mandatInfo.cycleStart.toISOString() : (client.date_ajout || client.created_at))}
                      isRelogged={isRelogged}
                      reloggedStatus={reloggedStatus}
                      reloggedDate={reloggedDate}
                    />
                  );
                })()}

                {/* Remboursement — visible en permanence, actif uniquement J80→J90 */}
                {profileActif !== false && daysRemaining > 0 && (() => {
                  const REFUND_DAY = 80;
                  const elapsedInt = Math.floor(daysElapsed);
                  const refundActive = elapsedInt >= REFUND_DAY && elapsedInt <= 90;
                  const daysUntilRefund = Math.max(0, REFUND_DAY - elapsedInt);
                  const tooltip = refundActive
                    ? 'Vous êtes éligible au remboursement'
                    : `Disponible à partir du 80ème jour (encore ${daysUntilRefund} jour${daysUntilRefund > 1 ? 's' : ''})`;
                  return (
                    <div className={`${DASH_CARD} flex items-center justify-between gap-3 p-4`}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Demander un remboursement</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tooltip}</p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full"
                        variant={refundActive ? 'default' : 'outline'}
                        disabled={!refundActive}
                        onClick={() => navigate('/client/mon-contrat?action=refund')}
                        title={tooltip}
                      >
                        {refundActive ? 'Demander mon remboursement' : `J${elapsedInt}/${REFUND_DAY}`}
                      </Button>
                    </div>
                  );
                })()}
              </div>

              <div>
                {agent ? (
                  <PremiumAgentCard
                    agent={agent}
                    onMessage={() => navigate('/client/messagerie')}
                  />
                ) : (
                  <div className={`${DASH_CARD} p-6 text-center`}>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </span>
                    <p className="mt-3 font-semibold text-foreground">Aucun agent assigné</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Un agent vous sera bientôt attribué pour vous accompagner dans votre recherche.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DashSection>

          {/* 6. Statistiques */}
          <DashSection title="Mes statistiques">
            <SectionErrorBoundary sectionName="ClientStats">
              <ClientStatsSection
                offres={offres}
                visites={visites}
                candidatures={candidatures}
                client={client}
              />
            </SectionErrorBoundary>
          </DashSection>
        </PremiumPageShellV2>
      </PullToRefresh>

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
