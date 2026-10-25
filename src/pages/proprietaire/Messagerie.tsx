import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isSameDay, parseISO } from 'date-fns';

// Messaging components
import { PremiumMessageBubble } from '@/components/messaging/PremiumMessageBubble';
import { PremiumConversationItem } from '@/components/messaging/PremiumConversationItem';
import { PremiumChatInput } from '@/components/messaging/PremiumChatInput';
import { ChatHeader } from '@/components/messaging/ChatHeader';
import { ConversationListSkeleton, MessagesListSkeleton } from '@/components/messaging/MessagingSkeletons';
import DateSeparator from '@/components/messaging/DateSeparator';
import { MessengerSplitLayout } from '@/components/messaging/MessengerSplitLayout';
import {
  ChatEmptyState,
  ConversationFilterPills,
  ConversationItemsList,
  ConversationListEmpty,
  ConversationListHeader,
  ConversationSearchField,
} from '@/components/messaging/ConversationListParts';
import { MessageAttachmentUploader } from '@/components/MessageAttachmentUploader';

export default function Messagerie() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<{ id: string; name: string; avatarUrl?: string; isOnline?: boolean; lastSeenAt?: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);
  const [unreadCountsMap, setUnreadCountsMap] = useState<Map<string, number>>(new Map());
  // Filtre d'affichage de la liste (non lues / archivées), purement visuel
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'archived'>('all');

  const scrollViewportRef = useRef<HTMLDivElement>(null);

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

  // Load proprietaire and conversations
  useEffect(() => {
    loadProprietaireAndConversations();
  }, [user?.id]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv]);

  // Auto-scroll on new messages
  useLayoutEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      });
    }
  }, [messages.length, isLoadingMessages, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel('proprietaire-messages')
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
            setMessages(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv]);

  const loadProprietaireAndConversations = async () => {
    if (!user) return;
    
    setIsLoadingConversations(true);
    try {
      // Get proprietaire
      const { data: propData } = await supabase
        .from('proprietaires')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!propData) {
        setIsLoadingConversations(false);
        return;
      }

      setProprietaireId(propData.id);

      // Get agent info if assigned
      if (propData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id, user_id')
          .eq('id', propData.agent_id)
          .single();

        if (agentData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('prenom, nom, avatar_url, is_online, last_seen_at')
            .eq('id', agentData.user_id)
            .single();

          setAgentInfo({
            id: agentData.id,
            name: `${profileData?.prenom || ''} ${profileData?.nom || ''}`.trim() || 'Mon agent',
            avatarUrl: profileData?.avatar_url || undefined,
            isOnline: profileData?.is_online || false,
            lastSeenAt: profileData?.last_seen_at || undefined,
          });
        }
      }

      // Load conversations (using proprietaire_id stored in client_id field for now)
      // In a real scenario, we might need to add a proprietaire_id column to conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', propData.id)
        .eq('conversation_type', 'proprietaire')
        .order('last_message_at', { ascending: false });

      if (convData && convData.length > 0) {
        setConversations(convData);
        loadUnreadCounts(convData.map(c => c.id));
      } else if (propData.agent_id) {
        // Create initial conversation with agent if none exists
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            agent_id: propData.agent_id,
            client_id: propData.id,
            conversation_type: 'proprietaire',
            subject: 'Discussion avec votre agent',
          })
          .select()
          .single();

        if (!error && newConv) {
          setConversations([newConv]);
          
          // Add agent to conversation_agents
          await supabase.from('conversation_agents').insert({
            conversation_id: newConv.id,
            agent_id: propData.agent_id,
          });
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les conversations',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadUnreadCounts = async (convIds: string[]) => {
    if (convIds.length === 0) return;

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
  };

  const loadMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .eq('sender_type', 'agent');

      // Update unread count
      setUnreadCountsMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(convId);
        return newMap;
      });
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const content = textOverride ?? messageText;
    if ((!content.trim() && !pendingAttachment) || !selectedConv || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'proprietaire',
          content: content || null,
          attachment_url: pendingAttachment?.url || null,
          attachment_thumbnail_url: (pendingAttachment as any)?.thumbnail_url || null,
          attachment_type: pendingAttachment?.type || null,
          attachment_name: pendingAttachment?.name || null,
          attachment_size: pendingAttachment?.size || null,
        });

      if (error) throw error;

      // Update conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv);

      setMessageText('');
      setPendingAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer le message",
        variant: 'destructive',
      });
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConv);

  // Group messages by date for date separators
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const msgDate = parseISO(msg.created_at);
    const prevMsg = messages[idx - 1];
    const showDateSeparator = !prevMsg || !isSameDay(parseISO(prevMsg.created_at), msgDate);
    
    if (showDateSeparator) {
      acc.push({ type: 'date', date: msg.created_at });
    }
    acc.push({ type: 'message', data: msg });
    return acc;
  }, [] as any[]);

  // --- Affichage (calculs purement visuels à partir des données déjà chargées) ---
  const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchedConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        normalize(`${c.subject || ''} ${agentInfo?.name || ''}`).includes(normalize(searchQuery.trim())),
      )
    : conversations;
  const unreadConvs = searchedConversations.filter((c) => (unreadCountsMap.get(c.id) || 0) > 0);
  const archivedConvs = searchedConversations.filter((c) => c.is_archived);
  const visibleConversations =
    listFilter === 'unread' ? unreadConvs : listFilter === 'archived' ? archivedConvs : searchedConversations;
  const totalUnread = conversations.filter((c) => (unreadCountsMap.get(c.id) || 0) > 0).length;
  const headerSummary = isLoadingConversations
    ? 'Chargement…'
    : agentInfo
      ? totalUnread > 0
        ? `Échanges avec ${agentInfo.name} · ${totalUnread} non lue${totalUnread > 1 ? 's' : ''}`
        : `Échanges avec ${agentInfo.name}`
      : 'Échanges avec votre agent';

  const conversationsList = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <ConversationListHeader
        title="Messagerie"
        subtitle={headerSummary}
        leading={<SidebarTrigger className="lg:hidden h-10 w-10 rounded-full" />}
      />
      <ConversationSearchField value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher une conversation" />
      {conversations.length > 1 && (
        <ConversationFilterPills<'all' | 'unread' | 'archived'>
          options={[
            { key: 'all', label: 'Toutes', count: searchedConversations.length },
            { key: 'unread', label: 'Non lues', count: unreadConvs.length, alert: unreadConvs.length > 0 },
            { key: 'archived', label: 'Archivées', count: archivedConvs.length },
          ]}
          value={listFilter}
          onChange={setListFilter}
        />
      )}
      <div className="border-t border-border/70" />
      <ScrollArea className="flex-1 min-h-0">
        {isLoadingConversations ? (
          <ConversationListSkeleton />
        ) : conversations.length === 0 ? (
          <ConversationListEmpty
            title="Aucune conversation"
            description={agentInfo ? 'Démarrez une conversation avec votre agent' : 'Aucun agent assigné'}
          />
        ) : visibleConversations.length === 0 ? (
          <ConversationListEmpty
            title={searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            description={searchQuery ? 'Essayez un autre terme.' : 'Rien dans ce filtre pour le moment.'}
          />
        ) : (
          <ConversationItemsList>
            {visibleConversations.map((conv, index) => (
              <PremiumConversationItem
                key={conv.id}
                name={agentInfo?.name || 'Agent'}
                avatarUrl={agentInfo?.avatarUrl}
                lastMessage={conv.subject || 'Discussion'}
                lastMessageTime={conv.last_message_at}
                unreadCount={unreadCountsMap.get(conv.id) || 0}
                isSelected={selectedConv === conv.id}
                isArchived={conv.is_archived}
                onClick={() => setSelectedConv(conv.id)}
                index={index}
                isOnline={agentInfo?.isOnline}
                lastSeenAt={agentInfo?.lastSeenAt}
              />
            ))}
          </ConversationItemsList>
        )}
      </ScrollArea>
    </div>
  );

  const chatHeader = selectedConversation ? (
    <ChatHeader
      name={agentInfo?.name || 'Agent'}
      avatarUrl={agentInfo?.avatarUrl}
      isOnline={agentInfo?.isOnline}
      lastSeenAt={agentInfo?.lastSeenAt}
      isArchived={selectedConversation.is_archived}
      conversationId={selectedConversation.id}
      onBackClick={() => setSelectedConv(null)}
    />
  ) : null;

  const chatView = selectedConv && selectedConversation ? (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1 min-w-0" viewportRef={scrollViewportRef}>
        <div className="px-3 py-2 sm:px-4 min-h-full">
          {isLoadingMessages ? (
            <MessagesListSkeleton />
          ) : messages.length === 0 ? (
            <ChatEmptyState title="Démarrez la conversation" description="Envoyez un message à votre agent" />
          ) : (
            <div className="max-w-3xl mx-auto min-w-0 pb-2">
              {groupedMessages.map((item, idx) => {
                if (item.type === 'date') {
                  return <DateSeparator key={`date-${idx}`} date={item.date} />;
                }

                const msg = item.data;
                const isSent = msg.sender_type === 'proprietaire';

                return (
                  <PremiumMessageBubble
                    key={msg.id}
                    content={msg.content}
                    senderType={msg.sender_type}
                    timestamp={msg.created_at}
                    isSent={isSent}
                    read={msg.read}
                    senderName={isSent ? 'Vous' : agentInfo?.name}
                    attachmentUrl={msg.attachment_url}
                    attachmentType={msg.attachment_type}
                    attachmentName={msg.attachment_name}
                  />
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Saisie */}
      <PremiumChatInput
        message={messageText}
        onMessageChange={setMessageText}
        onSendMessage={handleSendMessage}
        placeholder="Écrivez votre message..."
        disabled={selectedConversation.is_archived}
        attachmentSlot={
          <MessageAttachmentUploader
            conversationId={selectedConv}
            value={pendingAttachment}
            onAttachmentReady={(attachment) => {
              setPendingAttachment(attachment);
            }}
          />
        }
        pendingAttachment={pendingAttachment}
        onRemoveAttachment={() => setPendingAttachment(null)}
      />
    </div>
  ) : null;

  return (
    <MessengerSplitLayout
      className={`h-[calc(100dvh-3.5rem)] lg:h-[100dvh] [.imr-mobile-shell_&]:h-full`}
      conversationsList={conversationsList}
      chatView={chatView}
      chatHeader={chatHeader}
      selectedConversation={selectedConv && selectedConversation ? selectedConv : null}
      onBack={() => setSelectedConv(null)}
      headerName={agentInfo?.name || 'Agent'}
      headerSubtitle={selectedConversation?.is_archived ? 'Conversation archivée' : selectedConversation?.subject || 'Votre agent'}
      headerAvatarUrl={agentInfo?.avatarUrl ?? null}
      isOnline={!!agentInfo?.isOnline}
      emptyState={
        <ChatEmptyState
          title="Messagerie"
          description="Sélectionnez une conversation pour échanger avec votre agent immobilier"
        />
      }
    />
  );
}
