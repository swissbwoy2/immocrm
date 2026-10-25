import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, Bike, Calendar, CheckCircle, DollarSign, FileCheck, FileText, Handshake, Heart, Image as ImageIcon,
  Key, Mail, MessageSquare, RefreshCw, RotateCw, Send, User as UserIcon, Users, Zap,
} from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { mandatElapsedFor, mandatRemainingFor } from '@/utils/mandatDates';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { AgentStatsSection } from '@/components/stats/AgentStatsSection';
import { DefaultGoalsSection } from '@/components/stats/DefaultGoalsSection';
import { AgentBadges } from '@/components/stats/AgentBadges';
import { countUniqueOffres } from '@/utils/visitesCalculator';
import { isClientActif, useUsersAvecCreditsMandat } from '@/lib/activeClients';
import { DashboardBanner } from '@/components/common/DashboardBanner';
import { SteeveProposalsCard } from '@/components/steeve/SteeveProposalsCard';
import { DASH_CARD, DashBadge, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import {
  ActionGrid, DayBanner, FoldSection, KpiTile, StaffSectionTitle, StaffShell, type ActionTileItem, type DayVisit,
} from '@/components/dashboard-staff/StaffDashParts';
import { CandidaturesActionList, ProjectionList, ReactionsList } from '@/components/dashboard-staff/AgentDashLists';
import {
  VISITE_A_VENIR_STATUTS, formatHeure, formatJourLong, inLastDays, inNextDays, prochaineVisite, s, startOfDay,
  totalEnAttente, variation, visitesDuJour,
} from '@/components/dashboard-staff/staffDashboardModel';

export default function AgentDashboard() {
  const usersAvecCreditsMandat = useUsersAvecCreditsMandat();
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
  const [offresAutoAGerer, setOffresAutoAGerer] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadAgentData = useCallback(async () => {
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

      if (!agentData) {
        setLoading(false);
        return;
      }

      // Récupérer les clients via client_agents ET clients.agent_id (union des deux sources)
      const [{ data: clientAgentsData }, { data: principalClientsData }] = await Promise.all([
        supabase.from('client_agents').select('client_id').eq('agent_id', agentData.id),
        supabase.from('clients').select('id').eq('agent_id', agentData.id),
      ]);

      const clientIds = Array.from(new Set([
        ...(clientAgentsData?.map(ca => ca.client_id) || []),
        ...(principalClientsData?.map(c => c.id) || []),
      ]));

      let clientsData: any[] = [];
      if (clientIds.length > 0) {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);
        clientsData = data || [];
      }
      
      setClients(clientsData);

      // Récupérer les profils des clients
      const clientUserIds = clientsData.map(c => c.user_id).filter(Boolean);
      const profilesPromise: Promise<Map<string, any>> = clientUserIds.length > 0
        ? (async () => {
            const { data } = await supabase
              .from('profiles')
              .select('id, prenom, nom')
              .in('id', clientUserIds);
            return new Map((data || []).map(p => [p.id, p]));
          })()
        : Promise.resolve(new Map<string, any>());

      // === PARALLEL: Launch all remaining queries simultaneously ===
      const [
        profilesMap,
        offresResult,
        documentsResult,
        renouvResult,
        candidaturesResult,
        transactionsResult,
        visitesResult,
        offresAutoResult,
      ] = await Promise.all([
        profilesPromise,
        // Offres with reduced columns
        supabase
          .from('offres')
          .select('id, date_envoi, adresse, client_id, prix, pieces, surface, lien_annonce, agent_id, statut, titre, type_bien, clients(user_id)')
          .eq('agent_id', agentData.id)
          .order('date_envoi', { ascending: false })
          .limit(15000),
        // Documents
        clientUserIds.length > 0
          ? supabase
              .from('documents')
              .select('*, clients!documents_client_id_fkey(*)')
              .in('user_id', clientUserIds)
              .order('created_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
        // Renouvellements
        clientIds.length > 0
          ? supabase
              .from('renouvellements_mandat')
              .select('*')
              .in('client_id', clientIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        // Candidatures
        clientIds.length > 0
          ? supabase
              .from('candidatures')
              .select('*, offres(adresse, prix, pieces)')
              .in('client_id', clientIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        // Transactions
        supabase
          .from('transactions')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('date_transaction', { ascending: false }),
        // All visites (single query, filter delegated client-side)
        supabase
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
          .eq('agent_id', agentData.id),
        // Compteur « Offres auto à gérer » : offres auto de MES clients qui attendent une action
        // (même filtre que l'onglet « À gérer » de /agent/offres-auto : envoi_auto + needs_agent_action). SELECT count, head.
        clientIds.length > 0
          ? supabase
              .from('offres')
              .select('id', { count: 'exact', head: true })
              .eq('envoi_auto', true)
              .eq('needs_agent_action', true)
              .in('client_id', clientIds)
          : Promise.resolve({ count: 0, error: null }),
      ]);

      // Error logging for silent query failures
      if (offresResult.error) console.error('Offres query error:', offresResult.error);
      if ('error' in documentsResult && documentsResult.error) console.error('Documents query error:', documentsResult.error);
      if ('error' in candidaturesResult && candidaturesResult.error) console.error('Candidatures query error:', candidaturesResult.error);
      if (transactionsResult.error) console.error('Transactions query error:', transactionsResult.error);
      if (visitesResult.error) console.error('Visites query error:', visitesResult.error);
      if (visitesResult.error) console.error('Visites query error:', visitesResult.error);

      setProfiles(profilesMap);
      setOffres(offresResult.data || []);
      setDocuments(documentsResult.data || []);
      setRenouvellements(renouvResult.data || []);
      setCandidatures(candidaturesResult.data || []);
      setTransactions(transactionsResult.data || []);
      setOffresAutoAGerer((offresAutoResult as any).error ? undefined : ((offresAutoResult as any).count ?? 0));
      
      const allVisites = visitesResult.data || [];
      setVisites(allVisites);
      
      // Filter delegated visits client-side
      const delegated = allVisites.filter(
        v => v.est_deleguee && v.statut === 'planifiee'
      ).sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());
      setVisitesDelegues(delegated);
    } catch (error) {
      console.error('Erreur chargement données agent:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    
    loadAgentData();
  }, [user?.id, userRole, location.key, navigate, loadAgentData]);

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agentFound = clients.find(c => c.agent_id === agentId);
    if (!agentFound) return "Agent";
    return "Agent";
  };

  if (loading || !agent) {
    return (
      <StaffShell>
        <div className="flex items-center justify-center py-32" role="status" aria-label="Chargement du tableau de bord">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      </StaffShell>
    );
  }

  // Exclure les clients relogés (mandats terminés) de tous les calculs
  const clientsNonReloge = clients.filter(c => c.statut !== 'reloge');

  // Les clients actifs (non relogés + dans les 90 jours)
  const clientsActifs = clients.filter(c => isClientActif(c, usersAvecCreditsMandat)).length;

  // Clients par type (exclure les relogés)
  const clientsLocation = clientsNonReloge.filter(c => c.type_recherche !== 'Acheter').length;
  const clientsAchat = clientsNonReloge.filter(c => c.type_recherche === 'Acheter').length;

  const deadlinesCritiques = clientsNonReloge.filter(c => {
    if (c.statut !== 'actif') return false;
    return mandatElapsedFor(c as any) >= 90 && mandatRemainingFor(c as any) <= 0;
  }).length;

  // Filtrer uniquement les clients actifs des 3 derniers mois pour la projection financière
  // IMPORTANT: Exclure les clients relogés pour ne pas fausser les projections
  const clientsActifs3Mois = clients.filter(c => isClientActif(c, usersAvecCreditsMandat));

  const projectionFinanciere = clientsActifs3Mois.map(client => {
    const commissionBrute = client.budget_max || 0;
    const splitAgent = client.commission_split || 50;
    const partAgent = Math.round(commissionBrute * (splitAgent / 100));
    const profile = profiles.get(client.user_id);
    const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
    return {
      clientId: client.id,
      clientName,
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

  // Mois précédent (comparaison ▲▼, mêmes données)
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const transactionsMoisPasse = transactions.filter(t => {
    const d = new Date(t.date_transaction);
    return d >= startPrevMonth && d < startOfMonth && t.statut === 'conclue';
  });
  const commissionsMoisPasse = transactionsMoisPasse.reduce((sum, t) => sum + (t.part_agent || 0), 0);

  const clientsCritiques = clients.filter(c => {
    const days = mandatElapsedFor(c as any);
    return days >= 60;
  }).sort((a, b) => mandatElapsedFor(b as any) - mandatElapsedFor(a as any));
  const critiquesExpires = clientsCritiques.filter(c => mandatRemainingFor(c as any) <= 0).length;
  const critiquesProches = clientsCritiques.length - critiquesExpires;

  // Réactions clients aux offres (statuts nécessitant une action agent)
  const REACTION_STATUTS = ['interesse', 'visite_planifiee', 'candidature_deposee', 'demande_postulation'];
  const clientReactions = offres
    .filter(o => REACTION_STATUTS.includes(o.statut))
    .map(o => {
      const client = clients.find(c => c.id === o.client_id);
      const profile = client ? profiles.get(client.user_id) : null;
      return {
        id: o.id,
        adresse: o.adresse,
        prix: o.prix,
        pieces: o.pieces,
        surface: o.surface,
        statut: o.statut,
        statut_client: o.statut,
        date_envoi: o.date_envoi,
        clientName: profile ? `${profile.prenom} ${profile.nom}` : 'Client',
        client_id: o.client_id,
      };
    });

  const nomClient = (clientId?: string | null, userId?: string | null) => {
    const client = clientId ? clients.find(c => c.id === clientId) : null;
    const profile = profiles.get(userId || client?.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : 'Client';
  };

  /* ---------- Offres envoyées ---------- */
  const startToday = startOfDay(now);
  const uniqueToday = countUniqueOffres(offres.filter(o => o.date_envoi && new Date(o.date_envoi) >= startToday));
  const uniqueTotal = countUniqueOffres(offres);
  const uniqueSemaine = countUniqueOffres(offres.filter(o => inLastDays(o.date_envoi, 7, now)));
  const uniqueCeMois = countUniqueOffres(offres.filter(o => o.date_envoi && new Date(o.date_envoi) >= startOfMonth));
  const uniqueMoisPasse = countUniqueOffres(offres.filter(o => {
    if (!o.date_envoi) return false;
    const d = new Date(o.date_envoi);
    return d >= startPrevMonth && d < startOfMonth;
  }));

  /* ---------- Candidatures ---------- */
  const statusActionRequired = ['bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe'];
  const candidaturesAction = candidatures.filter(c => statusActionRequired.includes(c.statut));
  const candidaturesEnAttente = candidatures.filter(c => c.statut === 'en_attente').length;

  /* ---------- Visites ---------- */
  const visitesCoursierImpayees = visites.filter(v =>
    v.statut_coursier === 'termine' &&
    !v.paye_coursier &&
    new Date(v.date_visite) >= startOfMonth
  );
  const soldeCoursier = visitesCoursierImpayees.reduce(
    (sum, v) => sum + (v.remuneration_coursier || 5), 0
  );
  const duJour = visitesDuJour(visites, now);
  const prochaine = prochaineVisite(duJour, now);
  const toDayVisit = (v: any): DayVisit => {
    const offre = v.offres;
    return {
      id: v.id,
      heure: formatHeure(v.date_visite),
      titre: offre?.adresse || 'Adresse à confirmer',
      sous: [nomClient(v.client_id, v.clients?.user_id), offre?.pieces ? `${offre.pieces} pièces` : null, v.est_deleguee ? 'déléguée' : null].filter(Boolean).join(' · '),
      onClick: () => navigate('/agent/visites'),
    };
  };
  const visitesAVenir7 = visites.filter(v => VISITE_A_VENIR_STATUTS.includes(v.statut) && inNextDays(v.date_visite, 7, now)).length;
  const visitesSansRetour = visites.filter(v => v.statut === 'effectuee' && !v.client_decision && inLastDays(v.date_visite, 30, now)).length;
  const delegueesEnRetard = visitesDelegues.filter(v => new Date(v.date_visite) < now).length;

  /* ---------- Cette semaine ---------- */
  const interetsSemaine = offres.filter(o => o.statut === 'interesse' && inLastDays(o.date_envoi, 7, now)).length;
  const candidaturesSemaine = candidatures.filter(c => inLastDays(c.date_depot || c.created_at, 7, now)).length;
  const bauxSemaine = candidatures.filter(c => inLastDays(c.signature_effectuee_at, 7, now)).length;
  const mandatsEcheance7 = clientsNonReloge.filter(c => {
    if (c.statut !== 'actif') return false;
    const r = mandatRemainingFor(c as any);
    return r > 0 && r <= 7;
  }).length;

  /* ---------- À traiter : raccourcis triés par urgence ---------- */
  const aPostuler = offres.filter(o => o.statut === 'souhaite_postuler').length;
  const actions: ActionTileItem[] = [
    {
      key: 'mandats', icon: AlertTriangle, label: 'Mandats de mes clients', count: clientsCritiques.length,
      tone: critiquesExpires > 0 ? 'danger' : 'warning',
      phrase: clientsCritiques.length > 0
        ? [critiquesExpires && `${critiquesExpires} expiré${s(critiquesExpires)}`, critiquesProches && `${critiquesProches} à ≤ 30 j`].filter(Boolean).join(' · ') + ' : prévenir le client'
        : 'Aucune échéance proche',
      detail: 'Mandats à 60 jours ou plus : voir « Deadlines critiques » plus bas.',
      onClick: () => document.getElementById('deadlines-critiques')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      key: 'delegues', icon: Handshake, label: 'Visites déléguées', count: visitesDelegues.length,
      tone: delegueesEnRetard > 0 ? 'danger' : 'warning',
      phrase: visitesDelegues.length > 0
        ? (delegueesEnRetard > 0 ? `${delegueesEnRetard} en retard : à effectuer ou mettre à jour` : 'À effectuer pour mes clients')
        : 'Aucune visite déléguée',
      onClick: () => navigate('/agent/visites'),
    },
    {
      key: 'postuler', icon: Send, label: 'Postulations', count: aPostuler, tone: 'warning',
      phrase: aPostuler > 0 ? 'Mes clients veulent postuler : déposer le dossier' : 'Aucune postulation à déposer',
      onClick: () => navigate('/agent/postulations'),
    },
    {
      key: 'reactions', icon: Heart, label: 'Réactions clients', count: clientReactions.length, tone: 'warning',
      phrase: clientReactions.length > 0 ? 'Intérêts et demandes à suivre' : 'Aucune réaction en attente',
      onClick: () => navigate('/agent/offres-envoyees'),
    },
    {
      key: 'offresAuto', icon: Zap, label: 'Offres auto à gérer', count: offresAutoAGerer, tone: 'warning',
      phrase: offresAutoAGerer === undefined ? 'Fixer les visites des offres envoyées' : offresAutoAGerer > 0 ? 'Visite à fixer ou offre à compléter' : 'Aucune action requise',
      onClick: () => navigate('/agent/offres-auto'),
    },
    {
      key: 'candidatures', icon: FileCheck, label: 'Candidatures', count: candidaturesAction.length, tone: 'primary',
      phrase: `${candidaturesAction.length} à finaliser · ${candidaturesEnAttente} en attente · ${candidatures.length} au total`,
      onClick: () => navigate('/agent/candidatures'),
    },
    {
      key: 'retours', icon: MessageSquare, label: 'Visites sans retour', count: visitesSansRetour, tone: 'warning',
      phrase: visitesSansRetour > 0 ? 'Relancer le client : postule-t-il ?' : 'Tous les retours sont reçus',
      detail: 'Visites effectuées ces 30 derniers jours sans décision du client.',
      onClick: () => navigate('/agent/visites'),
    },
    {
      key: 'messages', icon: Mail, label: 'Messages non lus', count: counts.new_message, tone: 'primary',
      phrase: counts.new_message > 0 ? 'Répondre à mes clients' : 'Messagerie à jour',
      onClick: () => navigate('/agent/messagerie'),
    },
  ];
  const pointsOuverts = actions.filter(a => (a.count ?? 0) > 0).length;
  const enAttente = totalEnAttente(actions);

  const subtitle = [
    pointsOuverts === 0 ? 'Tout est à jour' : `${pointsOuverts} point${s(pointsOuverts)} à traiter (${enAttente} élément${s(enAttente)})`,
    `${commissionsCeMois.toLocaleString()} CHF de commissions ce mois`,
  ].join(' · ');

  /* ---------- Documents clients (regroupement existant) ---------- */
  const documentsByClient: Record<string, any[]> = documents.reduce((acc: Record<string, any[]>, doc) => {
    const clientId = doc.user_id;
    if (!acc[clientId]) {
      acc[clientId] = [];
    }
    acc[clientId].push(doc);
    return acc;
  }, {});
  const requiredTypes = ['fiche_salaire', 'extrait_poursuites', 'piece_identite'];
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
    return { userId, client, profile, docs, completeness, recentDocs, latestUpload: docs[0]?.created_at };
  }).sort((a, b) => {
    // Trier par uploads récents d'abord, puis par complétude
    if (a.recentDocs.length !== b.recentDocs.length) {
      return b.recentDocs.length - a.recentDocs.length;
    }
    return a.completeness - b.completeness;
  });
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'fiche_salaire': 'Fiche salaire',
      'extrait_poursuites': 'Extrait poursuites',
      'piece_identite': 'Pièce ID',
      'autre': 'Autre'
    };
    return labels[type] || type || 'Autre';
  };
  const getDocIcon = (type: string) => (type?.includes('image') ? ImageIcon : FileText);

  /* ---------- Renouvellements récents ---------- */
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

  const hasDetail = clientReactions.length > 0 || visitesDelegues.length > 0 || candidaturesAction.length > 0;

  return (
    <PullToRefresh onRefresh={loadAgentData} className="flex-1 overflow-y-auto">
      <StaffShell>
        <DashboardBanner />

        <div className="space-y-3">
          <DashPageHeader
            title="Tableau de bord"
            subtitle={subtitle}
            action={
              <>
                <Button variant="outline" size="sm" className="h-11 rounded-full sm:h-10" onClick={loadAgentData} aria-label="Actualiser">
                  <RefreshCw className="h-4 w-4" /><span className="ml-2 hidden sm:inline">Actualiser</span>
                </Button>
                <Button size="sm" className="h-11 rounded-full sm:h-10" onClick={() => navigate('/agent/conclure-affaire')}>
                  <CheckCircle className="h-4 w-4" /><span className="ml-2">Conclure une affaire</span>
                </Button>
              </>
            }
          />

          {/* (a) Ma journée + (b) À traiter : premier écran */}
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <DayBanner
                greeting="Bonjour"
                dateLabel={formatJourLong(now)}
                total={duJour.length}
                next={prochaine ? toDayVisit(prochaine) : null}
                others={duJour.filter(v => v !== prochaine).map(toDayVisit)}
                onAgenda={() => navigate('/agent/calendrier')}
                agendaLabel="Calendrier"
              />
            </div>
            <section className="space-y-2 lg:col-span-8" aria-label="À traiter">
              <h2 className="px-0.5 text-base font-semibold text-foreground">
                À traiter <span className="font-normal text-muted-foreground">· urgent d’abord</span>
              </h2>
              <ActionGrid items={actions} />
            </section>
          </div>
        </div>

        {/* Détail des actions : réactions, visites déléguées, candidatures en cours */}
        {hasDetail && (
          <FoldSection id="detail-actions" title="Détail des actions" subtitle="Les éléments précis à traiter pour mes clients">
            <div className="grid gap-3 lg:grid-cols-12">
              {clientReactions.length > 0 && (
                <div className="lg:col-span-6"><ReactionsList reactions={clientReactions} basePath="/agent" /></div>
              )}

              {visitesDelegues.length > 0 && (
                <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-6`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Handshake className="h-4 w-4" /></span>
                      Visites déléguées par vos clients
                    </h3>
                    <DashBadge tone="primary">{visitesDelegues.length}</DashBadge>
                  </div>
                  <div className="divide-y divide-border/60">
                    {visitesDelegues.slice(0, 3).map(visite => {
                      const clientName = nomClient(visite.client_id);
                      const dateVisite = new Date(visite.date_visite);
                      const isToday = dateVisite.toDateString() === new Date().toDateString();
                      const isPast = dateVisite < new Date();
                      return (
                        <button
                          key={visite.id}
                          type="button"
                          className="w-full py-2.5 text-left hover:bg-muted/40"
                          onClick={() => navigate('/agent/visites')}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 truncate text-sm font-medium text-foreground">{visite.offres?.adresse}</p>
                            {isToday && <DashBadge tone="warning">Aujourd'hui</DashBadge>}
                            {isPast && <DashBadge tone="danger">En retard</DashBadge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {visite.offres?.pieces} pièces • {visite.offres?.surface} m² • {visite.offres?.prix?.toLocaleString()} CHF
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {dateVisite.toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })} à {dateVisite.toLocaleTimeString('fr-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
                            <UserIcon className="h-3.5 w-3.5" /> Délégué par {clientName}
                          </p>
                          {visite.notes && (
                            <p className="mt-1 text-xs italic text-muted-foreground">"{visite.notes}"</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" className="mt-3 h-11 w-full rounded-full sm:h-10" onClick={() => navigate('/agent/visites')}>
                    Voir toutes les visites déléguées
                  </Button>
                </div>
              )}

              {candidaturesAction.length > 0 && (
                <div className="lg:col-span-6">
                  <CandidaturesActionList candidatures={candidaturesAction} getClientName={(clientId: string) => nomClient(clientId)} />
                </div>
              )}
            </div>
          </FoldSection>
        )}

        {/* Actions préparées par Steeve, à valider (masqué s'il n'y en a pas) */}
        <SteeveProposalsCard basePath="/agent" hideWhenEmpty />

        {/* (c) Cette semaine */}
        <section className="space-y-3" aria-label="Cette semaine">
          <StaffSectionTitle title="Cette semaine" subtitle="Mes clients · 7 derniers jours et 7 prochains jours" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <KpiTile icon={Calendar} label="Visites à venir" value={visitesAVenir7} phrase="planifiées d’ici 7 jours" onClick={() => navigate('/agent/calendrier')} />
            <KpiTile icon={Send} label="Offres envoyées" value={uniqueSemaine} phrase={`en 7 jours · ${uniqueToday} aujourd’hui · ${uniqueTotal} au total`} onClick={() => navigate('/agent/offres-envoyees')} />
            <KpiTile icon={Heart} label="Intérêts" value={interetsSemaine} phrase="offres de la semaine qui plaisent" onClick={() => navigate('/agent/offres-envoyees')} />
            <KpiTile icon={FileCheck} label="Candidatures" value={candidaturesSemaine} phrase="déposées en 7 jours" onClick={() => navigate('/agent/candidatures')} />
            <KpiTile icon={Key} label="Baux signés" value={bauxSemaine} phrase="en 7 jours" onClick={() => navigate('/agent/candidatures')} />
            <KpiTile icon={AlertTriangle} label="Mandats" value={mandatsEcheance7} phrase={mandatsEcheance7 > 0 ? 'échoient dans 7 jours : prévenir' : 'aucune échéance sous 7 jours'} onClick={() => document.getElementById('deadlines-critiques')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            {/* Deadlines critiques */}
            <div id="deadlines-critiques" className={`${DASH_CARD} scroll-mt-4 p-4 md:p-5 lg:col-span-7`}>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><AlertTriangle className="h-4 w-4" /></span>
                Deadlines critiques
                {deadlinesCritiques > 0 && <DashBadge tone="danger">{deadlinesCritiques} expiré{s(deadlinesCritiques)}</DashBadge>}
              </h3>
              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                {clientsCritiques.length > 0 ? (
                  clientsCritiques.map(client => {
                    const dateAjout = client.date_ajout || client.created_at;
                    const daysRemaining = mandatRemainingFor(client as any);
                    const isExpired = daysRemaining <= 0;
                    const isWarning = daysRemaining > 0 && daysRemaining <= 30;
                    const profile = profiles.get(client.user_id);
                    const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';

                    return (
                      <div key={client.id} className="rounded-xl border border-border/70 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{clientName}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Inscrit le {new Date(dateAjout).toLocaleDateString('fr-CH')}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-semibold ${isExpired ? 'text-destructive' : isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                              {isExpired ? 'Expiré' : `${daysRemaining}j`}
                            </p>
                            <p className="text-xs text-muted-foreground">{isExpired ? 'J+90' : 'restants'}</p>
                          </div>
                        </div>
                        {isExpired && (
                          <p className="mt-2 border-t border-border/60 pt-2 text-xs font-medium text-destructive">Mandat expiré - Action requise</p>
                        )}
                        {isWarning && !isExpired && (
                          <p className="mt-2 border-t border-border/60 pt-2 text-xs font-medium text-amber-700 dark:text-amber-400">Moins de 30 jours restants</p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><CheckCircle className="h-6 w-6" /></span>
                    <p className="text-sm font-medium">Aucune deadline critique</p>
                    <p className="mt-1 text-xs">Tous vos clients sont à jour</p>
                  </div>
                )}
              </div>
            </div>

            {/* Renouvellements récents */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-5`}>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><RotateCw className="h-4 w-4" /></span>
                Renouvellements récents
              </h3>
              {recentRenewals.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {recentRenewals.map((renewal) => (
                    <div key={renewal.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">Client renouvelé</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {renewal.daysSince === 0 ? "Aujourd'hui" : `Il y a ${renewal.daysSince} jour${renewal.daysSince > 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Agent: {getAgentName(renewal.client.agent_id)}</p>
                      </div>
                      <DashBadge tone="success">+90 jours</DashBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><RotateCw className="h-6 w-6" /></span>
                  <p className="text-sm font-medium">Aucun renouvellement récent</p>
                  <p className="mt-1 text-xs text-muted-foreground">Les renouvellements des 30 derniers jours apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* (d) Performance */}
        <section className="space-y-3" aria-label="Performance">
          <StaffSectionTitle title="Performance" subtitle="Ce mois · mes commissions et mes objectifs" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
            <KpiTile icon={DollarSign} label="Commissions ce mois" value={`${commissionsCeMois.toLocaleString()} CHF`} delta={variation(commissionsCeMois, commissionsMoisPasse)} phrase={`${transactionsCeMois.length} affaire${transactionsCeMois.length > 1 ? 's' : ''} conclue${transactionsCeMois.length > 1 ? 's' : ''}`} onClick={() => navigate('/agent/transactions')} />
            <KpiTile icon={Send} label="Offres ce mois" value={uniqueCeMois} delta={variation(uniqueCeMois, uniqueMoisPasse)} phrase="biens proposés à mes clients" onClick={() => navigate('/agent/offres-envoyees')} />
            <KpiTile icon={Users} label="Mes clients actifs" value={clientsActifs} phrase={`${clientsLocation} location · ${clientsAchat} achat`} onClick={() => navigate('/agent/mes-clients')} />
            <KpiTile icon={CheckCircle} label="Affaires conclues" value={transactions.filter(t => t.statut === 'conclue').length} phrase="depuis le début" onClick={() => navigate('/agent/transactions')} />
            <KpiTile icon={DollarSign} label="Commission pot." value={`${totalCommissionPotentielle.toLocaleString()} CHF`} phrase="sur mes clients actifs (3 mois)" />
            <KpiTile icon={Bike} label="Solde coursier" value={`${soldeCoursier.toLocaleString()} CHF`} phrase={`${visitesCoursierImpayees.length} visite${visitesCoursierImpayees.length > 1 ? 's' : ''} non payée${visitesCoursierImpayees.length > 1 ? 's' : ''} ce mois`} />
          </div>

          {/* Objectifs journaliers par défaut */}
          <div className={`${DASH_CARD} overflow-hidden`}>
            <DefaultGoalsSection
              agentId={agent?.id || ''}
              offres={offres}
              visites={visites}
              candidatures={candidatures}
              clients={clients}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <ProjectionList projections={projectionFinanciere} totalCommissionPotentielle={totalCommissionPotentielle} />
            </div>

            {/* Affaires conclues ce mois */}
            {transactionsCeMois.length > 0 && (
              <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-6`}>
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle className="h-4 w-4" /></span>
                  Affaires conclues ce mois
                </h3>
                <div className="divide-y divide-border/60">
                  {transactionsCeMois.map(transaction => (
                    <div key={transaction.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{nomClient(transaction.client_id)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Loyer: {transaction.montant_total.toLocaleString()} CHF/an</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Conclue le {new Date(transaction.date_transaction).toLocaleDateString('fr-CH')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{transaction.part_agent.toLocaleString()} CHF</p>
                        <p className="text-xs text-muted-foreground">Votre part</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
                  <p className="font-semibold text-foreground">Total ce mois</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">{commissionsCeMois.toLocaleString()} CHF</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* (e) Analyses : repliables sur mobile */}
        <FoldSection id="analyses" title="Analyses" subtitle="Statistiques détaillées, badges, dernières offres, documents de mes clients">
          <div>
            <AgentStatsSection
              offres={offres}
              transactions={transactions}
              candidatures={candidatures}
              clients={clients}
              agentId={agent?.id || ''}
            />
          </div>

          <div className={`${DASH_CARD} overflow-hidden`}>
            <AgentBadges agentId={agent?.id || ''} />
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            {/* Dernières offres */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-6`}>
              <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Send className="h-4 w-4" /></span>
                Dernières offres envoyées
              </h3>
              {offres.length > 0 ? (
                <>
                  <div className="divide-y divide-border/60">
                    {offres.slice(0, 5).map(offre => (
                      <button
                        key={offre.id}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 py-2.5 text-left hover:bg-muted/40"
                        onClick={() => navigate('/agent/offres-envoyees')}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{offre.adresse}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {offre.pieces} pièces • {offre.surface} m² • {offre.prix.toLocaleString()} CHF
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                          </p>
                        </div>
                        <DashBadge tone={offre.statut === 'envoyee' ? 'primary' : 'muted'}>{offre.statut}</DashBadge>
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-3 h-11 w-full rounded-full sm:h-10" onClick={() => navigate('/agent/offres-envoyees')}>
                    Voir toutes les offres
                  </Button>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Send className="h-6 w-6" /></span>
                  <p className="text-sm font-medium">Aucune offre envoyée</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => navigate('/agent/envoyer-offre')}>
                    Envoyer une offre
                  </Button>
                </div>
              )}
            </div>

            {/* Documents clients */}
            <div className={`${DASH_CARD} p-4 md:p-5 lg:col-span-6`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span>
                  Documents clients
                </h3>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/agent/documents')}>
                  Voir tout
                </Button>
              </div>
              {clientsWithDocs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><FileText className="h-6 w-6" /></span>
                  <p className="text-sm font-medium">Aucun document</p>
                  <p className="mt-1 text-xs">Les documents des clients apparaîtront ici</p>
                </div>
              ) : (
                <>
                  {/* Résumé global */}
                  <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
                    <div className="text-center">
                      <p className="text-xl font-semibold tabular-nums text-foreground">{documents.length}</p>
                      <p className="text-xs text-muted-foreground">Documents</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {clientsWithDocs.filter(c => c.completeness === 100).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Dossiers complets</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                        {documents.filter(d => {
                          const days = Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
                          return days <= 7;
                        }).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Cette semaine</p>
                    </div>
                  </div>

                  {/* Liste par client */}
                  <div className="max-h-[500px] divide-y divide-border/60 overflow-y-auto pr-1">
                    {clientsWithDocs.slice(0, 5).map(({ userId, client, profile, docs, completeness, recentDocs }) => {
                      const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                      const isComplete = completeness === 100;
                      const hasRecentUploads = recentDocs.length > 0;
                      const barTone = isComplete ? 'bg-emerald-500' : completeness >= 66 ? 'bg-amber-500' : 'bg-destructive';
                      const txtTone = isComplete ? 'text-emerald-700 dark:text-emerald-400' : completeness >= 66 ? 'text-amber-700 dark:text-amber-400' : 'text-destructive';
                      return (
                        <div key={userId} className="py-3">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{clientName}</p>
                                {hasRecentUploads && <DashBadge tone="primary">Nouveau</DashBadge>}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">{docs.length} document{docs.length > 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-semibold ${txtTone}`}>{completeness}%</div>
                              <p className="text-xs text-muted-foreground">complet</p>
                            </div>
                          </div>

                          {/* Barre de progression */}
                          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${barTone}`} style={{ width: `${completeness}%` }} />
                          </div>

                          {/* Types de documents */}
                          <div className="flex flex-wrap gap-1">
                            {([...new Set(docs.map((d: any) => d.type_document).filter(Boolean))] as string[]).slice(0, 4).map((type: string, i: number) => (
                              <DashBadge key={i} tone="muted">{getTypeLabel(type)}</DashBadge>
                            ))}
                            {docs.filter((d: any) => !d.type_document || d.type_document === 'autre').length > 0 && (
                              <DashBadge tone="neutral">+{docs.filter((d: any) => !d.type_document || d.type_document === 'autre').length} autre</DashBadge>
                            )}
                          </div>

                          {/* Documents récents */}
                          {recentDocs.length > 0 && (
                            <div className="mt-2 border-t border-border/50 pt-2">
                              <p className="mb-1 text-xs text-muted-foreground">Récemment ajoutés:</p>
                              {recentDocs.slice(0, 2).map(doc => {
                                const DocIcon = getDocIcon(doc.type);
                                return (
                                  <div key={doc.id} className="flex items-center gap-2 py-0.5 text-xs">
                                    <DocIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 truncate">{doc.nom}</span>
                                    <span className="text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('fr-CH')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <Button variant="ghost" size="sm" className="mt-2 h-9 w-full rounded-full text-xs" onClick={() => navigate(`/agent/clients/${client?.id}`)}>
                            Voir le profil client
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {clientsWithDocs.length > 5 && (
                    <Button variant="outline" className="mt-2 h-11 w-full rounded-full sm:h-10" onClick={() => navigate('/agent/documents')}>
                      Voir tous les documents ({documents.length})
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </FoldSection>
      </StaffShell>
    </PullToRefresh>
  );
}
