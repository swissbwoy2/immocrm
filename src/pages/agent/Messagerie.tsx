import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Search, Home, Send,
  Check, X, Clock, FileSignature, Key, Calendar, Plus, Trash2, FileEdit
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageAttachmentUploader } from "@/components/MessageAttachmentUploader";
import { MessageAttachment } from "@/components/MessageAttachment";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { AgentNewAdminConversationDialog } from "@/components/AgentNewAdminConversationDialog";
import { parseMessageWithLinks } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { MessagingLayout } from "@/components/MessagingLayout";
import { ChatAvatar } from "@/components/messaging/ChatAvatar";
import { PremiumMessageBubble } from "@/components/messaging/PremiumMessageBubble";
import { PremiumConversationItem } from "@/components/messaging/PremiumConversationItem";
import { PremiumChatInput } from "@/components/messaging/PremiumChatInput";
import { QuickRepliesMenu } from "@/components/messaging/QuickRepliesMenu";
import { ChatHeader } from "@/components/messaging/ChatHeader";
import { FloatingParticles, MeshGradientBackground, ChatPatternBackground } from "@/components/messaging/FloatingParticles";
import { ConversationListSkeleton, MessagesListSkeleton } from "@/components/messaging/MessagingSkeletons";
import { PremiumOffreCard } from "@/components/messaging/PremiumOffreCard";
import { ScrollToTopButton } from "@/components/messaging/ScrollToTopButton";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import DateSeparator from "@/components/messaging/DateSeparator";

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Helper to parse the special button tag for deposer candidature
const parseDeposerButtonTag = (content: string) => {
  const regex = /\[BOUTON_DEPOSER_CANDIDATURE:([^:]+):([^\]]+)\]/;
  const match = content?.match(regex);
  if (match) {
    return { offreId: match[1], clientId: match[2] };
  }
  return null;
};

// Helper to clean message content from special tags
const cleanMessageContent = (content: string) => {
  return content?.replace(/\[BOUTON_DEPOSER_CANDIDATURE:[^\]]+\]/g, '').trim() || '';
};

const Messagerie = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMessagesMap, setLastMessagesMap] = useState<Map<string, { content: string | null; attachment_name: string | null }>>(new Map());
  const [offresMap, setOffresMap] = useState<Record<string, any>>({});
  const [candidaturesMap, setCandidaturesMap] = useState<Record<string, any>>({});
  const [visitesMap, setVisitesMap] = useState<Record<string, any[]>>({});
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [contactsMap, setContactsMap] = useState<Record<string, { name: string; type: string; clientId?: string }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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
  
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [unreadCountsMap, setUnreadCountsMap] = useState<Map<string, number>>(new Map());
  const [agentFullName, setAgentFullName] = useState<string>("");

  const scrollToBottom = useCallback((instant: boolean = false) => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      const scrollHeight = viewport.scrollHeight;
      const clientHeight = viewport.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      
      if (instant) {
        viewport.scrollTop = maxScroll;
      } else {
        viewport.scrollTo({ top: maxScroll, behavior: 'smooth' });
      }
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setShowScrollTop(target.scrollTop > 300);
  }, []);

  useEffect(() => {
    loadAgentAndConversations();
    markTypeAsRead('new_message');
  }, [user?.id]);

  // Load unread counts after agent data is loaded
  useEffect(() => {
    if (agentId) {
      loadUnreadCounts();
    }
  }, [agentId]);

  const loadUnreadCounts = async () => {
    if (!agentId) return;
    try {
      // Get all conversations for this agent
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agentId);

      if (!convs || convs.length === 0) return;

      const convIds = convs.map(c => c.id);

      // Count unread messages (not from agent)
      const { data } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('read', false)
        .neq('sender_type', 'agent')
        .in('conversation_id', convIds);

      if (data) {
        const countsMap = new Map<string, number>();
        data.forEach(msg => {
          const count = countsMap.get(msg.conversation_id) || 0;
          countsMap.set(msg.conversation_id, count + 1);
        });
        setUnreadCountsMap(countsMap);
      }
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  // Auto-select conversation from URL parameter
  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    if (conversationId && conversations.length > 0) {
      const exists = conversations.find(c => c.id === conversationId);
      if (exists) {
        setSelectedConv(conversationId);
        // Clean URL
        searchParams.delete('conversationId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv]);

  // Track previous values for scroll behavior
  const prevMessagesLengthRef = useRef(0);
  const prevConvRef = useRef<string | null>(null);

  // Auto-scroll to bottom when conversation changes (instant) or new messages (smooth)
  // useLayoutEffect ensures scroll happens before paint
  useLayoutEffect(() => {
    if (isLoadingMessages || messages.length === 0) return;
    
    const isNewConversation = prevConvRef.current !== selectedConv;
    const isNewMessage = messages.length > prevMessagesLengthRef.current && !isNewConversation;
    
    // Double requestAnimationFrame pour attendre le rendu complet
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (isNewConversation) {
          scrollToBottom(true); // instant pour nouvelle conversation
        } else if (isNewMessage) {
          scrollToBottom(false); // smooth pour nouveaux messages
        }
      });
    });
    
    prevConvRef.current = selectedConv;
    prevMessagesLengthRef.current = messages.length;
  }, [selectedConv, messages.length, isLoadingMessages, scrollToBottom]);

  // Force scroll to bottom when messages are first loaded
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0 && selectedConv) {
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [isLoadingMessages, selectedConv, scrollToBottom]);

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
            // Update lastMessagesMap for realtime updates
            const newMsg = payload.new as any;
            setLastMessagesMap(prev => {
              const newMap = new Map(prev);
              newMap.set(newMsg.conversation_id, { 
                content: newMsg.content, 
                attachment_name: newMsg.attachment_name 
              });
              return newMap;
            });
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

    setIsLoadingConversations(true);
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;
      
      const agentIdStr = agentData.id;
      setAgentId(agentIdStr);

      // Récupérer le nom de l'agent
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', user.id)
        .single();
      
      if (agentProfile) {
        setAgentFullName(`${agentProfile.prenom} ${agentProfile.nom}`.trim());
      }

      // Récupérer les clients actuellement assignés à cet agent via client_agents
      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentIdStr);

      const assignedClientIds = clientAgentsData?.map(ca => ca.client_id) || [];

      // Charger les conversations client-agent avec clients assignés uniquement
      const { data: clientConvs } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentIdStr)
        .eq('conversation_type', 'client-agent')
        .in('client_id', assignedClientIds);

      // Charger les conversations admin-agent (pas de filtre client)
      const { data: adminConvs } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentIdStr)
        .eq('conversation_type', 'admin-agent');

      // Combiner les deux types de conversations et trier par date
      const convData = [...(clientConvs || []), ...(adminConvs || [])].sort(
        (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
      );

      setConversations(convData);

      // Charger le dernier message de chaque conversation
      if (convData.length > 0) {
        const convIds = convData.map(c => c.id);
        const lastMsgsMap = new Map<string, { content: string | null; attachment_name: string | null }>();
        
        // Récupérer le dernier message de chaque conversation
        for (const convId of convIds) {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, attachment_name')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (lastMsg) {
            lastMsgsMap.set(convId, { content: lastMsg.content, attachment_name: lastMsg.attachment_name });
          }
        }
        setLastMessagesMap(lastMsgsMap);
      }

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
          // Find conversation to get stored client_name as fallback
          const conv = convData?.find(c => c.client_id === client.id);
          contactsMapping[client.id] = { 
            name: fullName || conv?.client_name || 'Destinataire inconnu', 
            type: 'client', 
            clientId: client.id 
          };
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
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setIsLoadingMessages(true);
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

      // Load candidatures and visites for these offers
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

        // Load visites for these offers
        const { data: visitesData } = await supabase
          .from('visites')
          .select('*')
          .in('offre_id', offreIds);

        const visitesMapping: Record<string, any[]> = {};
        visitesData?.forEach(v => {
          if (!visitesMapping[v.offre_id]) visitesMapping[v.offre_id] = [];
          visitesMapping[v.offre_id].push(v);
        });
        setVisitesMap(visitesMapping);
      }

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .neq('sender_type', 'agent');
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const content = textOverride ?? messageText;
    if ((!content.trim() && !pendingAttachment) || !selectedConv || !user || !agentId) {
      console.log('[Messagerie Agent] Message vide ou conversation non sélectionnée');
      return;
    }

    console.log('[Messagerie Agent] Envoi du message...', { conversationId: selectedConv, agentId });

    try {
      // Vérifier si c'est une conversation client et si l'agent est toujours assigné
      const currentConversation = conversations.find(c => c.id === selectedConv);
      if (currentConversation?.conversation_type === 'client-agent' && currentConversation?.client_id) {
        const { data: assignment } = await supabase
          .from('client_agents')
          .select('id')
          .eq('agent_id', agentId)
          .eq('client_id', currentConversation.client_id)
          .maybeSingle();
          
        if (!assignment) {
          toast({
            title: "Accès refusé",
            description: "Vous n'êtes plus assigné à ce client",
            variant: "destructive",
          });
          return;
        }
      }

      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'agent',
          content: content || null,
          attachment_url: pendingAttachment?.url || null,
          attachment_type: pendingAttachment?.type || null,
          attachment_name: pendingAttachment?.name || null,
          attachment_size: pendingAttachment?.size || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[Messagerie Agent] Erreur insertion message:', error);
        throw error;
      }

      console.log('[Messagerie Agent] Message envoyé avec succès:', insertedMsg?.id);

      // Mettre à jour la conversation
      const { error: convError } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv);

      if (convError) {
        console.error('[Messagerie Agent] Erreur mise à jour conversation:', convError);
      }

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
        try {
          if (conversation.conversation_type === 'admin-agent' && conversation.admin_user_id) {
            await supabase.rpc('create_notification', {
              p_user_id: conversation.admin_user_id,
              p_type: 'new_message',
              p_title: 'Nouveau message agent',
              p_message: `${agentName} vous a envoyé un message`,
              p_link: `/admin/messagerie?conversationId=${selectedConv}`,
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
                p_link: `/client/messagerie?conversationId=${selectedConv}`,
                p_metadata: { conversation_id: selectedConv }
              });
            }
          }
        } catch (notifError) {
          console.warn('[Messagerie Agent] Erreur création notification:', notifError);
        }
      }

      // Update lastMessagesMap with the new message
      setLastMessagesMap(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedConv, { 
          content: content || null, 
          attachment_name: pendingAttachment?.name || null 
        });
        return newMap;
      });

      // Ajouter le message à la liste locale si le realtime ne l'a pas déjà fait
      if (insertedMsg && !messages.some(m => m.id === insertedMsg.id)) {
        setMessages(prev => [...prev, insertedMsg]);
      }

      setMessageText("");
      setPendingAttachment(null);
      
      toast({
        title: "Message envoyé",
        description: "Votre message a bien été envoyé",
      });
    } catch (error: any) {
      console.error('[Messagerie Agent] Erreur envoi message:', error);
      toast({
        title: "Erreur d'envoi",
        description: error?.message || "Impossible d'envoyer le message. Veuillez réessayer.",
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

        case 'confirmer_visite':
          const { data: visiteNormale } = await supabase
            .from('visites')
            .select('*')
            .eq('offre_id', offreId)
            .eq('est_deleguee', false)
            .eq('statut', 'planifiee')
            .maybeSingle();

          if (visiteNormale) {
            await supabase
              .from('visites')
              .update({ statut: 'confirmee' })
              .eq('id', visiteNormale.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'agent',
              content: `✅ **Visite confirmée**\n\n📍 ${offre.adresse}\n📅 ${new Date(visiteNormale.date_visite).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n🕐 ${new Date(visiteNormale.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}\n\nJe confirme votre présence pour cette visite. À bientôt !`,
              offre_id: offreId
            });

            await supabase.from('offres').update({ statut: 'visite_confirmee' }).eq('id', offreId);
            
            toast({ title: "Visite confirmée" });
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
              content: `✅ J'ai confirmé la visite déléguée pour ${offre.adresse}. Je vous ferai un retour détaillé après la visite.`,
              offre_id: offreId
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
              content: `❌ Je ne suis malheureusement pas disponible pour cette date de visite déléguée. Pouvez-vous me proposer une autre date ?`,
              offre_id: offreId
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
        <div className="mt-2">
          <LinkPreviewCard url={offre.lien_annonce} />
        </div>
      )}
    </div>
  );

  // Agent contextual actions
  const OffreActions = ({ offre, onAction }: { offre: any, onAction: (action: string) => void }) => {
    if (!offre) return null;

    const candidature = candidaturesMap[offre.id];
    const statut = candidature?.statut || offre.statut;
    const visites = visitesMap[offre.id] || [];

    // Check for delegated visits status
    const hasPendingDelegatedVisit = offre.statut === 'interesse' && 
      visites.some(v => v.est_deleguee && v.statut === 'planifiee');
    const hasConfirmedDelegatedVisit = offre.statut === 'interesse' && 
      visites.some(v => v.est_deleguee && v.statut === 'confirmee');
    const hasRefusedDelegatedVisit = offre.statut === 'interesse' && 
      visites.some(v => v.est_deleguee && v.statut === 'refusee') &&
      !visites.some(v => v.est_deleguee && v.statut === 'planifiee');
    
    // Visite planifiée (normale) - afficher bouton de confirmation
    if (offre.statut === 'visite_planifiee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Visite planifiée
            </p>
          </div>
          <Button size="sm" onClick={() => onAction('confirmer_visite')} className="w-full">
            <Check className="h-4 w-4 mr-1" /> Confirmer présence client
          </Button>
        </div>
      );
    }

    // Visite déléguée confirmée - afficher badge de confirmation
    if (hasConfirmedDelegatedVisit) {
      return (
        <div className="mt-3">
          <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
              <Check className="h-3 w-3" /> Visite déléguée confirmée
            </p>
          </div>
        </div>
      );
    }

    // Visite déléguée refusée - afficher badge d'attente nouvelle date
    if (hasRefusedDelegatedVisit) {
      return (
        <div className="mt-3">
          <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
              <X className="h-3 w-3" /> Visite déléguée refusée - en attente de nouvelle date
            </p>
          </div>
        </div>
      );
    }

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
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="shrink-0" />
            <h2 className="font-semibold text-lg">Conversations</h2>
          </div>
          {agentId && (
            <div className="grid grid-cols-2 gap-2">
              <NewConversationDialog 
                agentId={agentId} 
                onConversationCreated={handleConversationCreated}
              />
              <AgentNewAdminConversationDialog
                agentId={agentId}
                onConversationCreated={handleConversationCreated}
              />
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <ConversationListSkeleton />
        ) : (
          filteredConversations.map((conv, index) => {
            const contactInfo = getContactInfo(conv);
            const lastMsg = lastMessagesMap.get(conv.id);
            const lastMessageText = lastMsg?.content || (lastMsg?.attachment_name ? `📎 ${lastMsg.attachment_name}` : conv.subject || null);
            // Use the preloaded unread counts map
            const unreadCount = unreadCountsMap.get(conv.id) || 0;
            
            return (
              <PremiumConversationItem
                key={conv.id}
                name={contactInfo.name}
                avatarUrl={null}
                lastMessage={lastMessageText}
                lastMessageTime={conv.last_message_at || conv.created_at}
                unreadCount={unreadCount}
                isSelected={selectedConv === conv.id}
                isArchived={conv.is_archived}
                onClick={() => setSelectedConv(conv.id)}
                index={index}
              />
            );
          })
        )}
      </ScrollArea>
    </>
  );

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 chat-background relative overflow-hidden">
      <ChatPatternBackground />
      <MeshGradientBackground />
      <FloatingParticles count={12} />
      {currentConversation?.is_archived && (
        <div className="p-3 bg-warning/10 border-b border-warning/20 relative z-10">
          <p className="text-xs text-warning text-center flex items-center justify-center gap-2">
            <Badge variant="outline" className="border-warning text-warning text-xs">
              Archivée
            </Badge>
            Conversation archivée - Vous ne pouvez plus envoyer de messages
          </p>
        </div>
      )}
      <ScrollArea 
        className="flex-1 relative z-10 min-w-0"
        viewportRef={scrollViewportRef}
        viewportClassName="p-2 sm:p-4"
        onScroll={handleScroll}
      >
        {isLoadingMessages ? (
          <MessagesListSkeleton />
        ) : (
        <div className="space-y-2 max-w-4xl mx-auto min-w-0">
          {/* Header qui défile avec les messages */}
          {/* Header qui défile avec les messages */}
          {currentConversation && (
            <div className="mb-4 pb-3 border-b border-border/30">
              <ChatHeader
                name={getContactInfo(currentConversation).name}
                avatarUrl={null}
                status={getContactInfo(currentConversation).type === 'admin' ? 'Admin' : undefined}
                isArchived={currentConversation.is_archived}
              />
            </div>
          )}
          
          {/* Calculer le dernier message pour chaque offre */}
          {(() => {
            const lastMessageByOffre = new Map<string, string>();
            selectedMessages.forEach(msg => {
              if (msg.offre_id) {
                lastMessageByOffre.set(msg.offre_id, msg.id);
              }
            });
            
            return selectedMessages.map((msg, index) => {
              const isSent = msg.sender_type === 'agent';
              // Déterminer le nom de l'expéditeur selon le type d'expéditeur
              let senderName: string | undefined;
              if (isSent) {
                senderName = undefined; // Nos propres messages (agent)
              } else if (msg.sender_type === 'admin') {
                // Message envoyé par un admin - récupérer le nom de l'admin via sender_id
                senderName = contactsMap[msg.sender_id]?.name || 'Admin';
              } else {
                // Message envoyé par un client
                senderName = getContactInfo(currentConversation).name;
              }
              
              // Check for special button tag
              const deposerButtonData = parseDeposerButtonTag(msg.content || '');
              const cleanContent = cleanMessageContent(msg.content || '');
              
              // N'afficher l'OffreCard que sur le dernier message de chaque offre
              const isLastMessageForOffre = msg.offre_id && 
                lastMessageByOffre.get(msg.offre_id) === msg.id;
              
              // Afficher le séparateur de date si c'est le premier message ou si le jour a changé
              const showDateSeparator = index === 0 || 
                !isSameDay(parseISO(msg.created_at), parseISO(selectedMessages[index - 1].created_at));
              
              return (
                <div key={msg.id}>
                  {showDateSeparator && <DateSeparator date={msg.created_at} />}
                  <PremiumMessageBubble
                    content={cleanContent}
                    isSent={isSent}
                    timestamp={msg.created_at}
                    read={msg.read}
                    senderName={senderName}
                    attachmentUrl={msg.attachment_url}
                    attachmentName={msg.attachment_name}
                    attachmentType={msg.attachment_type}
                    attachmentSize={msg.attachment_size}
                    payload={msg.payload as any}
                  />
                  {/* Bouton Déposer candidature si tag présent dans message client */}
                  {deposerButtonData && msg.sender_type === 'client' && (
                    <div className={`mt-2 ${isSent ? 'ml-auto' : 'mr-auto'} max-w-[75%] md:max-w-[60%]`}>
                      <Button 
                        className="w-full"
                        onClick={() => navigate(`/agent/deposer-candidature?clientId=${deposerButtonData.clientId}&offreId=${deposerButtonData.offreId}`)}
                      >
                        <FileEdit className="mr-2 h-4 w-4" />
                        Déposer la candidature
                      </Button>
                    </div>
                  )}
                  {isLastMessageForOffre && offresMap[msg.offre_id!] && (
                    <div className={`mt-2 ${isSent ? 'ml-auto' : 'mr-auto'} max-w-[75%] md:max-w-[60%]`}>
                      <OffreCard offre={offresMap[msg.offre_id!]} />
                      <OffreActions 
                        offre={offresMap[msg.offre_id!]} 
                        onAction={(action) => handleOffreAction(msg.offre_id, action)}
                      />
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
        )}
      </ScrollArea>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
      {!currentConversation?.is_archived && (
        <div className="relative z-10">
          <PremiumChatInput
            onSendMessage={handleSendMessage}
            message={messageText}
            onMessageChange={setMessageText}
            disabled={false}
            placeholder="Écrivez un message..."
            pendingAttachment={pendingAttachment}
            onRemoveAttachment={() => setPendingAttachment(null)}
            attachmentSlot={
              <MessageAttachmentUploader
                conversationId={selectedConv}
                onAttachmentReady={setPendingAttachment}
              />
            }
            quickRepliesSlot={
              currentConversation?.conversation_type === 'client-agent' && (
                <QuickRepliesMenu
                  onSelectReply={(template) => setMessageText(template)}
                  clientFirstName={(() => {
                    const contact = contactsMap[currentConversation?.client_id || ''];
                    if (contact?.name) {
                      return contact.name.split(' ')[0];
                    }
                    return '';
                  })()}
                  agentFullName={agentFullName}
                />
              )
            }
          />
        </div>
      )}

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
    <div className="h-[calc(100vh-56px)] lg:h-screen flex flex-col overflow-hidden">
      <MessagingLayout
        conversationsList={conversationsList}
        chatView={chatView}
        selectedConversation={selectedConv}
        onSelectConversation={setSelectedConv}
      />
    </div>
  );
};

export default Messagerie;
