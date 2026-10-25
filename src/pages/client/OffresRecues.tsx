import { useState, useEffect, useMemo } from "react";
import { usePreviewImage, type ShowcaseItem } from "@/components/public-site/showcase/useShowcase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Square, Home, Eye, Heart, CheckCircle, Info, FileCheck, Check, X, Upload, User, Clock, FolderOpen, MessageSquare, Sparkles, Building2, Star, TrendingUp, Zap, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { canDecideOnOffre, visiteIndicatesDone } from '@/lib/visitDecision';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateChances } from "@/utils/chanceCalculator";
import { ChanceIndicator } from "@/components/ChanceIndicator";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useNotifications } from "@/hooks/useNotifications";
import { CandidatureWorkflowInteractive } from "@/components/CandidatureWorkflowInteractive";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { OffreInteretPrompt } from "@/components/client/OffreInteretPrompt";
import { PremiumOffreDetailsDialog } from "@/components/premium/PremiumOffreDetailsDialog";
import { submitVisitVideoDecision } from "@/components/client/VisitVideoDecisionCard";
import { notifyPostulationRequest, getClientDisplayName } from "@/lib/postulationRequest";
import { requestPostulation, POSTULATION_CONFIRMATION } from "@/lib/postulationJob";
import { Loader2 } from "lucide-react";
import { consumeVisitCoin } from "@/hooks/useUserCredits";

// Skeleton card for loading state
const OffreSkeletonCard = ({ index }: { index: number }) => (
  <Card 
    className="overflow-hidden p-6 animate-fade-in"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4 mb-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-2/3 mb-4" />
    <div className="flex gap-2 pt-4 border-t">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-9 w-28" />
    </div>
  </Card>
);

// Animated counter component
const AnimatedValue = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};
function VideoDecisionInlineButtons({ offre, visites, onDone }: { offre: any; visites: any[]; onDone: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<null | 'souhaite_postuler' | 'refuse'>(null);
  const relatedVisites = visites.filter((v) => v.offre_id === offre.id);
  const latestVisite = relatedVisites.sort((a, b) => {
    const da = a.date_visite ? new Date(a.date_visite).getTime() : 0;
    const db = b.date_visite ? new Date(b.date_visite).getTime() : 0;
    return db - da;
  })[0];
  const canDecide = canDecideOnOffre(offre, relatedVisites);
  const decision: 'souhaite_postuler' | 'refuse' | null = latestVisite?.client_decision ?? null;

  const handle = async (choice: 'souhaite_postuler' | 'refuse') => {
    if (!user || !canDecide || saving || decision) return;
    setSaving(choice);
    try {
      await submitVisitVideoDecision({
        user,
        visiteId: latestVisite?.id ?? '',
        offreId: offre.id,
        agentIdHint: latestVisite?.agent_id ?? offre.agent_id ?? null,
        address: offre.adresse || '',
        choice,
      });
      toast({
        title: choice === 'souhaite_postuler' ? 'Demande enregistrée et transmise à l\'équipe' : 'Choix enregistré',
        description: choice === 'souhaite_postuler'
          ? 'Votre demande de candidature a été transmise à votre agent.'
          : 'Votre choix a été enregistré.',
      });
      onDone();
    } catch (err: any) {
      console.error('[VideoDecisionInlineButtons]', err);
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible d\'enregistrer votre choix',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  if (decision) {
    return (
      <p className={cn(
        "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
        decision === 'souhaite_postuler'
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}>
        {decision === 'souhaite_postuler' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {decision === 'souhaite_postuler' ? 'Vous souhaitez postuler' : 'Vous ne postulez pas'}
      </p>
    );
  }

  return (
    <div className="mt-3 w-full space-y-2">
      <div className="grid gap-2">
        <Button
          className="h-11 w-full rounded-full"
          disabled={!canDecide || !!saving}
          onClick={() => handle('souhaite_postuler')}
        >
          {saving === 'souhaite_postuler' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Oui, je veux postuler
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full rounded-full"
          disabled={!canDecide || !!saving}
          onClick={() => handle('refuse')}
        >
          {saving === 'refuse' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
          Non, je ne postule pas
        </Button>
      </div>
      {!canDecide && (
        <p className="text-xs text-muted-foreground">Disponible après la visite</p>
      )}
    </div>
  );
}

type OffreFiltre = 'toutes' | 'a_repondre' | 'en_cours' | 'refusees';

/** Libellé court affiché sur la photo. */
const STATUT_COURT: Record<string, string> = {
  envoyee: 'Nouvelle',
  vue: 'À répondre',
  interesse: 'Intéressé',
  visite_planifiee: 'Visite planifiée',
  visite_confirmee: 'Visite confirmée',
  visite_effectuee: 'Visitée',
  souhaite_postuler: 'Je postule',
  demande_postulation: 'Demande envoyée',
  candidature_deposee: 'Candidature déposée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
};

/** Phrase de suite pour les étapes gérées par l'agent. */
const STATUT_SUITE: Record<string, string> = {
  demande_postulation: 'Votre demande de postulation est transmise à votre agent.',
  candidature_deposee: 'Votre candidature est déposée. Suivez-la dans « Candidatures ».',
  acceptee: 'Bonne nouvelle : votre candidature est acceptée.',
};

/** Photo de l'offre (galerie ou aperçu de l'annonce), format 4:3. */
function OffrePhoto({ offre }: { offre: any }) {
  const item = useMemo<ShowcaseItem>(() => ({
    id: offre.id,
    titre: offre.titre ?? null,
    type_bien: offre.type_bien ?? null,
    adresse: offre.adresse ?? null,
    prix: offre.prix ?? null,
    pieces: offre.pieces ?? null,
    surface: offre.surface ?? null,
    etage: offre.etage ?? null,
    lien_annonce: offre.lien_annonce ?? null,
    medias_galerie: offre.medias_galerie ?? null,
  }), [offre]);
  const img = usePreviewImage(item);
  return (
    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
      {img ? (
        <img src={img} alt={offre.adresse || 'Photo du bien'} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Home className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

const OffresRecues = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offres, setOffres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffre, setSelectedOffre] = useState<any | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [candidatureDialogOpen, setCandidatureDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documentsFicheSalaire, setDocumentsFicheSalaire] = useState<File[]>([]);
  const [documentExtraitPoursuites, setDocumentExtraitPoursuites] = useState<File | null>(null);
  const [documentPieceIdentite, setDocumentPieceIdentite] = useState<File | null>(null);
  const [messageClient, setMessageClient] = useState('');
  const [accepteConditions, setAccepteConditions] = useState(false);
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [delegateDate, setDelegateDate] = useState<string>("");
  const [delegateProposedSlots, setDelegateProposedSlots] = useState<any[]>([]);
  const [visitRequiredAlertOpen, setVisitRequiredAlertOpen] = useState(false);
  const [filtre, setFiltre] = useState<OffreFiltre>('toutes');
  
  const [clientData, setClientData] = useState<any>(null);
  const [visites, setVisites] = useState<any[]>([]);
  const [documentsStats, setDocumentsStats] = useState<any>({});
  const [proposedSlots, setProposedSlots] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [selectedExistingSalaire, setSelectedExistingSalaire] = useState<string[]>([]);
  const [selectedExistingPoursuites, setSelectedExistingPoursuites] = useState<string | null>(null);
  const [selectedExistingIdentite, setSelectedExistingIdentite] = useState<string | null>(null);

  useEffect(() => {
    loadOffres();
    loadClientData();
    loadVisites();
    loadDocumentsStats();
    loadExistingDocuments();
    loadCandidatures();
    markTypeAsRead('new_offer');
  }, [user?.id]);

  // Auto-open offer details from query param (?offre= ou ?offreId= depuis les notifications)
  useEffect(() => {
    const offreId = searchParams.get('offre') || searchParams.get('offreId');
    if (offreId && offres.length > 0 && !loading) {
      const offre = offres.find(o => o.id === offreId);
      if (offre) {
        setSelectedOffre(offre);
        setDetailsDialogOpen(true);
        // Clean the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [offres, loading, searchParams]);

  const loadExistingDocuments = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientData.id)
        .is('offre_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingDocuments(data || []);
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  const loadOffres = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        console.log('No client data found');
        return;
      }

      const { data: offresData, error } = await supabase
        .from('offres')
        .select(`
          *,
          agent:agents!offres_agent_id_fkey(
            id,
            user_id,
            profile:profiles!agents_user_id_fkey(
              prenom,
              nom,
              email,
              telephone
            )
          )
        `)
        .eq('client_id', clientData.id)
        .order('date_envoi', { ascending: false })
        .limit(15000);

      if (error) throw error;

      setOffres(offresData || []);
    } catch (error) {
      console.error('Error loading offres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les offres",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('revenus_mensuels, residence, type_permis')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setClientData(data);
    } catch (error) {
      console.error('Error loading client data:', error);
    }
  };

  const loadVisites = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('visites')
        .select('*')
        .eq('client_id', clientData.id)
        .limit(15000);

      if (error) throw error;
      setVisites(data || []);
    } catch (error) {
      console.error('Error loading visites:', error);
    }
  };

  const loadDocumentsStats = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('documents')
        .select('type_document, offre_id')
        .eq('client_id', clientData.id);

      if (error) throw error;

      const stats: any = {};
      data?.forEach((doc: any) => {
        const offreId = doc.offre_id || 'global';
        if (!stats[offreId]) {
          stats[offreId] = {
            fiche_salaire: 0,
            extrait_poursuites: 0,
            piece_identite: 0,
            permis_sejour: 0
          };
        }
        if (doc.type_document) {
          stats[offreId][doc.type_document] = (stats[offreId][doc.type_document] || 0) + 1;
        }
      });

      setDocumentsStats(stats);
    } catch (error) {
      console.error('Error loading documents stats:', error);
    }
  };

  const loadCandidatures = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('candidatures')
        .select('*')
        .eq('client_id', clientData.id);

      if (error) throw error;
      setCandidatures(data || []);
    } catch (error) {
      console.error('Error loading candidatures:', error);
    }
  };

  const refreshData = () => {
    loadDocumentsStats();
    loadVisites();
    loadCandidatures();
  };

  const handleProgressWorkflow = async (nextStatut: string, candidatureId: string) => {
    try {
      const { error } = await supabase
        .from('candidatures')
        .update({ 
          statut: nextStatut,
          ...(nextStatut === 'bail_conclu' ? {
            client_accepte_conclure: true,
            client_accepte_conclure_at: new Date().toISOString()
          } : {})
        })
        .eq('id', candidatureId);

      if (error) throw error;

      const candidature = candidatures.find(c => c.id === candidatureId);
      const offre = offres.find(o => o.id === candidature?.offre_id);
      
      const { data: client } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (client?.agent_id) {
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', client.id)
          .eq('agent_id', client.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: client.id,
              agent_id: client.agent_id,
              subject: 'Messages',
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv && offre) {
          const messageContent = nextStatut === 'bail_conclu' 
            ? `✅ **Bail confirmé**\n\nJ'accepte de conclure le bail pour :\n📍 ${offre.adresse}\n💰 ${offre.prix?.toLocaleString()} CHF/mois\n\nMerci de valider avec la régie.`
            : `📋 Progression de la candidature pour ${offre.adresse} vers l'étape: ${nextStatut}`;

          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: messageContent,
            offre_id: offre.id
          });
        }
      }

      await loadCandidatures();
      await loadOffres();
      
      toast({ 
        title: nextStatut === 'bail_conclu' ? "✅ Bail confirmé" : "Progression enregistrée", 
        description: nextStatut === 'bail_conclu' 
          ? "Votre agent va valider avec la régie." 
          : "Votre agent a été notifié."
      });
    } catch (error) {
      console.error('Error progressing workflow:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const updateStatut = async (offreId: string, newStatut: string) => {
    if (newStatut === 'visite_planifiee') {
      const offre = offres.find(o => o.id === offreId);
      if (offre) {
        handlePlanVisit(offre);
      }
      return;
    }

    try {
      const offre = offres.find(o => o.id === offreId);
      if (!offre) return;

      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut, updated_at: new Date().toISOString() })
        .eq('id', offreId);

      if (error) throw error;

      if (newStatut === 'interesse' || newStatut === 'refusee') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, agent_id, user_id')
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
              ? `✅ Le client est intéressé par l'offre : ${offre.adresse} (${offre.prix} CHF/mois)`
              : `❌ Le client a refusé l'offre : ${offre.adresse}`;

            await supabase
              .from('messages')
              .insert({
                conversation_id: conv.id,
                sender_id: user?.id,
                sender_type: 'client',
                content: messageContent,
                offre_id: offre.id
              });
          }
        }
      }

      setOffres(offres.map(o => o.id === offreId ? { ...o, statut: newStatut } : o));
      toast({ title: "Succès", description: "Statut mis à jour et agent notifié" });
    } catch (error) {
      console.error('Error updating statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const formatStatutOffre = (statut: string) => {
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'envoyee': { label: '📨 Envoyée', variant: 'secondary' },
      'vue': { label: '👁️ Vue', variant: 'outline' },
      'interesse': { label: '💚 Intéressé', variant: 'default' },
      'visite_planifiee': { label: '📅 Visite planifiée', variant: 'default' },
      'visite_effectuee': { label: '✅ Visite effectuée', variant: 'default' },
      'demande_postulation': { label: '📝 Demande en attente', variant: 'outline' },
      'candidature_deposee': { label: '📋 Candidature déposée', variant: 'default' },
      'acceptee': { label: '🎉 Acceptée', variant: 'default' },
      'refusee': { label: '❌ Refusée', variant: 'destructive' },
    };
    return labels[statut] || { label: statut, variant: 'secondary' };
  };

  const uploadDocument = async (
    file: File,
    typeDocument: string,
    offreId: string
  ): Promise<string | null> => {
    try {
      const filePath = `${user!.id}/${offreId}/${typeDocument}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData) throw new Error('Client not found');

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: file.name,
          type: file.type,
          taille: file.size,
          user_id: user!.id,
          client_id: clientData.id,
          offre_id: offreId,
          type_document: typeDocument,
          url: filePath,
          statut: 'valide'
        });

      if (dbError) throw dbError;

      return filePath;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleDeposerCandidature = (offre: any) => {
    setSelectedOffre(offre);
    setDocumentsFicheSalaire([]);
    setDocumentExtraitPoursuites(null);
    setDocumentPieceIdentite(null);
    setMessageClient('');
    setAccepteConditions(false);
    setSelectedExistingSalaire([]);
    setSelectedExistingPoursuites(null);
    setSelectedExistingIdentite(null);
    setCandidatureDialogOpen(true);
  };

  const handleDeleguerVisite = async (offre: any) => {
    setSelectedOffre(offre);
    setDelegateDate("");
    
    const { data: slots, error } = await supabase
      .from('visites')
      .select('*')
      .eq('offre_id', offre.id)
      .eq('statut', 'planifiee')
      .order('date_visite', { ascending: true });
    
    if (error) {
      console.error('Error loading proposed slots:', error);
      setDelegateProposedSlots([]);
    } else {
      setDelegateProposedSlots(slots || []);
    }
    
    setDelegateDialogOpen(true);
  };

  const confirmDeleguerVisite = async () => {
    if (!selectedOffre) return;
    
    // Si des créneaux sont proposés, une date doit être sélectionnée
    if (delegateProposedSlots.length > 0 && !delegateDate) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un créneau pour la visite',
        variant: 'destructive'
      });
      return;
    }

    const coin = await consumeVisitCoin();
    if (!coin.ok) {
      toast({ title: 'Délégation impossible', description: coin.message, variant: 'destructive' });
      return;
    }

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData?.agent_id) {
        toast({
          title: 'Erreur',
          description: 'Aucun agent assigné',
          variant: 'destructive'
        });
        return;
      }

      // Si une date est sélectionnée, créer une visite avec cette date
      // Sinon, créer une demande de visite sans date (l'agent choisira)
      if (delegateDate) {
        // Check for existing visit to avoid duplicates
        const { data: existingVisites } = await supabase
          .from('visites')
          .select('id')
          .eq('offre_id', selectedOffre.id)
          .eq('client_id', clientData.id)
          .eq('est_deleguee', true)
          .eq('statut', 'planifiee');

        if (existingVisites && existingVisites.length > 0) {
          await supabase.from('visites')
            .update({ date_visite: delegateDate })
            .eq('id', existingVisites[0].id);
        } else {
          await supabase.from('visites').insert({
            offre_id: selectedOffre.id,
            client_id: clientData.id,
            agent_id: clientData.agent_id,
            adresse: selectedOffre.adresse,
            date_visite: delegateDate,
            statut: 'planifiee',
            est_deleguee: true,
            source: 'deleguee',
            notes: 'Visite déléguée à l\'agent par le client'
          });
        }
      }

      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', selectedOffre.id);

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
            subject: 'Messages'
          })
          .select()
          .maybeSingle();
        conv = newConv;
      }

      if (conv) {
        let messageContent: string;
        
        if (delegateDate) {
          const visitDate = new Date(delegateDate);
          const formattedDate = visitDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          const formattedTime = visitDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          messageContent = `🏠 **Demande de visite déléguée à l'agent**\n\n📍 Adresse: ${selectedOffre.adresse}\n💰 Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n📅 Date souhaitée: ${formattedDate} à ${formattedTime}\n\nLe client souhaite que vous effectuiez la visite pour lui à cette date.`;
        } else {
          messageContent = `🏠 **Demande de visite déléguée à l'agent**\n\n📍 Adresse: ${selectedOffre.adresse}\n💰 Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n\n📋 Le client souhaite que vous organisiez et effectuiez la visite pour lui. Merci de proposer des créneaux ou de fixer une date.`;
        }
        
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          sender_type: 'client',
          content: messageContent,
          offre_id: selectedOffre.id
        });
      }

      setDelegateDialogOpen(false);
      await loadOffres();
      await refreshData();

      toast({
        title: '✅ Visite déléguée',
        description: 'Votre agent a été notifié et organisera la visite'
      });
    } catch (error) {
      console.error('Error delegating visit:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déléguer la visite',
        variant: 'destructive'
      });
    }
  };

  const handlePostulerDirect = async (offre: any) => {
    const visiteEffectuee = visites.find(v => 
      v.offre_id === offre.id && 
      v.statut === 'effectuee'
    );
    
    if (!visiteEffectuee) {
      setSelectedOffre(offre);
      setVisitRequiredAlertOpen(true);
      return;
    }

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData) {
        toast({
          title: 'Erreur',
          description: 'Client introuvable',
          variant: 'destructive'
        });
        return;
      }

      // Demande atomique et idempotente (candidature + offre + file de traitement).
      const pr = await requestPostulation(offre.id);
      if (pr.already_requested) {
        await loadOffres();
        refreshData();
        toast({ title: '✅ ' + POSTULATION_CONFIRMATION, description: 'Votre demande était déjà enregistrée.' });
        return;
      }

      if (clientData.agent_id) {
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
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          const messageContent = `📝 **DEMANDE DE DÉPÔT DE CANDIDATURE**

🏠 **Bien concerné:**
- Adresse: ${offre.adresse}
- Loyer: ${offre.prix?.toLocaleString()} CHF/mois
- Type: ${offre.type_bien || 'N/A'}

✅ **Visite effectuée** - J'ai consulté les médias de la visite

💼 Je souhaite que vous déposiez mon dossier auprès de la régie.

[BOUTON_DEPOSER_CANDIDATURE:${offre.id}:${clientData.id}]`;

          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user!.id,
            sender_type: 'client',
            content: messageContent,
            offre_id: offre.id
          });
        }
      }

      await notifyPostulationRequest({
        clientId: clientData.id,
        agentId: clientData.agent_id,
        offreId: offre.id,
        address: offre.adresse || '',
        displayName: await getClientDisplayName(user!.id),
        choice: 'souhaite_postuler',
      });

      await loadOffres();
      refreshData();

      toast({
        title: '✅ ' + POSTULATION_CONFIRMATION,
        description: 'Votre agent a été notifié et s\'occupera de la postulation pour vous.'
      });

    } catch (error) {
      console.error('Error requesting direct application:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la demande',
        variant: 'destructive'
      });
    }
  };

  const confirmCandidature = async () => {
    if (!selectedOffre || !accepteConditions) {
      toast({
        title: 'Erreur',
        description: 'Veuillez accepter les conditions',
        variant: 'destructive'
      });
      return;
    }

    const totalSalaireCount = documentsFicheSalaire.filter(f => f).length + selectedExistingSalaire.length;
    if (totalSalaireCount < 3) {
      toast({
        title: 'Documents manquants',
        description: 'Vous devez fournir vos 3 dernières fiches de salaire',
        variant: 'destructive'
      });
      return;
    }

    if (!documentExtraitPoursuites && !selectedExistingPoursuites) {
      toast({
        title: 'Document manquant',
        description: 'Vous devez fournir un extrait de l\'office des poursuites',
        variant: 'destructive'
      });
      return;
    }

    if (!documentPieceIdentite && !selectedExistingIdentite) {
      toast({
        title: 'Document manquant',
        description: 'Vous devez fournir une pièce d\'identité valable',
        variant: 'destructive'
      });
      return;
    }

    setUploadingDocs(true);

    try {
      const salaireUploads = documentsFicheSalaire.length > 0 
        ? await Promise.all(
            documentsFicheSalaire.filter(f => f).map(file =>
              uploadDocument(file, 'fiche_salaire', selectedOffre.id)
            )
          )
        : [];

      if (documentExtraitPoursuites) {
        await uploadDocument(
          documentExtraitPoursuites,
          'extrait_poursuites',
          selectedOffre.id
        );
      }

      if (documentPieceIdentite) {
        await uploadDocument(
          documentPieceIdentite,
          'piece_identite',
          selectedOffre.id
        );
      }

      if (selectedExistingSalaire.length > 0) {
        await supabase
          .from('documents')
          .update({ offre_id: selectedOffre.id })
          .in('id', selectedExistingSalaire);
      }

      if (selectedExistingPoursuites) {
        await supabase
          .from('documents')
          .update({ offre_id: selectedOffre.id })
          .eq('id', selectedExistingPoursuites);
      }

      if (selectedExistingIdentite) {
        await supabase
          .from('documents')
          .update({ offre_id: selectedOffre.id })
          .eq('id', selectedExistingIdentite);
      }

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData) throw new Error('Client not found');

      const pr = await requestPostulation(selectedOffre.id);
      if (pr.already_requested) {
        setCandidatureDialogOpen(false);
        await loadOffres();
        refreshData();
        toast({ title: '✅ ' + POSTULATION_CONFIRMATION, description: 'Votre demande était déjà enregistrée ; vos documents ont été ajoutés.' });
        return;
      }

      try {
        await notifyPostulationRequest({
          clientId: clientData.id,
          agentId: clientData.agent_id,
          offreId: selectedOffre.id,
          address: selectedOffre.adresse,
          displayName: await getClientDisplayName(user!.id),
          choice: 'souhaite_postuler',
        });
      } catch (e) { console.error('notifyPostulationRequest', e); }

      if (clientData.agent_id) {
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
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          const messageContent = `📝 **NOUVELLE CANDIDATURE DÉPOSÉE AVEC DOSSIER COMPLET**\n\n🏠 **Bien concerné:**\n- Adresse: ${selectedOffre.adresse}\n- Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n- Type: ${selectedOffre.type_bien || 'N/A'}\n\n✅ **Documents fournis:**\n- ✓ 3 fiches de salaire\n- ✓ Extrait de l'office des poursuites (< 3 mois)\n- ✓ Pièce d'identité valable\n\n${messageClient ? `💬 **Message du client:**\n${messageClient}\n\n` : ''}📋 Le dossier complet est disponible dans la section "Documents" du client.`;

          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user!.id,
            sender_type: 'client',
            content: messageContent,
            offre_id: selectedOffre.id
          });
        }
      }

      setCandidatureDialogOpen(false);
      await loadOffres();
      refreshData();

      toast({
        title: '🎉 ' + POSTULATION_CONFIRMATION,
        description: 'Votre dossier complet a été envoyé à votre agent. Vous serez contacté prochainement.'
      });

    } catch (error) {
      console.error('Error submitting candidature:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déposer la candidature. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleViewDetails = (offre: any) => {
    setSelectedOffre(offre);
    setDetailsDialogOpen(true);
  };

  // Un clic sur une option de visite vaut confirmation de l'interet : le pipeline agent en depend.
  const confirmerInteretSiBesoin = async (offre: any) => {
    if (offre?.statut === 'envoyee' || offre?.statut === 'vue') {
      try {
        await updateStatut(offre.id, 'interesse');
      } catch {
        // L'organisation de la visite continue meme si la mise a jour echoue.
      }
    }
  };

  const handleVisiteParClient = async (offre: any) => {
    await confirmerInteretSiBesoin(offre);
    handlePlanVisit(offre);
  };

  const handleVisiteParAgent = async (offre: any) => {
    await confirmerInteretSiBesoin(offre);
    handleDeleguerVisite(offre);
  };

  const handlePlanVisit = async (offre: any) => {
    setSelectedOffre(offre);
    setSelectedDate("");
    
    const { data: slots, error } = await supabase
      .from('visites')
      .select('*')
      .eq('offre_id', offre.id)
      .eq('statut', 'planifiee')
      .order('date_visite', { ascending: true });
    
    if (error) {
      console.error('Error loading proposed slots:', error);
      setProposedSlots([]);
    } else {
      setProposedSlots(slots || []);
    }
    
    setVisitDialogOpen(true);
  };

  const confirmVisit = async () => {
    if (!selectedOffre || !selectedDate) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner une date et heure pour la visite",
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!clientData?.agent_id) {
        toast({ 
          title: "Erreur", 
          description: "Aucun agent assigné",
          variant: "destructive" 
        });
        return;
      }

      await supabase
        .from('visites')
        .insert({
          offre_id: selectedOffre.id,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          date_visite: selectedDate,
          adresse: selectedOffre.adresse,
          statut: 'planifiee',
          source: 'planifiee_client',
          notes: 'Visite demandée par le client',
        });

      await supabase
        .from('offres')
        .update({ statut: 'visite_planifiee', updated_at: new Date().toISOString() })
        .eq('id', selectedOffre.id);

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
        await supabase
          .from('messages')
          .insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `📅 **NOUVELLE VISITE PLANIFIÉE**\n\n🏠 Adresse: ${selectedOffre.adresse}\n💰 Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n📆 Date: ${new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n⏰ Heure: ${new Date(selectedDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\n✅ Le client confirme sa présence pour cette visite.`,
            offre_id: selectedOffre.id
          });
      }

      setOffres(offres.map(o => o.id === selectedOffre.id ? { ...o, statut: 'visite_planifiee' } : o));
      setVisitDialogOpen(false);
      toast({ 
        title: "✅ Visite planifiée", 
        description: `Rendez-vous confirmé le ${new Date(selectedDate).toLocaleDateString('fr-FR')} à ${new Date(selectedDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Votre agent a été notifié.`
      });
      
      await loadOffres();
      refreshData();
    } catch (error) {
      console.error('Error planning visit:', error);
      toast({
        title: "Erreur",
        description: "Impossible de planifier la visite",
        variant: "destructive",
      });
    }
  };

  // Chargement : grille de cartes vides, même gabarit que la page.
  if (loading) {
    return (
      <div className="relative flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8" role="status" aria-label="Chargement des offres">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-[14px]" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filtres : une seule rangée de pastilles, du plus urgent au plus ancien.
  const A_REPONDRE = ['envoyee', 'vue'];
  const EN_COURS = ['interesse', 'visite_planifiee', 'visite_confirmee', 'visite_effectuee', 'souhaite_postuler', 'demande_postulation', 'candidature_deposee', 'acceptee'];
  const filtres: { key: OffreFiltre; label: string; count: number }[] = [
    { key: 'toutes', label: 'Toutes', count: offres.length },
    { key: 'a_repondre', label: 'À répondre', count: offres.filter((o) => A_REPONDRE.includes(o.statut)).length },
    { key: 'en_cours', label: 'En cours', count: offres.filter((o) => EN_COURS.includes(o.statut)).length },
    { key: 'refusees', label: 'Refusées', count: offres.filter((o) => o.statut === 'refusee').length },
  ];
  const offresFiltrees = offres.filter((o) => {
    if (filtre === 'a_repondre') return A_REPONDRE.includes(o.statut);
    if (filtre === 'en_cours') return EN_COURS.includes(o.statut);
    if (filtre === 'refusees') return o.statut === 'refusee';
    return true;
  });
  const aRepondre = filtres[1].count;

  return (
    <div className="flex-1 overflow-auto relative">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {/* En-tête */}
        <header className="mb-5">
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[28px]">Offres reçues</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {offres.length === 0
              ? 'Les biens sélectionnés par votre agent arrivent ici.'
              : aRepondre > 0
                ? `${offres.length} offre${offres.length > 1 ? 's' : ''} · ${aRepondre} en attente de votre réponse`
                : `${offres.length} offre${offres.length > 1 ? 's' : ''} sélectionnée${offres.length > 1 ? 's' : ''} pour vous`}
          </p>
        </header>

        {offres.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Home className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Aucune offre pour le moment</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Votre agent recherche les biens qui correspondent à vos critères. Vous serez notifié dès qu'une offre arrive.
            </p>
          </div>
        ) : (
          <>
            {/* Pastilles de filtre */}
            <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filtrer les offres">
              {filtres.map((f) => {
                const active = filtre === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFiltre(f.key)}
                    className={cn(
                      'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground hover:border-foreground/60',
                    )}
                  >
                    {f.label}
                    <span className={cn('text-xs', active ? 'text-background/70' : 'text-muted-foreground')}>{f.count}</span>
                  </button>
                );
              })}
            </div>

            {offresFiltrees.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Aucune offre dans cette catégorie.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {offresFiltrees.map((offre) => {
                  const liees = visites.filter((v) => v.offre_id === offre.id);
                  const apresVisite =
                    ['visite_effectuee', 'candidature_deposee', 'souhaite_postuler'].includes(offre.statut) ||
                    liees.some(visiteIndicatesDone);
                  const prochaine = liees
                    .filter((v) => v.date_visite && new Date(v.date_visite).getTime() >= Date.now() && v.statut !== 'annulee')
                    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime())[0];
                  const details = [
                    offre.pieces ? `${offre.pieces} pièces` : null,
                    offre.surface ? `${offre.surface} m²` : null,
                    offre.etage ? `Étage ${offre.etage}` : null,
                  ].filter(Boolean).join(' · ');

                  return (
                    <article
                      key={offre.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)]"
                    >
                      {/* Photo + statut : ouvre le détail */}
                      <button
                        type="button"
                        onClick={() => handleViewDetails(offre)}
                        className="group relative block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Voir le détail : ${offre.adresse || 'offre'}`}
                      >
                        <OffrePhoto offre={offre} />
                        <span
                          className={cn(
                            'absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
                            A_REPONDRE.includes(offre.statut)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-foreground',
                          )}
                        >
                          {STATUT_COURT[offre.statut] ?? 'Offre'}
                        </span>
                      </button>

                      <div className="flex flex-1 flex-col p-4">
                        {/* Infos essentielles */}
                        <button type="button" onClick={() => handleViewDetails(offre)} className="text-left">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                              {offre.adresse || offre.titre || 'Offre reçue'}
                            </h3>
                            {offre.prix ? (
                              <p className="shrink-0 text-right text-[15px] text-foreground">
                                <span className="font-semibold">CHF {Number(offre.prix).toLocaleString('fr-CH')}</span>
                                <span className="block text-xs text-muted-foreground">par mois</span>
                              </p>
                            ) : null}
                          </div>
                          {details && <p className="mt-1 text-sm text-muted-foreground">{details}</p>}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Reçue le {offre.date_envoi ? new Date(offre.date_envoi).toLocaleDateString('fr-CH') : '—'}
                            {offre.agent?.profile?.prenom ? ` · par ${offre.agent.profile.prenom}` : ''}
                          </p>
                        </button>

                        {/* Prochaine étape : une seule action claire par offre */}
                        <div className="mt-4 flex-1 border-t border-border/70 pt-4" onClick={(e) => e.stopPropagation()}>
                          {apresVisite ? (
                            <>
                              <p className="text-sm font-semibold text-foreground">Après la visite, voulez-vous postuler ?</p>
                              <VideoDecisionInlineButtons offre={offre} visites={visites} onDone={() => { loadOffres(); loadVisites(); }} />
                            </>
                          ) : A_REPONDRE.includes(offre.statut) || offre.statut === 'interesse' ? (
                            <>
                              <p className="text-sm font-semibold text-foreground">
                                {offre.statut === 'interesse' ? 'Organisez la visite' : 'Ce bien vous intéresse ?'}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {prochaine
                                  ? `Visite proposée le ${new Date(prochaine.date_visite).toLocaleString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}`
                                  : 'Choisissez qui se rend sur place.'}
                              </p>
                              <div className="mt-3 grid gap-2">
                                <Button className="h-11 w-full rounded-full" onClick={() => handleVisiteParClient(offre)}>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Je visite moi-même
                                </Button>
                                <Button variant="outline" className="h-11 w-full rounded-full" onClick={() => handleVisiteParAgent(offre)}>
                                  <User className="mr-2 h-4 w-4" />
                                  Mon agent visite pour moi
                                </Button>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateStatut(offre.id, 'refusee')}
                                className="mt-2 w-full py-1.5 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                              >
                                {offre.statut === 'interesse' ? 'Je ne suis plus intéressé' : 'Pas intéressé'}
                              </button>
                            </>
                          ) : offre.statut === 'visite_planifiee' ? (
                            <>
                              <p className="text-sm font-semibold text-foreground">Visite planifiée</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {prochaine
                                  ? new Date(prochaine.date_visite).toLocaleString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
                                  : 'La date apparaît dans votre agenda.'}
                              </p>
                              <Button
                                variant="outline"
                                className="mt-3 h-11 w-full rounded-full"
                                onClick={() => updateStatut(offre.id, 'visite_effectuee')}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                J'ai fait la visite
                              </Button>
                              <button
                                type="button"
                                onClick={() => updateStatut(offre.id, 'refusee')}
                                className="mt-2 w-full py-1.5 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                              >
                                Je ne suis plus intéressé
                              </button>
                            </>
                          ) : offre.statut === 'refusee' ? (
                            <>
                              <p className="text-sm text-muted-foreground">Vous avez refusé cette offre.</p>
                              <button
                                type="button"
                                onClick={() => updateStatut(offre.id, 'interesse')}
                                className="mt-1 text-sm font-medium text-foreground underline underline-offset-4"
                              >
                                Finalement, ce bien m'intéresse
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {STATUT_SUITE[offre.statut] ?? 'Votre agent s’occupe de la suite.'}
                            </p>
                          )}
                        </div>

                        {/* Liens secondaires */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-9 rounded-full px-3" onClick={() => handleViewDetails(offre)}>
                            <Info className="mr-1.5 h-4 w-4" />
                            Détails
                          </Button>
                          {offre.lien_annonce && (
                            <a
                              href={/^https?:\/\//i.test(String(offre.lien_annonce).trim()) ? String(offre.lien_annonce).trim() : `https://${String(offre.lien_annonce).trim()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground hover:bg-muted"
                            >
                              <ExternalLink className="mr-1.5 h-4 w-4" />
                              Voir l'annonce
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Dialog des détails - Premium Component */}
        <PremiumOffreDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          offre={selectedOffre}
          candidatures={candidatures}
          clientData={clientData}
          documentsStats={documentsStats}
          visites={visites}
          onProgressWorkflow={handleProgressWorkflow}
          onPlanVisit={handleVisiteParClient}
          onDeleguerVisite={handleVisiteParAgent}
          onRespondInteret={(o: any, statut: 'interesse' | 'refusee') => updateStatut(o.id, statut)}
          onPostulerDirect={handlePostulerDirect}
          formatStatutOffre={formatStatutOffre}
        />

        {/* Dialog de visite */}
        <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                Je visite moi-même
              </DialogTitle>
              <DialogDescription>
                Choisissez une date et heure pour visiter le bien
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30">
                  <h4 className="font-semibold text-sm">{selectedOffre.adresse}</h4>
                  <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mt-1">
                    CHF {selectedOffre.prix.toLocaleString()}/mois
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Sélectionnez un créneau</Label>
                  
                  {proposedSlots.length === 0 ? (
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/10 rounded-xl text-center border border-amber-200 dark:border-amber-800/50">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Aucun créneau proposé par votre agent
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Votre agent doit d'abord proposer des créneaux de visite pour ce bien. En attendant, vous pouvez lui déléguer l'organisation de la visite.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        onClick={() => {
                          setVisitDialogOpen(false);
                          handleDeleguerVisite(selectedOffre);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Déléguer l'organisation à votre agent
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {proposedSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={selectedDate === slot.date_visite ? "default" : "outline"}
                          className={cn(
                            "w-full justify-start text-left h-auto py-4 transition-all duration-300",
                            selectedDate === slot.date_visite && "shadow-lg shadow-primary/20"
                          )}
                          onClick={() => setSelectedDate(slot.date_visite)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold">
                                {new Date(slot.date_visite).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {new Date(slot.date_visite).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                            {selectedDate === slot.date_visite && (
                              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {proposedSlots.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-3 border-t border-border/50 space-y-2">
                      <p className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Aucun créneau ne vous convient ?
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setVisitDialogOpen(false);
                          handleDeleguerVisite(selectedOffre);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Déléguer l'organisation à votre agent
                      </Button>
                    </div>
                  )}
                  
                  {selectedDate && (
                    <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
                      <p className="text-sm font-medium mb-1 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Créneau sélectionné
                      </p>
                      <p className="text-sm">
                        <strong>
                          {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </strong>
                        {' à '}
                        <strong>
                          {new Date(selectedDate).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setVisitDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={confirmVisit} 
                disabled={!selectedDate}
                className="shadow-lg shadow-primary/20"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmer la visite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de candidature */}
        <Dialog open={candidatureDialogOpen} onOpenChange={setCandidatureDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                  <FileCheck className="h-5 w-5 text-purple-500" />
                </div>
                Déposer ma candidature
              </DialogTitle>
              <DialogDescription>
                Complétez votre candidature en fournissant tous les documents requis
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-6 py-4">
                <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border/50">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2">Bien concerné</h4>
                    <p className="text-sm">{selectedOffre.adresse}</p>
                    <p className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mt-1">
                      CHF {selectedOffre.prix.toLocaleString()}/mois
                    </p>
                  </CardContent>
                </Card>

                {selectedOffre.statut !== 'visite_effectuee' && (
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/50 dark:to-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800/50">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      ⚠️ <strong>Important :</strong> Une visite du bien sera obligatoire avant la validation finale de votre candidature.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold">Documents à fournir (obligatoires)</h4>

                  {/* Fiches de salaire */}
                  <div className="border border-border/50 rounded-xl p-4 bg-gradient-to-br from-card to-card/50">
                    <Label className="text-base font-medium">
                      📄 3 dernières fiches de salaire *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Vos 3 derniers bulletins de salaire ({documentsFicheSalaire.filter(f => f).length + selectedExistingSalaire.length}/3 fournis)
                    </p>
                    
                    {existingDocuments.filter(d => d.type_document === 'fiche_salaire').length > 0 && (
                      <div className="mb-3 p-3 bg-gradient-to-br from-blue-50/80 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                          <FolderOpen className="h-4 w-4" />
                          Sélectionner depuis mon dossier :
                        </p>
                        <div className="space-y-2">
                          {existingDocuments.filter(d => d.type_document === 'fiche_salaire').map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`salaire-${doc.id}`}
                                checked={selectedExistingSalaire.includes(doc.id)}
                                disabled={selectedExistingSalaire.length >= 3 && !selectedExistingSalaire.includes(doc.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedExistingSalaire([...selectedExistingSalaire, doc.id]);
                                  } else {
                                    setSelectedExistingSalaire(selectedExistingSalaire.filter(id => id !== doc.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`salaire-${doc.id}`} className="text-sm cursor-pointer flex-1">
                                {doc.nom}
                              </Label>
                              {selectedExistingSalaire.includes(doc.id) && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {existingDocuments.filter(d => d.type_document === 'fiche_salaire').length > 0 ? 'Ou uploader de nouveaux fichiers :' : 'Uploader vos fichiers :'}
                    </p>
                    <div className="space-y-2">
                      {[0, 1, 2].map(index => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const newDocs = [...documentsFicheSalaire];
                                newDocs[index] = file;
                                setDocumentsFicheSalaire(newDocs);
                              }
                            }}
                          />
                          {documentsFicheSalaire[index] && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extrait poursuites */}
                  <div className="border border-border/50 rounded-xl p-4 bg-gradient-to-br from-card to-card/50">
                    <Label className="text-base font-medium">
                      📋 Extrait de l'office des poursuites *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Datant de moins de 3 mois
                    </p>
                    
                    {existingDocuments.filter(d => d.type_document === 'extrait_poursuites').length > 0 && (
                      <div className="mb-3 p-3 bg-gradient-to-br from-blue-50/80 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                          <FolderOpen className="h-4 w-4" />
                          Sélectionner depuis mon dossier :
                        </p>
                        <div className="space-y-2">
                          {existingDocuments.filter(d => d.type_document === 'extrait_poursuites').map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`poursuites-${doc.id}`}
                                checked={selectedExistingPoursuites === doc.id}
                                onCheckedChange={(checked) => {
                                  setSelectedExistingPoursuites(checked ? doc.id : null);
                                  if (checked) setDocumentExtraitPoursuites(null);
                                }}
                              />
                              <Label htmlFor={`poursuites-${doc.id}`} className="text-sm cursor-pointer flex-1">
                                {doc.nom}
                              </Label>
                              {selectedExistingPoursuites === doc.id && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {existingDocuments.filter(d => d.type_document === 'extrait_poursuites').length > 0 ? 'Ou uploader un nouveau fichier :' : 'Uploader votre fichier :'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDocumentExtraitPoursuites(file);
                            setSelectedExistingPoursuites(null);
                          }
                        }}
                      />
                      {documentExtraitPoursuites && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>

                  {/* Pièce d'identité */}
                  <div className="border border-border/50 rounded-xl p-4 bg-gradient-to-br from-card to-card/50">
                    <Label className="text-base font-medium">
                      🪪 Pièce d'identité / ID suisse *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Document valable (carte identité, passeport, permis de séjour)
                    </p>
                    
                    {existingDocuments.filter(d => d.type_document === 'piece_identite' || d.type_document === 'permis_sejour').length > 0 && (
                      <div className="mb-3 p-3 bg-gradient-to-br from-blue-50/80 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                          <FolderOpen className="h-4 w-4" />
                          Sélectionner depuis mon dossier :
                        </p>
                        <div className="space-y-2">
                          {existingDocuments.filter(d => d.type_document === 'piece_identite' || d.type_document === 'permis_sejour').map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`identite-${doc.id}`}
                                checked={selectedExistingIdentite === doc.id}
                                onCheckedChange={(checked) => {
                                  setSelectedExistingIdentite(checked ? doc.id : null);
                                  if (checked) setDocumentPieceIdentite(null);
                                }}
                              />
                              <Label htmlFor={`identite-${doc.id}`} className="text-sm cursor-pointer flex-1">
                                {doc.nom}
                              </Label>
                              {selectedExistingIdentite === doc.id && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {existingDocuments.filter(d => d.type_document === 'piece_identite' || d.type_document === 'permis_sejour').length > 0 ? 'Ou uploader un nouveau fichier :' : 'Uploader votre fichier :'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDocumentPieceIdentite(file);
                            setSelectedExistingIdentite(null);
                          }
                        }}
                      />
                      {documentPieceIdentite && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Message optionnel */}
                <div className="space-y-2">
                  <Label>💬 Message à votre agent (optionnel)</Label>
                  <Textarea
                    placeholder="Avez-vous des informations complémentaires à transmettre ?"
                    value={messageClient}
                    onChange={(e) => setMessageClient(e.target.value)}
                    className="bg-background/50"
                  />
                </div>

                {/* Conditions */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20">
                  <Checkbox
                    id="accepte-conditions"
                    checked={accepteConditions}
                    onCheckedChange={(checked) => setAccepteConditions(checked === true)}
                  />
                  <Label htmlFor="accepte-conditions" className="text-sm cursor-pointer">
                    Je confirme l'exactitude des informations fournies et autorise votre agence à transmettre mon dossier à la régie concernée.
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter className="flex-shrink-0 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setCandidatureDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={confirmCandidature} 
                disabled={!accepteConditions || uploadingDocs}
                className="shadow-lg shadow-primary/20"
              >
                {uploadingDocs ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Déposer ma candidature
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de délégation */}
        <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                  <User className="h-5 w-5 text-emerald-500" />
                </div>
                Déléguer la visite à votre agent
              </DialogTitle>
              <DialogDescription>
                Votre agent effectuera la visite pour vous et vous fera un compte-rendu
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/20">
                  <h4 className="font-semibold text-sm">{selectedOffre.adresse}</h4>
                  <p className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mt-1">CHF {selectedOffre.prix.toLocaleString()}/mois</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Choisissez une date pour la visite</Label>
                  
                  {delegateProposedSlots.length === 0 ? (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10 rounded-xl text-center border border-emerald-200 dark:border-emerald-800/50">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          Aucun créneau proposé
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Votre agent organisera la visite à sa convenance et vous tiendra informé du créneau choisi.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {delegateProposedSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={delegateDate === slot.date_visite ? "default" : "outline"}
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => setDelegateDate(slot.date_visite)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold">
                                {new Date(slot.date_visite).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {new Date(slot.date_visite).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                            {delegateDate === slot.date_visite && (
                              <CheckCircle className="h-5 w-5 text-primary-foreground flex-shrink-0" />
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {delegateDate && (
                    <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
                      <p className="text-sm font-medium">✅ Date sélectionnée :</p>
                      <p className="text-sm mt-1">
                        <strong>
                          {new Date(delegateDate).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </strong>
                        {' à '}
                        <strong>
                          {new Date(delegateDate).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50/80 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>📋 Comment ça marche :</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Votre agent sera notifié de votre demande</li>
                      <li>Il confirmera la visite à la date choisie</li>
                      <li>Il effectuera la visite et vous fera un compte-rendu</li>
                      <li>Vous pourrez ensuite décider de postuler ou non</li>
                    </ul>
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex-shrink-0 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={confirmDeleguerVisite} 
                disabled={delegateProposedSlots.length === 0 ? false : !delegateDate}
              >
                {delegateProposedSlots.length === 0 ? 'Demander à mon agent' : 'Confirmer la délégation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Visite Requise */}
        <Dialog open={visitRequiredAlertOpen} onOpenChange={setVisitRequiredAlertOpen}>
          <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                  <Info className="h-5 w-5 text-amber-500" />
                </div>
                Visite obligatoire
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>Aucune régie propriétaire ne considérera votre dossier avant d'avoir visité l'appartement.</strong>
              </p>
              <p className="text-sm">
                Merci de visiter ce bien vous-même ou de déléguer la visite à votre agent avant de postuler.
              </p>
              <p className="text-sm text-muted-foreground">
                Après la visite, vous pourrez revenir ici pour demander à votre agent de postuler pour vous.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setVisitRequiredAlertOpen(false)}>
                Fermer
              </Button>
              <Button 
                variant="secondary"
                onClick={() => { 
                  setVisitRequiredAlertOpen(false);
                  if (selectedOffre) handleDeleguerVisite(selectedOffre);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                Je délègue à mon agent
              </Button>
              <Button onClick={() => {
                setVisitRequiredAlertOpen(false);
                if (selectedOffre) handlePlanVisit(selectedOffre);
              }}>
                <Calendar className="mr-2 h-4 w-4" />
                Je visite moi-même
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OffresRecues;
