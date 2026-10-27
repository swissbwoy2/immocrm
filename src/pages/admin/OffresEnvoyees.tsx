import { estPrixDAchat } from '@/lib/achatOffreActions';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DashBadge, DashPage, DashPageHeader, DashEmptyState, DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
import { DETAIL_DIALOG, DetailHeader, DetailBody, KeyFacts, DetailSection, DetailRow, DetailText, DetailContact, DetailActions, chfDetail, dateTimeCH } from "@/components/details/DetailPrimitives";
import { Label } from "@/components/ui/label";
import { 
  Send, MapPin, Home, Calendar, User, Filter, Eye, ExternalLink, Phone, Building, Forward, Clock, 
  CheckCircle, XCircle, Star, FileText, Key, Sparkles, Pencil, CalendarPlus
} from "lucide-react";
import { EditOffreDialog } from "@/components/EditOffreDialog";
import { zurichDateTimeToIso } from "@/lib/dateZurich";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaginated } from "@/lib/fetchAllWithRange";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { groupOffresByEnvoi } from "@/utils/visitesCalculator";
import { Users, Loader2 } from "lucide-react";
import { AdresseMap } from '@/components/maps/AdresseMap';

interface Visite {
  id: string;
  offre_id: string;
  date_visite: string;
  statut: string | null;
  notes: string | null;
  feedback_agent: string | null;
}

interface Offre {
  id: string;
  titre: string | null;
  adresse: string;
  prix: number;
  pieces: number | null;
  surface: number | null;
  type_bien: string | null;
  statut: string | null;
  date_envoi: string | null;
  client_id: string | null;
  agent_id: string | null;
  lien_annonce: string | null;
  description: string | null;
  disponibilite: string | null;
  etage: string | null;
  code_immeuble: string | null;
  commentaires: string | null;
  concierge_nom: string | null;
  concierge_tel: string | null;
  locataire_nom: string | null;
  locataire_tel: string | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
}

interface Agent {
  id: string;
  user_id: string;
}

interface Client {
  id: string;
  user_id: string;
  agent_id: string | null;
}

// Configuration complète des statuts avec toutes les étapes du workflow
const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: typeof Send; 
  emoji: string;
  step: number;
}> = {
  envoyee: {
    label: 'Envoyée', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Send, 
    emoji: '📤',
    step: 1 
  },
  vue: { 
    label: 'Vue', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: Eye, 
    emoji: '👁️',
    step: 2 
  },
  interesse: { 
    label: 'Intéressé', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Star, 
    emoji: '⭐',
    step: 3 
  },
  souhaite_postuler: {
    label: 'Souhaite postuler',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    icon: Star,
    emoji: '📝',
    step: 5.4
  },
  visite_planifiee: { 
    label: 'Visite planifiée', 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    icon: Calendar, 
    emoji: '📅',
    step: 4 
  },
  visite_effectuee: { 
    label: 'Visite effectuée', 
    color: 'text-teal-600', 
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
    icon: CheckCircle, 
    emoji: '✅',
    step: 5 
  },
  offre_envisagee: {
    label: "Offre d'achat envisagée",
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: Star,
    emoji: '💰',
    step: 5.6
  },
  demande_postulation: { 
    label: 'Demande en attente', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: Clock, 
    emoji: '📝',
    step: 5.5 
  },
  candidature_deposee: {
    label: 'Candidature déposée', 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    icon: FileText, 
    emoji: '📋',
    step: 6 
  },
  acceptee: { 
    label: 'Acceptée', 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    icon: Key, 
    emoji: '🎉',
    step: 7 
  },
  refusee: { 
    label: 'Refusée', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    icon: XCircle, 
    emoji: '❌',
    step: -1 
  },
};

// Étapes de la timeline
const TIMELINE_STEPS = [
  { key: 'envoyee', label: 'Envoyée', emoji: '📤' },
  { key: 'vue', label: 'Vue', emoji: '👁️' },
  { key: 'interesse', label: 'Intéressé', emoji: '⭐' },
  { key: 'visite_planifiee', label: 'Visite', emoji: '📅' },
  { key: 'visite_effectuee', label: 'Visitée', emoji: '✅' },
  { key: 'candidature_deposee', label: 'Candidature', emoji: '📋' },
  { key: 'acceptee', label: 'Acceptée', emoji: '🎉' },
];

// Composant Timeline Premium
function OfferTimeline({ currentStatut }: { currentStatut: string | null }) {
  const statusConfig = STATUS_CONFIG[currentStatut || 'envoyee'];
  const currentStep = statusConfig?.step || 1;
  const isRefused = currentStatut === 'refusee';

  if (isRefused) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full border border-destructive/20">
        <XCircle className="h-3.5 w-3.5 text-destructive" />
        <span className="text-xs font-medium text-destructive">Refusée</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
      {TIMELINE_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isPast = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isFuture = stepNumber > currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                isPast && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                isFuture && "bg-muted text-muted-foreground"
              )}
              title={step.label}
            >
              {isPast ? '✓' : step.emoji}
            </div>
            {index < TIMELINE_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5 transition-all",
                  stepNumber < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}


/** Adresse sans accents ni ponctuation, en minuscules, pour comparer « Av. de France 71 » et « avenue de france 71 ». */
const normalizeAddress = (v: string | null | undefined) =>
  (v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const addressWords = (v: string) => normalizeAddress(v).split(' ').filter(w => w.length >= 2 || /^\d+$/.test(w));

export default function AdminOffresEnvoyees() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [offres, setOffres] = useState<Offre[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsById, setAgentsById] = useState<Map<string, Agent>>(new Map());
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsById, setClientsById] = useState<Map<string, Client>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  // Affichage par tranches : des centaines de cartes d'un coup bloquent la page sur mobile.
  const PAR_TRANCHE = 30;
  const [visibleCount, setVisibleCount] = useState(PAR_TRANCHE);
  // Filtre par adresse : cherché dans TOUTES les offres en base (pas seulement celles déjà chargées).
  const [addressFilter, setAddressFilter] = useState("");
  const [addressResults, setAddressResults] = useState<Offre[] | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  
  // Dialog state
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTargetClient, setSelectedTargetClient] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [markingCandidature, setMarkingCandidature] = useState(false);
  
  // Visites state
  const [visitesMap, setVisitesMap] = useState<Map<string, Visite[]>>(new Map());

  // Modifier l'offre / ajouter une visite depuis le détail
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newVisiteDate, setNewVisiteDate] = useState('');
  const [newVisiteHeure, setNewVisiteHeure] = useState('');
  const [newVisiteFin, setNewVisiteFin] = useState('');
  const [addingVisite, setAddingVisite] = useState(false);

  const INITIAL_LIMIT = 10000;

  // Deep link: /admin/offres-envoyees?offreId=<id>
  useEffect(() => {
    const offreId = searchParams.get('offreId');
    if (!offreId || offres.length === 0) return;
    const ouvrir = (target: any) => {
      setSelectedOffre(target);
      setDetailDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('offreId');
      setSearchParams(next, { replace: true });
    };
    const target = offres.find((o) => o.id === offreId);
    if (target) { ouvrir(target); return; }
    // Offre hors des offres chargées (liste tronquée) : on la charge directement.
    let alive = true;
    supabase.from('offres').select('*').eq('id', offreId).maybeSingle().then(({ data }) => {
      if (alive && data) ouvrir(data);
    });
    return () => { alive = false; };
  }, [offres, searchParams, setSearchParams]);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user?.id, userRole]);

  const loadData = async () => {
    try {
      // Parallélisation : count + offres récentes + agents + clients en simultané
      const [
        { count: countResult },
        { data: offresData, error: offresError },
        { data: agentsData, error: agentsError },
        { data: clientsData, error: clientsError },
      ] = await Promise.all([
        supabase.from('offres').select('*', { count: 'exact', head: true }),
        supabase
          .from('offres')
          .select('*')
          .order('date_envoi', { ascending: false })
          .limit(INITIAL_LIMIT),
        supabase.from('agents').select('id, user_id'),
        supabase.from('clients').select('id, user_id, agent_id'),
      ]);

      if (offresError) throw offresError;
      if (agentsError) throw agentsError;
      if (clientsError) throw clientsError;

      setTotalCount(countResult || 0);
      setOffres(offresData || []);
      setLoadedAll((offresData?.length || 0) >= (countResult || 0));

      setAgents(agentsData || []);
      setAgentsById(new Map((agentsData || []).map(a => [a.id, a])));
      setClients(clientsData || []);
      setClientsById(new Map((clientsData || []).map(c => [c.id, c])));

      // Profils + visites en parallèle
      const userIds = new Set<string>();
      agentsData?.forEach(a => userIds.add(a.user_id));
      clientsData?.forEach(c => userIds.add(c.user_id));

      const offreIds = (offresData || []).map(o => o.id);
      const [profilesRes, visitesRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from('profiles').select('id, prenom, nom').in('id', Array.from(userIds))
          : Promise.resolve({ data: [] as any[], error: null }),
        offreIds.length > 0
          ? supabase
              .from('visites')
              .select('id, offre_id, date_visite, statut, notes, feedback_agent')
              .in('offre_id', offreIds)
              .order('date_visite', { ascending: true })
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      if (profilesRes.data) {
        setProfiles(new Map(profilesRes.data.map((p: any) => [p.id as string, p as Profile] as const)));
      }

      if (visitesRes.data) {
        const newVisitesMap = new Map<string, Visite[]>();
        visitesRes.data.forEach((v: any) => {
          if (!newVisitesMap.has(v.offre_id)) newVisitesMap.set(v.offre_id, []);
          newVisitesMap.get(v.offre_id)!.push(v);
        });
        setVisitesMap(newVisitesMap);
      }
    } catch (error) {
      console.error('Erreur chargement offres:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  // Recherche par adresse côté base, avec un court délai pendant la frappe.
  useEffect(() => {
    const words = addressWords(addressFilter);
    if (!words.length) {
      setAddressResults(null);
      setAddressLoading(false);
      return;
    }
    let cancelled = false;
    setAddressLoading(true);
    const timer = setTimeout(async () => {
      try {
        let query = supabase.from('offres').select('*');
        // Lettres accentuables remplacées par « _ » : « geneve » trouve aussi « Genève » ; le tri exact se fait ensuite.
        for (const w of words) query = query.ilike('adresse', `%${w.replace(/[\\%_]/g, '').replace(/[aeiouyc]/g, '_')}%`);
        const { data, error } = await query.order('date_envoi', { ascending: false }).limit(1000);
        if (error) throw error;
        if (cancelled) return;
        const rows = (data || []) as Offre[];
        setAddressResults(rows);
        const missing = rows.map(o => o.id).filter(id => !visitesMap.has(id));
        if (missing.length) {
          const { data: vis } = await supabase
            .from('visites')
            .select('id, offre_id, date_visite, statut, notes, feedback_agent')
            .in('offre_id', missing.slice(0, 500))
            .order('date_visite', { ascending: true });
          if (!cancelled && vis?.length) {
            setVisitesMap(prev => {
              const next = new Map(prev);
              vis.forEach((v: any) => {
                const list = next.get(v.offre_id) || [];
                if (!list.some(x => x.id === v.id)) next.set(v.offre_id, [...list, v]);
              });
              return next;
            });
          }
        }
      } catch (e) {
        console.error('Erreur recherche par adresse:', e);
        if (!cancelled) toast.error('Recherche par adresse impossible');
      } finally {
        if (!cancelled) setAddressLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
    // visitesMap volontairement absent : on ne relance pas la recherche quand les visites arrivent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFilter]);

  const loadAllOffres = async () => {
    setLoadingMore(true);
    try {
      const { data, error } = await fetchAllPaginated(
        () => supabase.from('offres').select('*').order('date_envoi', { ascending: false })
      );
      if (error) throw error;
      setOffres(data || []);
      setLoadedAll(true);
      toast.success(`${data?.length || 0} offres chargées`);
    } catch (e) {
      console.error('Erreur chargement complet:', e);
      toast.error('Erreur lors du chargement complet');
    } finally {
      setLoadingMore(false);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Agent inconnu";
    const agent = agentsById.get(agentId);
    if (!agent) return "Agent inconnu";
    const profile = profiles.get(agent.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Agent inconnu";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Client inconnu";
    const client = clientsById.get(clientId);
    if (!client) return "Client inconnu";
    const profile = profiles.get(client.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getStatusBadge = (statut: string | null) => {
    const config = STATUS_CONFIG[statut || 'envoyee'] || STATUS_CONFIG.envoyee;
    const Icon = config.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 font-medium border",
          config.bgColor,
          config.color,
          config.borderColor
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{config.emoji}</span>
        {config.label}
      </Badge>
    );
  };

  const handleOpenOffreDetail = (offre: Offre) => {
    resetNewVisite();
    setSelectedOffre(offre);
    setDetailDialogOpen(true);
  };

  /** Recharge les visites d'une seule offre (après ajout ou modification). */
  const refreshVisitesOffre = async (offreId: string) => {
    const { data } = await supabase
      .from('visites')
      .select('id, offre_id, date_visite, statut, notes, feedback_agent')
      .eq('offre_id', offreId)
      .order('date_visite', { ascending: true });
    setVisitesMap(prev => {
      const next = new Map(prev);
      next.set(offreId, (data || []) as Visite[]);
      return next;
    });
  };

  const resetNewVisite = () => { setNewVisiteDate(''); setNewVisiteHeure(''); setNewVisiteFin(''); };

  /** Ajoute une date de visite (heure suisse) à l'offre affichée, pour son client. */
  const handleAddVisite = async () => {
    if (!selectedOffre) return;
    const debut = zurichDateTimeToIso(newVisiteDate, newVisiteHeure);
    if (!debut) { toast.error('Indiquez la date et l\'heure de la visite'); return; }
    if (!selectedOffre.client_id) { toast.error('Cette offre n\'a pas de client'); return; }
    const fin = newVisiteFin ? zurichDateTimeToIso(newVisiteDate, newVisiteFin) : null;
    if (fin && new Date(fin).getTime() <= new Date(debut).getTime()) { toast.error('L\'heure de fin doit être après le début'); return; }
    setAddingVisite(true);
    try {
      // Pas de doublon : même offre, même client, même créneau.
      const { data: existing } = await supabase
        .from('visites')
        .select('id')
        .eq('offre_id', selectedOffre.id)
        .eq('client_id', selectedOffre.client_id)
        .eq('date_visite', debut)
        .limit(1);
      if (existing && existing.length > 0) { toast.info('Cette visite existe déjà'); return; }

      const agentId = selectedOffre.agent_id || clientsById.get(selectedOffre.client_id)?.agent_id || null;
      const { error } = await supabase.from('visites').insert({
        offre_id: selectedOffre.id,
        client_id: selectedOffre.client_id,
        agent_id: agentId,
        adresse: selectedOffre.adresse,
        date_visite: debut,
        date_visite_fin: fin,
        statut: 'planifiee',
        source: 'manuel',
      } as any);
      if (error) throw error;

      // L'offre passe en « Visite planifiée » seulement si elle n'est pas déjà plus avancée.
      if (['envoyee', 'vue', 'interesse', 'souhaite_postuler', null, ''].includes(selectedOffre.statut as any)) {
        const { error: upErr } = await supabase.from('offres').update({ statut: 'visite_planifiee' }).eq('id', selectedOffre.id);
        if (!upErr) {
          setSelectedOffre(prev => prev ? { ...prev, statut: 'visite_planifiee' } : prev);
          setOffres(prev => prev.map(o => o.id === selectedOffre.id ? { ...o, statut: 'visite_planifiee' } : o));
        }
      }
      await refreshVisitesOffre(selectedOffre.id);
      resetNewVisite();
      toast.success('Visite ajoutée');
    } catch (e: any) {
      console.error('[OffresEnvoyees] ajout visite', e);
      toast.error(e?.message || 'Impossible d\'ajouter la visite');
    } finally {
      setAddingVisite(false);
    }
  };

  const handleOpenTransferDialog = (offre: Offre, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOffre(offre);
    setSelectedTargetClient("");
    setTransferDialogOpen(true);
  };

  const handleMarkCandidatureDeposee = async () => {
    if (!selectedOffre) return;
    setMarkingCandidature(true);
    try {
      const { data: existing } = await supabase
        .from('candidatures')
        .select('id')
        .eq('offre_id', selectedOffre.id)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('candidatures')
          .insert({
            offre_id: selectedOffre.id,
            client_id: selectedOffre.client_id,
            statut: 'en_attente',
            date_depot: new Date().toISOString(),
            dossier_complet: true,
          });
        if (insertError) throw insertError;
      }

      const { error: updateError } = await supabase
        .from('offres')
        .update({ statut: 'candidature_deposee' })
        .eq('id', selectedOffre.id);
      if (updateError) throw updateError;

      toast.success('Candidature déposée');
      setSelectedOffre(null);
      setDetailDialogOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMarkingCandidature(false);
    }
  };

  const handleTransferOffre = async () => {
    if (!selectedOffre || !selectedTargetClient) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    setTransferring(true);
    try {
      // Trouver le client cible et son agent assigné
      const targetClient = clients.find(c => c.id === selectedTargetClient);
      
      if (!targetClient?.agent_id) {
        toast.error("Ce client n'a pas d'agent assigné");
        setTransferring(false);
        return;
      }

      // Créer une nouvelle offre pour le nouveau client avec l'agent assigné
      const { data: newOffre, error: offreError } = await supabase
        .from('offres')
        .insert({
          titre: selectedOffre.titre,
          adresse: selectedOffre.adresse,
          prix: selectedOffre.prix,
          pieces: selectedOffre.pieces,
          surface: selectedOffre.surface,
          type_bien: selectedOffre.type_bien,
          description: selectedOffre.description,
          lien_annonce: selectedOffre.lien_annonce,
          disponibilite: selectedOffre.disponibilite,
          etage: selectedOffre.etage,
          code_immeuble: selectedOffre.code_immeuble,
          commentaires: selectedOffre.commentaires,
          concierge_nom: selectedOffre.concierge_nom,
          concierge_tel: selectedOffre.concierge_tel,
          locataire_nom: selectedOffre.locataire_nom,
          locataire_tel: selectedOffre.locataire_tel,
          agent_id: targetClient.agent_id,
          client_id: selectedTargetClient,
          statut: 'envoyee',
          date_envoi: new Date().toISOString()
        })
        .select()
        .single();

      if (offreError) throw offreError;

      // Chercher la conversation existante entre le client et son agent
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', selectedTargetClient)
        .eq('agent_id', targetClient.agent_id)
        .eq('conversation_type', 'client-agent')
        .maybeSingle();

      let conversationId = existingConv?.id;

      // Si pas de conversation, en créer une
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: selectedTargetClient,
            agent_id: targetClient.agent_id,
            subject: 'Échanges',
            conversation_type: 'client-agent',
            status: 'active'
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;

        // Ajouter l'agent dans conversation_agents
        await supabase
          .from('conversation_agents')
          .insert({
            conversation_id: conversationId,
            agent_id: targetClient.agent_id
          });
      }

      // Récupérer le nom du client cible pour la personnalisation
      const targetClientProfile = profiles.get(targetClient.user_id);
      const clientName = targetClientProfile 
        ? `${targetClientProfile.prenom} ${targetClientProfile.nom}` 
        : 'Client';

      // Créer le message complet comme dans EnvoyerOffre
      const messageLines = [
        `Nouvelle Offre pour Votre Recherche d'Appartement`,
        ``,
        `Bonjour ${clientName} 👋,`,
        ``,
        `Nous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :`,
        ``,
        `📍 Localisation : ${selectedOffre.adresse}`,
        `💰 Prix : ${selectedOffre.prix.toLocaleString()} CHF`,
      ];
      
      if (selectedOffre.surface) messageLines.push(`📐 Surface : ${selectedOffre.surface} m²`);
      if (selectedOffre.pieces) messageLines.push(`🏠 Nombre de pièces : ${selectedOffre.pieces}`);
      if (selectedOffre.etage) messageLines.push(`🏢 Étage : ${selectedOffre.etage}`);
      if (selectedOffre.disponibilite) messageLines.push(`📅 Disponibilité : ${selectedOffre.disponibilite}`);
      if (selectedOffre.type_bien) messageLines.push(`🏘️ Type de bien : ${selectedOffre.type_bien}`);
      if (selectedOffre.description) {
        messageLines.push(``);
        messageLines.push(`Description :`);
        messageLines.push(selectedOffre.description);
      }
      if (selectedOffre.lien_annonce) {
        messageLines.push(``);
        messageLines.push(`🔗 Voir l'annonce complète : ${selectedOffre.lien_annonce}`);
      }
      if (selectedOffre.commentaires) {
        messageLines.push(``);
        messageLines.push(`💬 Commentaires : ${selectedOffre.commentaires}`);
      }
      
      messageLines.push(``);
      messageLines.push(`Pour toute question, n'hésitez pas à nous appeler au +41 21 634 31 61 ou à répondre directement à ce message.`);
      messageLines.push(``);
      messageLines.push(`Cordialement,`);
      messageLines.push(`L'équipe Immo-rama.ch`);

      const messageContent = messageLines.join('\n');

      // Créer le message avec l'offre attachée (au nom de l'agent)
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: targetClient.agent_id,
          sender_type: 'agent',
          content: messageContent,
          offre_id: newOffre.id
        });

      if (messageError) throw messageError;

      // Mettre à jour last_message_at de la conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      const targetClientName = getClientName(selectedTargetClient);

      toast.success(`Offre envoyée à ${targetClientName}`);
      setTransferDialogOpen(false);
      setDetailDialogOpen(false);
      
      // Recharger les données
      loadData();
    } catch (error) {
      console.error('Erreur transfert offre:', error);
      toast.error("Erreur lors de l'envoi de l'offre");
    } finally {
      setTransferring(false);
    }
  };

  // Filtrage
  const addressTerms = addressWords(addressFilter);
  const filteredOffres = (addressResults ?? offres).filter(offre => {
    const matchesAddress = !addressTerms.length || addressTerms.every(w => normalizeAddress(offre.adresse).includes(w));
    const matchesSearch = 
      offre.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offre.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      getClientName(offre.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAgentName(offre.agent_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || offre.statut === statusFilter;
    const matchesAgent = agentFilter === "all" || offre.agent_id === agentFilter;
    
    return matchesAddress && matchesSearch && matchesStatus && matchesAgent;
  });

  // Regroupement : 1 offre logique = même agent + même adresse + même prix + même jour d'envoi
  const groupedFilteredOffres = groupOffresByEnvoi(
    filteredOffres.map(o => ({ ...o, date_envoi: o.date_envoi || '' }))
  );

  // Stats basées sur les GROUPES (1 offre envoyée à 5 clients = 1 offre logique)
  const allGroups = groupOffresByEnvoi(offres.map(o => ({ ...o, date_envoi: o.date_envoi || '' })));
  const groupStatus = (g: typeof allGroups[number]) => {
    // Statut "le plus avancé" du groupe pour les KPI
    const statuses = g.items.map(i => i.statut || 'envoyee');
    if (statuses.includes('acceptee')) return 'acceptee';
    if (statuses.includes('candidature_deposee')) return 'candidature_deposee';
    if (statuses.some(s => ['souhaite_postuler', 'interesse', 'visite_planifiee', 'visite_effectuee', 'offre_envisagee'].includes(s))) return 'interesse';
    if (statuses.includes('vue')) return 'vue';
    return 'envoyee';
  };
  const totalOffres = allGroups.length;
  const offresEnvoyees = allGroups.filter(g => ['envoyee', 'vue'].includes(groupStatus(g))).length;
  const offresInteresse = allGroups.filter(g => groupStatus(g) === 'interesse').length;
  const candidatures = allGroups.filter(g => groupStatus(g) === 'candidature_deposee').length;
  const offresAcceptees = allGroups.filter(g => groupStatus(g) === 'acceptee').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
    <DashPage className="space-y-6">
        <DashPageHeader
          title="Offres envoyées"
          subtitle="Suivi de toutes les offres envoyées par les agents"
        />

        {/* Bandeau pagination */}
        {!loadedAll && totalCount > offres.length && (
          <div className={`${DASH_CARD} p-4`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Affichage des <span className="font-semibold text-foreground">{offres.length}</span> offres les plus récentes
                sur <span className="font-semibold text-foreground">{totalCount}</span> au total — chargement rapide ⚡
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={loadAllOffres}
                disabled={loadingMore}
              >
                {loadingMore ? 'Chargement…' : `Charger toutes les ${totalCount} offres`}
              </Button>
            </div>
          </div>
        )}

        {/* Stats Premium KPI */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {[
            { label: 'Total', sub: 'Offres envoyées', value: totalOffres, icon: Send, tone: 'bg-primary/10 text-primary' },
            { label: 'En attente', sub: 'Envoyées & vues', value: offresEnvoyees, icon: Eye, tone: 'bg-primary/10 text-primary' },
            { label: 'Intéressés', sub: 'Visites en cours', value: offresInteresse, icon: Star, tone: 'bg-amber-500/10 text-amber-600' },
            { label: 'Candidatures', sub: 'Dossiers déposés', value: candidatures, icon: FileText, tone: 'bg-primary/10 text-primary' },
            { label: 'Acceptées', sub: 'Réussies', value: offresAcceptees, icon: Key, tone: 'bg-emerald-500/10 text-emerald-600' },
          ].map(({ label, sub, value, icon: Icon, tone }) => (
            <div key={label} className={`${DASH_CARD} flex min-h-[104px] flex-col justify-between p-3 sm:p-4`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-2 block">
                <span className="block text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
                <span className="block truncate text-xs font-medium text-foreground">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{sub}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Filtres Premium */}
        <div className={`${DASH_CARD} p-4 md:p-5`}>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Filtres
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Adresse (ex. Av. de France 71)"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                  className="rounded-full pl-9 pr-9"
                  aria-label="Filtrer par adresse"
                />
                {addressLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Input
                placeholder="Rechercher (adresse, client, agent...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-full"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="envoyee">📤 Envoyée</SelectItem>
                  <SelectItem value="vue">👁️ Vue</SelectItem>
                  <SelectItem value="interesse">⭐ Intéressé</SelectItem>
                  <SelectItem value="souhaite_postuler">📝 Souhaite postuler</SelectItem>
                  <SelectItem value="offre_envisagee">💰 Offre d'achat envisagée</SelectItem>
                  <SelectItem value="visite_planifiee">📅 Visite planifiée</SelectItem>
                  <SelectItem value="visite_effectuee">✅ Visite effectuée</SelectItem>
                  <SelectItem value="candidature_deposee">📋 Candidature déposée</SelectItem>
                  <SelectItem value="acceptee">🎉 Acceptée</SelectItem>
                  <SelectItem value="refusee">❌ Refusée</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {getAgentName(agent.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addressResults && (
              <p className="mt-3 text-sm text-muted-foreground">
                {addressResults.length >= 1000 ? 'Plus de 1000' : addressResults.length} offre{addressResults.length > 1 ? 's' : ''} en base pour « {addressFilter.trim()} »
                {addressResults.length >= 1000 ? ' : précisez l’adresse.' : ' (toutes dates confondues).'}
              </p>
            )}
        </div>

        {/* Liste des offres Premium */}
        <div className="grid gap-4">
          {filteredOffres.length === 0 ? (
            <DashEmptyState
              icon={Send}
              title="Aucune offre trouvée"
              description="Modifiez vos filtres ou attendez que les agents envoient des offres"
            />
          ) : (
            groupedFilteredOffres.slice(0, visibleCount).map((group, index) => {
              const offre = group.representative;
              const isMulti = group.count > 1;
              const statusConfig = STATUS_CONFIG[offre.statut || 'envoyee'] || STATUS_CONFIG.envoyee;

              return (
                <div
                  key={group.key}
                  className={cn(DASH_CARD, "group relative overflow-hidden")}
                >

                  <div
                    className="relative p-4 md:p-5 cursor-pointer rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleOpenOffreDetail(offre)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenOffreDetail(offre)}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {offre.titre || offre.adresse}
                          </h3>
                          {getStatusBadge(offre.statut)}
                          {isMulti && (
                            <DashBadge tone="primary">
                              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{group.count} clients</span>
                            </DashBadge>
                          )}
                        </div>
                        <OfferTimeline currentStatut={offre.statut} />
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-primary/70" />
                          {offre.adresse}
                        </span>
                        {offre.type_bien && (
                          <span className="flex items-center gap-1.5">
                            <Home className="w-4 h-4" />
                            {offre.type_bien}
                          </span>
                        )}
                        {offre.pieces && <span>{offre.pieces} pièces</span>}
                        {offre.surface && <span>{offre.surface} m²</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="font-bold text-primary text-base">
                          CHF {offre.prix.toLocaleString()}{estPrixDAchat(offre.prix) ? ' · prix de vente' : '/mois'}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-4 h-4" />
                          {getAgentName(offre.agent_id)}
                        </span>
                        {!isMulti && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="w-4 h-4" />
                            {getClientName(offre.client_id)}
                          </span>
                        )}
                        {offre.date_envoi && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(offre.date_envoi), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border/50 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleOpenTransferDialog(offre, e)}
                          className="relative z-10 rounded-full"
                        >
                          <Forward className="w-4 h-4 mr-1.5" />
                          Envoyer à un client
                        </Button>
                        {!isMulti && offre.client_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/clients/${offre.client_id}`);
                            }}
                            className="relative z-10 rounded-full"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Voir client
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Liste dépliable des clients destinataires */}
                  {isMulti && (
                    <Collapsible>
                      <CollapsibleTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="w-full min-h-11 px-4 md:px-5 py-2 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 border-t border-border/50 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Voir les {group.count} destinataires & leurs statuts
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 md:px-5 pb-4 pt-2 space-y-2">
                          {group.items.map((item) => {
                            const itemStatus = STATUS_CONFIG[item.statut || 'envoyee'] || STATUS_CONFIG.envoyee;
                            return (
                              <div
                                key={item.id}
                                className="imr-lg-glass flex items-center justify-between gap-3 p-2.5 rounded-2xl"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate">
                                    {getClientName(item.client_id)}
                                  </span>
                                  {getStatusBadge(item.statut)}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenOffreDetail(item);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  {item.client_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/clients/${item.client_id}`);
                                      }}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              );
            })
          )}
        </div>
        {groupedFilteredOffres.length > visibleCount && (
          <div className="flex flex-col items-center gap-1 py-4">
            <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAR_TRANCHE)}>
              Afficher {Math.min(PAR_TRANCHE, groupedFilteredOffres.length - visibleCount)} offres de plus
            </Button>
            <span className="text-xs text-muted-foreground">
              {visibleCount} sur {groupedFilteredOffres.length} affichées
            </span>
          </div>
        )}
    </DashPage>

      {/* Dialog détail offre */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className={DETAIL_DIALOG}>
          <DetailHeader
            titleAs={DialogTitle}
            descriptionAs={DialogDescription}
            eyebrow="Détails de l'offre"
            title={selectedOffre ? (selectedOffre.titre || selectedOffre.adresse) : "Détails de l'offre"}
            subtitle={
              selectedOffre ? (
                <span className="flex flex-col gap-0.5">
                  {selectedOffre.titre && selectedOffre.adresse && (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{selectedOffre.adresse}</span>
                  )}
                  {selectedOffre.date_envoi && (
                    <span className="first-letter:uppercase">Envoyée le {dateTimeCH(selectedOffre.date_envoi)}</span>
                  )}
                </span>
              ) : undefined
            }
            badge={selectedOffre ? getStatusBadge(selectedOffre.statut) : undefined}
          />

          {selectedOffre && (
            <DetailBody>
              <KeyFacts
                columns={4}
                items={[
                  { label: estPrixDAchat(selectedOffre.prix) ? 'Prix de vente' : 'Prix', value: chfDetail(selectedOffre.prix), emphasis: true },
                  selectedOffre.pieces ? { label: 'Pièces', value: selectedOffre.pieces, icon: Home } : null,
                  selectedOffre.surface ? { label: 'Surface', value: `${selectedOffre.surface} m²` } : null,
                  selectedOffre.etage ? { label: 'Étage', value: selectedOffre.etage } : null,
                ]}
              />
              <AdresseMap address={selectedOffre?.adresse} />

              <DetailSection title="Progression">
                <OfferTimeline currentStatut={selectedOffre.statut} />
              </DetailSection>

              {(selectedOffre.type_bien || selectedOffre.disponibilite || selectedOffre.code_immeuble || selectedOffre.agent_id || selectedOffre.client_id) && (
                <DetailSection title="Informations">
                  <DetailRow icon={Home} label="Type de bien" value={selectedOffre.type_bien} />
                  <DetailRow icon={Calendar} label="Disponibilité" value={selectedOffre.disponibilite} />
                  <DetailRow icon={Building} label="Code immeuble" value={selectedOffre.code_immeuble} />
                  <DetailRow label="Agent" value={getAgentName(selectedOffre.agent_id)} />
                  <DetailRow label="Client" value={getClientName(selectedOffre.client_id)} />
                </DetailSection>
              )}

              {(selectedOffre.concierge_nom || selectedOffre.locataire_nom) && (
                <DetailSection title="Contacts sur place" icon={Phone}>
                  {selectedOffre.concierge_nom && (
                    <DetailContact role="Concierge" name={selectedOffre.concierge_nom} phone={selectedOffre.concierge_tel} />
                  )}
                  {selectedOffre.locataire_nom && (
                    <DetailContact role="Locataire actuel" name={selectedOffre.locataire_nom} phone={selectedOffre.locataire_tel} />
                  )}
                </DetailSection>
              )}

              {selectedOffre.description && (
                <DetailSection title="Description">
                  <DetailText>{selectedOffre.description}</DetailText>
                </DetailSection>
              )}

              {selectedOffre.commentaires && (
                <DetailSection title="Commentaires de l'agent">
                  <DetailText>{selectedOffre.commentaires}</DetailText>
                </DetailSection>
              )}

              {/* Section Visites */}
              {(() => {
                const visites = visitesMap.get(selectedOffre.id) || [];
                const now = new Date();

                const getVisiteStatus = (visite: Visite) => {
                  if (visite.statut === 'effectuee') return { label: 'Effectuée', tone: 'success' as const, icon: CheckCircle };
                  if (visite.statut === 'annulee') return { label: 'Annulée', tone: 'danger' as const, icon: XCircle };
                  const visiteDate = new Date(visite.date_visite);
                  if (visiteDate < now) return { label: 'Passée', tone: 'muted' as const, icon: Clock };
                  return { label: 'À venir', tone: 'neutral' as const, icon: Calendar };
                };

                return (
                  <DetailSection title={`Visites (${visites.length})`} icon={Calendar}>
                    {visites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {selectedOffre.statut === 'visite_planifiee'
                          ? "Visite programmée mais aucune date enregistrée"
                          : "Aucune visite pour cette offre"
                        }
                      </p>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {visites.map(visite => {
                          const status = getVisiteStatus(visite);
                          const StatusIcon = status.icon;
                          return (
                            <div key={visite.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-[15px] font-medium first-letter:uppercase">
                                  <StatusIcon className="h-4 w-4 shrink-0 text-primary" />
                                  <span className="first-letter:uppercase">{dateTimeCH(visite.date_visite)}</span>
                                </span>
                                <DashBadge tone={status.tone}>{status.label}</DashBadge>
                              </div>
                              {visite.notes && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Notes : </span>{visite.notes}
                                </p>
                              )}
                              {visite.feedback_agent && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Feedback agent : </span>{visite.feedback_agent}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Ajouter une date de visite */}
                    {selectedOffre.client_id && (
                      <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <CalendarPlus className="h-4 w-4 text-primary" /> Ajouter une date de visite
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                          <div className="space-y-1">
                            <Label htmlFor="nv-date" className="text-xs text-muted-foreground">Date</Label>
                            <Input id="nv-date" type="date" value={newVisiteDate} onChange={(e) => setNewVisiteDate(e.target.value)} className="rounded-full" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:contents">
                            <div className="space-y-1">
                              <Label htmlFor="nv-heure" className="text-xs text-muted-foreground">Heure</Label>
                              <Input id="nv-heure" type="time" value={newVisiteHeure} onChange={(e) => setNewVisiteHeure(e.target.value)} className="rounded-full" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="nv-fin" className="text-xs text-muted-foreground">Fin (facultatif)</Label>
                              <Input id="nv-fin" type="time" value={newVisiteFin} onChange={(e) => setNewVisiteFin(e.target.value)} className="rounded-full" />
                            </div>
                          </div>
                          <Button onClick={handleAddVisite} disabled={addingVisite || !newVisiteDate || !newVisiteHeure} className="h-10 rounded-full">
                            {addingVisite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                            Ajouter
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Heure suisse · visite planifiée pour {getClientName(selectedOffre.client_id)}.</p>
                      </div>
                    )}
                  </DetailSection>
                );
              })()}

              {selectedOffre.lien_annonce && (
                <DetailSection title="Lien de l'annonce" bare>
                  <LinkPreviewCard url={selectedOffre.lien_annonce} showInline />
                </DetailSection>
              )}
            </DetailBody>
          )}

          <DetailActions>
            {selectedOffre && (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier l'offre
              </Button>
            )}
            {selectedOffre && !estPrixDAchat(selectedOffre.prix) && !['candidature_deposee', 'acceptee', 'signature_effectuee', 'bail_conclu', 'refusee'].includes(selectedOffre.statut || '') && (
              <Button
                variant="outline"
                onClick={handleMarkCandidatureDeposee}
                disabled={markingCandidature}
              >
                {markingCandidature ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Marquer candidature déposée
                  </>
                )}
              </Button>
            )}
            {selectedOffre?.lien_annonce && (
              <Button
                variant="outline"
                onClick={() => window.open(selectedOffre.lien_annonce!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir l'annonce
              </Button>
            )}
            <Button
              variant={selectedOffre?.client_id ? "outline" : "default"}
              onClick={() => {
                setDetailDialogOpen(false);
                handleOpenTransferDialog(selectedOffre!);
              }}
            >
              <Forward className="w-4 h-4 mr-2" />
              Envoyer à un client
            </Button>
            {selectedOffre?.client_id && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                navigate(`/admin/clients/${selectedOffre.client_id}`);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                Voir le client
              </Button>
            )}
          </DetailActions>
        </DialogContent>
      </Dialog>

      {/* Modifier l'offre (et ses dates de visite) */}
      {selectedOffre && (
        <EditOffreDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          offre={selectedOffre}
          onSuccess={(updated) => {
            setSelectedOffre(prev => prev ? { ...prev, ...updated } : prev);
            setOffres(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
            refreshVisitesOffre(updated.id);
          }}
        />
      )}

      {/* Dialog transfert offre à un client */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer l'offre à un autre client</DialogTitle>
            <DialogDescription>
              Sélectionnez le client à qui envoyer cette offre. L'offre sera dupliquée et envoyée au client sélectionné via son agent assigné.
            </DialogDescription>
          </DialogHeader>

          {selectedOffre && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOffre.titre || selectedOffre.adresse}</p>
                <p className="text-sm text-muted-foreground">CHF {selectedOffre.prix.toLocaleString()}{estPrixDAchat(selectedOffre.prix) ? ' · prix de vente' : '/mois'}</p>
              </div>

              <div className="space-y-2">
                <Label>Sélectionner un client</Label>
                <Select value={selectedTargetClient} onValueChange={setSelectedTargetClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients
                      .filter(c => c.id !== selectedOffre.client_id && c.agent_id)
                      .map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {getClientName(client.id)} 
                          <span className="text-muted-foreground ml-2">
                            (Agent: {getAgentName(client.agent_id)})
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {clients.filter(c => c.id !== selectedOffre.client_id && c.agent_id).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun autre client avec un agent assigné disponible.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleTransferOffre} 
              disabled={!selectedTargetClient || transferring}
            >
              {transferring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer l'offre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
