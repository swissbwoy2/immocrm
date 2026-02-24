import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Square, Home, Eye, Heart, CheckCircle, Info, FileCheck, Check, X, Upload, User, Clock, FolderOpen, MessageSquare, Sparkles, Building2, Star, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { PremiumOffreDetailsDialog } from "@/components/premium/PremiumOffreDetailsDialog";

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

  // Auto-open offer details from query param
  useEffect(() => {
    const offreId = searchParams.get('offre');
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
        .order('date_envoi', { ascending: false });

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
        .eq('client_id', clientData.id);

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

      // Créer une demande de postulation (pas une candidature déposée)
      // Le statut de l'offre reste inchangé jusqu'à ce que l'agent envoie le dossier
      await supabase.from('candidatures').insert({
        offre_id: offre.id,
        client_id: clientData.id,
        statut: 'demande_postulation',
        message_client: 'Le client demande l\'aide de l\'agent pour postuler à ce bien.',
        dossier_complet: false
      });

      // NE PAS modifier le statut de l'offre ici !
      // L'offre reste à son statut actuel jusqu'à ce que l'agent envoie réellement le dossier

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

      await loadOffres();
      refreshData();

      toast({
        title: '✅ Demande envoyée',
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

      await supabase.from('candidatures').insert({
        offre_id: selectedOffre.id,
        client_id: clientData.id,
        message_client: messageClient,
        dossier_complet: true,
        statut: 'candidature_deposee'
      });

      await supabase
        .from('offres')
        .update({ statut: 'candidature_deposee' })
        .eq('id', selectedOffre.id);

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
        title: '🎉 Candidature déposée avec succès !',
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

  // Premium loading state
  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          {/* Header skeleton */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
          
          {/* Cards skeleton */}
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <OffreSkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="p-4 md:p-8 relative z-10">
        <PremiumPageHeader
          title="Offres Reçues"
          subtitle="Découvrez les biens sélectionnés pour vous"
          icon={Home}
          badge="Immobilier"
          action={
            offres.length > 0 ? (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className="px-4 py-2 text-sm bg-gradient-to-r from-primary/20 to-primary/5 border-primary/20 shadow-lg shadow-primary/5"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <AnimatedValue value={offres.length} /> offre{offres.length > 1 ? 's' : ''} disponible{offres.length > 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {offres.filter(o => o.statut === 'interesse').length} intéressantes
                </Badge>
              </div>
            ) : null
          }
        />

        {offres.length === 0 ? (
          /* Premium Empty State */
          <Card className="relative overflow-hidden p-12 text-center border-dashed animate-fade-in group">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative max-w-md mx-auto space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 shadow-xl shadow-primary/10">
                  <Home className="w-12 h-12 text-primary/60 animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Aucune offre pour le moment
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Votre agent recherche activement les biens qui correspondent à vos critères. Vous serez notifié dès qu'une nouvelle offre sera disponible.
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Zap className="w-4 h-4 animate-pulse" />
                <span>Recherche en cours...</span>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {offres.map((offre, index) => {
              const { label, variant } = formatStatutOffre(offre.statut);
              
              return (
                <Card 
                  key={offre.id} 
                  className={cn(
                    "group relative overflow-hidden cursor-pointer transition-all duration-500",
                    "bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm",
                    "border border-border/50 hover:border-primary/40",
                    "hover:shadow-2xl hover:shadow-primary/10",
                    "animate-fade-in"
                  )}
                  onClick={() => handleViewDetails(offre)}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Animated gradient border effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-lg" />
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>

                  {/* Status indicator line */}
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full transition-all duration-300",
                    offre.statut === 'interesse' && "bg-green-500",
                    offre.statut === 'visite_planifiee' && "bg-blue-500",
                    offre.statut === 'visite_effectuee' && "bg-emerald-500",
                    offre.statut === 'candidature_deposee' && "bg-purple-500",
                    offre.statut === 'acceptee' && "bg-yellow-500",
                    offre.statut === 'refusee' && "bg-red-500",
                    !['interesse', 'visite_planifiee', 'visite_effectuee', 'candidature_deposee', 'acceptee', 'refusee'].includes(offre.statut) && "bg-muted-foreground/30"
                  )} />

                  <div className="relative z-10 p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold group-hover:text-primary transition-colors duration-300">
                            {offre.adresse}
                          </h3>
                          <Badge 
                            variant={variant} 
                            className="shadow-sm transition-transform duration-300 group-hover:scale-105"
                          >
                            {label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 opacity-80">
                            <Calendar className="h-4 w-4" />
                            Reçue le {new Date(offre.date_envoi).toLocaleDateString('fr-FR')}
                          </div>
                          
                          {offre.agent?.profile && (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                <span className="text-xs font-semibold text-primary">
                                  {offre.agent.profile.prenom[0]}{offre.agent.profile.nom[0]}
                                </span>
                              </div>
                              <span className="text-sm">
                                Par <strong className="text-foreground">{offre.agent.profile.prenom}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                          CHF <AnimatedValue value={offre.prix} />
                        </p>
                        <p className="text-sm text-muted-foreground">par mois</p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {[
                        { icon: Home, label: 'Pièces', value: offre.pieces, color: 'from-blue-500/20 to-blue-500/5' },
                        { icon: Square, label: 'Surface', value: `${offre.surface} m²`, color: 'from-emerald-500/20 to-emerald-500/5' },
                        { icon: MapPin, label: 'Étage', value: offre.etage, color: 'from-amber-500/20 to-amber-500/5' }
                      ].map((stat, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "relative overflow-hidden p-2 sm:p-3 rounded-xl",
                            "bg-gradient-to-br", stat.color,
                            "border border-border/30",
                            "transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                          )}
                        >
                          <div className="flex flex-col items-center text-center gap-1">
                            <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm">
                              <stat.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                              <p className="text-sm font-semibold">{stat.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <p className="text-sm mb-4 line-clamp-2 text-muted-foreground leading-relaxed">
                      {offre.description}
                    </p>

                    {offre.disponibilite && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-2 rounded-lg bg-muted/30 w-fit">
                        <Clock className="h-4 w-4 text-primary/70" />
                        <span>Disponible dès le <strong>{offre.disponibilite}</strong></span>
                      </div>
                    )}

                    {/* Chance Indicator */}
                    {(offre.statut === 'interesse' || offre.statut === 'visite_planifiee' || 
                      offre.statut === 'visite_effectuee' || offre.statut === 'candidature_deposee') && (
                      <div className="mb-5 p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30">
                        <ChanceIndicator
                          {...calculateChances(
                            offre,
                            clientData,
                            documentsStats[offre.id] || documentsStats['global'] || {
                              fiche_salaire: 0,
                              extrait_poursuites: 0,
                              piece_identite: 0,
                              permis_sejour: 0
                            },
                            visites
                          )}
                          compact
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap pt-5 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group/btn"
                        onClick={() => handleViewDetails(offre)}
                      >
                        <Info className="mr-2 h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
                        Voir les détails
                        <ArrowRight className="ml-1 h-3 w-3 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                      </Button>
                      
                      {offre.lien_annonce && (
                        <LinkPreviewCard url={offre.lien_annonce} />
                      )}
                      
                      {(offre.statut === 'envoyee' || offre.statut === 'vue' || offre.statut === 'interesse') && (
                        <>
                          <Button 
                            size="sm" 
                            className="group/btn"
                            onClick={() => handlePlanVisit(offre)}
                          >
                            <Calendar className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            Planifier une visite
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="group/btn hover:border-primary/50"
                            onClick={() => handleDeleguerVisite(offre)}
                          >
                            <User className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            Déléguer à l'agent
                          </Button>
                          {offre.statut !== 'interesse' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-600 group/btn"
                                onClick={() => updateStatut(offre.id, 'interesse')}
                              >
                                <Heart className="mr-2 h-4 w-4 group-hover/btn:scale-125 group-hover/btn:text-green-500 transition-all" />
                                Intéressé
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive group/btn"
                                onClick={() => updateStatut(offre.id, 'refusee')}
                              >
                                <X className="mr-2 h-4 w-4 group-hover/btn:rotate-90 transition-transform" />
                                Refuser
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {offre.statut === 'visite_planifiee' && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 group/btn"
                          onClick={() => updateStatut(offre.id, 'visite_effectuee')}
                        >
                          <Check className="mr-2 h-4 w-4 group-hover/btn:scale-125 transition-transform" />
                          Marquer visite effectuée
                        </Button>
                      )}
                      {offre.statut === 'visite_effectuee' && (
                        <>
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 group/btn"
                            onClick={() => handlePostulerDirect(offre)}
                          >
                            <FileCheck className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            Déposer ma candidature
                            <Sparkles className="ml-1 h-3 w-3 animate-pulse" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="hover:border-primary/50"
                            onClick={() => updateStatut(offre.id, 'interesse')}
                          >
                            <Heart className="mr-2 h-4 w-4" />
                            Intéressé
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                            onClick={() => updateStatut(offre.id, 'refusee')}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Refuser
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
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
          onPlanVisit={handlePlanVisit}
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
                Planifier une visite
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
                Déléguer à l'agent
              </Button>
              <Button onClick={() => {
                setVisitRequiredAlertOpen(false);
                if (selectedOffre) handlePlanVisit(selectedOffre);
              }}>
                <Calendar className="mr-2 h-4 w-4" />
                Planifier une visite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OffresRecues;
