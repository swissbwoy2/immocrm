import { useState, useEffect, useRef, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  MapPin, Calendar, Square, Home, FileText, ThumbsUp, ThumbsDown, 
  PartyPopper, AlertTriangle, Clock, Check, Key, Star, Mail, MapPinned, Sparkles,
  FileSignature, Building2, CalendarCheck, AlertCircle, ChevronDown, ChevronUp,
  MessageSquare, User, Phone, FileStack, Loader2
} from "lucide-react";
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PremiumStatusCard } from "@/components/premium/PremiumStatusCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddressLink } from "@/components/AddressLink";
import {
  DASH_CARD, DashPage, DashPageHeader, DashFilterPills, DashSection, DashEmptyState, DashBadge,
} from "@/components/client/dashboard/DashPrimitives";
import type { ReactNode, ElementType } from "react";
import { Target, CheckCircle, Circle, XCircle } from "lucide-react";

const WORKFLOW_STATUTS = {
  envoyee: { label: 'Offre envoyée', color: 'secondary', step: 1 },
  vue: { label: 'Offre vue', color: 'outline', step: 1 },
  interesse: { label: 'Intéressé', color: 'default', step: 2 },
  visite_planifiee: { label: 'Visite planifiée', color: 'default', step: 3 },
  visite_effectuee: { label: 'Visite effectuée', color: 'default', step: 4 },
  candidature_deposee: { label: 'Candidature déposée', color: 'default', step: 5 },
  en_attente: { label: 'En attente réponse', color: 'secondary', step: 6 },
  acceptee: { label: 'Acceptée', color: 'default', step: 7 },
  refusee: { label: 'Refusée', color: 'destructive', step: 0 },
  bail_conclu: { label: 'Bail conclu', color: 'default', step: 8 },
  attente_bail: { label: 'Attente bail régie', color: 'secondary', step: 9 },
  bail_recu: { label: 'Bail reçu - Choisir date', color: 'default', step: 10 },
  signature_planifiee: { label: 'Signature planifiée', color: 'default', step: 11 },
  signature_effectuee: { label: 'Bail signé', color: 'default', step: 12 },
  etat_lieux_fixe: { label: 'État des lieux fixé', color: 'default', step: 13 },
  cles_remises: { label: 'Clés remises', color: 'default', step: 14 },
};

const getStatutLabel = (statut: string) => {
  return WORKFLOW_STATUTS[statut as keyof typeof WORKFLOW_STATUTS]?.label || statut;
};

const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
  const config = WORKFLOW_STATUTS[statut as keyof typeof WORKFLOW_STATUTS];
  return (config?.color as any) || 'secondary';
};

// Regroupement d'affichage (UX seulement — n'altère aucun statut)
const GROUPES = [
  { key: 'en_cours', label: 'En cours', dot: 'bg-primary' },
  { key: 'deposees', label: 'Déposées / en traitement', dot: 'bg-sky-500' },
  { key: 'cloturees', label: 'Clôturées', dot: 'bg-muted-foreground' },
] as const;

const STATUTS_DEPOSEES = [
  'candidature_deposee', 'en_attente', 'acceptee', 'bail_conclu', 'attente_bail',
  'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe',
];
const STATUTS_CLOTUREES = ['refusee', 'cles_remises'];

const getGroupe = (statut: string) => {
  if (STATUTS_CLOTUREES.includes(statut)) return 'cloturees';
  if (STATUTS_DEPOSEES.includes(statut)) return 'deposees';
  return 'en_cours';
};

// ---- Briques d'affichage locales (rendu sobre, mêmes données que les anciens composants Premium) ----

const STATUTS_SUCCES = ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'];

const getStatutTone = (statut: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted' => {
  if (getStatutBadgeVariant(statut) === 'destructive') return 'danger';
  if (STATUTS_SUCCES.includes(statut)) return 'success';
  if (statut === 'envoyee') return 'primary';
  return 'neutral';
};

/** Compteurs (Total, Actives, Acceptées, Clés remises). */
function CandidatureCounters({ data }: { data: { total: number; actives: number; acceptees: number; clesRemises: number } }) {
  const items = [
    { label: 'Total', value: data.total, icon: FileStack },
    { label: 'Actives', value: data.actives, icon: Target },
    { label: 'Acceptées', value: data.acceptees, icon: CheckCircle },
    { label: 'Clés remises', value: data.clesRemises, icon: Key },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className={`${DASH_CARD} flex items-center gap-3 p-4`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none tracking-tight text-foreground">{value}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Carte repliable d'une candidature (adresse, statut, infos, loyer, détail au clic). */
function CandidatureCard({ offre, statut, statutLabel, isExpanded, onToggle, children }: {
  offre: any;
  statut: string;
  statutLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`${DASH_CARD} overflow-hidden`}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer p-4 transition-colors hover:bg-muted/30 md:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <AddressLink
                  address={offre.adresse}
                  className="break-words text-base font-semibold"
                  iconClassName="h-4 w-4 shrink-0 text-muted-foreground"
                />
              </div>
              <span className="shrink-0">
                <DashBadge tone={getStatutTone(statut)}>{statutLabel}</DashBadge>
              </span>
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">{offre.pieces || '-'} pcs</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">{offre.surface || '-'} m²</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
              </span>
            </p>

            <div className="mt-3 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
              <p className="min-w-0 truncate text-foreground">
                <span className="text-lg font-semibold">CHF {offre.prix?.toLocaleString()}</span>
                <span className="ml-1 text-xs text-muted-foreground">par mois</span>
              </p>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
                {isExpanded ? 'Réduire' : 'Voir les détails'}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/70 px-4 pb-4 md:px-5 md:pb-5">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const FRISE_ETAPES = [
  { key: 'envoyee', label: 'Envoyée' },
  { key: 'vue', label: 'Vue' },
  { key: 'interesse', label: 'Intéressé' },
  { key: 'visite_planifiee', label: 'Visite' },
  { key: 'visite_effectuee', label: 'Visitée' },
  { key: 'candidature_deposee', label: 'Déposée' },
  { key: 'en_attente', label: 'Attente' },
  { key: 'acceptee', label: 'Acceptée' },
  { key: 'bail_conclu', label: 'Conclu' },
  { key: 'attente_bail', label: 'Attente bail' },
  { key: 'bail_recu', label: 'Bail reçu' },
  { key: 'signature_planifiee', label: 'Signature' },
  { key: 'signature_effectuee', label: 'Signé' },
  { key: 'etat_lieux_fixe', label: 'État lieux' },
  { key: 'cles_remises', label: 'Clés' },
];
const FRISE_ORDRE = FRISE_ETAPES.map((s) => s.key);

/** Frise de progression sobre : barre + étapes autour de l'étape courante. */
function ProgressionFrise({ currentStatut }: { currentStatut: string }) {
  if (currentStatut === 'refusee') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
        <XCircle className="h-4 w-4 shrink-0" />
        Candidature refusée
      </div>
    );
  }

  const currentIndex = FRISE_ORDRE.indexOf(currentStatut);
  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / FRISE_ORDRE.length) * 100 : 0;
  const visibles = currentIndex <= 3
    ? FRISE_ETAPES.slice(0, 7)
    : currentIndex >= FRISE_ORDRE.length - 3
      ? FRISE_ETAPES.slice(-7)
      : FRISE_ETAPES.slice(currentIndex - 3, currentIndex + 4);

  return (
    <div className="space-y-3">
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Progression : {Math.round(progressPercent)}%</p>
      </div>
      <ol className="flex flex-wrap gap-x-3 gap-y-2">
        {visibles.map((step) => {
          const stepIndex = FRISE_ORDRE.indexOf(step.key);
          const isPast = stepIndex < currentIndex;
          const isCurrent = stepIndex === currentIndex;
          return (
            <li
              key={step.key}
              className={`inline-flex items-center gap-1.5 text-xs ${
                isCurrent ? 'font-semibold text-foreground' : isPast ? 'text-foreground' : 'text-muted-foreground'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isPast ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              ) : isCurrent ? (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                </span>
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Bloc de réussite (candidature acceptée, clés remises). */
function SuccessNotice({ tone, title, description, icon: Icon, children }: {
  tone: 'success' | 'primary';
  title: string;
  description?: string;
  icon: ElementType;
  children?: ReactNode;
}) {
  const iconCls = tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary';
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}


interface DateProposee {
  date: string;
  lieu: string;
}

const MesCandidatures = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { syncEvent } = useGoogleCalendarSync();
  const [searchParams] = useSearchParams();
  const [offres, setOffres] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [recommendationEmails, setRecommendationEmails] = useState(['', '', '', '', '']);
  const [sendingRecommendation, setSendingRecommendation] = useState(false);
  const [currentCandidatureId, setCurrentCandidatureId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showThankYouDialog, setShowThankYouDialog] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'ancien' | 'statut'>('recent');

  // Handle URL parameter for auto-expanding candidature
  useEffect(() => {
    const candidatureId = searchParams.get('candidatureId');
    if (candidatureId && candidatures.length > 0) {
      // Find the offre linked to this candidature
      const candidature = candidatures.find(c => c.id === candidatureId);
      if (candidature) {
        // Auto-expand this card
        setExpandedCards(prev => new Set([...prev, candidature.offre_id]));
        // Scroll to the card
        setTimeout(() => {
          const cardElement = cardRefs.current.get(candidature.offre_id);
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [searchParams, candidatures]);

  const toggleCard = (offreId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offreId)) {
        newSet.delete(offreId);
      } else {
        newSet.add(offreId);
      }
      return newSet;
    });
  };

  // Calculate KPIs
  const kpiData = {
    total: offres.length,
    actives: offres.filter(o => {
      const c = candidatures.find(c => c.offre_id === o.id);
      const s = c?.statut || o.statut;
      return !['refusee', 'cles_remises'].includes(s);
    }).length,
    acceptees: candidatures.filter(c => ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut)).length,
    clesRemises: candidatures.filter(c => c.statut === 'cles_remises').length,
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        setLoading(false);
        return;
      }

      const { data: offresData } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date_envoi', { ascending: false });

      const { data: candidaturesData } = await supabase
        .from('candidatures')
        .select('*')
        .eq('client_id', clientData.id);

      setOffres(offresData || []);
      setCandidatures(candidaturesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (offreId: string, newStatut: string) => {
    try {
      const offre = offres.find(o => o.id === offreId);
      if (!offre) return;

      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id) {
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('agent_id', clientData.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              subject: 'Messages',
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          const messageContent = newStatut === 'interesse' 
            ? `✅ Je suis intéressé par l'offre : ${offre.adresse} (${offre.prix} CHF/mois)`
            : `❌ Je ne suis pas intéressé par l'offre : ${offre.adresse}`;

          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: messageContent,
            offre_id: offre.id
          });
        }
      }

      setOffres(prev => prev.map(o => o.id === offreId ? { ...o, statut: newStatut } : o));

      toast({
        title: "Statut mis à jour",
        description: `L'offre a été ${newStatut === 'interesse' ? 'marquée comme intéressante' : 'refusée'}.`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleAccepterConclure = async (candidatureId: string) => {
    try {
      const { error } = await supabase
        .from('candidatures')
        .update({ 
          statut: 'bail_conclu',
          client_accepte_conclure: true,
          client_accepte_conclure_at: new Date().toISOString()
        })
        .eq('id', candidatureId);

      if (error) throw error;

      await loadData();
      toast({ title: "Bail accepté", description: "Votre agent va valider avec la régie." });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleChoisirDate = async (candidatureId: string, dateIndex: number) => {
    try {
      const candidature = candidatures.find(c => c.id === candidatureId);
      const dates = candidature?.dates_signature_proposees as DateProposee[] | null;
      if (!dates || !dates[dateIndex]) return;

      const selectedDate = dates[dateIndex];

      const { error } = await supabase
        .from('candidatures')
        .update({ 
          statut: 'signature_planifiee',
          date_signature_choisie: selectedDate.date,
        })
        .eq('id', candidatureId);

      if (error) throw error;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const offre = offres.find(o => o.id === candidature?.offre_id);

      if (clientData) {
        await supabase.from('calendar_events').insert({
          title: `Signature bail - ${offre?.adresse || 'Bail'}`,
          event_type: 'signature',
          event_date: selectedDate.date,
          description: `Lieu: ${selectedDate.lieu}`,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          created_by: user?.id,
        });

        // Sync to Google Calendar
        if (user) {
          syncEvent(user.id, {
            title: `Signature bail - ${offre?.adresse || 'Bail'}`,
            description: `Lieu: ${selectedDate.lieu}`,
            start: selectedDate.date,
          });
        }

        // Send ICS invite via email
        if (user?.email) {
          supabase.functions.invoke('send-calendar-invite', {
            body: {
              title: `Signature bail - ${offre?.adresse || 'Bail'}`,
              description: `Lieu: ${selectedDate.lieu}`,
              location: selectedDate.lieu,
              start_date: selectedDate.date,
              end_date: new Date(new Date(selectedDate.date).getTime() + 3600000).toISOString(),
              recipient_email: user.email,
            },
          });
        }
      }

      await loadData();
      toast({ title: "Date choisie", description: "Le rendez-vous a été ajouté à votre agenda." });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleSendRecommendations = async () => {
    const validEmails = recommendationEmails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length === 0) {
      toast({ title: "Aucun email valide", variant: "destructive" });
      return;
    }

    setSendingRecommendation(true);
    try {
      const { error } = await supabase.functions.invoke('send-recommendation-email', {
        body: { emails: validEmails, userId: user?.id }
      });

      if (error) throw error;

      if (currentCandidatureId) {
        await supabase
          .from('candidatures')
          .update({ 
            recommandation_envoyee: true,
            emails_recommandation: validEmails
          })
          .eq('id', currentCandidatureId);
      }

      setShowRecommendationDialog(false);
      setRecommendationEmails(['', '', '', '', '']);
      await loadData();
      toast({ title: "Recommandations envoyées", description: `${validEmails.length} email(s) envoyé(s)` });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur d'envoi", variant: "destructive" });
    } finally {
      setSendingRecommendation(false);
    }
  };

  const openGoogleMaps = async (candidatureId?: string) => {
    window.open('https://share.google/rQl4mbAJowzSW2V8m', '_blank');
    
    if (candidatureId) {
      await supabase
        .from('candidatures')
        .update({ avis_google_envoye: true })
        .eq('id', candidatureId);
      
      loadData();
    }
    
    setShowThankYouDialog(true);
  };

  // ---- Recherche / filtres / tri (UX uniquement, la logique de statuts reste inchangée) ----
  const enrichedOffres = useMemo(() => offres.map((offre) => {
    const candidature = candidatures.find(c => c.offre_id === offre.id);
    const statut = candidature?.statut || offre.statut;
    return { ...offre, __statut: statut, groupe: getGroupe(statut) };
  }), [offres, candidatures]);

  const statutCounts = useMemo(() => {
    const map = new Map<string, number>();
    enrichedOffres.forEach(o => map.set(o.__statut, (map.get(o.__statut) || 0) + 1));
    return Array.from(map.entries()).map(([statut, count]) => ({ statut, count }));
  }, [enrichedOffres]);

  const visibleOffres = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = enrichedOffres.filter(o => {
      if (statutFilter.startsWith('groupe:')) {
        if (o.groupe !== statutFilter.slice(7)) return false;
      } else if (statutFilter !== 'all' && o.__statut !== statutFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        o.adresse, o.ville, o.npa, o.quartier, o.type_bien,
        (o as any).titre, (o as any).regie, (o as any).gerance,
        (o as any).contact_gerance, (o as any).contact_annonceur,
      ].filter(Boolean).join(' ').toLowerCase();

      return hay.includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'statut') {
        const sa = WORKFLOW_STATUTS[a.__statut as keyof typeof WORKFLOW_STATUTS]?.step ?? 0;
        const sb = WORKFLOW_STATUTS[b.__statut as keyof typeof WORKFLOW_STATUTS]?.step ?? 0;
        return sb - sa;
      }
      const da = new Date(a.date_envoi || 0).getTime();
      const db = new Date(b.date_envoi || 0).getTime();
      return sortBy === 'ancien' ? da - db : db - da;
    });
    return list;
  }, [enrichedOffres, search, statutFilter, sortBy]);

  const groupedOffres = useMemo(() => (
    GROUPES
      .map(g => ({ ...g, items: visibleOffres.filter(o => o.groupe === g.key) }))
      .filter(g => g.items.length > 0)
  ), [visibleOffres]);

  if (loading) {
    return (
      <DashPage>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status" aria-label="Chargement des candidatures">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
          <p className="text-sm text-muted-foreground">Chargement de vos candidatures...</p>
        </div>
      </DashPage>
    );
  }

  const filterOptions = [
    { key: 'all', label: 'Tout', count: offres.length },
    ...GROUPES
      .map((g) => ({ key: `groupe:${g.key}`, label: g.label, count: enrichedOffres.filter(o => o.groupe === g.key).length }))
      .filter((g) => g.count > 0),
  ];

  return (
    <DashPage className="pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <DashPageHeader
        title="Mes Candidatures"
        subtitle="Suivez l'état de vos offres et candidatures en temps réel"
      />

      {/* Compteurs */}
      <CandidatureCounters data={kpiData} />

      {offres.length > 0 ? (
        <div className="space-y-8">
          {/* Recherche / filtres / tri */}
          <div>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row">
              <div className="relative w-full min-w-0 lg:flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par adresse, ville…"
                  className="h-11 w-full rounded-full bg-background pl-10"
                  aria-label="Rechercher une candidature"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:shrink-0">
                <Select value={statutFilter} onValueChange={setStatutFilter}>
                  <SelectTrigger className="h-11 w-full min-w-0 rounded-full lg:w-[230px]" aria-label="Filtrer par statut">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">Tous les statuts ({offres.length})</SelectItem>
                    {statutCounts.map(({ statut, count }) => (
                      <SelectItem key={statut} value={statut}>
                        {getStatutLabel(statut)} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="h-11 w-full min-w-0 rounded-full lg:w-[190px]" aria-label="Trier">
                    <SelectValue placeholder="Trier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récentes d'abord</SelectItem>
                    <SelectItem value="ancien">Plus anciennes d'abord</SelectItem>
                    <SelectItem value="statut">Par statut (avancement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DashFilterPills
              label="Filtrer les candidatures"
              options={filterOptions}
              value={statutFilter}
              onChange={(key) => {
                if (key === 'all') setStatutFilter('all');
                else setStatutFilter(statutFilter === key ? 'all' : key);
              }}
            />
          </div>

          {groupedOffres.map((groupe) => {
            return (
              <DashSection
                key={groupe.key}
                title={groupe.label}
                action={<DashBadge tone="muted">{groupe.items.length}</DashBadge>}
              >
                <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {groupe.items.map((offre) => {
                    const candidature = candidatures.find(c => c.offre_id === offre.id);
                    const statut = candidature?.statut || offre.statut;
                    const datesProposees = candidature?.dates_signature_proposees as DateProposee[] | null;
                    const isExpanded = expandedCards.has(offre.id);

                    return (
                      <div
                        key={offre.id}
                        ref={(el) => {
                          if (el) cardRefs.current.set(offre.id, el);
                        }}
                        className="min-w-0"
                      >
                        <CandidatureCard
                          offre={offre}
                          statut={statut}
                          statutLabel={getStatutLabel(statut)}
                          isExpanded={isExpanded}
                          onToggle={() => toggleCard(offre.id)}
                        >
                          <div className="space-y-5 pt-4">
                            {/* Frise de progression */}
                            {candidature && (
                              <ProgressionFrise currentStatut={statut} />
                            )}

                            {/* Caractéristiques du bien */}
                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm">{offre.pieces} pièces</span>
                              </div>
                              <div className="flex min-w-0 items-center gap-2">
                                <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm">{offre.surface} m²</span>
                              </div>
                              <div className="flex min-w-0 items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm">{offre.etage || '-'} étage</span>
                              </div>
                              <div className="flex min-w-0 items-center gap-2">
                                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm">{offre.type_bien || 'Appartement'}</span>
                              </div>
                            </div>

                            {offre.description && (
                              <p className="text-sm text-muted-foreground">{offre.description}</p>
                            )}

                            {/* Actions rapides */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={(e) => { e.stopPropagation(); navigate('/client/messagerie'); }}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Contacter mon agent
                              </Button>
                              {offre.lien_annonce && (
                                <LinkPreviewCard url={offre.lien_annonce} />
                              )}
                            </div>

                            {/* ÉTAPES DU PARCOURS */}

                            {/* Offre initiale - Accepter / Refuser */}
                            {statut === 'envoyee' && (
                              <div className="space-y-2 border-t border-border/70 pt-4">
                                <Button
                                  onClick={() => updateStatut(offre.id, 'interesse')}
                                  className="w-full rounded-full"
                                  size="lg"
                                >
                                  <ThumbsUp className="mr-2 h-5 w-5" />
                                  Je suis intéressé
                                </Button>
                                <Button
                                  onClick={() => updateStatut(offre.id, 'refusee')}
                                  variant="outline"
                                  className="w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <ThumbsDown className="mr-2 h-4 w-4" />
                                  Pas intéressé
                                </Button>
                              </div>
                            )}

                            {/* Intéressé - en attente de visite */}
                            {statut === 'interesse' && (
                              <PremiumStatusCard
                                variant="info"
                                title="Offre marquée comme intéressante"
                                description="Votre agent va organiser une visite pour vous."
                              />
                            )}

                            {/* Visite / candidature en cours */}
                            {['visite_planifiee', 'visite_effectuee', 'candidature_deposee', 'en_attente'].includes(statut) && (
                              <PremiumStatusCard
                                variant="waiting"
                                title="Candidature en cours de traitement"
                                description="Votre agent gère activement cette candidature."
                                icon={Clock}
                              />
                            )}

                            {/* ACCEPTÉE - félicitations + conclure */}
                            {statut === 'acceptee' && candidature && (
                              <div className="space-y-3 border-t border-border/70 pt-4">
                                <SuccessNotice
                                  tone="success"
                                  title="Félicitations !"
                                  description="Votre candidature a été acceptée ! Vous pouvez maintenant conclure le bail."
                                  icon={PartyPopper}
                                />

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      className="w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                      size="lg"
                                    >
                                      <FileSignature className="mr-2 h-5 w-5" />
                                      Conclure le bail
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                                          <AlertTriangle className="h-[18px] w-[18px]" />
                                        </span>
                                        Avertissement important
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="space-y-3 text-left">
                                        <p>
                                          En acceptant de conclure ce bail, vous vous engagez à respecter les conditions suivantes :
                                        </p>
                                        <div className="rounded-xl bg-amber-500/10 p-4">
                                          <p className="font-medium text-amber-700 dark:text-amber-300">
                                            Des frais pourront être facturés en cas de désistement par la régie ou le propriétaire
                                            de l'offre, en alignement avec leurs conditions générales.
                                          </p>
                                        </div>
                                        <p>Êtes-vous sûr de vouloir continuer ?</p>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
                                      <AlertDialogAction className="rounded-full" onClick={() => handleAccepterConclure(candidature.id)}>
                                        J'accepte et je conclus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}

                            {/* Bail conclu - en attente de la régie */}
                            {statut === 'bail_conclu' && (
                              <PremiumStatusCard
                                variant="info"
                                title="Bail en cours de validation"
                                description="Votre agent valide avec la régie. Vous serez notifié dès réception du bail."
                                icon={Building2}
                              />
                            )}

                            {/* Attente bail */}
                            {statut === 'attente_bail' && (
                              <PremiumStatusCard
                                variant="waiting"
                                title="En attente du bail"
                                description="En attente de la réception du bail par la régie..."
                                icon={Clock}
                              />
                            )}

                            {/* Bail reçu - choisir la date de signature */}
                            {statut === 'bail_recu' && datesProposees && datesProposees.length > 0 && (
                              <div className="border-t border-border/70 pt-4">
                                <div className={`${DASH_CARD} p-4 md:p-5`}>
                                  <div className="mb-3 flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                      <CalendarCheck className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-base font-semibold text-foreground">
                                        Le bail est prêt ! Choisissez une date de signature :
                                      </h4>
                                      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>Lieu : {candidature?.lieu_signature || 'Chemin de l\'Esparcette 5, 1023 Crissier'}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <RadioGroup
                                    value={selectedDateIndex?.toString()}
                                    onValueChange={(val) => setSelectedDateIndex(parseInt(val))}
                                    className="space-y-2"
                                  >
                                    {datesProposees.map((d, idx) => (
                                      <div key={idx} className="flex items-center space-x-3 rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-foreground/40">
                                        <RadioGroupItem value={idx.toString()} id={`date-${idx}`} />
                                        <Label htmlFor={`date-${idx}`} className="flex-1 cursor-pointer">
                                          <span className="font-medium">
                                            {format(new Date(d.date), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
                                          </span>
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                  <Button
                                    className="mt-4 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                    disabled={selectedDateIndex === null}
                                    onClick={() => candidature && selectedDateIndex !== null && handleChoisirDate(candidature.id, selectedDateIndex)}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Confirmer cette date
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Signature planifiée */}
                            {statut === 'signature_planifiee' && (
                              <PremiumStatusCard
                                variant="success"
                                title="Signature prévue"
                                icon={CalendarCheck}
                              >
                                <div className="mt-2 space-y-1 text-sm">
                                  <p className="flex items-start gap-1.5">
                                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>{candidature?.date_signature_choisie && format(new Date(candidature.date_signature_choisie), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}</span>
                                  </p>
                                  <p className="flex items-start gap-1.5">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>{candidature?.lieu_signature || 'Chemin de l\'Esparcette 5, 1023 Crissier'}</span>
                                  </p>
                                </div>
                              </PremiumStatusCard>
                            )}

                            {/* Signature effectuée - en attente de l'état des lieux */}
                            {statut === 'signature_effectuee' && (
                              <PremiumStatusCard
                                variant="success"
                                title="Bail signé !"
                                description="En attente de la date de l'état des lieux..."
                                icon={Check}
                              />
                            )}

                            {/* État des lieux fixé - ALERTE IMPORTANTE */}
                            {statut === 'etat_lieux_fixe' && (
                              <div className="space-y-3 border-t border-border/70 pt-4">
                                <PremiumStatusCard
                                  variant="info"
                                  title="État des lieux et remise des clés"
                                  icon={Key}
                                >
                                  <p className="mt-2 flex items-start gap-1.5 text-sm">
                                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>
                                      {candidature?.date_etat_lieux && format(new Date(candidature.date_etat_lieux), 'EEEE dd MMMM yyyy', { locale: fr })}
                                      {candidature?.heure_etat_lieux && ` à ${candidature.heure_etat_lieux}`}
                                    </span>
                                  </p>
                                </PremiumStatusCard>

                                <PremiumStatusCard
                                  variant="warning"
                                  title="IMPORTANT - À préparer AVANT l'état des lieux"
                                  icon={AlertCircle}
                                >
                                  <div className="mt-3 space-y-2">
                                    <p className="text-sm">
                                      Pour l'obtention de vos clés à l'état des lieux, il vous faut <strong>impérativement</strong> :
                                    </p>
                                    <ul className="space-y-2 text-sm">
                                      <li className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                        <span>Avoir souscrit une <strong>garantie de loyer</strong></span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                        <span>Avoir payé le <strong>premier loyer</strong></span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                        <span>Avoir souscrit une <strong>assurance RC</strong> (si vous n'en avez pas déjà une)</span>
                                      </li>
                                    </ul>
                                    <p className="mt-3 text-sm font-medium">
                                      Sans l'un de ces éléments, la régie pourrait refuser de vous remettre les clés !
                                    </p>
                                  </div>
                                </PremiumStatusCard>
                              </div>
                            )}

                            {/* Clés remises - recommandation */}
                            {statut === 'cles_remises' && (
                              <div className="space-y-3 border-t border-border/70 pt-4">
                                <SuccessNotice
                                  tone="primary"
                                  title="Bienvenue chez vous !"
                                  description="Félicitations ! Vous avez reçu les clés de votre nouveau logement."
                                  icon={Key}
                                >
                                  {!candidature?.recommandation_envoyee && (
                                    <div className="mt-3 space-y-3">
                                      <p className="text-sm text-muted-foreground">
                                        Aidez-nous à aider d'autres personnes comme vous !
                                      </p>
                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                          variant="outline"
                                          className="rounded-full"
                                          onClick={() => {
                                            setCurrentCandidatureId(candidature?.id);
                                            setShowRecommendationDialog(true);
                                          }}
                                        >
                                          <Mail className="mr-2 h-4 w-4" />
                                          Recommander à 5 amis
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="rounded-full"
                                          onClick={() => openGoogleMaps(candidature?.id)}
                                          disabled={candidature?.avis_google_envoye}
                                        >
                                          <Star className="mr-2 h-4 w-4" />
                                          {candidature?.avis_google_envoye ? 'Merci pour votre avis !' : 'Noter sur Google'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {candidature?.recommandation_envoyee && (
                                    <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                                      <Sparkles className="h-4 w-4" />
                                      Merci pour vos recommandations !
                                    </p>
                                  )}
                                </SuccessNotice>
                              </div>
                            )}

                            {/* Refusée */}
                            {statut === 'refusee' && (
                              <PremiumStatusCard
                                variant="warning"
                                title="Candidature refusée"
                                description="Cette candidature a été refusée. Contactez votre agent pour plus d'informations."
                              />
                            )}
                          </div>
                        </CandidatureCard>
                      </div>
                    );
                  })}
                </div>
              </DashSection>
            );
          })}
          {visibleOffres.length === 0 && (
            <DashEmptyState
              icon={FileStack}
              title="Aucun résultat"
              description="Aucune candidature ne correspond à votre recherche ou à vos filtres."
            />
          )}
        </div>
      ) : (
        <DashEmptyState
          icon={FileStack}
          title="Aucune offre reçue"
          description="Vous n'avez pas encore reçu d'offres pour le moment"
        />
      )}

      {/* Dialogue recommandation */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-[18px] w-[18px]" />
              </span>
              Recommander Immo-Rama
            </DialogTitle>
            <DialogDescription>
              Partagez votre expérience avec vos proches ! Entrez jusqu'à 5 adresses email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {recommendationEmails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-sm text-muted-foreground">{idx + 1}.</span>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => {
                    const newEmails = [...recommendationEmails];
                    newEmails[idx] = e.target.value;
                    setRecommendationEmails(newEmails);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setShowRecommendationDialog(false)}>
              Annuler
            </Button>
            <Button className="rounded-full" onClick={handleSendRecommendations} disabled={sendingRecommendation}>
              {sendingRecommendation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer les recommandations'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue remerciement */}
      <Dialog open={showThankYouDialog} onOpenChange={setShowThankYouDialog}>
        <DialogContent className="max-w-md rounded-2xl text-center">
          <DialogHeader>
            <div className="mb-3 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Star className="h-7 w-7" />
              </span>
            </div>
            <DialogTitle className="text-center text-xl font-semibold">Merci infiniment !</DialogTitle>
            <DialogDescription className="mt-3 space-y-3 text-center text-[15px]">
              <p>
                Votre avis compte énormément pour nous et aide d'autres personnes
                à nous faire confiance dans leur recherche de logement.
              </p>
              <p className="font-medium text-foreground">
                Grâce à vous, nous pouvons continuer à accompagner des familles
                vers leur nouveau chez-soi !
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowThankYouDialog(false)} className="w-full rounded-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Avec plaisir !
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashPage>
  );
};

export default MesCandidatures;
