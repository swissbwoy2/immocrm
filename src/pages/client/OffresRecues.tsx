import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Square, Home, ExternalLink, Eye, Heart, CheckCircle, Info, FileCheck, Check, X, Upload, User, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateChances } from "@/utils/chanceCalculator";
import { ChanceIndicator } from "@/components/ChanceIndicator";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const OffresRecues = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
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
  
  const [clientData, setClientData] = useState<any>(null);
  const [visites, setVisites] = useState<any[]>([]);
  const [documentsStats, setDocumentsStats] = useState<any>({});
  const [proposedSlots, setProposedSlots] = useState<any[]>([]);

  useEffect(() => {
    loadOffres();
    loadClientData();
    loadVisites();
    loadDocumentsStats();
    // Mark new_offer notifications as read when visiting this page
    markTypeAsRead('new_offer');
  }, [user]);

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

      // Compter les documents par offre
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

  // Rafraîchir les données après upload
  const refreshData = () => {
    loadDocumentsStats();
    loadVisites();
  };

  const updateStatut = async (offreId: string, newStatut: string) => {
    // Si c'est une visite planifiée, ouvrir le dialog de sélection de date
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

      // Créer un message automatique pour notifier l'agent
      if (newStatut === 'interesse' || newStatut === 'refusee') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, agent_id, user_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (clientData?.agent_id) {
          // Trouver ou créer une conversation
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
              });
          }
        }
      }

      // NE PLUS créer automatiquement de visite ici - c'est fait dans confirmVisit()

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
      'candidature_deposee': { label: '📝 Candidature déposée', variant: 'default' },
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
    setCandidatureDialogOpen(true);
  };

  const handleDeleguerVisite = async (offre: any) => {
    setSelectedOffre(offre);
    setDelegateDate("");
    
    // Charger les créneaux proposés par l'agent pour cette offre
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
    
    if (!delegateDate) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une date et heure pour la visite',
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

      // Créer une visite déléguée avec la date sélectionnée
      await supabase.from('visites').insert({
        offre_id: selectedOffre.id,
        client_id: clientData.id,
        agent_id: clientData.agent_id,
        adresse: selectedOffre.adresse,
        date_visite: delegateDate,
        statut: 'planifiee',
        est_deleguee: true,
        notes: 'Visite déléguée à l\'agent par le client'
      });

      // Marquer l'offre comme intéressée
      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', selectedOffre.id);

      // Notifier l'agent
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
        
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          sender_type: 'client',
          content: `🏠 **Demande de visite déléguée à l'agent**\n\n📍 Adresse: ${selectedOffre.adresse}\n💰 Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n📅 Date souhaitée: ${formattedDate} à ${formattedTime}\n\nLe client souhaite que vous effectuiez la visite pour lui à cette date.`
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

      // 1. Créer une candidature avec dossier_complet: false
      await supabase.from('candidatures').insert({
        offre_id: offre.id,
        client_id: clientData.id,
        message_client: 'Le client demande l\'aide de l\'agent pour postuler à ce bien.',
        dossier_complet: false
      });

      // 2. Marquer l'offre comme candidature en cours
      await supabase
        .from('offres')
        .update({ statut: 'candidature_deposee' })
        .eq('id', offre.id);

      // 3. Notifier l'agent via messagerie
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
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user!.id,
            sender_type: 'client',
            content: `🆘 **DEMANDE D'AIDE POUR POSTULATION**\n\n🏠 **Bien concerné:**\n- Adresse: ${offre.adresse}\n- Loyer: ${offre.prix.toLocaleString()} CHF/mois\n- Type: ${offre.type_bien || 'N/A'}\n\n💼 **Le client souhaite que vous postuliez pour lui à ce bien.**\n\nMerci de prendre en charge la postulation avec les documents du client disponibles dans son dossier.`
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

    if (documentsFicheSalaire.length !== 3) {
      toast({
        title: 'Documents manquants',
        description: 'Vous devez fournir vos 3 dernières fiches de salaire',
        variant: 'destructive'
      });
      return;
    }

    if (!documentExtraitPoursuites) {
      toast({
        title: 'Document manquant',
        description: 'Vous devez fournir un extrait de l\'office des poursuites',
        variant: 'destructive'
      });
      return;
    }

    if (!documentPieceIdentite) {
      toast({
        title: 'Document manquant',
        description: 'Vous devez fournir une pièce d\'identité valable',
        variant: 'destructive'
      });
      return;
    }

    setUploadingDocs(true);

    try {
      const salaireUploads = await Promise.all(
        documentsFicheSalaire.map(file =>
          uploadDocument(file, 'fiche_salaire', selectedOffre.id)
        )
      );

      const extraitPath = await uploadDocument(
        documentExtraitPoursuites,
        'extrait_poursuites',
        selectedOffre.id
      );

      const identitePath = await uploadDocument(
        documentPieceIdentite,
        'piece_identite',
        selectedOffre.id
      );

      if (!salaireUploads.every(p => p) || !extraitPath || !identitePath) {
        throw new Error('Échec de l\'upload de certains documents');
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
        dossier_complet: true
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
            content: messageContent
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
    
    // Charger les créneaux proposés par l'agent pour cette offre
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

      // Créer la visite avec la date sélectionnée
      await supabase
        .from('visites')
        .insert({
          offre_id: selectedOffre.id,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          date_visite: selectedDate,
          adresse: selectedOffre.adresse,
          statut: 'planifiee',
          notes: 'Visite demandée par le client',
        });

      // Mettre à jour le statut de l'offre
      await supabase
        .from('offres')
        .update({ statut: 'visite_planifiee', updated_at: new Date().toISOString() })
        .eq('id', selectedOffre.id);

      // Notifier l'agent
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
          });
      }

      setOffres(offres.map(o => o.id === selectedOffre.id ? { ...o, statut: 'visite_planifiee' } : o));
      setVisitDialogOpen(false);
      toast({ 
        title: "✅ Visite planifiée", 
        description: `Rendez-vous confirmé le ${new Date(selectedDate).toLocaleDateString('fr-FR')} à ${new Date(selectedDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Votre agent a été notifié.`
      });
      
      // Rafraîchir la liste des offres
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Offres Reçues</h1>
          <p className="text-muted-foreground">Consultez les biens qui vous sont proposés</p>
        </div>

        <div className="grid gap-6">
          {offres.map((offre) => {
            const { label, variant } = formatStatutOffre(offre.statut);
            
            return (
              <Card 
                key={offre.id} 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewDetails(offre)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{offre.adresse}</h3>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Reçue le {new Date(offre.date_envoi).toLocaleDateString('fr-FR')}
                      </div>
                      
                      {offre.agent?.profile && (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {offre.agent.profile.prenom[0]}{offre.agent.profile.nom[0]}
                            </span>
                          </div>
                          <span className="text-sm">
                            Envoyée par <strong>{offre.agent.profile.prenom} {offre.agent.profile.nom}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">CHF {offre.prix.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">par mois</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{offre.pieces} pièces</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{offre.surface} m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{offre.etage} étage</span>
                  </div>
                </div>

                <p className="text-sm mb-4 line-clamp-2">{offre.description}</p>

                {offre.disponibilite && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Disponible dès le {offre.disponibilite}
                  </p>
                )}

                {/* Indicateur de chances */}
                {(offre.statut === 'interesse' || offre.statut === 'visite_planifiee' || 
                  offre.statut === 'visite_effectuee' || offre.statut === 'candidature_deposee') && (
                  <div className="mb-4">
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

                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <Button variant="default" size="sm" onClick={() => handleViewDetails(offre)}>
                    <Info className="mr-2 h-4 w-4" />
                    Voir les détails
                  </Button>
                  {offre.lien_annonce && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={offre.lien_annonce} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir l'annonce
                      </a>
                    </Button>
                  )}
                  {(offre.statut === 'envoyee' || offre.statut === 'vue' || offre.statut === 'interesse') && (
                    <>
                      <Button size="sm" onClick={() => handlePlanVisit(offre)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Planifier une visite
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleguerVisite(offre)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Déléguer à l'agent
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handlePostulerDirect(offre)}>
                        <User className="mr-2 h-4 w-4" />
                        Demander aide agent
                      </Button>
                      {offre.statut !== 'interesse' && (
                        <>
                          <Button size="sm" onClick={() => updateStatut(offre.id, 'interesse')}>
                            <Heart className="mr-2 h-4 w-4" />
                            Intéressé
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatut(offre.id, 'refusee')}>
                            <X className="mr-2 h-4 w-4" />
                            Refuser
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {offre.statut === 'visite_planifiee' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'visite_effectuee')}>
                      <Check className="mr-2 h-4 w-4" />
                      Marquer la visite comme effectuée
                    </Button>
                  )}
                  {offre.statut === 'visite_effectuee' && (
                    <>
                      <Button size="sm" onClick={() => handleDeposerCandidature(offre)}>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Déposer ma candidature
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatut(offre.id, 'interesse')}>
                        <Heart className="mr-2 h-4 w-4" />
                        Marquer comme intéressé
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatut(offre.id, 'refusee')}>
                        <X className="mr-2 h-4 w-4" />
                        Refuser
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Dialog des détails */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Détails de l'offre</DialogTitle>
              <DialogDescription>
                Informations complètes sur le bien proposé
              </DialogDescription>
            </DialogHeader>
            
            {selectedOffre && (
              <div className="space-y-6">
                {/* En-tête */}
                <div className="border-b pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedOffre.adresse}</h3>
                      <Badge variant={formatStatutOffre(selectedOffre.statut).variant} className="mt-2">
                        {formatStatutOffre(selectedOffre.statut).label}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">CHF {selectedOffre.prix.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">par mois</p>
                    </div>
                  </div>
                </div>

                {/* Caractéristiques principales */}
                <div>
                  <h4 className="font-semibold mb-3">📋 Caractéristiques</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pièces</p>
                        <p className="font-medium">{selectedOffre.pieces}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Surface</p>
                        <p className="font-medium">{selectedOffre.surface} m²</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Étage</p>
                        <p className="font-medium">{selectedOffre.etage}</p>
                      </div>
                    </div>
                    {selectedOffre.type_bien && (
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="font-medium">{selectedOffre.type_bien}</p>
                        </div>
                      </div>
                    )}
                    {selectedOffre.disponibilite && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Disponibilité</p>
                          <p className="font-medium">{selectedOffre.disponibilite}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedOffre.description && (
                  <div>
                    <h4 className="font-semibold mb-2">📝 Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedOffre.description}</p>
                  </div>
                )}

                {/* Informations pratiques */}
                {(selectedOffre.code_immeuble || selectedOffre.concierge_nom || selectedOffre.locataire_nom) && (
                  <div>
                    <h4 className="font-semibold mb-3">🏢 Informations pratiques</h4>
                    <div className="space-y-2">
                      {selectedOffre.code_immeuble && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Code immeuble</span>
                          <span className="text-sm font-medium">{selectedOffre.code_immeuble}</span>
                        </div>
                      )}
                      {selectedOffre.concierge_nom && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Concierge</span>
                          <span className="text-sm font-medium">
                            {selectedOffre.concierge_nom}
                            {selectedOffre.concierge_tel && ` - ${selectedOffre.concierge_tel}`}
                          </span>
                        </div>
                      )}
                      {selectedOffre.locataire_nom && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Locataire actuel</span>
                          <span className="text-sm font-medium">
                            {selectedOffre.locataire_nom}
                            {selectedOffre.locataire_tel && ` - ${selectedOffre.locataire_tel}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Indicateur de chances détaillé */}
                {(selectedOffre.statut === 'interesse' || selectedOffre.statut === 'visite_planifiee' || 
                  selectedOffre.statut === 'visite_effectuee' || selectedOffre.statut === 'candidature_deposee') && (
                  <ChanceIndicator
                    {...calculateChances(
                      selectedOffre,
                      clientData,
                      documentsStats[selectedOffre.id] || documentsStats['global'] || {
                        fiche_salaire: 0,
                        extrait_poursuites: 0,
                        piece_identite: 0,
                        permis_sejour: 0
                      },
                      visites
                    )}
                  />
                )}

                {/* Section Agent */}
                {selectedOffre.agent?.profile && (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      👤 Votre agent
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {selectedOffre.agent.profile.prenom[0]}{selectedOffre.agent.profile.nom[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {selectedOffre.agent.profile.prenom} {selectedOffre.agent.profile.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">Agent immobilier</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${selectedOffre.agent.profile.email}`}>
                            📧 {selectedOffre.agent.profile.email}
                          </a>
                        </Button>
                        {selectedOffre.agent.profile.telephone && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${selectedOffre.agent.profile.telephone}`}>
                              📞 {selectedOffre.agent.profile.telephone}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Commentaires de l'agent */}
                {selectedOffre.commentaires && (
                  <div>
                    <h4 className="font-semibold mb-2">💬 Commentaires de votre agent</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedOffre.commentaires}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-4 border-t">
                  {selectedOffre.lien_annonce && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedOffre.lien_annonce} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir l'annonce
                      </a>
                    </Button>
                  )}
                  {(selectedOffre.statut === 'envoyee' || selectedOffre.statut === 'vue') && (
                    <>
                      <Button size="sm" onClick={() => { handlePlanVisit(selectedOffre); setDetailsDialogOpen(false); }}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Visiter ce bien
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { updateStatut(selectedOffre.id, 'refusee'); setDetailsDialogOpen(false); }}>
                        <X className="mr-2 h-4 w-4" />
                        Refuser
                      </Button>
                    </>
                  )}
                  {selectedOffre.statut === 'visite_planifiee' && (
                    <Button size="sm" onClick={() => { updateStatut(selectedOffre.id, 'visite_effectuee'); setDetailsDialogOpen(false); }}>
                      <Check className="mr-2 h-4 w-4" />
                      Marquer la visite comme effectuée
                    </Button>
                  )}
                  {selectedOffre.statut === 'visite_effectuee' && (
                    <Button size="sm" onClick={() => { handleDeposerCandidature(selectedOffre); setDetailsDialogOpen(false); }}>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Déposer ma candidature
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de planification de visite */}
        <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Planifier une visite</DialogTitle>
              <DialogDescription>
                Sélectionnez un créneau proposé par votre agent
              </DialogDescription>
            </DialogHeader>
            
            {selectedOffre && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">{selectedOffre.adresse}</h4>
                  <p className="text-2xl font-bold text-primary">CHF {selectedOffre.prix.toLocaleString()}/mois</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    {proposedSlots.length > 0 
                      ? "Choisissez un créneau proposé par votre agent" 
                      : "Aucun créneau proposé"}
                  </Label>
                  
                  {proposedSlots.length === 0 ? (
                    <div className="p-6 bg-muted rounded-lg text-center space-y-3">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Votre agent n'a pas encore proposé de créneaux de visite pour cette offre.
                      </p>
                      <Button 
                        variant="default"
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setVisitDialogOpen(false);
                          handleDeleguerVisite(selectedOffre);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Demander à l'agent d'organiser
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {proposedSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={selectedDate === slot.date_visite ? "default" : "outline"}
                          className="w-full justify-start text-left h-auto py-4"
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
                    <div className="text-xs text-muted-foreground pt-3 border-t space-y-2">
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
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-1">✅ Créneau sélectionné :</p>
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
              <Button onClick={confirmVisit} disabled={!selectedDate}>
                Confirmer la visite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de candidature */}
        <Dialog open={candidatureDialogOpen} onOpenChange={setCandidatureDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📝 Déposer ma candidature</DialogTitle>
              <DialogDescription>
                Complétez votre candidature en fournissant tous les documents requis
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-6 py-4">
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2">Bien concerné</h4>
                    <p className="text-sm">{selectedOffre.adresse}</p>
                    <p className="text-lg font-bold text-primary mt-1">
                      CHF {selectedOffre.prix.toLocaleString()}/mois
                    </p>
                  </CardContent>
                </Card>

                {selectedOffre.statut !== 'visite_effectuee' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      ⚠️ <strong>Important :</strong> Une visite du bien sera obligatoire avant la validation finale de votre candidature. Vous ou votre agent devrez effectuer cette visite pour confirmer votre intérêt.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold">Documents à fournir (obligatoires)</h4>

                  <div className="border rounded-lg p-4">
                    <Label className="text-base font-medium">
                      📄 3 dernières fiches de salaire *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Vos 3 derniers bulletins de salaire
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

                  <div className="border rounded-lg p-4">
                    <Label className="text-base font-medium">
                      📋 Extrait de l'office des poursuites *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Datant de moins de 3 mois
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentExtraitPoursuites(file);
                        }}
                      />
                      {documentExtraitPoursuites && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <Label className="text-base font-medium">
                      🪪 Pièce d'identité / ID suisse *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Document valable (carte identité, passeport, permis de séjour)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentPieceIdentite(file);
                        }}
                      />
                      {documentPieceIdentite && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message / Motivation (optionnel)</Label>
                  <Textarea
                    placeholder="Présentez-vous et expliquez pourquoi ce bien vous intéresse..."
                    value={messageClient}
                    onChange={(e) => setMessageClient(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
                  <Checkbox
                    id="conditions"
                    checked={accepteConditions}
                    onCheckedChange={(checked) => setAccepteConditions(checked as boolean)}
                  />
                  <Label htmlFor="conditions" className="text-sm cursor-pointer">
                    Je confirme que tous les documents fournis sont authentiques et à jour.
                    Je comprends que mon dossier sera examiné par l'agent et le propriétaire.
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCandidatureDialogOpen(false)}
                disabled={uploadingDocs}
              >
                Annuler
              </Button>
              <Button
                onClick={confirmCandidature}
                disabled={uploadingDocs || !accepteConditions}
              >
                {uploadingDocs ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
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

        {/* Dialog de délégation de visite */}
        <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Déléguer la visite à votre agent</DialogTitle>
              <DialogDescription>
                Choisissez une date et votre agent effectuera la visite pour vous
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Bien concerné</h4>
                  <p className="text-sm">{selectedOffre.adresse}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    CHF {selectedOffre.prix.toLocaleString()}/mois
                  </p>
                </div>

                {/* Sélection de date/heure */}
                <div className="space-y-3">
                  <h4 className="font-semibold">📅 Choisissez une date de visite</h4>
                  
                  {delegateProposedSlots.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Aucun créneau proposé par l'agent. Veuillez choisir une date :
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="delegateDate">Date</Label>
                          <Input
                            id="delegateDate"
                            type="date"
                            value={delegateDate ? delegateDate.split('T')[0] : ''}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              const time = delegateDate ? delegateDate.split('T')[1]?.slice(0, 5) : '10:00';
                              setDelegateDate(`${e.target.value}T${time}:00`);
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="delegateTime">Heure</Label>
                          <Input
                            id="delegateTime"
                            type="time"
                            value={delegateDate ? delegateDate.split('T')[1]?.slice(0, 5) : '10:00'}
                            onChange={(e) => {
                              const date = delegateDate ? delegateDate.split('T')[0] : new Date().toISOString().split('T')[0];
                              setDelegateDate(`${date}T${e.target.value}:00`);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Créneaux proposés par l'agent :
                      </p>
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
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
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

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={confirmDeleguerVisite} disabled={!delegateDate}>
                Confirmer la délégation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OffresRecues;