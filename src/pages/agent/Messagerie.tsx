import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Send, Search, Users, Shield, Home, ExternalLink, 
  Check, X, Clock, FileSignature, Key, Calendar, Plus, Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageAttachmentUploader } from "@/components/MessageAttachmentUploader";
import { MessageAttachment } from "@/components/MessageAttachment";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { AgentNewAdminConversationDialog } from "@/components/AgentNewAdminConversationDialog";
import { parseMessageWithLinks } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { MessagingLayout } from "@/components/MessagingLayout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const Messagerie = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [offresMap, setOffresMap] = useState<Record<string, any>>({});
  const [candidaturesMap, setCandidaturesMap] = useState<Record<string, any>>({});
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [contactsMap, setContactsMap] = useState<Record<string, { name: string; type: string; clientId?: string }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);

  // Dialog states
  const [signatureDatesDialogOpen, setSignatureDatesDialogOpen] = useState(false);
  const [etatLieuxDialogOpen, setEtatLieuxDialogOpen] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<any>(null);
  const [selectedOffre, setSelectedOffre] = useState<any>(null);
  const [signatureDates, setSignatureDates] = useState<{date: string, lieu: string}[]>([
    { date: "", lieu: "Chemin de l'Esparcette 5, 1023 Crissier" }
  ]);
  const [etatLieuxDate, setEtatLieuxDate] = useState("");
  const [etatLieuxHeure, setEtatLieuxHeure] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    loadAgentAndConversations();
    markTypeAsRead('new_message');
  }, [user]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConv]);

  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConv}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv]);

  const loadAgentAndConversations = async () => {
    if (!user) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;
      
      const agentIdStr = agentData.id;
      setAgentId(agentIdStr);

      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentIdStr)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setConversations(convData || []);

      const clientIds = convData?.filter(c => c.client_id).map(c => c.client_id) || [];
      const adminUserIds = convData?.filter(c => c.admin_user_id).map(c => c.admin_user_id) || [];
      
      const contactsMapping: Record<string, { name: string; type: string; clientId?: string }> = {};

      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, user_id')
          .in('id', clientIds);

        const userIds = clientsData?.map(c => c.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        
        clientsData?.forEach(client => {
          const profile = profilesMap.get(client.user_id);
          const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim();
          contactsMapping[client.id] = { name: fullName || 'Inconnu', type: 'client', clientId: client.id };
        });
      }

      if (adminUserIds.length > 0) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', adminUserIds);

        adminProfiles?.forEach(profile => {
          const fullName = `${profile.prenom || ''} ${profile.nom || ''}`.trim();
          contactsMapping[profile.id] = { name: fullName || 'Admin', type: 'admin' };
        });
      }

      setContactsMap(contactsMapping);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les conversations",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, offres(*)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Build offers map
      const offresMapping: Record<string, any> = {};
      const offreIds: string[] = [];
      data?.forEach(msg => {
        if (msg.offre_id && msg.offres) {
          offresMapping[msg.offre_id] = msg.offres;
          offreIds.push(msg.offre_id);
        }
      });
      setOffresMap(offresMapping);

      // Load candidatures for these offers
      if (offreIds.length > 0) {
        const conversation = conversations.find(c => c.id === convId);
        if (conversation?.client_id) {
          const { data: candidaturesData } = await supabase
            .from('candidatures')
            .select('*')
            .in('offre_id', offreIds)
            .eq('client_id', conversation.client_id);

          const candidaturesMapping: Record<string, any> = {};
          candidaturesData?.forEach(c => {
            candidaturesMapping[c.offre_id] = c;
          });
          setCandidaturesMap(candidaturesMapping);
        }
      }

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .neq('sender_type', 'agent');
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !pendingAttachment) || !selectedConv || !user || !agentId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'agent',
          content: messageText || null,
          attachment_url: pendingAttachment?.url || null,
          attachment_type: pendingAttachment?.type || null,
          attachment_name: pendingAttachment?.name || null,
          attachment_size: pendingAttachment?.size || null,
        });

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv);

      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', user.id)
        .single();

      const agentName = agentProfile 
        ? `${agentProfile.prenom} ${agentProfile.nom}`.trim() 
        : 'Votre agent';

      const conversation = conversations.find(c => c.id === selectedConv);
      if (conversation) {
        if (conversation.conversation_type === 'admin-agent' && conversation.admin_user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: conversation.admin_user_id,
            p_type: 'new_message',
            p_title: 'Nouveau message agent',
            p_message: `${agentName} vous a envoyé un message`,
            p_link: '/admin/messagerie',
            p_metadata: { conversation_id: selectedConv }
          });
        } else if (conversation.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('user_id')
            .eq('id', conversation.client_id)
            .single();

          if (clientData) {
            await supabase.rpc('create_notification', {
              p_user_id: clientData.user_id,
              p_type: 'new_message',
              p_title: 'Nouveau message',
              p_message: `${agentName} vous a envoyé un message`,
              p_link: '/client/messagerie',
              p_metadata: { conversation_id: selectedConv }
            });
          }
        }
      }

      setMessageText("");
      setPendingAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  // Handle agent actions on offers/candidatures
  const handleOffreAction = async (offreId: string, action: string, data?: any) => {
    if (!user || !agentId) return;

    const offre = offresMap[offreId];
    const candidature = candidaturesMap[offreId];
    const conversation = conversations.find(c => c.id === selectedConv);

    try {
      // Get client info for notifications
      let clientUserId: string | null = null;
      let clientName = 'Le client';
      
      if (conversation?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('user_id')
          .eq('id', conversation.client_id)
          .single();
        
        if (clientData) {
          clientUserId = clientData.user_id;
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('prenom, nom')
            .eq('id', clientData.user_id)
            .single();
          
          if (clientProfile) {
            clientName = `${clientProfile.prenom} ${clientProfile.nom}`.trim();
          }
        }
      }

      switch (action) {
        case 'accepter_candidature':
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ statut: 'acceptee' })
              .eq('id', candidature.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `🎉 **Bonne nouvelle !** Votre candidature pour ${offre.adresse} a été acceptée par la régie ! Confirmez que vous souhaitez conclure le bail.`,
              offre_id: offreId
            });

            toast({ title: "Candidature acceptée" });
          }
          break;

        case 'refuser_candidature':
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ statut: 'refusee' })
              .eq('id', candidature.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `❌ Malheureusement, votre candidature pour ${offre.adresse} n'a pas été retenue par la régie. Nous continuons à chercher le bien idéal pour vous !`,
              offre_id: offreId
            });

            toast({ title: "Candidature refusée" });
          }
          break;

        case 'valider_regie':
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ 
                agent_valide_regie: true,
                agent_valide_regie_at: new Date().toISOString(),
                statut: 'attente_bail'
              })
              .eq('id', candidature.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `✅ J'ai transmis votre dossier à la régie pour ${offre.adresse}. Nous attendons maintenant le bail.`,
              offre_id: offreId
            });

            toast({ title: "Validation régie confirmée" });
          }
          break;

        case 'bail_recu':
          setSelectedCandidature(candidature);
          setSelectedOffre(offre);
          setSignatureDates([{ date: "", lieu: "Chemin de l'Esparcette 5, 1023 Crissier" }]);
          setSignatureDatesDialogOpen(true);
          return;

        case 'confirmer_signature':
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ 
                signature_effectuee: true,
                signature_effectuee_at: new Date().toISOString(),
                statut: 'signature_effectuee'
              })
              .eq('id', candidature.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `✅ **Bail signé !** Le bail pour ${offre.adresse} est maintenant signé. Nous allons fixer la date de l'état des lieux.`,
              offre_id: offreId
            });

            toast({ title: "Signature confirmée" });
          }
          break;

        case 'fixer_etat_lieux':
          setSelectedCandidature(candidature);
          setSelectedOffre(offre);
          setEtatLieuxDate("");
          setEtatLieuxHeure("");
          setEtatLieuxDialogOpen(true);
          return;

        case 'remettre_cles':
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ 
                cles_remises: true,
                cles_remises_at: new Date().toISOString(),
                statut: 'cles_remises'
              })
              .eq('id', candidature.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `🔑🎉 **Félicitations !** Les clés de ${offre.adresse} vous ont été remises. Bienvenue chez vous ! N'hésitez pas à nous laisser un avis Google et à nous recommander !`,
              offre_id: offreId
            });

            toast({ title: "Clés remises - Affaire conclue !" });
          }
          break;

        case 'confirmer_visite_deleguee':
          const { data: visite } = await supabase
            .from('visites')
            .select('*')
            .eq('offre_id', offreId)
            .eq('est_deleguee', true)
            .eq('statut', 'planifiee')
            .single();

          if (visite) {
            await supabase
              .from('visites')
              .update({ statut: 'confirmee' })
              .eq('id', visite.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `✅ J'ai confirmé la visite déléguée pour ${offre.adresse}. Je vous ferai un retour détaillé après la visite.`
            });

            toast({ title: "Visite déléguée confirmée" });
          }
          break;

        case 'refuser_visite_deleguee':
          const { data: visiteRefus } = await supabase
            .from('visites')
            .select('*')
            .eq('offre_id', offreId)
            .eq('est_deleguee', true)
            .eq('statut', 'planifiee')
            .single();

          if (visiteRefus) {
            await supabase
              .from('visites')
              .update({ statut: 'refusee' })
              .eq('id', visiteRefus.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `❌ Je ne suis malheureusement pas disponible pour cette date de visite déléguée. Pouvez-vous me proposer une autre date ?`
            });

            toast({ title: "Visite déléguée refusée" });
          }
          break;
      }

      loadMessages(selectedConv!);
    } catch (error) {
      console.error('Error handling action:', error);
      toast({ title: "Erreur", description: "Impossible d'effectuer cette action", variant: "destructive" });
    }
  };

  // Submit signature dates
  const submitSignatureDates = async () => {
    if (!selectedCandidature || !selectedOffre || !user) return;

    const validDates = signatureDates.filter(d => d.date && d.lieu);
    if (validDates.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins une date", variant: "destructive" });
      return;
    }

    try {
      await supabase
        .from('candidatures')
        .update({ 
          bail_recu: true,
          bail_recu_at: new Date().toISOString(),
          dates_signature_proposees: validDates,
          statut: 'bail_recu'
        })
        .eq('id', selectedCandidature.id);

      const datesText = validDates.map(d => 
        `📅 ${format(new Date(d.date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })} - 📍 ${d.lieu}`
      ).join('\n');

      await supabase.from('messages').insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'agent',
        content: `📄 **Le bail est prêt !**\n\nChoisissez une date de signature parmi les créneaux suivants :\n\n${datesText}`,
        offre_id: selectedOffre.id
      });

      setSignatureDatesDialogOpen(false);
      toast({ title: "Dates de signature envoyées" });
      loadMessages(selectedConv!);
    } catch (error) {
      console.error('Error submitting signature dates:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  // Submit état des lieux
  const submitEtatLieux = async () => {
    if (!selectedCandidature || !selectedOffre || !etatLieuxDate || !user) return;

    try {
      const conversation = conversations.find(c => c.id === selectedConv);
      
      await supabase
        .from('candidatures')
        .update({ 
          date_etat_lieux: etatLieuxDate,
          heure_etat_lieux: etatLieuxHeure || null,
          statut: 'etat_lieux_fixe'
        })
        .eq('id', selectedCandidature.id);

      // Create calendar event
      await supabase.from('calendar_events').insert({
        title: `État des lieux - ${selectedOffre.adresse}`,
        event_type: 'etat_lieux',
        event_date: etatLieuxHeure 
          ? `${etatLieuxDate}T${etatLieuxHeure}:00`
          : `${etatLieuxDate}T09:00:00`,
        description: `État des lieux pour ${selectedOffre.adresse}`,
        client_id: conversation?.client_id,
        agent_id: agentId,
        created_by: user.id,
        priority: 'haute'
      });

      const dateFormatted = format(new Date(etatLieuxDate), 'EEEE d MMMM yyyy', { locale: fr });

      await supabase.from('messages').insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'agent',
        content: `🔑 **État des lieux fixé !**\n\n📅 Date : ${dateFormatted}${etatLieuxHeure ? ` à ${etatLieuxHeure}` : ''}\n📍 ${selectedOffre.adresse}\n\nLes clés vous seront remises à cette occasion.`,
        offre_id: selectedOffre.id
      });

      setEtatLieuxDialogOpen(false);
      toast({ title: "État des lieux fixé" });
      loadMessages(selectedConv!);
    } catch (error) {
      console.error('Error submitting état des lieux:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const getContactInfo = (conv: any) => {
    if (conv.conversation_type === 'admin-agent' && conv.admin_user_id) {
      return contactsMap[conv.admin_user_id] || { name: 'Admin', type: 'admin' };
    }
    if (conv.client_id) {
      return contactsMap[conv.client_id] || { name: 'Inconnu', type: 'client' };
    }
    return { name: 'Inconnu', type: 'unknown' };
  };

  const filteredConversations = conversations.filter(conv => {
    const searchTerm = removeAccents(searchQuery.toLowerCase());
    const contactInfo = getContactInfo(conv);
    const contactName = removeAccents(contactInfo.name.toLowerCase());
    return contactName.includes(searchTerm);
  });

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);

  const handleConversationCreated = async (conversationId: string) => {
    await loadAgentAndConversations();
    setSelectedConv(conversationId);
  };

  const currentConversation = conversations.find(c => c.id === selectedConv);

  // Offer card component
  const OffreCard = ({ offre }: { offre: any }) => (
    <div className="mt-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-2 mb-2">
        <Home className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{offre.adresse}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span>💰 {offre.prix?.toLocaleString()} CHF</span>
            {offre.surface && <span>📐 {offre.surface} m²</span>}
            {offre.pieces && <span>🏠 {offre.pieces} pcs</span>}
          </div>
        </div>
      </div>
      {offre.lien_annonce && (
        <a 
          href={offre.lien_annonce} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
        >
          <ExternalLink className="h-3 w-3" />
          Voir l'annonce complète
        </a>
      )}
    </div>
  );

  // Agent contextual actions
  const OffreActions = ({ offre, onAction }: { offre: any, onAction: (action: string) => void }) => {
    if (!offre) return null;

    const candidature = candidaturesMap[offre.id];
    const statut = candidature?.statut || offre.statut;

    // Check for pending delegated visit
    const hasPendingDelegatedVisit = offre.statut === 'interesse';

    // Visite déléguée en attente
    if (hasPendingDelegatedVisit) {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Visite déléguée en attente de confirmation
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAction('confirmer_visite_deleguee')} className="flex-1">
              <Check className="h-4 w-4 mr-1" /> Confirmer visite
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction('refuser_visite_deleguee')} className="flex-1">
              <X className="h-4 w-4 mr-1" /> Indisponible
            </Button>
          </div>
        </div>
      );
    }

    // Candidature en attente - accepter/refuser
    if (statut === 'en_attente' || statut === 'candidature_deposee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Candidature en attente de validation régie
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAction('accepter_candidature')} className="flex-1">
              <Check className="h-4 w-4 mr-1" /> Accepter
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction('refuser_candidature')} className="flex-1">
              <X className="h-4 w-4 mr-1" /> Refuser
            </Button>
          </div>
        </div>
      );
    }

    // Client a confirmé vouloir conclure - valider avec régie
    if (statut === 'bail_conclu') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
              <Check className="h-3 w-3" /> Client confirme vouloir ce bien
            </p>
          </div>
          <Button size="sm" onClick={() => onAction('valider_regie')} className="w-full">
            <Check className="h-4 w-4 mr-1" /> Valider auprès de la régie
          </Button>
        </div>
      );
    }

    // En attente du bail de la régie
    if (statut === 'attente_bail') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Clock className="h-3 w-3" /> En attente du bail de la régie
            </p>
          </div>
          <Button size="sm" onClick={() => onAction('bail_recu')} className="w-full">
            <FileSignature className="h-4 w-4 mr-1" /> Bail reçu - Proposer dates signature
          </Button>
        </div>
      );
    }

    // Signature planifiée - confirmer signature effectuée
    if (statut === 'signature_planifiee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Signature planifiée
              {candidature?.date_signature_choisie && (
                <span className="ml-1">
                  le {format(new Date(candidature.date_signature_choisie), 'd MMM à HH:mm', { locale: fr })}
                </span>
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => onAction('confirmer_signature')} className="w-full">
            <Check className="h-4 w-4 mr-1" /> Confirmer signature effectuée
          </Button>
        </div>
      );
    }

    // Signature effectuée - fixer état des lieux
    if (statut === 'signature_effectuee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
              <Check className="h-3 w-3" /> Bail signé
            </p>
          </div>
          <Button size="sm" onClick={() => onAction('fixer_etat_lieux')} className="w-full">
            <Key className="h-4 w-4 mr-1" /> Fixer date état des lieux
          </Button>
        </div>
      );
    }

    // État des lieux fixé - remettre les clés
    if (statut === 'etat_lieux_fixe') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> État des lieux
              {candidature?.date_etat_lieux && (
                <span className="ml-1">
                  le {format(new Date(candidature.date_etat_lieux), 'd MMM', { locale: fr })}
                  {candidature.heure_etat_lieux && ` à ${candidature.heure_etat_lieux}`}
                </span>
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => onAction('remettre_cles')} className="w-full">
            <Key className="h-4 w-4 mr-1" /> Clés remises - Conclure
          </Button>
        </div>
      );
    }

    // Clés remises - affaire conclue
    if (statut === 'cles_remises') {
      return (
        <div className="mt-3 p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
            <Key className="h-4 w-4" />
            🎉 Affaire conclue !
          </p>
        </div>
      );
    }

    return null;
  };

  const conversationsList = (
    <>
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="font-semibold">Mes Conversations</h2>
          <div className="flex gap-2">
            {agentId && (
              <>
                <NewConversationDialog 
                  agentId={agentId} 
                  onConversationCreated={handleConversationCreated}
                />
                <AgentNewAdminConversationDialog
                  agentId={agentId}
                  onConversationCreated={handleConversationCreated}
                />
              </>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConversations.map((conv) => {
          const contactInfo = getContactInfo(conv);
          const convMessages = messages.filter(m => m.conversation_id === conv.id);
          const lastMessage = convMessages[convMessages.length - 1];
          const unreadCount = convMessages.filter(m => !m.read && m.sender_type !== 'agent').length;
          
          return (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConv === conv.id ? 'bg-muted' : ''}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {contactInfo.type === 'admin' ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p className="font-medium text-sm">{contactInfo.name}</p>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="default" className="ml-2">{unreadCount}</Badge>
                )}
              </div>
              {contactInfo.type === 'admin' && (
                <Badge variant="outline" className="text-xs border-primary text-primary mb-1">
                  Admin
                </Badge>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {lastMessage?.content?.substring(0, 50) || conv.subject}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(conv.last_message_at || conv.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          );
        })}
      </ScrollArea>
    </>
  );

  const chatHeader = currentConversation && (
    <div className="flex items-center gap-2">
      {getContactInfo(currentConversation).type === 'admin' ? (
        <Shield className="h-4 w-4 text-primary" />
      ) : (
        <Users className="h-4 w-4 text-muted-foreground" />
      )}
      <h2 className="font-semibold truncate">
        {getContactInfo(currentConversation).name}
      </h2>
    </div>
  );

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {selectedMessages.map((msg) => (
            <Card key={msg.id} className={`p-4 ${msg.sender_type === 'agent' ? 'ml-auto max-w-[85%] bg-primary/10' : 'mr-auto max-w-[85%]'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">
                    {msg.sender_type === 'agent' ? 'Vous' : 
                     msg.sender_type === 'admin' ? getContactInfo(currentConversation).name :
                     getContactInfo(currentConversation).name}
                  </p>
                  {msg.sender_type === 'admin' && (
                    <Badge variant="outline" className="text-xs border-primary text-primary">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              {msg.content && (
                <div className="text-sm whitespace-pre-wrap">
                  {parseMessageWithLinks(msg.content).map((part, index) => 
                    part.type === 'link' ? (
                      <a
                        key={index}
                        href={part.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {part.content}
                      </a>
                    ) : (
                      <span key={index}>{part.content}</span>
                    )
                  )}
                </div>
              )}
              {msg.attachment_url && (
                <div className="mt-2">
                  <MessageAttachment
                    url={msg.attachment_url}
                    type={msg.attachment_type || ''}
                    name={msg.attachment_name || 'Fichier'}
                    size={msg.attachment_size || 0}
                  />
                </div>
              )}
              {msg.offre_id && offresMap[msg.offre_id] && (
                <>
                  <OffreCard offre={offresMap[msg.offre_id]} />
                  <OffreActions 
                    offre={offresMap[msg.offre_id]} 
                    onAction={(action) => handleOffreAction(msg.offre_id, action)}
                  />
                </>
              )}
            </Card>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <MessageAttachmentUploader
              conversationId={selectedConv}
              onAttachmentReady={setPendingAttachment}
            />
            <Input
              placeholder="Écrire un message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          <Button onClick={handleSendMessage} disabled={!messageText.trim() && !pendingAttachment}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialog proposer dates signature */}
      <Dialog open={signatureDatesDialogOpen} onOpenChange={setSignatureDatesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📅 Proposer des dates de signature</DialogTitle>
            <DialogDescription>
              Le bail est prêt. Proposez des créneaux au client pour la signature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {signatureDates.map((slot, idx) => (
              <div key={idx} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Créneau {idx + 1}</Label>
                  {signatureDates.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSignatureDates(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  type="datetime-local"
                  value={slot.date}
                  onChange={(e) => {
                    const newDates = [...signatureDates];
                    newDates[idx].date = e.target.value;
                    setSignatureDates(newDates);
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <Input
                  placeholder="Lieu de signature"
                  value={slot.lieu}
                  onChange={(e) => {
                    const newDates = [...signatureDates];
                    newDates[idx].lieu = e.target.value;
                    setSignatureDates(newDates);
                  }}
                />
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setSignatureDates(prev => [...prev, { date: "", lieu: "Chemin de l'Esparcette 5, 1023 Crissier" }])}
            >
              <Plus className="h-4 w-4 mr-2" /> Ajouter un créneau
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureDatesDialogOpen(false)}>Annuler</Button>
            <Button onClick={submitSignatureDates}>
              <Send className="h-4 w-4 mr-2" /> Envoyer au client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog fixer état des lieux */}
      <Dialog open={etatLieuxDialogOpen} onOpenChange={setEtatLieuxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔑 Fixer la date de l'état des lieux</DialogTitle>
            <DialogDescription>
              Définissez la date et l'heure de remise des clés pour {selectedOffre?.adresse}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="etat-date">Date</Label>
              <Input
                id="etat-date"
                type="date"
                value={etatLieuxDate}
                onChange={(e) => setEtatLieuxDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label htmlFor="etat-heure">Heure (optionnel)</Label>
              <Input
                id="etat-heure"
                type="time"
                value={etatLieuxHeure}
                onChange={(e) => setEtatLieuxHeure(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtatLieuxDialogOpen(false)}>Annuler</Button>
            <Button onClick={submitEtatLieux} disabled={!etatLieuxDate}>
              <Key className="h-4 w-4 mr-2" /> Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Sélectionnez une conversation
    </div>
  );

  return (
    <MessagingLayout
      conversationsList={conversationsList}
      chatView={chatView}
      selectedConversation={selectedConv}
      onSelectConversation={setSelectedConv}
      chatHeader={chatHeader}
    />
  );
};

export default Messagerie;
