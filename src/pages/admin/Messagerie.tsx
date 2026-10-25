import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Home, Megaphone, MessageSquare, RefreshCw, UserCog } from "lucide-react";
import { ScrollToTopButton } from "@/components/messaging/ScrollToTopButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageAttachmentUploader } from "@/components/MessageAttachmentUploader";
import { useNotifications } from "@/hooks/useNotifications";
import { AdminNewConversationDialog } from "@/components/AdminNewConversationDialog";
import { PremiumMessageBubble } from "@/components/messaging/PremiumMessageBubble";
import { PremiumConversationItem } from "@/components/messaging/PremiumConversationItem";
import { PremiumChatInput } from "@/components/messaging/PremiumChatInput";
import { ChatHeader } from "@/components/messaging/ChatHeader";
import { ConversationListSkeleton, MessagesListSkeleton } from "@/components/messaging/MessagingSkeletons";
import DateSeparator from "@/components/messaging/DateSeparator";
import { isSameDay, parseISO } from "date-fns";
import { type ConversationTabKey } from "@/components/messaging/ConversationTabs";
import { computeTabBuckets, type ConvLastMeta } from "@/lib/messagingTabs";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { MessengerSplitLayout, MESSENGER_PAGE_HEIGHT } from "@/components/messaging/MessengerSplitLayout";
import {
  ChatEmptyState,
  ConversationFilterPills,
  ConversationItemsList,
  ConversationListEmpty,
  ConversationListHeader,
  ConversationSearchField,
} from "@/components/messaging/ConversationListParts";

type ConvTypeKey = "clients" | "agents" | "proprietaires" | "annonces";
const CONV_TYPE_LABELS: Record<ConvTypeKey, string> = {
  clients: "Clients",
  agents: "Agents",
  proprietaires: "Propriétaires",
  annonces: "Annonces",
};
const CONV_TYPE_ICONS: Record<ConvTypeKey, React.ElementType> = {
  clients: MessageSquare,
  agents: UserCog,
  proprietaires: Home,
  annonces: Megaphone,
};

const ADMIN_TAB_STORAGE_KEY = "messagerie_admin_tab";

// Fonction pour retirer les accents des chaînes pour une recherche plus flexible
const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const Messagerie = () => {
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [unreadCountsMap, setUnreadCountsMap] = useState<Map<string, number>>(new Map());
  const [lastMetaMap, setLastMetaMap] = useState<Map<string, ConvLastMeta>>(new Map());
  const [videoConvSet, setVideoConvSet] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ConversationTabKey>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_TAB_STORAGE_KEY) as ConversationTabKey | null;
      if (saved && ["a_traiter", "videos", "clients", "robot", "tout"].includes(saved)) return saved;
    } catch {}
    return "a_traiter";
  });
  useEffect(() => {
    try { localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab); } catch {}
  }, [activeTab]);
  // Filtre d'affichage par type de conversation (non mémorisé)
  const [typeFilter, setTypeFilter] = useState<"all" | ConvTypeKey>("all");

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
    loadConversations();
    loadUnreadCounts();
    // Mark new_message notifications as read when visiting this page
    markTypeAsRead('new_message');
  }, []);

  const loadUnreadCounts = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('masque_messagerie', false)
        .eq('read', false)
        .neq('sender_type', 'admin');

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
    if (selectedConv) {
      loadMessages(selectedConv);
      
      // S'abonner aux nouveaux messages en temps réel
      const channel = supabase
        .channel(`admin-messages-${selectedConv}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConv}`
          },
          (payload) => {
            const newMessage = payload.new as any;
            if (newMessage?.masque_messagerie) return;
            // Charger le profil de l'expéditeur
            supabase
              .from('profiles')
              .select('id, prenom, nom')
              .eq('id', newMessage.sender_id)
              .single()
              .then(({ data: senderProfile }) => {
                const enrichedMessage = {
                  ...newMessage,
                  senderName: senderProfile
                    ? `${senderProfile.prenom} ${senderProfile.nom}`
                    : newMessage.sender_type === 'client' ? 'Client' : newMessage.sender_type === 'admin' ? 'Admin' : 'Agent'
                };
                setMessages(prev => [...prev, enrichedMessage]);
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConv]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (data) {
        // Charger les clients et les agents
        const clientIds = [...new Set(data.map(c => c.client_id).filter(Boolean))] as string[];
        const agentIds = [...new Set(data.map(c => c.agent_id).filter(Boolean))] as string[];
        const adminUserIds = [...new Set(data.map(c => c.admin_user_id).filter(Boolean))] as string[];
        const conversationIds = data.map(c => c.id);
        
        // Charger les clients
        const { data: clientsData } = clientIds.length > 0 
          ? await supabase.from('clients').select('id, user_id').in('id', clientIds)
          : { data: [] as { id: string; user_id: string }[] };
        
        // Charger les agents
        const { data: agentsData } = agentIds.length > 0
          ? await supabase.from('agents').select('id, user_id').in('id', agentIds)
          : { data: [] as { id: string; user_id: string }[] };
        
        // Récupérer tous les user_ids pour charger les profils
        const allUserIds = [
          ...(clientsData?.map(c => c.user_id) || []),
          ...(agentsData?.map(a => a.user_id) || []),
          ...adminUserIds
        ];
        
        const { data: profilesData } = allUserIds.length > 0
          ? await supabase.from('profiles').select('id, prenom, nom, email, last_seen_at, is_online').in('id', allUserIds)
          : { data: [] as { id: string; prenom: string; nom: string; email: string; last_seen_at: string | null; is_online: boolean | null }[] };

        // Charger les derniers messages de chaque conversation (+ meta pour les onglets)
        const { data: lastMessagesData } = conversationIds.length > 0
          ? await supabase
              .from('messages')
              .select('conversation_id, content, attachment_name, attachment_type, sender_type, sender_id, created_at')
              .eq('masque_messagerie', false)
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false })
          : { data: [] as any[] };

        // Créer une map du dernier message par conversation + meta + vidéo set
        const lastMessagesMap = new Map<string, { content: string | null; attachment_name: string | null }>();
        const metaMap = new Map<string, ConvLastMeta>();
        const videoSet = new Set<string>();
        (lastMessagesData || []).forEach((msg: any) => {
          if (!lastMessagesMap.has(msg.conversation_id)) {
            lastMessagesMap.set(msg.conversation_id, {
              content: msg.content,
              attachment_name: msg.attachment_name
            });
            metaMap.set(msg.conversation_id, {
              sender_type: msg.sender_type,
              sender_id: msg.sender_id,
              attachment_type: msg.attachment_type,
            });
          }
          if (msg.attachment_type === 'video') videoSet.add(msg.conversation_id);
        });
        setLastMetaMap(metaMap);
        setVideoConvSet(videoSet);
        
        const clientsMap = new Map<string, string>(clientsData?.map(c => [c.id, c.user_id] as [string, string]) || []);
        const agentsMap = new Map<string, string>(agentsData?.map(a => [a.id, a.user_id] as [string, string]) || []);
        const profilesMap = new Map<string, { id: string; prenom: string; nom: string; email: string; last_seen_at: string | null; is_online: boolean | null }>(
          profilesData?.map(p => [p.id, p] as [string, typeof p]) || []
        );
        
        // Enrichir les conversations
        const enrichedConvs = data.map(conv => {
          const clientUserId = clientsMap.get(conv.client_id || '');
          const clientProfile = clientUserId ? profilesMap.get(clientUserId) : null;
          
          const agentUserId = agentsMap.get(conv.agent_id);
          const agentProfile = agentUserId ? profilesMap.get(agentUserId) : null;

          const adminProfile = conv.admin_user_id ? profilesMap.get(conv.admin_user_id) : null;

          const lastMsg = lastMessagesMap.get(conv.id);
          const lastMessageText = lastMsg?.content || (lastMsg?.attachment_name ? `📎 ${lastMsg.attachment_name}` : null);
          
          return {
            ...conv,
            clientName: clientProfile 
              ? `${clientProfile.prenom} ${clientProfile.nom}` 
              : null,
            agentName: agentProfile 
              ? `${agentProfile.prenom} ${agentProfile.nom}` 
              : 'Agent inconnu',
            adminName: adminProfile
              ? `${adminProfile.prenom} ${adminProfile.nom}`
              : null,
            lastMessageText,
            clientLastSeenAt: clientProfile?.last_seen_at,
            clientIsOnline: clientProfile?.is_online,
          };
        });
        
        setConversations(enrichedConvs);
        setProfiles(profilesMap as Map<string, any>);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleConversationCreated = (conversationId: string) => {
    loadConversations();
    setSelectedConv(conversationId);
  };

  const loadMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('masque_messagerie', false)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (data) {
        // Charger les profils pour les expéditeurs
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: sendersData } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', senderIds);
        
        const sendersMap = new Map(sendersData?.map(p => [p.id, p]));
        
        const enrichedMessages = data.map(msg => ({
          ...msg,
          senderName: sendersMap.get(msg.sender_id) 
            ? `${sendersMap.get(msg.sender_id).prenom} ${sendersMap.get(msg.sender_id).nom}`
            : msg.sender_type === 'client' ? 'Client' : msg.sender_type === 'admin' ? 'Admin' : 'Agent'
        }));
        
        setMessages(enrichedMessages);
        
        // Marquer les messages comme lus
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', convId)
          .eq('read', false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const content = textOverride ?? messageText;
    if ((!content.trim() && !pendingAttachment) || !selectedConv || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'admin',
        content: content.trim() || null,
        attachment_url: pendingAttachment?.url || null,
          attachment_thumbnail_url: (pendingAttachment as any)?.thumbnail_url || null,
        attachment_type: pendingAttachment?.type || null,
        attachment_name: pendingAttachment?.name || null,
        attachment_size: pendingAttachment?.size || null,
      });

    if (error) {
      console.error('Erreur envoi message:', error);
      return;
    }

    setMessageText('');
    setPendingAttachment(null);
    
    // Mettre à jour le timestamp de la conversation
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', selectedConv);

    // Send notifications
    const conversation = conversations.find(c => c.id === selectedConv);
    if (conversation) {
      // Get admin name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', user.id)
        .single();

      const adminName = adminProfile 
        ? `${adminProfile.prenom} ${adminProfile.nom}`.trim() 
        : 'L\'administrateur';

      // If it's an admin-agent conversation, notify the agent
      if (conversation.conversation_type === 'admin-agent') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', conversation.agent_id)
          .single();

        if (agentData) {
          await supabase.rpc('create_notification', {
            p_user_id: agentData.user_id,
            p_type: 'new_message',
            p_title: 'Nouveau message admin',
            p_message: `${adminName} vous a envoyé un message`,
            p_link: `/agent/messagerie?conversationId=${selectedConv}`,
            p_metadata: { conversation_id: selectedConv }
          });

          await supabase.functions.invoke('send-notification-email', {
            body: {
              user_id: agentData.user_id,
              notification_type: 'new_message',
              title: 'Nouveau message admin',
              message: `${adminName} vous a envoyé un message`,
              link: `/agent/messagerie?conversationId=${selectedConv}`
            }
          });
        }
      } else {
        // Client-agent conversation - notify both
        if (conversation.client_id) {
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
              p_message: `${adminName} vous a envoyé un message`,
              p_link: `/client/messagerie?conversationId=${selectedConv}`,
              p_metadata: { conversation_id: selectedConv }
            });

            await supabase.functions.invoke('send-notification-email', {
              body: {
                user_id: clientData.user_id,
                notification_type: 'new_message',
                title: 'Nouveau message',
                message: `${adminName} vous a envoyé un message`,
                link: `/client/messagerie?conversationId=${selectedConv}`
              }
            });
          }
        }

        // Notify agent
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', conversation.agent_id)
          .single();

        if (agentData) {
          await supabase.rpc('create_notification', {
            p_user_id: agentData.user_id,
            p_type: 'new_message',
            p_title: 'Nouveau message',
            p_message: `${adminName} a envoyé un message dans une conversation`,
            p_link: `/agent/messagerie?conversationId=${selectedConv}`,
            p_metadata: { conversation_id: selectedConv }
          });

          await supabase.functions.invoke('send-notification-email', {
            body: {
              user_id: agentData.user_id,
              notification_type: 'new_message',
              title: 'Nouveau message',
              message: `${adminName} a envoyé un message dans une conversation`,
              link: `/agent/messagerie?conversationId=${selectedConv}`
            }
          });
        }
      }
    }
  };

  const searchedConversations = conversations.filter(conv => {
    const searchTerm = removeAccents(searchQuery.toLowerCase());
    const clientName = removeAccents((conv.clientName || '').toLowerCase());
    const agentName = removeAccents((conv.agentName || '').toLowerCase());
    return clientName.includes(searchTerm) || agentName.includes(searchTerm);
  });

  const { filtered: tabBuckets, counts: tabCounts } = useMemo(
    () => computeTabBuckets({
      conversations: searchedConversations,
      getId: (c: any) => c.id,
      lastMetaMap,
      unreadMap: unreadCountsMap,
      videoConvSet,
      selfSenderType: 'admin',
    }),
    [searchedConversations, lastMetaMap, unreadCountsMap, videoConvSet]
  );
  const filteredConversations = tabBuckets[activeTab];

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);
  const currentConversation = conversations.find(c => c.id === selectedConv);

  // --- Affichage (calculs purement visuels à partir des données déjà chargées) ---
  const getListName = (conv: any) =>
    conv.conversation_type === 'admin-agent' ? conv.agentName : conv.clientName || 'Client';

  const typeOf = (conv: any): ConvTypeKey => {
    switch (conv.conversation_type) {
      case 'admin-agent': return 'agents';
      case 'proprietaire': return 'proprietaires';
      case 'annonce': return 'annonces';
      default: return 'clients';
    }
  };

  // Filtre par type (Clients / Agents / Propriétaires / Annonces), appliqué sur « Tout »
  const typeCounts = useMemo(() => {
    const counts: Record<ConvTypeKey, number> = { clients: 0, agents: 0, proprietaires: 0, annonces: 0 };
    searchedConversations.forEach((c) => { counts[typeOf(c)] += 1; });
    return counts;
  }, [searchedConversations]);
  const presentTypes = (Object.keys(typeCounts) as ConvTypeKey[]).filter((k) => typeCounts[k] > 0);

  const visibleConversations = typeFilter === 'all'
    ? filteredConversations
    : searchedConversations.filter((c) => typeOf(c) === typeFilter);

  // Résumé de l'en-tête (sur l'ensemble, hors recherche)
  const totalUnreadConvs = useMemo(
    () => conversations.filter((c) => (unreadCountsMap.get(c.id) || 0) > 0).length,
    [conversations, unreadCountsMap]
  );
  const headerSummary = isLoadingConversations
    ? 'Chargement…'
    : totalUnreadConvs > 0
      ? `${totalUnreadConvs} conversation${totalUnreadConvs > 1 ? 's' : ''} non lue${totalUnreadConvs > 1 ? 's' : ''} · ${conversations.length} au total`
      : `${conversations.length} conversation${conversations.length > 1 ? 's' : ''} · tout est lu`;

  type PillKey = ConversationTabKey | `type:${ConvTypeKey}`;
  const pillOptions: { key: PillKey; label: string; count?: number; alert?: boolean }[] = [
    { key: 'a_traiter', label: 'À traiter', count: tabCounts.a_traiter, alert: tabCounts.a_traiter > 0 },
    { key: 'clients', label: 'Réponses clients', count: tabCounts.clients },
    { key: 'videos', label: 'Vidéos & visites', count: tabCounts.videos },
    { key: 'robot', label: 'Offres du robot', count: tabCounts.robot },
    { key: 'tout', label: 'Tout', count: tabCounts.tout },
    ...(presentTypes.length > 1
      ? presentTypes.map((k) => ({ key: `type:${k}` as PillKey, label: CONV_TYPE_LABELS[k], count: typeCounts[k] }))
      : []),
  ];
  const activePill: PillKey = typeFilter === 'all' ? activeTab : `type:${typeFilter}`;
  const handlePillChange = (key: PillKey) => {
    if (key.startsWith('type:')) {
      setTypeFilter(key.slice(5) as ConvTypeKey);
      setActiveTab('tout');
    } else {
      setTypeFilter('all');
      setActiveTab(key as ConversationTabKey);
    }
  };

  const handleRefresh = () => {
    loadConversations();
    loadUnreadCounts();
  };

  const emptyTitle = searchQuery
    ? 'Aucune conversation trouvée'
    : activePill === 'a_traiter'
      ? 'Rien à traiter'
      : 'Aucune conversation';
  const emptyDescription = searchQuery
    ? 'Essayez un autre nom de client ou d\'agent.'
    : activePill === 'a_traiter'
      ? 'Toutes les conversations ont reçu une réponse.'
      : 'Rien dans ce filtre pour le moment.';

  const conversationsList = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <StoriesBar />
      <ConversationListHeader
        title="Messagerie"
        subtitle={headerSummary}
        leading={<SidebarTrigger className="hidden lg:inline-flex h-10 w-10 rounded-full" />}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleRefresh}
              aria-label="Actualiser"
              title="Actualiser"
            >
              <RefreshCw className={isLoadingConversations ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
            {/* Bouton « Nouvelle conversation » réduit à son icône ronde (le libellé reste lu par les lecteurs d'écran) */}
            <div className="[&>button]:h-10 [&>button]:w-10 [&>button]:gap-0 [&>button]:rounded-full [&>button]:p-0 [&>button]:text-[0px] [&>button>svg]:m-0">
              <AdminNewConversationDialog onConversationCreated={handleConversationCreated} />
            </div>
          </>
        }
      />
      <ConversationSearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Rechercher par client ou agent"
      />
      <ConversationFilterPills options={pillOptions} value={activePill} onChange={handlePillChange} />
      <div className="border-t border-border/70" />
      <ScrollArea className="flex-1 min-h-0 min-w-0 max-w-full" viewportClassName="!block !w-full !min-w-0 max-w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:max-w-full">
        {isLoadingConversations ? (
          <ConversationListSkeleton />
        ) : visibleConversations.length === 0 ? (
          <ConversationListEmpty
            icon={activePill === 'a_traiter' && !searchQuery ? CheckCircle2 : MessageSquare}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <ConversationItemsList>
            {visibleConversations.map((conv, index) => {
              const isAgentConv = conv.conversation_type === 'admin-agent';
              const type = typeOf(conv);
              return (
                <PremiumConversationItem
                  key={conv.id}
                  name={getListName(conv)}
                  avatarUrl={null}
                  subtitle={isAgentConv ? 'Agent' : conv.agentName ? `Agent : ${conv.agentName}` : undefined}
                  lastMessage={conv.lastMessageText}
                  lastMessageTime={conv.last_message_at}
                  unreadCount={unreadCountsMap.get(conv.id) || 0}
                  isSelected={selectedConv === conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  index={index}
                  lastSeenAt={!isAgentConv ? conv.clientLastSeenAt : undefined}
                  isOnline={!isAgentConv ? conv.clientIsOnline : undefined}
                  channelIcon={type === 'clients' ? undefined : CONV_TYPE_ICONS[type]}
                  channelLabel={type === 'clients' ? undefined : CONV_TYPE_LABELS[type]}
                />
              );
            })}
          </ConversationItemsList>
        )}
      </ScrollArea>
    </div>
  );

  const headerName = currentConversation
    ? currentConversation.conversation_type === 'admin-agent'
      ? currentConversation.agentName
      : currentConversation.clientName ?? 'Client'
    : undefined;
  const headerSubtitle = currentConversation
    ? [
        currentConversation.conversation_type === 'admin-agent'
          ? 'Agent'
          : currentConversation.agentName
            ? `avec ${currentConversation.agentName}`
            : null,
        currentConversation.subject || null,
      ].filter(Boolean).join(' · ') || 'Conversation'
    : undefined;
  const headerIsOnline =
    currentConversation?.conversation_type !== 'admin-agent'
      ? !!currentConversation?.clientIsOnline
      : false;

  const chatHeader = currentConversation && (
    <ChatHeader
      name={headerName || 'Conversation'}
      avatarUrl={null}
      status={currentConversation.subject}
      subtitle={headerSubtitle}
      conversationId={currentConversation.id}
      lastSeenAt={currentConversation.conversation_type !== 'admin-agent' ? currentConversation.clientLastSeenAt : undefined}
      isOnline={currentConversation.conversation_type !== 'admin-agent' ? currentConversation.clientIsOnline : undefined}
    />
  );

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden bg-background">
      <ScrollArea
        className="flex-1 relative min-w-0"
        viewportRef={scrollViewportRef}
        viewportClassName="px-3 py-2 sm:px-4 [&>div]:!block [&>div]:!min-w-0 [&>div]:max-w-full"
        onScroll={handleScroll}
      >
        {isLoadingMessages ? (
          <MessagesListSkeleton />
        ) : selectedMessages.length === 0 ? (
          <ChatEmptyState
            title="Aucun message"
            description="Écrivez le premier message de cette conversation."
          />
        ) : (
          <div className="max-w-3xl mx-auto min-w-0 pb-2">
            {selectedMessages.map((msg, index) => {
              const isSent = msg.sender_type === 'admin';
              const senderName = isSent ? undefined : msg.senderName;

              // Séparateur de date : premier message ou changement de jour
              const showDateSeparator = index === 0 ||
                !isSameDay(parseISO(msg.created_at), parseISO(selectedMessages[index - 1].created_at));

              return (
                <div key={msg.id}>
                  {showDateSeparator && <DateSeparator date={msg.created_at} />}
                  <PremiumMessageBubble
                    content={msg.content || ''}
                    isSent={isSent}
                    senderType={msg.sender_type}
                    timestamp={msg.created_at}
                    read={msg.read}
                    senderName={senderName}
                    attachmentUrl={msg.attachment_url}
                    attachmentName={msg.attachment_name}
                    attachmentType={msg.attachment_type}
                    attachmentSize={msg.attachment_size}
                    payload={msg.payload as any}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
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
            value={pendingAttachment}
            onAttachmentReady={setPendingAttachment}
          />
        }
      />
    </div>
  ) : (
    <ChatEmptyState />
  );

  return (
    <MessengerSplitLayout
      className={MESSENGER_PAGE_HEIGHT}
      conversationsList={conversationsList}
      chatView={chatView}
      chatHeader={chatHeader}
      selectedConversation={selectedConv}
      onBack={() => setSelectedConv(null)}
      headerName={headerName}
      headerSubtitle={headerSubtitle}
      headerAvatarUrl={null}
      isOnline={headerIsOnline}
    />
  );
};

export default Messagerie;