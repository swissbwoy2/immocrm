import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Send, Home, Heart, Calendar, X, FileText, ExternalLink,
  Check, Clock, Key, Star, Mail, User, PartyPopper, FileSignature,
  MapPin, AlertCircle, MessageCircle, Sparkles, Search
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageAttachmentUploader } from "@/components/MessageAttachmentUploader";
import { MessageAttachment } from "@/components/MessageAttachment";
import { parseMessageWithLinks } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { MessagingLayout } from "@/components/MessagingLayout";
import { ChatAvatar } from "@/components/messaging/ChatAvatar";
import { PremiumMessageBubble } from "@/components/messaging/PremiumMessageBubble";
import { PremiumConversationItem } from "@/components/messaging/PremiumConversationItem";
import { PremiumChatInput } from "@/components/messaging/PremiumChatInput";
import { ChatHeader } from "@/components/messaging/ChatHeader";
import { ConversationListSkeleton, MessagesListSkeleton } from "@/components/messaging/MessagingSkeletons";
import { FloatingParticles, MeshGradientBackground, ChatPatternBackground } from "@/components/messaging/FloatingParticles";
import { PremiumOffreCard } from "@/components/messaging/PremiumOffreCard";
import { ScrollToTopButton } from "@/components/messaging/ScrollToTopButton";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import DateSeparator from "@/components/messaging/DateSeparator";

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const Messagerie = () => {
  const { user } = useAuth();
  const { syncEvent } = useGoogleCalendarSync();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { markTypeAsRead } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMessagesMap, setLastMessagesMap] = useState<Map<string, { content: string | null; attachment_name: string | null }>>(new Map());
  const [offresMap, setOffresMap] = useState<Record<string, any>>({});
  const [candidaturesMap, setCandidaturesMap] = useState<Record<string, any>>({});
  const [visitesMap, setVisitesMap] = useState<Record<string, any>>({});
  const [agentsMap, setAgentsMap] = useState<Record<string, { name: string; lastSeenAt?: string | null; isOnline?: boolean | null }>>({});
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Dialog states
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [candidatureDialogOpen, setCandidatureDialogOpen] = useState(false);
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false);
  const [thankYouDialogOpen, setThankYouDialogOpen] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState<any>(null);
  const [selectedCandidature, setSelectedCandidature] = useState<any>(null);
  const [visitDate, setVisitDate] = useState("");
  const [delegateDate, setDelegateDate] = useState("");
  const [delegateNotes, setDelegateNotes] = useState("");
  const [messageClient, setMessageClient] = useState("");
  const [accepteConditions, setAccepteConditions] = useState(false);
  const [recommendationEmails, setRecommendationEmails] = useState<string[]>(["", "", "", "", ""]);
  const [selectedSignatureDate, setSelectedSignatureDate] = useState<string>("");
  const [proposedSlots, setProposedSlots] = useState<any[]>([]);
  const [delegateProposedSlots, setDelegateProposedSlots] = useState<any[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [processedOffreIds, setProcessedOffreIds] = useState<Set<string>>(new Set());

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [unreadCountsMap, setUnreadCountsMap] = useState<Map<string, number>>(new Map());

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
    loadClientAndConversations();
    loadUnreadCounts();
    markTypeAsRead('new_message');
  }, [user?.id]);

  const loadUnreadCounts = async () => {
    if (!user) return;
    try {
      // Get client ID first
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!clientData) return;

      // Get conversations for this client
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientData.id);

      if (!convs || convs.length === 0) return;

      const convIds = convs.map(c => c.id);

      // Count unread messages from agent
      const { data } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('read', false)
        .eq('sender_type', 'agent')
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

  // Force scroll to bottom when messages are first loaded - avec délai plus long et retry
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0 && selectedConv) {
      // Premier scroll immédiat
      scrollToBottom(true);
      
      // Second scroll après un court délai pour s'assurer que le DOM est prêt
      const timer1 = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      
      // Troisième scroll de sécurité après rendu complet
      const timer2 = setTimeout(() => {
        scrollToBottom(true);
      }, 300);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isLoadingMessages, selectedConv, scrollToBottom]);

  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel('client-messages-changes')
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

  const loadClientAndConversations = async () => {
    if (!user) return;
    
    setIsLoadingConversations(true);
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

      const clientIdStr = clientData.id;
      setClientId(clientIdStr);

      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', clientIdStr)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setConversations(convData || []);

      // Charger le dernier message de chaque conversation
      if (convData && convData.length > 0) {
        const convIds = convData.map(c => c.id);
        const lastMsgsMap = new Map<string, { content: string | null; attachment_name: string | null }>();
        
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

      const agentIds = convData?.map(c => c.agent_id) || [];
      if (agentIds.length > 0) {
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, user_id')
          .in('id', agentIds);

        const userIds = agentsData?.map(a => a.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, prenom, nom, last_seen_at, is_online')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        const agentsMapping: Record<string, { name: string; lastSeenAt?: string | null; isOnline?: boolean | null }> = {};
        
        agentsData?.forEach(agent => {
          const profile = profilesMap.get(agent.user_id);
          const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim();
          agentsMapping[agent.id] = {
            name: fullName || 'Mon agent',
            lastSeenAt: profile?.last_seen_at,
            isOnline: profile?.is_online
          };
        });
        setAgentsMap(agentsMapping);
      }
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

      // Create map of offers for quick access
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
      if (offreIds.length > 0 && clientId) {
        const { data: candidaturesData } = await supabase
          .from('candidatures')
          .select('*')
          .in('offre_id', offreIds)
          .eq('client_id', clientId);

        const candidaturesMapping: Record<string, any> = {};
        candidaturesData?.forEach(c => {
          candidaturesMapping[c.offre_id] = c;
        });
        setCandidaturesMap(candidaturesMapping);

        // Load visites for these offers
        const { data: visitesData } = await supabase
          .from('visites')
          .select('*')
          .in('offre_id', offreIds)
          .eq('client_id', clientId);

        const visitesMapping: Record<string, any> = {};
        visitesData?.forEach(v => {
          visitesMapping[v.offre_id] = v;
        });
        setVisitesMap(visitesMapping);
      }

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .eq('sender_type', 'agent');
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const content = textOverride ?? messageText;
    if ((!content.trim() && !pendingAttachment) || !selectedConv || !user) {
      console.log('[Messagerie Client] Message vide ou conversation non sélectionnée');
      return;
    }

    console.log('[Messagerie Client] Envoi du message...', { conversationId: selectedConv, userId: user.id });

    try {
      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'client',
          content: content || null,
          attachment_url: pendingAttachment?.url || null,
          attachment_type: pendingAttachment?.type || null,
          attachment_name: pendingAttachment?.name || null,
          attachment_size: pendingAttachment?.size || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[Messagerie Client] Erreur insertion message:', error);
        throw error;
      }

      console.log('[Messagerie Client] Message envoyé avec succès:', insertedMsg?.id);

      // Mettre à jour la conversation
      const { error: convError } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv);

      if (convError) {
        console.error('[Messagerie Client] Erreur mise à jour conversation:', convError);
      }

      const conversation = conversations.find(c => c.id === selectedConv);
      if (conversation) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', conversation.agent_id)
          .single();

        if (agentData) {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('prenom, nom')
            .eq('id', user.id)
            .single();

          const clientName = clientProfile 
            ? `${clientProfile.prenom} ${clientProfile.nom}`.trim() 
            : 'Un client';

          // Créer notification (ignore les erreurs silencieusement)
          try {
            await supabase.rpc('create_notification', {
              p_user_id: agentData.user_id,
              p_type: 'new_message',
              p_title: 'Nouveau message',
              p_message: `${clientName} vous a envoyé un message`,
              p_link: `/agent/messagerie?conversationId=${selectedConv}`,
              p_metadata: { conversation_id: selectedConv }
            });
          } catch (notifError) {
            console.warn('[Messagerie Client] Erreur création notification:', notifError);
          }

          // Envoyer email (ignore les erreurs silencieusement)
          try {
            await supabase.functions.invoke('send-notification-email', {
              body: {
                user_id: agentData.user_id,
                notification_type: 'new_message',
                title: 'Nouveau message',
                message: `${clientName} vous a envoyé un message`,
                link: `/agent/messagerie?conversationId=${selectedConv}`
              }
            });
          } catch (emailError) {
            console.warn('[Messagerie Client] Erreur envoi email notification:', emailError);
          }
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
      console.error('[Messagerie Client] Erreur envoi message:', error);
      toast({
        title: "Erreur d'envoi",
        description: error?.message || "Impossible d'envoyer le message. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Unified action handler
  const handleOffreAction = async (offreId: string, action: string, data?: any) => {
    if (!user || !clientId) return;
    
    // Prevent double processing
    if (isProcessingAction) return;
    setIsProcessingAction(true);

    const offre = offresMap[offreId];
    const candidature = candidaturesMap[offreId];

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      // Get agent user_id for notifications
      const { data: agentData } = await supabase
        .from('agents')
        .select('user_id')
        .eq('id', clientData.agent_id)
        .single();

      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', user.id)
        .single();

      const clientName = clientProfile 
        ? `${clientProfile.prenom} ${clientProfile.nom}`.trim() 
        : 'Un client';

      switch (action) {
        case 'interesse':
          // Mark as processed to hide buttons immediately
          setProcessedOffreIds(prev => new Set(prev).add(offreId));
          
          await supabase
            .from('offres')
            .update({ statut: 'interesse' })
            .eq('id', offreId);

          await supabase.from('messages').insert({
            conversation_id: selectedConv,
            sender_id: user.id,
            sender_type: 'client',
            content: `✅ Je suis intéressé(e) par cette offre !`,
            offre_id: offreId
          });

          // Notify agent
          if (agentData?.user_id) {
            await supabase.rpc('create_notification', {
              p_user_id: agentData.user_id,
              p_type: 'client_interesse',
              p_title: '💚 Client intéressé',
              p_message: `${clientName} est intéressé(e) par ${offre.adresse}`,
              p_link: '/agent/offres-envoyees',
              p_metadata: { offre_id: offreId }
            });
          }

          toast({ title: "Succès", description: "Agent notifié de votre intérêt" });
          break;

        case 'planifier_visite':
          // Load proposed slots from agent
          const { data: visitSlots } = await supabase
            .from('visites')
            .select('*')
            .eq('offre_id', offreId)
            .eq('statut', 'planifiee')
            .order('date_visite', { ascending: true });
          
          setProposedSlots(visitSlots || []);
          setSelectedOffre(offre);
          setVisitDate("");
          setVisitDialogOpen(true);
          setIsProcessingAction(false);
          return; // Don't reload messages yet

        case 'deleguer_visite':
          // Load proposed slots from agent
          const { data: delegateSlots } = await supabase
            .from('visites')
            .select('*')
            .eq('offre_id', offreId)
            .eq('statut', 'planifiee')
            .order('date_visite', { ascending: true });
          
          setDelegateProposedSlots(delegateSlots || []);
          setSelectedOffre(offre);
          setDelegateDate("");
          setDelegateNotes("");
          setDelegateDialogOpen(true);
          setIsProcessingAction(false);
          return;

        case 'postuler':
        case 'deposer_candidature':
          setSelectedOffre(offre);
          setMessageClient("");
          setAccepteConditions(false);
          setCandidatureDialogOpen(true);
          return;

        case 'demander_aide':
          // Create candidature with dossier_complet: false
          await supabase.from('candidatures').insert({
            offre_id: offreId,
            client_id: clientData.id,
            message_client: 'Le client demande l\'aide de l\'agent pour postuler à ce bien.',
            statut: 'candidature_deposee',
            dossier_complet: false
          });

          await supabase
            .from('offres')
            .update({ statut: 'candidature_deposee' })
            .eq('id', offreId);

          await supabase.from('messages').insert({
            conversation_id: selectedConv,
            sender_id: user.id,
            sender_type: 'client',
            content: `🆘 J'ai besoin de votre aide pour postuler au bien ${offre.adresse}. Pouvez-vous m'accompagner dans les démarches ?`,
            offre_id: offreId
          });

          toast({ title: "Demande envoyée", description: "Votre agent va vous contacter" });
          break;

        case 'visite_effectuee':
          await supabase
            .from('offres')
            .update({ statut: 'visite_effectuee' })
            .eq('id', offreId);

          // Update visite status
          await supabase
            .from('visites')
            .update({ statut: 'effectuee' })
            .eq('offre_id', offreId)
            .eq('client_id', clientData.id);

          await supabase.from('messages').insert({
            conversation_id: selectedConv,
            sender_id: user.id,
            sender_type: 'client',
            content: `✅ J'ai effectué la visite du bien ${offre.adresse}`,
            offre_id: offreId
          });

          // Notify agent
          if (agentData?.user_id) {
            await supabase.rpc('create_notification', {
              p_user_id: agentData.user_id,
              p_type: 'visite_effectuee',
              p_title: '✅ Visite effectuée',
              p_message: `${clientName} a effectué la visite de ${offre.adresse}`,
              p_link: '/agent/visites',
              p_metadata: { offre_id: offreId }
            });
          }

          toast({ title: "Visite confirmée" });
          break;

        case 'confirmer_conclure':
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ 
                client_accepte_conclure: true,
                client_accepte_conclure_at: new Date().toISOString(),
                statut: 'bail_conclu'
              })
              .eq('id', candidature.id);

            await supabase.from('messages').insert({
              conversation_id: selectedConv,
              sender_id: user.id,
              sender_type: 'client',
              content: `🎉 Je confirme vouloir conclure le bail pour ${offre.adresse} !`,
              offre_id: offreId
            });

            toast({ title: "Confirmation envoyée", description: "Votre agent valide avec la régie" });
          }
          break;

        case 'choisir_date_signature':
          if (candidature && typeof data === 'number') {
            const datesProposees = candidature.dates_signature_proposees || [];
            const selectedDateObj = datesProposees[data];
            if (selectedDateObj) {
              await supabase
                .from('candidatures')
                .update({ 
                  date_signature_choisie: selectedDateObj.date,
                  lieu_signature: selectedDateObj.lieu,
                  statut: 'signature_planifiee'
                })
                .eq('id', candidature.id);

              // Create calendar event for signature
              await supabase.from('calendar_events').insert({
                title: `Signature bail - ${offre.adresse}`,
                event_type: 'signature',
                event_date: selectedDateObj.date,
                description: `Signature du bail pour ${offre.adresse}\nLieu: ${selectedDateObj.lieu}`,
                client_id: clientData.id,
                agent_id: clientData.agent_id,
                created_by: user.id,
                priority: 'haute'
              });

              // Sync signature to Google Calendar
              if (user) {
                syncEvent(user.id, {
                  title: `Signature bail - ${offre.adresse}`,
                  description: `Lieu: ${selectedDateObj.lieu}`,
                  start: selectedDateObj.date,
                });
              }

              await supabase.from('messages').insert({
                conversation_id: selectedConv,
                sender_id: user.id,
                sender_type: 'client',
                content: `📅 J'ai choisi la date de signature : ${format(new Date(selectedDateObj.date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })} à ${selectedDateObj.lieu}`,
                offre_id: offreId
              });

              // Notify agent
              if (agentData?.user_id) {
                await supabase.rpc('create_notification', {
                  p_user_id: agentData.user_id,
                  p_type: 'date_signature_choisie',
                  p_title: '📅 Date de signature choisie',
                  p_message: `${clientName} a choisi une date de signature pour ${offre.adresse}`,
                  p_link: '/agent/candidatures',
                  p_metadata: { candidature_id: candidature.id, offre_id: offreId }
                });
              }

              toast({ title: "Date confirmée" });
            }
          }
          break;

        case 'avis_google':
          window.open('https://share.google/rQl4mbAJowzSW2V8m', '_blank');
          if (candidature) {
            await supabase
              .from('candidatures')
              .update({ avis_google_envoye: true })
              .eq('id', candidature.id);
          }
          setThankYouDialogOpen(true);
          return;

        case 'recommander':
          setSelectedCandidature(candidature);
          setRecommendationEmails(["", "", "", "", ""]);
          setRecommendationDialogOpen(true);
          return;

        case 'details':
          navigate(`/client/offres-recues?offre=${offreId}`);
          return;

        case 'refuser':
          await supabase
            .from('offres')
            .update({ statut: 'refusee' })
            .eq('id', offreId);

          await supabase.from('messages').insert({
            conversation_id: selectedConv,
            sender_id: user.id,
            sender_type: 'client',
            content: `❌ Cette offre ne correspond pas à mes critères.`,
            offre_id: offreId
          });

          // Mark as processed
          setProcessedOffreIds(prev => new Set(prev).add(offreId));
          toast({ title: "Offre refusée" });
          break;
      }

      loadMessages(selectedConv!);
      
    } catch (error) {
      console.error('Error handling offer action:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer cette action",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Confirm visit planning
  const confirmPlanVisit = async () => {
    if (!selectedOffre || !visitDate || !user || !clientId) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData?.agent_id) {
        toast({ title: "Erreur", description: "Aucun agent assigné", variant: "destructive" });
        return;
      }

      // Check if visit already exists for this offer
      const { data: existingVisites } = await supabase
        .from('visites')
        .select('id')
        .eq('offre_id', selectedOffre.id)
        .eq('client_id', clientData.id)
        .eq('statut', 'planifiee');

      if (existingVisites && existingVisites.length > 0) {
        // Update existing visit instead of creating duplicate
        await supabase.from('visites')
          .update({ date_visite: visitDate })
          .eq('id', existingVisites[0].id);
      } else {
        // Create visit
        await supabase.from('visites').insert({
          offre_id: selectedOffre.id,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          adresse: selectedOffre.adresse,
          date_visite: visitDate,
          statut: 'planifiee',
          est_deleguee: false,
          source: 'planifiee_client'
        });
      }

      await supabase
        .from('offres')
        .update({ statut: 'visite_planifiee' })
        .eq('id', selectedOffre.id);

      const formattedDate = format(new Date(visitDate), 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
      
      // Check if calendar event already exists before creating
      const { data: existingEvents } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('event_type', 'visite')
        .eq('client_id', clientData.id)
        .ilike('title', `%${selectedOffre.adresse}%`);

      if (!existingEvents || existingEvents.length === 0) {
        await supabase.from('calendar_events').insert({
          title: `Visite - ${selectedOffre.adresse}`,
          event_type: 'visite',
          event_date: visitDate,
          description: `Visite planifiée par le client pour ${selectedOffre.adresse}`,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          created_by: user.id,
          priority: 'normale'
        });

        // Sync visite to Google Calendar
        if (user) {
          syncEvent(user.id, {
            title: `Visite - ${selectedOffre.adresse}`,
            description: `Visite planifiée pour ${selectedOffre.adresse}`,
            start: visitDate,
          });
        }
      }

      await supabase.from('messages').insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'client',
        content: `📅 J'ai planifié une visite pour le ${formattedDate} au ${selectedOffre.adresse}`,
        offre_id: selectedOffre.id
      });

      // Notify agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('user_id')
        .eq('id', clientData.agent_id)
        .single();

      if (agentData?.user_id) {
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('prenom, nom')
          .eq('id', user.id)
          .single();

        const clientName = clientProfile 
          ? `${clientProfile.prenom} ${clientProfile.nom}`.trim() 
          : 'Un client';

        await supabase.rpc('create_notification', {
          p_user_id: agentData.user_id,
          p_type: 'new_visit',
          p_title: '📅 Nouvelle visite planifiée',
          p_message: `${clientName} a planifié une visite le ${formattedDate} au ${selectedOffre.adresse}`,
          p_link: '/agent/visites',
          p_metadata: { offre_id: selectedOffre.id }
        });
      }

      // Mark as processed to hide buttons
      setProcessedOffreIds(prev => new Set(prev).add(selectedOffre.id));
      setVisitDialogOpen(false);
      toast({ title: "Visite planifiée", description: "Votre agent a été notifié" });
      loadMessages(selectedConv!);
    } catch (error) {
      console.error('Error planning visit:', error);
      toast({ title: "Erreur", description: "Impossible de planifier la visite", variant: "destructive" });
    }
  };

  // Confirm delegate visit
  const confirmDelegateVisit = async () => {
    if (!selectedOffre || !user || !clientId) return;
    
    // If proposed slots exist, a date must be selected
    if (delegateProposedSlots.length > 0 && !delegateDate) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un créneau", variant: "destructive" });
      return;
    }

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData?.agent_id) {
        toast({ title: "Erreur", description: "Aucun agent assigné", variant: "destructive" });
        return;
      }

      // Check for existing delegated visits
      const { data: existingVisites } = await supabase
        .from('visites')
        .select('id')
        .eq('offre_id', selectedOffre.id)
        .eq('client_id', clientData.id)
        .eq('est_deleguee', true);

      if (existingVisites && existingVisites.length > 0) {
        // Update existing visit
        if (delegateDate) {
          await supabase.from('visites')
            .update({ 
              date_visite: delegateDate,
              notes: delegateNotes || 'Visite déléguée à l\'agent par le client'
            })
            .eq('id', existingVisites[0].id);
        }
      } else if (delegateDate) {
        // Create delegated visit only if date is provided
        await supabase.from('visites').insert({
          offre_id: selectedOffre.id,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          adresse: selectedOffre.adresse,
          date_visite: delegateDate,
          statut: 'planifiee',
          est_deleguee: true,
          notes: delegateNotes || 'Visite déléguée à l\'agent par le client'
        });
      }

      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', selectedOffre.id);

      let messageContent: string;
      
      if (delegateDate) {
        const formattedDate = format(new Date(delegateDate), 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
        
        // Check for existing calendar event before creating
        const { data: existingEvents } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('event_type', 'visite')
          .eq('client_id', clientData.id)
          .ilike('title', `%${selectedOffre.adresse}%`);

        if (!existingEvents || existingEvents.length === 0) {
          await supabase.from('calendar_events').insert({
            title: `Visite déléguée - ${selectedOffre.adresse}`,
            event_type: 'visite',
            event_date: delegateDate,
            description: `Visite déléguée par le client pour ${selectedOffre.adresse}\n${delegateNotes ? `Notes: ${delegateNotes}` : ''}`,
            client_id: clientData.id,
            agent_id: clientData.agent_id,
            created_by: user.id,
            priority: 'haute'
        });

        // Sync visite déléguée to Google Calendar
        if (user) {
          syncEvent(user.id, {
            title: `Visite déléguée - ${selectedOffre.adresse}`,
            description: `Visite déléguée pour ${selectedOffre.adresse}`,
            start: delegateDate,
          });
        }
        }

        messageContent = `🏠 **Demande de visite déléguée**\n\n📍 ${selectedOffre.adresse}\n📅 Date souhaitée : ${formattedDate}\n${delegateNotes ? `📝 Notes : ${delegateNotes}` : ''}\n\nPouvez-vous effectuer cette visite pour moi ?`;
      } else {
        messageContent = `🏠 **Demande de visite déléguée**\n\n📍 ${selectedOffre.adresse}\n\n📋 Je souhaite que vous organisiez et effectuiez la visite pour moi. Merci de me proposer des créneaux ou de fixer une date.`;
      }

      await supabase.from('messages').insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'client',
        content: messageContent,
        offre_id: selectedOffre.id
      });

      // Notify agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('user_id')
        .eq('id', clientData.agent_id)
        .single();

      if (agentData?.user_id) {
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('prenom, nom')
          .eq('id', user.id)
          .single();

        const clientName = clientProfile 
          ? `${clientProfile.prenom} ${clientProfile.nom}`.trim() 
          : 'Un client';

        await supabase.rpc('create_notification', {
          p_user_id: agentData.user_id,
          p_type: 'visit_delegated',
          p_title: '🏠 Visite déléguée',
          p_message: `${clientName} vous demande d'effectuer une visite pour ${selectedOffre.adresse}`,
          p_link: '/agent/visites',
          p_metadata: { offre_id: selectedOffre.id }
        });
      }

      // Mark as processed to hide buttons
      setProcessedOffreIds(prev => new Set(prev).add(selectedOffre.id));
      setDelegateDialogOpen(false);
      toast({ title: "Visite déléguée", description: "Votre agent a été notifié" });
      loadMessages(selectedConv!);
    } catch (error) {
      console.error('Error delegating visit:', error);
      toast({ title: "Erreur", description: "Impossible de déléguer la visite", variant: "destructive" });
    }
  };

  // Confirm candidature
  const confirmCandidature = async () => {
    if (!selectedOffre || !accepteConditions || !user || !clientId) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data: candidature } = await supabase.from('candidatures').insert({
        offre_id: selectedOffre.id,
        client_id: clientData.id,
        message_client: messageClient || null,
        statut: 'candidature_deposee',
        dossier_complet: true
      }).select().single();

      await supabase
        .from('offres')
        .update({ statut: 'candidature_deposee' })
        .eq('id', selectedOffre.id);

      await supabase.from('messages').insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'client',
        content: `📝 **Candidature déposée**\n\n📍 ${selectedOffre.adresse}\n💰 ${selectedOffre.prix?.toLocaleString()} CHF/mois\n${messageClient ? `\n💬 Message : ${messageClient}` : ''}`,
        offre_id: selectedOffre.id
      });

      // Notify agent
      if (clientData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', clientData.agent_id)
          .single();

        if (agentData?.user_id) {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('prenom, nom')
            .eq('id', user.id)
            .single();

          const clientName = clientProfile 
            ? `${clientProfile.prenom} ${clientProfile.nom}`.trim() 
            : 'Un client';

          await supabase.rpc('create_notification', {
            p_user_id: agentData.user_id,
            p_type: 'new_candidature',
            p_title: '📝 Nouvelle candidature',
            p_message: `${clientName} a déposé une candidature pour ${selectedOffre.adresse}`,
            p_link: '/agent/candidatures',
            p_metadata: { candidature_id: candidature?.id, offre_id: selectedOffre.id }
          });
        }
      }

      setCandidatureDialogOpen(false);
      toast({ title: "Candidature envoyée", description: "Votre dossier est en cours d'examen" });
      loadMessages(selectedConv!);
    } catch (error) {
      console.error('Error submitting candidature:', error);
      toast({ title: "Erreur", description: "Impossible d'envoyer la candidature", variant: "destructive" });
    }
  };

  // Send recommendations
  const sendRecommendations = async () => {
    const validEmails = recommendationEmails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length === 0) {
      toast({ title: "Erreur", description: "Veuillez entrer au moins un email valide", variant: "destructive" });
      return;
    }

    try {
      if (selectedCandidature) {
        await supabase
          .from('candidatures')
          .update({ 
            recommandation_envoyee: true,
            emails_recommandation: validEmails
          })
          .eq('id', selectedCandidature.id);

        // Call edge function to send emails
        await supabase.functions.invoke('send-recommendation-email', {
          body: { emails: validEmails, candidature_id: selectedCandidature.id }
        });
      }

      setRecommendationDialogOpen(false);
      toast({ title: "Recommandations envoyées", description: `${validEmails.length} email(s) envoyé(s)` });
    } catch (error) {
      console.error('Error sending recommendations:', error);
      toast({ title: "Erreur", description: "Impossible d'envoyer les recommandations", variant: "destructive" });
    }
  };

  const getAgentInfo = (agentId: string) => {
    return agentsMap[agentId] || { name: "Mon agent", lastSeenAt: null, isOnline: null };
  };

  const getAgentName = (agentId: string) => {
    return getAgentInfo(agentId).name;
  };

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);
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

  // Contextual action buttons based on offer/candidature status
  const OffreActions = ({ offre, visite, onAction }: { offre: any, visite?: any, onAction: (action: string, data?: any) => void }) => {
    if (!offre) return null;
    
    // Check if this offer has been processed (action already taken)
    if (processedOffreIds.has(offre.id)) {
      return (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Check className="h-3 w-3" /> Action en cours de traitement...
          </p>
        </div>
      );
    }

    const candidature = candidaturesMap[offre.id];
    const statut = candidature?.statut || offre.statut;
    
    // Check if visit date has passed
    const isVisiteDatePassed = visite?.date_visite ? new Date(visite.date_visite) <= new Date() : false;

    // Nouvelle offre - tous les boutons disponibles
    if (statut === 'envoyee' || statut === 'vue') {
      return (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAction('interesse')} disabled={isProcessingAction} className="flex-1">
              <Heart className="h-4 w-4 mr-1" /> Intéressé(e)
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction('planifier_visite')} disabled={isProcessingAction} className="flex-1">
              <Calendar className="h-4 w-4 mr-1" /> Planifier visite
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onAction('deleguer_visite')} disabled={isProcessingAction} className="flex-1">
              <User className="h-4 w-4 mr-1" /> Déléguer visite
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onAction('postuler')} disabled={isProcessingAction} className="flex-1">
              <FileText className="h-4 w-4 mr-1" /> Postuler
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => onAction('details')} disabled={isProcessingAction}>
              <ExternalLink className="h-4 w-4 mr-1" /> Détails
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAction('refuser')} disabled={isProcessingAction}>
              <X className="h-4 w-4 mr-1" /> Refuser
            </Button>
          </div>
        </div>
      );
    }

    // Intéressé - proposer visite ou postuler
    if (statut === 'interesse') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
              <Check className="h-3 w-3" /> Vous êtes intéressé(e) par cette offre
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAction('planifier_visite')} className="flex-1">
              <Calendar className="h-4 w-4 mr-1" /> Planifier visite
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction('deleguer_visite')} className="flex-1">
              <User className="h-4 w-4 mr-1" /> Déléguer visite
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onAction('postuler')} className="w-full">
            <FileText className="h-4 w-4 mr-1" /> Postuler directement
          </Button>
        </div>
      );
    }

    // Visite planifiée - confirmer la visite effectuée
    if (statut === 'visite_planifiee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Visite planifiée
              {visite?.date_visite && (
                <span className="ml-1">
                  ({format(new Date(visite.date_visite), 'dd/MM à HH:mm', { locale: fr })})
                </span>
              )}
            </p>
          </div>
          {isVisiteDatePassed ? (
            <Button size="sm" onClick={() => onAction('visite_effectuee')} className="w-full">
              <Check className="h-4 w-4 mr-1" /> Marquer visite effectuée
            </Button>
          ) : (
            <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                ⏳ Actions disponibles après la visite
              </p>
            </div>
          )}
        </div>
      );
    }

    // Visite effectuée - proposer de postuler (only if date passed)
    if (statut === 'visite_effectuee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
              <Check className="h-3 w-3" /> Visite effectuée
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAction('deposer_candidature')} className="flex-1">
              <FileText className="h-4 w-4 mr-1" /> Déposer candidature
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction('demander_aide')} className="flex-1">
              <User className="h-4 w-4 mr-1" /> Demander aide agent
            </Button>
          </div>
        </div>
      );
    }

    // Candidature déposée / En attente
    if (statut === 'candidature_deposee' || statut === 'en_attente') {
      return (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              En attente de réponse de la régie...
            </p>
          </div>
        </div>
      );
    }

    // Candidature acceptée - confirmer pour conclure
    if (statut === 'acceptee') {
      return (
        <div className="mt-3 space-y-2">
          <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-700 dark:text-green-300">
                🎉 Félicitations ! Candidature acceptée !
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => onAction('confirmer_conclure')} className="w-full">
            <Check className="h-4 w-4 mr-1" /> Confirmer et conclure
          </Button>
        </div>
      );
    }

    // Bail conclu - en attente validation régie
    if (statut === 'bail_conclu') {
      return (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Vous avez confirmé vouloir ce bien. En attente de validation par la régie...
          </p>
        </div>
      );
    }

    // Attente bail
    if (statut === 'attente_bail') {
      return (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              L'agent attend le bail de la régie...
            </p>
          </div>
        </div>
      );
    }

    // Bail reçu - choisir date signature
    if (statut === 'bail_recu' && candidature) {
      const datesProposees = candidature.dates_signature_proposees || [];
      return (
        <div className="mt-3 space-y-2">
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              📄 Le bail est prêt ! Choisissez une date de signature.
            </p>
          </div>
          {datesProposees.length > 0 ? (
            <RadioGroup 
              value={selectedSignatureDate} 
              onValueChange={(val) => {
                setSelectedSignatureDate(val);
                onAction('choisir_date_signature', parseInt(val));
              }}
              className="space-y-2"
            >
              {datesProposees.map((d: any, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                  <RadioGroupItem value={String(idx)} id={`date-${idx}`} />
                  <Label htmlFor={`date-${idx}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">
                      {format(new Date(d.date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">📍 {d.lieu}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-sm text-muted-foreground p-2">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Votre agent vous proposera des dates prochainement.
            </p>
          )}
        </div>
      );
    }

    // Signature planifiée
    if (statut === 'signature_planifiee' && candidature) {
      return (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              📅 Signature confirmée
            </p>
          </div>
          {candidature.date_signature_choisie && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {format(new Date(candidature.date_signature_choisie), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {candidature.lieu_signature || 'Lieu à confirmer'}
          </p>
        </div>
      );
    }

    // Signature effectuée - attente état des lieux
    if (statut === 'signature_effectuee') {
      return (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            ✅ Bail signé ! En attente de la date d'état des lieux...
          </p>
        </div>
      );
    }

    // État des lieux fixé
    if (statut === 'etat_lieux_fixe' && candidature) {
      return (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              🔑 État des lieux fixé
            </p>
          </div>
          {candidature.date_etat_lieux && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {format(new Date(candidature.date_etat_lieux), 'EEEE d MMMM yyyy', { locale: fr })}
              {candidature.heure_etat_lieux && ` à ${candidature.heure_etat_lieux}`}
            </p>
          )}
        </div>
      );
    }

    // Clés remises - Félicitations + avis + recommandation
    if (statut === 'cles_remises') {
      return (
        <div className="mt-3 space-y-3">
          <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-700 dark:text-green-300">
                🔑 🎉 Félicitations ! Les clés vous ont été remises !
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onAction('avis_google')} className="flex-1">
              <Star className="h-4 w-4 mr-1" /> Laisser un avis Google
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction('recommander')} className="flex-1">
              <Mail className="h-4 w-4 mr-1" /> Recommander à des amis
            </Button>
          </div>
        </div>
      );
    }

    // Refusée
    if (statut === 'refusee') {
      return (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <X className="h-4 w-4" />
            ❌ Cette offre/candidature a été refusée
          </p>
        </div>
      );
    }

    return null;
  };

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = removeAccents(searchQuery.toLowerCase());
    return conversations.filter(conv => {
      const agentName = removeAccents(getAgentName(conv.agent_id).toLowerCase());
      return agentName.includes(query);
    });
  }, [conversations, searchQuery, agentsMap]);

  const conversationsList = (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Premium background effects */}
      <FloatingParticles count={10} className="opacity-30" />
      
      {/* Premium Header */}
      <div className="relative z-10 p-4 border-b border-border/30 bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <SidebarTrigger className="shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xl gradient-text">Messages</h2>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            {conversations.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {/* Unread badge */}
          {conversations.some(c => messages.filter(m => m.conversation_id === c.id && !m.read && m.sender_type === 'agent').length > 0) && (
            <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">
              Nouveau
            </Badge>
          )}
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-9 bg-muted/50 border-border/50",
              "focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
              "transition-all duration-300"
            )}
          />
        </div>
      </div>
      
      {/* Conversations list */}
      <ScrollArea className="flex-1 relative z-10">
        {isLoadingConversations ? (
          <ConversationListSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 animate-float">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {searchQuery ? 'Essayez un autre terme' : 'Vos messages apparaîtront ici'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv, index) => {
            const lastMsg = lastMessagesMap.get(conv.id);
            const lastMessageText = lastMsg?.content || (lastMsg?.attachment_name ? `📎 ${lastMsg.attachment_name}` : conv.subject || null);
            // Use the preloaded unread counts map
            const unreadCount = unreadCountsMap.get(conv.id) || 0;
            
            return (
              <PremiumConversationItem
                key={conv.id}
                name={getAgentName(conv.agent_id)}
                avatarUrl={null}
                lastMessage={lastMessageText}
                lastMessageTime={conv.last_message_at || conv.created_at}
                unreadCount={unreadCount}
                isSelected={selectedConv === conv.id}
                onClick={() => setSelectedConv(conv.id)}
                index={index}
                lastSeenAt={getAgentInfo(conv.agent_id).lastSeenAt}
                isOnline={getAgentInfo(conv.agent_id).isOnline}
              />
            );
          })
        )}
      </ScrollArea>
    </div>
  );

  const chatHeader = currentConversation && (
    <ChatHeader
      name={getAgentName(currentConversation.agent_id)}
      avatarUrl={null}
      lastSeenAt={getAgentInfo(currentConversation.agent_id).lastSeenAt}
      isOnline={getAgentInfo(currentConversation.agent_id).isOnline}
    />
  );

  // Calculer le dernier message pour chaque offre
  const lastMessageByOffre = useMemo(() => {
    const map = new Map<string, string>();
    selectedMessages.forEach(msg => {
      if (msg.offre_id) {
        map.set(msg.offre_id, msg.id); // Garder le dernier (ordre chronologique)
      }
    });
    return map;
  }, [selectedMessages]);

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden">
      {/* Premium background */}
      <MeshGradientBackground />
      <ChatPatternBackground />
      
      {/* Messages area */}
      <ScrollArea 
        className="flex-1 relative z-10 min-w-0"
        viewportRef={scrollViewportRef}
        viewportClassName="p-2 sm:p-4"
        onScroll={handleScroll}
      >
        {isLoadingMessages ? (
          <MessagesListSkeleton />
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto min-w-0">
            {selectedMessages.map((msg, index) => {
              const isSent = msg.sender_type === 'client';
              // Déterminer le nom de l'expéditeur selon le type
              let senderName: string | undefined;
              if (isSent) {
                senderName = undefined; // Nos propres messages
              } else if (msg.sender_type === 'admin') {
                senderName = 'Admin';
              } else {
                senderName = getAgentName(currentConversation?.agent_id);
              }
              
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
                    content={msg.content || ''}
                    isSent={isSent}
                    timestamp={msg.created_at}
                    read={msg.read}
                    senderName={senderName}
                    attachmentUrl={msg.attachment_url}
                    attachmentName={msg.attachment_name}
                    attachmentType={msg.attachment_type}
                    attachmentSize={msg.attachment_size}
                    payload={msg.payload as any}
                    index={index}
                  />
                  {isLastMessageForOffre && offresMap[msg.offre_id!] && (
                    <div className={`mt-3 ${isSent ? 'ml-auto' : 'mr-auto'} max-w-[80%] md:max-w-[65%] animate-slide-up`}>
                      <PremiumOffreCard offre={offresMap[msg.offre_id!]} />
                      <OffreActions 
                        offre={offresMap[msg.offre_id!]} 
                        visite={visitesMap[msg.offre_id!]}
                        onAction={(action, data) => handleOffreAction(msg.offre_id, action, data)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
      
      {/* Input area */}
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
        />
      </div>

      {/* Dialog Planifier Visite */}
      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent className="glass-premium border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Planifier une visite
            </DialogTitle>
            <DialogDescription>
              {proposedSlots.length > 0 
                ? `Sélectionnez un créneau proposé par votre agent pour ${selectedOffre?.adresse}`
                : `Choisissez la date et l'heure de votre visite pour ${selectedOffre?.adresse}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {proposedSlots.length > 0 ? (
              <RadioGroup value={visitDate} onValueChange={setVisitDate} className="space-y-2">
                {proposedSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <RadioGroupItem value={slot.date_visite} id={`slot-${idx}`} />
                    <Label htmlFor={`slot-${idx}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">
                        {format(new Date(slot.date_visite), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div>
                <Label htmlFor="visit-date">Date et heure</Label>
                <Input
                  id="visit-date"
                  type="datetime-local"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="mt-1.5"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitDialogOpen(false)}>Annuler</Button>
            <Button onClick={confirmPlanVisit} disabled={!visitDate} className="bg-gradient-to-r from-primary to-primary/80">
              <Calendar className="h-4 w-4 mr-2" /> Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Déléguer Visite */}
      <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
        <DialogContent className="glass-premium border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Déléguer la visite à votre agent
            </DialogTitle>
            <DialogDescription>
              Votre agent effectuera la visite pour vous et vous fera un retour détaillé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {delegateProposedSlots.length > 0 ? (
              <div>
                <Label>Sélectionnez un créneau</Label>
                <RadioGroup value={delegateDate} onValueChange={setDelegateDate} className="space-y-2 mt-2">
                  {delegateProposedSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <RadioGroupItem value={slot.date_visite} id={`delegate-slot-${idx}`} />
                      <Label htmlFor={`delegate-slot-${idx}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">
                          {format(new Date(slot.date_visite), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Aucun créneau proposé. Votre agent organisera la visite et vous proposera des dates.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="delegate-notes">Notes pour l'agent (optionnel)</Label>
              <Textarea
                id="delegate-notes"
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
                placeholder="Points à vérifier, questions à poser..."
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={confirmDelegateVisit} 
              disabled={delegateProposedSlots.length > 0 && !delegateDate}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <User className="h-4 w-4 mr-2" /> Déléguer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Candidature */}
      <Dialog open={candidatureDialogOpen} onOpenChange={setCandidatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📝 Déposer ma candidature</DialogTitle>
            <DialogDescription>
              Soumettez votre candidature pour {selectedOffre?.adresse}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message-client">Message pour l'agent (optionnel)</Label>
              <Textarea
                id="message-client"
                value={messageClient}
                onChange={(e) => setMessageClient(e.target.value)}
                placeholder="Motivations, situation particulière..."
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="conditions"
                checked={accepteConditions}
                onCheckedChange={(checked) => setAccepteConditions(checked as boolean)}
              />
              <Label htmlFor="conditions" className="text-sm leading-tight cursor-pointer">
                Je confirme que mon dossier est complet et que les informations fournies sont exactes
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandidatureDialogOpen(false)}>Annuler</Button>
            <Button onClick={confirmCandidature} disabled={!accepteConditions}>
              <FileText className="h-4 w-4 mr-2" /> Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Recommandation */}
      <Dialog open={recommendationDialogOpen} onOpenChange={setRecommendationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📧 Recommander Immo-Rama</DialogTitle>
            <DialogDescription>
              Partagez votre expérience avec vos proches ! Entrez jusqu'à 5 adresses email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {recommendationEmails.map((email, idx) => (
              <Input
                key={idx}
                type="email"
                placeholder={`Email ${idx + 1}`}
                value={email}
                onChange={(e) => {
                  const newEmails = [...recommendationEmails];
                  newEmails[idx] = e.target.value;
                  setRecommendationEmails(newEmails);
                }}
              />
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecommendationDialogOpen(false)}>Annuler</Button>
            <Button onClick={sendRecommendations}>
              <Mail className="h-4 w-4 mr-2" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Remerciement Google */}
      <Dialog open={thankYouDialogOpen} onOpenChange={setThankYouDialogOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            <DialogTitle className="text-2xl">Merci infiniment ! 🙏</DialogTitle>
            <DialogDescription className="text-base mt-4 space-y-3">
              <p>
                Votre avis compte énormément pour nous et aide d'autres personnes 
                à nous faire confiance dans leur recherche de logement.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Grâce à vous, nous pouvons continuer à accompagner des familles 
                vers leur nouveau chez-soi !
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => setThankYouDialogOpen(false)} className="w-full">
              <PartyPopper className="h-4 w-4 mr-2" />
              Avec plaisir !
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
        chatHeader={chatHeader}
      />
    </div>
  );
};

export default Messagerie;
