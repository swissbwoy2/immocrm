import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { CandidatProspectsList, fetchCandidatProspects, type CandidatProspect } from "@/components/admin/CandidatProspectsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Upload, Trash2, Search, Send, AlertTriangle, ShieldCheck, UserX, Home, Key, UserPlus, Loader2, CheckSquare, X as XIcon, RefreshCw, MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DASH_CARD, DashPage, DashPageHeader, DashFilterPills, DashEmptyState } from "@/components/client/dashboard/DashPrimitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientListeCard, ClientListeTable, type ClientListeCtx } from "@/components/admin/clients-liste/ClientListeCard";
import { construireVue, dansOnglet, nomComplet, MOTIFS, SITUATIONS, SEUIL_MANDAT_JOURS, SEUIL_INACTIF_JOURS, type ClientVue, type Motif, type Situation } from "@/components/admin/clients-liste/clientsListeModel";
import { BulkActionsBar, STATUT_LABELS as BULK_STATUT_LABELS, type BulkStatut } from "@/components/admin/clients/BulkActionsBar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { mandatElapsedFor } from '@/utils/mandatDates';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { ClientsByAgentView } from "@/components/admin/clients/ClientsByAgentView";
import type { ReletterRequest, ReletterCounts } from "@/components/admin/ClientCardReletter";
import { cn } from "@/lib/utils";
import { isBuyerType, isPurchaseBuyer, normalizeTypeRecherche } from "@/lib/journey";
import { fetchCandidatCriteresMap, mergeCandidatCriteres } from "@/lib/candidatCriteresMerge";

type ClientAgent = {
  client_id: string;
  agent_id: string;
  is_primary: boolean;
  created_at: string | null;
};


interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  nationalite?: string;
  type_permis?: string;
  region_recherche?: string;
  type_bien?: string;
  situation_familiale?: string;
  profession?: string;
  secteur_activite?: string;
  residence?: string;
  created_at?: string;
  date_ajout?: string;
  poursuites?: boolean;
  journey_type?: string | null;
  type_recherche?: string | null;
}

type PurchaseProjectLite = {
  id: string;
  client_id: string | null;
  user_id: string | null;
  statut: string | null;
};

type JourneyTab = 'all' | 'chercheurs' | 'acheteurs' | 'reloueurs' | 'mixtes' | 'prospects';

interface ClientCandidate {
  id: string;
  client_id: string;
  type: string;
  revenus_mensuels?: number;
  type_permis?: string;
  nationalite?: string;
  poursuites?: boolean;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  actif?: boolean;
  last_seen_at?: string | null;
  is_online?: boolean | null;
}

interface Agent {
  id: string;
  profile: Profile;
}

type SortField = 'urgence' | 'date' | 'name' | 'agent' | 'budget' | 'days';
type SortOrder = 'asc' | 'desc';

const Clients = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientProfiles, setClientProfiles] = useState<Map<string, Profile>>(new Map());
  const [clientCandidates, setClientCandidates] = useState<Map<string, ClientCandidate[]>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [selectedTypeRecherche, setSelectedTypeRecherche] = useState<'all' | 'Louer' | 'Acheter'>('all');
  const [selectedTypePermis, setSelectedTypePermis] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('urgence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null);
  const [offresToday, setOffresToday] = useState<Map<string, number>>(new Map());
  const [docConfirmations, setDocConfirmations] = useState<Set<string>>(new Set());
  // Multi-sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatutTarget, setBulkStatutTarget] = useState<BulkStatut | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  // Cartes sur mobile / tablette, tableau dense sur PC (≥ 1024 px).
  // Mesure immédiate de la largeur au premier rendu : pas de tableau affiché un instant sur mobile.
  const isMobileHook = useIsMobile();
  const [largeurInitialeCompacte] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [mesure, setMesure] = useState(false);
  useEffect(() => { setMesure(true); }, []);
  const isCompact = mesure ? isMobileHook || (typeof window !== 'undefined' && window.innerWidth < 1024) : largeurInitialeCompacte;
  // File de travail : onglet par situation (par défaut « À traiter »), motif éventuel, panneau de filtres.
  // Un lien direct vers un client (?clientId=) ouvre « Tous » pour que la carte soit visible.
  const [situationTab, setSituationTab] = useState<Situation>(() => (searchParams.get('clientId') ? 'tous' : 'a_traiter'));
  const [motifFilter, setMotifFilter] = useState<Motif | 'tous'>('tous');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Light invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ prenom: '', nom: '', email: '', telephone: '', typeRecherche: 'Acheter' });
  const [sendingInvite, setSendingInvite] = useState(false);

  const [clientAgents, setClientAgents] = useState<ClientAgent[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'byAgent'>('list');

  // Onglet journey (Tous / Chercheurs / Reloueurs / Mixtes)
  const initialTab = ((): JourneyTab => {
    const fromUrl = searchParams.get('tab');
    const allowed: JourneyTab[] = ['all','chercheurs','acheteurs','reloueurs','mixtes','prospects'];
    if (fromUrl && (allowed as string[]).includes(fromUrl)) return fromUrl as JourneyTab;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('adminClientsJourneyTab') : null;
    if (stored && (allowed as string[]).includes(stored)) return stored as JourneyTab;
    return 'all';
  })();
  const [journeyTab, setJourneyTab] = useState<JourneyTab>(initialTab);

  // Données reloueurs (jointures par user_id)
  const [relouerByUser, setRelouerByUser] = useState<Map<string, ReletterRequest>>(new Map());
  const [relouerCounts, setRelouerCounts] = useState<Map<string, ReletterCounts>>(new Map());
  const [purchaseByClient, setPurchaseByClient] = useState<Map<string, PurchaseProjectLite>>(new Map());
  const [purchaseByUser, setPurchaseByUser] = useState<Map<string, PurchaseProjectLite>>(new Map());

  // Filtres spécifiques onglet Reloueurs
  const [relouerStatus, setRelouerStatus] = useState<string>('all');
  const [relouerCommune, setRelouerCommune] = useState<string>('');
  const [relouerType, setRelouerType] = useState<string>('all');
  const [relouerPhotos, setRelouerPhotos] = useState<'all' | 'with' | 'without'>('all');
  const [relouerDocs, setRelouerDocs] = useState<'all' | 'with' | 'without'>('all');
  const [relouerAvailability, setRelouerAvailability] = useState<'all' | 'set' | 'none'>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('adminClientsJourneyTab', journeyTab);
  }, [journeyTab]);

  useEffect(() => {
    loadData();
  }, []);

  // Changement d'onglet, de motif ou de parcours : on repart des 50 premiers.
  useEffect(() => { setDisplayCount(50); }, [situationTab, motifFilter, journeyTab]);

  // Compteur de crédits par utilisateur — affichage seul (badge à côté du statut), aucun statut modifié.
  const [creditsByUser, setCreditsByUser] = useState<Map<string, { mandat_statut: string; coins_mandat: number }>>(new Map());
  useEffect(() => {
    const ids = Array.from(new Set(clients.map((c) => c.user_id).filter(Boolean)));
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const map = new Map<string, { mandat_statut: string; coins_mandat: number }>();
        for (let i = 0; i < ids.length; i += 100) {
          const { data } = await (supabase as any)
            .from('user_credits')
            .select('user_id, mandat_statut, coins_mandat')
            .in('user_id', ids.slice(i, i + 100));
          (data || []).forEach((r: any) => map.set(r.user_id, { mandat_statut: r.mandat_statut, coins_mandat: r.coins_mandat }));
        }
        if (alive) setCreditsByUser(map);
      } catch { /* badge simplement absent en cas d'erreur */ }
    })();
    return () => { alive = false; };
  }, [clients]);

  // Prospects (comptes candidat sans dossier client) — chargement séparé, en lecture seule,
  // pour ne jamais ralentir ni bloquer la liste des clients.
  const [prospects, setProspects] = useState<CandidatProspect[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(true);
  const [prospectsError, setProspectsError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchCandidatProspects()
      .then((rows) => { if (alive) { setProspects(rows); setProspectsError(null); } })
      .catch((e) => { if (alive) setProspectsError(e?.message || 'erreur'); })
      .finally(() => { if (alive) setProspectsLoading(false); });
    return () => { alive = false; };
  }, []);


  // Handle URL params for deep linking
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId && clients.length > 0 && !loading) {
      setTimeout(() => {
        cardRefs.current[clientId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        const card = cardRefs.current[clientId];
        if (card) {
          card.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            card.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [searchParams, clients, loading]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load TOUS les clients (registre CRM global, tous parcours confondus).
      // L'onglet journey filtre l'affichage côté client (housing_search / property_reletting / mixed / NULL).
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .is('anonymise_at', null)
        .order('created_at', { ascending: false })
        .limit(15000);


      if (clientsError) throw clientsError;

      // Load all client profiles - now including presence fields
      const clientUserIds = clientsData?.map(c => c.user_id) || [];

      // Complète les critères vides avec ceux saisis par les candidats
      // (candidat_criteres) — les valeurs déjà présentes dans clients restent prioritaires.
      const criteresMap = await fetchCandidatCriteresMap(clientUserIds);
      setClients((clientsData || []).map((c) => mergeCandidatCriteres(c, criteresMap.get(c.user_id))));
      const clientIds = clientsData?.map(c => c.id) || [];

      if (clientUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom, email, telephone, actif, last_seen_at, is_online')
          .in('id', clientUserIds)
          .limit(15000);

        if (profilesError) throw profilesError;

        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile as Profile);
        });
        setClientProfiles(profilesMap);
      }

      // Load all client candidates for solvability
      if (clientIds.length > 0) {
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('client_candidates')
          .select('id, client_id, type, revenus_mensuels, type_permis, nationalite, poursuites')
          .in('client_id', clientIds)
          .limit(15000);

        if (!candidatesError && candidatesData) {
          const candidatesMap = new Map<string, ClientCandidate[]>();
          candidatesData.forEach(candidate => {
            const existing = candidatesMap.get(candidate.client_id) || [];
            existing.push(candidate as ClientCandidate);
            candidatesMap.set(candidate.client_id, existing);
          });
          setClientCandidates(candidatesMap);
        }
      }

      // Load purchase projects in batch: acheteur = type achat OU journey achat OU projet achat existant.
      if (clientIds.length > 0) {
        const { data: purchaseRows, error: purchaseError } = await supabase
          .from('purchase_projects')
          .select('id, client_id, user_id, statut')
          .or(`client_id.in.(${clientIds.join(',')}),user_id.in.(${clientUserIds.join(',')})`)
          .limit(15000);
        if (!purchaseError && purchaseRows) {
          const byClient = new Map<string, PurchaseProjectLite>();
          const byUser = new Map<string, PurchaseProjectLite>();
          purchaseRows.forEach((p: any) => {
            if (p.client_id && !byClient.has(p.client_id)) byClient.set(p.client_id, p as PurchaseProjectLite);
            if (p.user_id && !byUser.has(p.user_id)) byUser.set(p.user_id, p as PurchaseProjectLite);
          });
          setPurchaseByClient(byClient);
          setPurchaseByUser(byUser);
        } else {
          setPurchaseByClient(new Map());
          setPurchaseByUser(new Map());
        }
      } else {
        setPurchaseByClient(new Map());
        setPurchaseByUser(new Map());
      }

      // Load agents with active profiles
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id');

      if (agentsError) throw agentsError;

      // Load agent profiles separately, filtering by actif = true
      const agentUserIds = agentsData?.map(a => a.user_id) || [];
      const { data: agentProfilesData, error: agentProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', agentUserIds)
        .eq('actif', true);

      if (agentProfilesError) throw agentProfilesError;

      const agentProfilesMap = new Map(agentProfilesData?.map(p => [p.id, p]));

      // Only keep agents with active profiles
      const transformedAgents = agentsData
        ?.filter(agent => agentProfilesMap.has(agent.user_id))
        .map(agent => ({
          id: agent.id,
          profile: agentProfilesMap.get(agent.user_id) as Profile,
        })) || [];

      setAgents(transformedAgents);

      // Load client_agents (lecture seule, non bloquant — vue "Clients par agent")
      try {
        const { data: caData, error: caError } = await supabase
          .from('client_agents')
          .select('client_id, agent_id, is_primary, created_at')
          .limit(15000);
        if (caError) console.error('client_agents fetch failed', caError);
        setClientAgents((caData as ClientAgent[] | null) ?? []);
      } catch (caErr) {
        console.error('client_agents fetch threw', caErr);
        setClientAgents([]);
      }



      // Load today's offers count per client
      const today = new Date().toISOString().split('T')[0];
      const { data: offresData } = await supabase
        .from('offres')
        .select('client_id')
        .gte('date_envoi', `${today}T00:00:00`)
        .lt('date_envoi', `${today}T23:59:59`)
        .limit(15000);

      const offresMap = new Map<string, number>();
      offresData?.forEach(offre => {
        if (offre.client_id) {
          const count = offresMap.get(offre.client_id) || 0;
          offresMap.set(offre.client_id, count + 1);
        }
      });
      setOffresToday(offresMap);

      // Load document update confirmations for current month
      const now = new Date();
      const day = now.getDate();
      let targetYear = now.getFullYear();
      let targetMonth = now.getMonth();
      if (day >= 25) {
        targetMonth += 1;
        if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
      }
      const currentMonthYear = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
      
      const { data: confirmationsData } = await supabase
        .from('document_update_confirmations')
        .select('client_id')
        .eq('month_year', currentMonthYear)
        .eq('fiches_salaire_ok', true)
        .eq('poursuites_ok', true)
        .eq('permis_ok', true);
      
      const confirmedSet = new Set<string>();
      confirmationsData?.forEach(c => confirmedSet.add(c.client_id));
      setDocConfirmations(confirmedSet);

      // Load relouer_requests (dossiers logements à relouer) — indexés par user_id
      const reletterUserIds = (clientsData || [])
        .filter((c: any) => c.journey_type === 'property_reletting' || c.journey_type === 'mixed')
        .map((c: any) => c.user_id)
        .filter(Boolean);
      if (reletterUserIds.length > 0) {
        const { data: rData } = await supabase
          .from('relouer_requests')
          .select('id, user_id, status, property_street, property_zip, property_city, property_type, rooms, surface, rent_net, availability_date, assigned_agent_id')
          .in('user_id', reletterUserIds)
          .order('created_at', { ascending: false })
          .limit(5000);
        const rMap = new Map<string, ReletterRequest>();
        (rData || []).forEach((r: any) => {
          if (r.user_id && !rMap.has(r.user_id)) rMap.set(r.user_id, r as ReletterRequest);
        });
        setRelouerByUser(rMap);

        const requestIds = Array.from(rMap.values()).map(r => r.id);
        if (requestIds.length > 0) {
          const [{ data: photos }, { data: docs }, { data: slots }, { data: cands }] = await Promise.all([
            supabase.from('relouer_photos').select('request_id').in('request_id', requestIds).limit(15000),
            supabase.from('relouer_documents').select('request_id').in('request_id', requestIds).limit(15000),
            supabase.from('relouer_visit_slots').select('request_id').in('request_id', requestIds).limit(15000),
            supabase.from('relouer_candidates').select('request_id').in('request_id', requestIds).limit(15000),
          ]);
          const cMap = new Map<string, ReletterCounts>();
          requestIds.forEach(id => cMap.set(id, { photos: 0, docs: 0, slots: 0, candidates: 0 }));
          (photos || []).forEach((p: any) => { const c = cMap.get(p.request_id); if (c) c.photos++; });
          (docs || []).forEach((p: any) => { const c = cMap.get(p.request_id); if (c) c.docs++; });
          (slots || []).forEach((p: any) => { const c = cMap.get(p.request_id); if (c) c.slots++; });
          (cands || []).forEach((p: any) => { const c = cMap.get(p.request_id); if (c) c.candidates++; });
          setRelouerCounts(cMap);
        } else {
          setRelouerCounts(new Map());
        }
      } else {
        setRelouerByUser(new Map());
        setRelouerCounts(new Map());
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const regions = ['Chablais', 'Fribourg', 'Gros-de-Vaud', 'Lausanne et région', 'Ouest-lausannois', 'Lavaux', 'Nord-vaudois', 'Nyon et région', 'Riviera', 'Valais', 'Genève', 'Autre'];
  const nombrePieces = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5+'];

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const togglePieces = (pieces: string) => {
    setSelectedPieces(prev => 
      prev.includes(pieces) ? prev.filter(p => p !== pieces) : [...prev, pieces]
    );
  };

  const typePermisOptions = ['B', 'C', 'L', 'F', 'N', 'G', 'Suisse'];
  const statutOptions = ['actif', 'en_attente', 'reloge', 'stoppe', 'suspendu', 'inactif'];
  const statutLabels: Record<string, string> = { actif: 'Actif', en_attente: 'En attente', reloge: 'Relogé', stoppe: 'Stoppé', suspendu: 'Suspendu', inactif: 'Inactif' };

  const getPurchaseProject = (c: Client) => purchaseByClient.get(c.id) || purchaseByUser.get(c.user_id) || null;
  const isBuyer = (c: Client) => isPurchaseBuyer(c, getPurchaseProject(c));
  const isReletter = (c: Client) => !isBuyer(c) && c.journey_type === 'property_reletting';
  const isMixed = (c: Client) => !isBuyer(c) && c.journey_type === 'mixed';
  const isSearcher = (c: Client) => !isBuyer(c) && (!c.journey_type || c.journey_type === 'housing_search');

  const filteredClients = clients.filter(client => {
    // Onglet Prospects : liste séparée (comptes candidat sans dossier) — aucun client ici.
    if (journeyTab === 'prospects') return false;
    // 1) Filtre par onglet journey — PRIORITE ABSOLUE acheteurs (jamais reloueurs)
    if (journeyTab === 'acheteurs') {
      if (isReletter(client)) return false;
      if (!isBuyer(client)) return false;
    }
    if (journeyTab === 'chercheurs' && !(isSearcher(client) || isMixed(client))) return false;
    if (journeyTab === 'reloueurs') {
      if (isBuyer(client)) return false;
      if (!(isReletter(client) || isMixed(client))) return false;
    }
    if (journeyTab === 'mixtes' && !isMixed(client)) return false;

    const profile = clientProfiles.get(client.user_id);
    const matchesSearch = profile
      ? (`${profile.prenom} ${profile.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
         profile.email.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    if (!matchesSearch) return false;

    // Filtre type de recherche global, avant tout retour spécifique reloueur.
    if (selectedTypeRecherche !== 'all') {
      if (selectedTypeRecherche === 'Acheter') {
        if (!isBuyer(client)) return false;
      } else if (isBuyer(client) || normalizeTypeRecherche((client as any).type_recherche) !== selectedTypeRecherche) {
        return false;
      }
    }

    // 2) Pour les clients reloueurs purs (carte reloueur) — appliquer les filtres reloueur
    if (isReletter(client)) {
      const req = relouerByUser.get(client.user_id);
      // Filtres reloueur (s'appliquent dans tous les onglets où une carte reloueur est rendue)
      if (relouerStatus !== 'all' && req?.status !== relouerStatus) return false;
      if (relouerType !== 'all' && (req?.property_type || '') !== relouerType) return false;
      if (relouerCommune.trim() && !(req?.property_city || '').toLowerCase().includes(relouerCommune.trim().toLowerCase())) return false;
      if (relouerPhotos !== 'all') {
        const n = req ? (relouerCounts.get(req.id)?.photos ?? 0) : 0;
        if (relouerPhotos === 'with' && n === 0) return false;
        if (relouerPhotos === 'without' && n > 0) return false;
      }
      if (relouerDocs !== 'all') {
        const n = req ? (relouerCounts.get(req.id)?.docs ?? 0) : 0;
        if (relouerDocs === 'with' && n === 0) return false;
        if (relouerDocs === 'without' && n > 0) return false;
      }
      if (relouerAvailability !== 'all') {
        const has = !!req?.availability_date;
        if (relouerAvailability === 'set' && !has) return false;
        if (relouerAvailability === 'none' && has) return false;
      }
      // Pour reloueurs purs : filtre agent appliqué sur l'agent assigné du dossier
      if (filterAgent !== 'all') {
        if (req?.assigned_agent_id !== filterAgent) return false;
      }
      if (showUnassignedOnly && req?.assigned_agent_id) return false;
      // Pièces du logement (réutilise sélecteur pièces si présent)
      if (selectedPieces.length > 0) {
        const ok = selectedPieces.some(p => {
          if (req?.rooms == null) return false;
          if (p === '5+') return req.rooms >= 5;
          const n = Number(p);
          return !Number.isNaN(n) && Math.abs(req.rooms - n) < 0.01;
        });
        if (!ok) return false;
      }
      return true;
    }

    // 3) Pour chercheurs / mixtes — filtres chercheur classiques
    const matchesAgent = filterAgent === "all" || client.agent_id === filterAgent;
    const matchesUnassigned = !showUnassignedOnly || !client.agent_id;

    const matchRegion = selectedRegions.length === 0 ||
      (client.region_recherche && selectedRegions.includes(client.region_recherche));

    const matchPieces = selectedPieces.length === 0 ||
      selectedPieces.some(p => {
        if (client.pieces == null) return false;
        if (p === '5+') return client.pieces >= 5;
        const pieceNum = Number(p);
        return !Number.isNaN(pieceNum) && Math.abs(client.pieces - pieceNum) < 0.01;
      });

    const matchTypeRecherche = true;

    const matchTypePermis = selectedTypePermis === 'all' ||
      client.type_permis === selectedTypePermis;

    const matchStatut = selectedStatut === 'all' ||
      (client as any).statut === selectedStatut;

    const bMin = budgetMin ? Number(budgetMin) : 0;
    const bMax = budgetMax ? Number(budgetMax) : Infinity;
    const clientBudget = client.budget_max || 0;
    const matchBudget = clientBudget >= bMin && clientBudget <= bMax;

    return matchesAgent && matchesUnassigned && matchRegion && matchPieces && matchTypeRecherche && matchTypePermis && matchStatut && matchBudget;
  });

  const showReletterFilters = journeyTab === 'reloueurs';
  const showSearcherFilters = journeyTab === 'chercheurs' || journeyTab === 'mixtes' || journeyTab === 'all';

  const activeFilterCount = (showSearcherFilters ? (selectedRegions.length + selectedPieces.length +
    (selectedTypeRecherche !== 'all' ? 1 : 0) + (selectedTypePermis !== 'all' ? 1 : 0) +
    (selectedStatut !== 'all' ? 1 : 0) + (budgetMin ? 1 : 0) + (budgetMax ? 1 : 0)) : 0) +
    (showReletterFilters ? ((relouerStatus !== 'all' ? 1 : 0) + (relouerType !== 'all' ? 1 : 0) +
      (relouerCommune.trim() ? 1 : 0) + (relouerPhotos !== 'all' ? 1 : 0) +
      (relouerDocs !== 'all' ? 1 : 0) + (relouerAvailability !== 'all' ? 1 : 0) +
      selectedPieces.length) : 0) +
    (showUnassignedOnly ? 1 : 0) + (filterAgent !== 'all' ? 1 : 0);


  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.profile.prenom} ${agent.profile.nom}` : "Non assigné";
  };

  // ============= Vues de travail (calculs purement visuels sur les données chargées) =============
  // Chaque client filtré reçoit sa situation, ses motifs « à traiter » et UNE prochaine action.
  const vues = useMemo<ClientVue[]>(() => {
    const out: ClientVue[] = [];
    for (const client of filteredClients) {
      const profile = clientProfiles.get(client.user_id);
      if (!profile) continue;
      const reloueur = isReletter(client) || (isMixed(client) && relouerByUser.has(client.user_id));
      const req = reloueur ? relouerByUser.get(client.user_id) : undefined;
      out.push(construireVue({
        client: client as any,
        profile,
        candidates: clientCandidates.get(client.id) || [],
        isAcheteur: isBuyer(client),
        isMixed: isMixed(client),
        reloueur,
        request: req,
        counts: req ? relouerCounts.get(req.id) : undefined,
        offresToday: offresToday.get(client.id) || 0,
        docConfirmed: docConfirmations.has(client.id),
      }));
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClients, clientProfiles, clientCandidates, relouerByUser, relouerCounts, offresToday, docConfirmations, purchaseByClient, purchaseByUser]);

  // Compteurs : suivent la recherche et les filtres.
  const situationCounts = useMemo(() => {
    const c: Record<Situation, number> = { a_traiter: 0, actifs: 0, en_attente: 0, reloges: 0, arretes: 0, tous: vues.length };
    const m: Record<Motif, number> = { sans_agent: 0, incomplet: 0, mandat: 0, inactif: 0 };
    for (const v of vues) {
      c[v.situation]++;
      if (v.motifs.length > 0) c.a_traiter++;
      v.motifs.forEach((k) => { m[k]++; });
    }
    return { c, m };
  }, [vues]);

  // Trier les clients de l'onglet courant
  const sortedVues = useMemo(() => {
    const list = vues.filter((v) => dansOnglet(v, situationTab, motifFilter));
    return list.sort((va, vb) => {
      const a = va.client as unknown as Client;
      const b = vb.client as unknown as Client;
      const profileA = va.profile;
      const profileB = vb.profile;
      let comparison = 0;

      switch (sortField) {
        case 'urgence':
          // Urgent d'abord (indépendant du sens) : prochaine action la plus pressante, puis échéance la plus proche.
          return (va.urgence - vb.urgence)
            || ((va.daysRemaining ?? 9999) - (vb.daysRemaining ?? 9999))
            || nomComplet(profileA).localeCompare(nomComplet(profileB), 'fr');
        case 'date':
          const dateA = new Date(a.date_ajout || a.created_at || 0).getTime();
          const dateB = new Date(b.date_ajout || b.created_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'name':
          const nameA = profileA ? `${profileA.prenom} ${profileA.nom}`.toLowerCase() : '';
          const nameB = profileB ? `${profileB.prenom} ${profileB.nom}`.toLowerCase() : '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'agent':
          const agentA = getAgentName(a.agent_id).toLowerCase();
          const agentB = getAgentName(b.agent_id).toLowerCase();
          comparison = agentA.localeCompare(agentB);
          break;
        case 'budget':
          comparison = (a.budget_max || 0) - (b.budget_max || 0);
          break;
        case 'days':
          const daysA = mandatElapsedFor(a as any);
          const daysB = mandatElapsedFor(b as any);
          comparison = daysA - daysB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vues, situationTab, motifFilter, sortField, sortOrder, agents]);
  const sortedClients = useMemo(() => sortedVues.map((v) => v.client as unknown as Client), [sortedVues]);

  const handleDeleteAllClients = async () => {
    try {
      setDeleting(true);

      const { data, error } = await supabase.functions.invoke('delete-all-clients');

      if (error) throw error;

      console.log('Delete all clients response:', data);

      toast({
        title: 'Suppression réussie',
        description: `${data.deletedClients} clients supprimés`,
      });

      // Reload data
      await loadData();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting all clients:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer tous les clients',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatTimeElapsed = (days: number) => {
    const totalHours = days * 24;
    const displayDays = Math.floor(days);
    const remainingHours = Math.floor((days - displayDays) * 24);
    const remainingMinutes = Math.floor(((days - displayDays) * 24 - remainingHours) * 60);
    return `${displayDays}j ${remainingHours}h ${remainingMinutes}m`;
  };

  const handleDeleteClient = async (clientUserId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la navigation vers la page de détail
    
    try {
      setDeletingClientId(clientUserId);

      const { error } = await supabase.functions.invoke('delete-client', {
        body: { userId: clientUserId }
      });

      if (error) throw error;

      toast({
        title: 'Client anonymisé (RGPD)',
        description: 'Données sensibles effacées. Nom, email et téléphone conservés pour la comptabilité.',
      });

      // Recharger les données
      await loadData();
    } catch (error) {
      console.error('Error anonymising client:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'anonymiser le client",
        variant: 'destructive',
      });
    } finally {
      setDeletingClientId(null);
    }
  };

  const handleInviteClient = async (email: string, clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setInvitingClientId(clientId);

      const { error } = await supabase.functions.invoke('invite-client', {
        body: { email, clientId }
      });

      if (error) throw error;

      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été envoyée à ${email}`,
      });
    } catch (error) {
      console.error('Error inviting client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'invitation',
        variant: 'destructive',
      });
    } finally {
      setInvitingClientId(null);
    }
  };

  const handleLightInvite = async () => {
    if (!inviteForm.email || !inviteForm.prenom || !inviteForm.nom) {
      toast({ title: 'Erreur', description: 'Prénom, nom et email sont requis', variant: 'destructive' });
      return;
    }
    try {
      setSendingInvite(true);
      const { error } = await supabase.functions.invoke('invite-client', {
        body: {
          email: inviteForm.email,
          prenom: inviteForm.prenom,
          nom: inviteForm.nom,
          telephone: inviteForm.telephone || null,
          invitationLegere: true,
          typeRecherche: normalizeTypeRecherche(inviteForm.typeRecherche),
          journeyType: isBuyerType(inviteForm.typeRecherche) ? 'purchase_search' : 'housing_search',
          createPurchaseProject: isBuyerType(inviteForm.typeRecherche),
        }
      });
      if (error) throw error;
      toast({ title: 'Invitation envoyée', description: `${inviteForm.prenom} ${inviteForm.nom} recevra un email d'invitation` });
      setInviteDialogOpen(false);
      setInviteForm({ prenom: '', nom: '', email: '', telephone: '', typeRecherche: 'Acheter' });
      await loadData();
    } catch (error: any) {
      console.error('Error light invite:', error);
      toast({ title: 'Erreur', description: error.message || "Impossible d'envoyer l'invitation", variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  // ============= Multi-sélection =============
  const toggleSelect = (clientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const targets = clients.filter((c) => ids.includes(c.id));
    if (targets.length === 0) return;

    setBulkLoading(true);
    let success = 0;
    let failed = 0;
    const BATCH = 5;
    try {
      for (let i = 0; i < targets.length; i += BATCH) {
        const slice = targets.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          slice.map((c) => supabase.functions.invoke('delete-client', { body: { userId: c.user_id } }))
        );
        results.forEach((r) => {
          if (r.status === 'fulfilled' && !r.value.error) success++;
          else failed++;
        });
      }
      toast({
        title: failed === 0 ? 'Anonymisation réussie' : 'Anonymisation partielle',
        description: `${success} client(s) anonymisé(s) (RGPD)${failed > 0 ? ` · ${failed} échec(s)` : ''}`,
        variant: failed === 0 ? 'default' : 'destructive',
      });
      await loadData();
      exitSelectionMode();
      setBulkDeleteOpen(false);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast({ title: 'Erreur', description: error.message || 'Suppression échouée', variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkChangeStatut = async (statut: BulkStatut) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ statut, date_changement_statut: new Date().toISOString() } as any)
        .in('id', ids);
      if (error) throw error;
      // 📱 WhatsApp welcome on activation (fire-and-forget)
      if (statut === 'actif') {
        ids.forEach((cid) => {
          supabase.functions.invoke('wa-send-welcome', { body: { client_id: cid } })
            .catch((e) => console.error('wa-send-welcome failed:', e));
        });
      }
      toast({
        title: 'Statut mis à jour',
        description: `${ids.length} client(s) → ${BULK_STATUT_LABELS[statut]}`,
      });
      await loadData();
      exitSelectionMode();
      setBulkStatutTarget(null);
    } catch (error: any) {
      console.error('Bulk statut error:', error);
      toast({ title: 'Erreur', description: error.message || 'Mise à jour échouée', variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <DashPage>
        <div role="status" aria-label="Chargement des clients">
          <div className="h-7 w-48 rounded-full bg-muted/60" />
          <div className="mt-6 h-24 rounded-2xl bg-muted/40" />
        </div>
      </DashPage>
    );
  }

  const { c: sc, m: mc } = situationCounts;
  const resume = sc.a_traiter === 0
    ? `Tout est à jour · ${clients.length} clients au total`
    : [
        `${sc.a_traiter} client${sc.a_traiter > 1 ? 's' : ''} à traiter`,
        mc.sans_agent > 0 ? `${mc.sans_agent} sans agent` : null,
        mc.mandat > 0 ? `${mc.mandat} mandat${mc.mandat > 1 ? 's' : ''} échu${mc.mandat > 1 ? 's' : ''} sous ${SEUIL_MANDAT_JOURS} j` : null,
        `${clients.length} clients au total`,
      ].filter(Boolean).join(' · ');

  const journeyTotals = {
    all: clients.length,
    chercheurs: clients.filter(c => isSearcher(c) || isMixed(c)).length,
    acheteurs: clients.filter(c => isBuyer(c) && !isReletter(c)).length,
    reloueurs: clients.filter(c => isReletter(c) || isMixed(c)).length,
    mixtes: clients.filter(c => isMixed(c)).length,
    prospects: prospects.length,
  };
  const journeyOptions: { key: JourneyTab; label: string }[] = [
    { key: 'all', label: 'Tous les clients' },
    { key: 'chercheurs', label: 'Chercheurs (location)' },
    { key: 'acheteurs', label: 'Acheteurs' },
    { key: 'reloueurs', label: 'Clients reloueurs' },
    { key: 'mixtes', label: 'Mixtes' },
    { key: 'prospects', label: 'Prospects (candidats)' },
  ];

  const sortOptions: { value: string; label: string }[] = [
    { value: 'urgence:asc', label: 'Urgent d’abord' },
    { value: 'date:desc', label: 'Ajout : plus récents' },
    { value: 'date:asc', label: 'Ajout : plus anciens' },
    { value: 'name:asc', label: 'Nom (A–Z)' },
    { value: 'name:desc', label: 'Nom (Z–A)' },
    { value: 'agent:asc', label: 'Agent (A–Z)' },
    { value: 'budget:desc', label: 'Budget décroissant' },
    { value: 'budget:asc', label: 'Budget croissant' },
    { value: 'days:desc', label: 'Jours de mandat (plus)' },
    { value: 'days:asc', label: 'Jours de mandat (moins)' },
  ];
  const sortValue = sortField === 'urgence' ? 'urgence:asc' : `${sortField}:${sortOrder}`;

  const resetFilters = () => {
    setFilterAgent('all'); setShowUnassignedOnly(false); setSelectedRegions([]); setSelectedPieces([]);
    setSelectedTypeRecherche('all'); setSelectedTypePermis('all'); setSelectedStatut('all'); setBudgetMin(''); setBudgetMax('');
    setRelouerStatus('all'); setRelouerType('all'); setRelouerCommune(''); setRelouerPhotos('all'); setRelouerDocs('all'); setRelouerAvailability('all');
  };

  const ctx: ClientListeCtx = {
    agentName: (v) => getAgentName(v.agentId || undefined),
    credits: (v) => creditsByUser.get(v.client.user_id),
    purchaseStatut: (v) => getPurchaseProject(v.client as unknown as Client)?.statut,
    selectionMode,
    isSelected: (id) => selectedIds.has(id),
    onToggleSelect: toggleSelect,
    // Tous les clients (reloueurs purs ou mixtes compris) ouvrent la fiche client unifiée.
    onOpen: (v) => navigate(`/admin/clients/${v.client.id}`),
    onInvite: (v, e) => handleInviteClient(v.profile.email, v.client.id, e),
    invitingClientId,
    onAnonymiser: (v, e) => handleDeleteClient(v.client.user_id, e),
    deletingUserId: deletingClientId,
    setRef: (id, el) => { cardRefs.current[id] = el; },
  };

  const visibles = sortedVues.slice(0, displayCount);
  const allVisibleSelected = sortedVues.length > 0 && sortedVues.every((v) => selectedIds.has(v.client.id));

  const tuiles: { label: string; value: number; onClick: () => void; alerte?: boolean }[] = [
    { label: 'Actifs', value: sc.actifs, onClick: () => setSituationTab('actifs') },
    { label: 'En attente', value: sc.en_attente, onClick: () => setSituationTab('en_attente') },
    { label: 'Sans agent', value: mc.sans_agent, alerte: mc.sans_agent > 0, onClick: () => { setSituationTab('a_traiter'); setMotifFilter('sans_agent'); } },
    { label: `Mandats ≤ ${SEUIL_MANDAT_JOURS} j`, value: mc.mandat, alerte: mc.mandat > 0, onClick: () => { setSituationTab('a_traiter'); setMotifFilter('mandat'); } },
    { label: `Inactifs > ${SEUIL_INACTIF_JOURS} j`, value: mc.inactif, alerte: mc.inactif > 0, onClick: () => { setSituationTab('a_traiter'); setMotifFilter('inactif'); } },
  ];

  const chip = (active: boolean) => cn(
    'inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors',
    active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:border-foreground/60',
  );

  return (
    <DashPage className="space-y-5 pb-28">
      <DashPageHeader
        title="Gestion des clients"
        subtitle={resume}
        action={
          <>
            <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={() => loadData()} aria-label="Actualiser">
              <RefreshCw className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Actualiser</span>
            </Button>
            <Button
              size="sm"
              variant={selectionMode ? "secondary" : "outline"}
              className="h-10 rounded-full"
              onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
              disabled={clients.length === 0}
            >
              {selectionMode ? <XIcon className="h-4 w-4 sm:mr-2" /> : <CheckSquare className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">{selectionMode ? 'Annuler' : 'Sélectionner'}</span>
            </Button>
            <Button onClick={() => setInviteDialogOpen(true)} size="sm" className="h-10 rounded-full">
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Inviter un client</span>
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-10 rounded-full" aria-label="Plus d'actions">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Plus</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Importer CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/inscriptions-echouees')}>
                  <AlertTriangle className="mr-2 h-4 w-4" /> Inscriptions échouées
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={clients.length === 0 || deleting}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {deleting ? 'Suppression...' : 'Supprimer tous'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement tous les clients ({clients.length})
              et toutes leurs données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllClients} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mode d'affichage */}
      <div className="inline-flex rounded-full border border-border bg-background p-1" role="tablist" aria-label="Mode d'affichage">
        {([
          { key: 'list', label: 'Liste clients' },
          { key: 'byAgent', label: 'Clients par agent' },
        ] as { key: 'list' | 'byAgent'; label: string }[]).map(opt => (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={viewMode === opt.key}
            onClick={() => setViewMode(opt.key)}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-medium transition-colors",
              viewMode === opt.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {viewMode === 'byAgent' && (
        <ClientsByAgentView
          clients={clients}
          clientProfiles={clientProfiles}
          agents={agents}
          clientAgents={clientAgents}
        />
      )}

      {viewMode === 'list' && (<>
        {/* Barre d'outils : recherche pleine largeur, parcours et tri côte à côte, filtres repliés */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client (nom, e-mail)…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher un client"
              className="h-11 rounded-full pl-10 pr-10"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_auto] lg:flex">
            <Select value={journeyTab} onValueChange={(v) => setJourneyTab(v as JourneyTab)}>
              <SelectTrigger className="h-11 rounded-full lg:w-[220px]" aria-label="Parcours"><SelectValue /></SelectTrigger>
              <SelectContent>
                {journeyOptions.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label} ({journeyTotals[o.key]})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortValue}
              onValueChange={(v) => { const [f, o] = v.split(':'); setSortField(f as SortField); setSortOrder(o as SortOrder); }}
              disabled={journeyTab === 'prospects'}
            >
              <SelectTrigger className="h-11 rounded-full lg:w-[200px]" aria-label="Trier"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={filtersOpen || activeFilterCount > 0 ? 'default' : 'outline'}
              className="col-span-2 h-11 rounded-full md:col-span-1"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              disabled={journeyTab === 'prospects'}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          </div>
        </div>

        {/* Panneau de filtres (replié par défaut) */}
        {filtersOpen && journeyTab !== 'prospects' && (
          <section className={cn(DASH_CARD, 'space-y-4 p-4 md:p-5')} aria-label="Filtres">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Agent</p>
                <Select value={filterAgent} onValueChange={setFilterAgent}>
                  <SelectTrigger className="h-11 rounded-full"><SelectValue placeholder="Filtrer par agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les agents</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.profile.prenom} {agent.profile.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={showUnassignedOnly ? "default" : "outline"}
                  onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                  className="h-11 w-full rounded-full"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Sans agent
                </Button>
              </div>
              {showSearcherFilters && (<>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Permis</p>
                  <Select value={selectedTypePermis} onValueChange={setSelectedTypePermis}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {typePermisOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Statut</p>
                  <Select value={selectedStatut} onValueChange={setSelectedStatut}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {statutOptions.map(s => <SelectItem key={s} value={s}>{statutLabels[s] || s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>)}
            </div>

            {showSearcherFilters && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Type de recherche</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={chip(selectedTypeRecherche === 'all')} onClick={() => setSelectedTypeRecherche('all')}>Tous</button>
                    <button type="button" className={chip(selectedTypeRecherche === 'Louer')} onClick={() => setSelectedTypeRecherche('Louer')}><Key className="mr-1 h-3 w-3" /> Location</button>
                    <button type="button" className={chip(selectedTypeRecherche === 'Acheter')} onClick={() => setSelectedTypeRecherche('Acheter')}><Home className="mr-1 h-3 w-3" /> Achat</button>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Budget (CHF)</p>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="h-11 rounded-full" aria-label="Budget minimum" />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input type="number" placeholder="Max" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="h-11 rounded-full" aria-label="Budget maximum" />
                  </div>
                </div>
              </div>
            )}

            {showSearcherFilters && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Régions</p>
                <div className="flex flex-wrap gap-1.5">
                  {regions.map(region => (
                    <button key={region} type="button" className={chip(selectedRegions.includes(region))} onClick={() => toggleRegion(region)}>{region}</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Nombre de pièces</p>
              <div className="flex flex-wrap gap-1.5">
                {nombrePieces.map(pieces => (
                  <button key={pieces} type="button" className={chip(selectedPieces.includes(pieces))} onClick={() => togglePieces(pieces)}>
                    {pieces === '5+' ? '5+ pièces' : `${pieces} pièce${pieces === '1' ? '' : 's'}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtres dossier reloueur — parcours « Clients reloueurs » */}
            {showReletterFilters && (
              <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Statut dossier</p>
                  <Select value={relouerStatus} onValueChange={setRelouerStatus}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="new_request">Nouvelle</SelectItem>
                      <SelectItem value="to_qualify">À qualifier</SelectItem>
                      <SelectItem value="missing_information">Infos manquantes</SelectItem>
                      <SelectItem value="waiting_documents">Docs en attente</SelectItem>
                      <SelectItem value="waiting_photos">Photos en attente</SelectItem>
                      <SelectItem value="ready_to_publish">Prêt à publier</SelectItem>
                      <SelectItem value="published">Publié</SelectItem>
                      <SelectItem value="visits_scheduled">Visites en cours</SelectItem>
                      <SelectItem value="applications_received">Candidatures reçues</SelectItem>
                      <SelectItem value="sent_to_agency">Transmis régie</SelectItem>
                      <SelectItem value="rented">Reloué</SelectItem>
                      <SelectItem value="cancelled">Annulé</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Type de logement</p>
                  <Select value={relouerType} onValueChange={setRelouerType}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="Appartement">Appartement</SelectItem>
                      <SelectItem value="Maison">Maison</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Loft">Loft</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Commune</p>
                  <Input value={relouerCommune} onChange={(e) => setRelouerCommune(e.target.value)} placeholder="Ville…" className="h-11 rounded-full" />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Photos</p>
                  <Select value={relouerPhotos} onValueChange={(v) => setRelouerPhotos(v as any)}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="with">Avec photos</SelectItem>
                      <SelectItem value="without">Sans photos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Documents</p>
                  <Select value={relouerDocs} onValueChange={(v) => setRelouerDocs(v as any)}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="with">Avec docs</SelectItem>
                      <SelectItem value="without">Sans docs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Disponibilité</p>
                  <Select value={relouerAvailability} onValueChange={(v) => setRelouerAvailability(v as any)}>
                    <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="set">Date renseignée</SelectItem>
                      <SelectItem value="none">Sans date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="h-11 rounded-full" onClick={resetFilters} disabled={activeFilterCount === 0}>Réinitialiser</Button>
              <Button className="h-11 rounded-full" onClick={() => setFiltersOpen(false)}>
                Voir {sortedVues.length} client{sortedVues.length > 1 ? 's' : ''}
              </Button>
            </div>
          </section>
        )}

        {journeyTab === 'prospects' ? (
          <CandidatProspectsList rows={prospects} loading={prospectsLoading} error={prospectsError} />
        ) : (<>
          {/* Synthèse : chaque tuile ouvre la file correspondante */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {tuiles.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={t.onClick}
                className={cn(DASH_CARD, 'flex min-h-[64px] flex-col justify-center px-3 py-2.5 text-left transition-transform duration-150 active:scale-[0.98]', t.alerte && 'ring-1 ring-amber-500/30')}
              >
                <span className={cn('text-xl font-semibold leading-tight', t.alerte ? 'text-amber-700 dark:text-amber-400' : 'text-foreground')}>{t.value}</span>
                <span className="truncate text-xs text-muted-foreground">{t.label}</span>
              </button>
            ))}
          </div>

          <div>
            <DashFilterPills
              label="Situation des clients"
              value={situationTab}
              onChange={(v) => { setSituationTab(v as Situation); setMotifFilter('tous'); }}
              options={SITUATIONS.map((s) => ({ key: s.key, label: s.label, count: sc[s.key] }))}
            />
            {situationTab === 'a_traiter' && sc.a_traiter > 0 && (
              <div className="-mt-2 mb-1 flex flex-wrap gap-1.5" role="group" aria-label="Motif">
                <button type="button" className={chip(motifFilter === 'tous')} onClick={() => setMotifFilter('tous')}>
                  Tous les motifs <span className="ml-1 opacity-70">{sc.a_traiter}</span>
                </button>
                {MOTIFS.map((m) => (
                  <button key={m.key} type="button" className={chip(motifFilter === m.key)} onClick={() => setMotifFilter(m.key)} disabled={mc[m.key] === 0}>
                    {m.label} <span className="ml-1 opacity-70">{mc[m.key]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sortedVues.length === 0 ? (
            <DashEmptyState
              icon={Users}
              title={
                searchTerm || activeFilterCount > 0 ? 'Aucun client ne correspond aux filtres sélectionnés'
                  : situationTab === 'a_traiter' ? 'Rien à traiter pour le moment'
                  : 'Aucun client trouvé'
              }
              description={situationTab === 'a_traiter' && !searchTerm ? 'Les clients sans agent, au dossier incomplet, au mandat bientôt échu ou inactifs depuis longtemps apparaissent ici.' : 'Modifiez vos filtres ou importez des clients via CSV'}
            />
          ) : isCompact ? (
            <div className="grid gap-3 md:grid-cols-2">
              {visibles.map((v) => <ClientListeCard key={v.client.id} v={v} ctx={ctx} />)}
            </div>
          ) : (
            <ClientListeTable
              vues={visibles}
              ctx={ctx}
              allSelected={allVisibleSelected}
              onToggleAll={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(sortedClients.map((c) => c.id)))}
            />
          )}

          {/* Afficher plus */}
          {sortedVues.length > displayCount && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setDisplayCount(prev => prev + 50)} className="h-11 rounded-full">
                Afficher plus ({sortedVues.length - displayCount} restants)
              </Button>
            </div>
          )}
        </>)}
      </>)}


      <CSVImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={() => {
          setShowImportDialog(false);
          loadData();
        }}
      />

      {/* Dialog invitation légère */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserPlus className="h-4 w-4" /></span>
              Inviter un client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Le client recevra un email d'invitation pour créer son mot de passe. Son compte sera en <strong>période d'essai</strong> jusqu'à ce qu'il complète son dossier.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="invite-prenom">Prénom *</Label>
                <Input id="invite-prenom" value={inviteForm.prenom} onChange={(e) => setInviteForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Marie" />
              </div>
              <div>
                <Label htmlFor="invite-nom">Nom *</Label>
                <Input id="invite-nom" value={inviteForm.nom} onChange={(e) => setInviteForm(f => ({ ...f, nom: e.target.value }))} placeholder="Dupont" />
              </div>
            </div>
            <div>
              <Label htmlFor="invite-email">Email *</Label>
              <Input id="invite-email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="marie@exemple.ch" />
            </div>
            <div>
              <Label htmlFor="invite-tel">Téléphone</Label>
              <Input id="invite-tel" value={inviteForm.telephone} onChange={(e) => setInviteForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+41 79 000 00 00" />
            </div>
            <div>
              <Label>Type de recherche</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" size="sm" variant={inviteForm.typeRecherche === 'Acheter' ? 'default' : 'outline'} onClick={() => setInviteForm(f => ({ ...f, typeRecherche: 'Acheter' }))} className="h-11 flex-1 rounded-full">
                  <Home className="w-4 h-4 mr-1" /> Acheter
                </Button>
                <Button type="button" size="sm" variant={inviteForm.typeRecherche === 'Louer' ? 'default' : 'outline'} onClick={() => setInviteForm(f => ({ ...f, typeRecherche: 'Louer' }))} className="h-11 flex-1 rounded-full">
                  <Key className="w-4 h-4 mr-1" /> Louer
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full">Annuler</Button>
            </DialogClose>
            <Button onClick={handleLightInvite} disabled={sendingInvite} className="rounded-full">
              {sendingInvite ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkActionsBar
        visible={selectionMode}
        selectedCount={selectedIds.size}
        totalVisible={sortedClients.length}
        loading={bulkLoading}
        onSelectAll={() => setSelectedIds(new Set(sortedClients.map((c) => c.id)))}
        onClear={() => setSelectedIds(new Set())}
        onCancel={exitSelectionMode}
        onDelete={() => setBulkDeleteOpen(true)}
        onChangeStatut={(s) => setBulkStatutTarget(s)}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !bulkLoading && setBulkDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><ShieldCheck className="h-4 w-4" /></span>
              Anonymiser {selectedIds.size} client(s) — Demande RGPD
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Conformément au <strong>droit à l'effacement</strong> (art. 17 RGPD / nLPD CH),
                  les données personnelles sensibles seront effacées (dossier, situation financière,
                  documents, conversations, mandat).
                </p>
                <p className="text-foreground">
                  ✅ <strong>Conservés</strong> : nom, prénom, email, téléphone — indispensables à la
                  <strong> comptabilité</strong> (factures, commissions) et aux <strong>statistiques</strong> de l'agence.
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  Les clients ne pourront plus se connecter. <strong>Action irréversible.</strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading} className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkLoading}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Anonymiser (RGPD)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkStatutTarget} onOpenChange={(o) => !bulkLoading && !o && setBulkStatutTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Passer {selectedIds.size} client(s) au statut « {bulkStatutTarget ? BULK_STATUT_LABELS[bulkStatutTarget] : ''} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le statut sera mis à jour pour tous les clients sélectionnés. La date de changement de statut est enregistrée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading} className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (bulkStatutTarget) handleBulkChangeStatut(bulkStatutTarget); }}
              disabled={bulkLoading}
              className="rounded-full"
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashPage>
  );
};

export default Clients;
