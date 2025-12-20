import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { MessageSquare, Search, Archive, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { isSameDay, parseISO } from 'date-fns';

// Messaging components
import { PremiumMessageBubble } from '@/components/messaging/PremiumMessageBubble';
import { PremiumConversationItem } from '@/components/messaging/PremiumConversationItem';
import { PremiumChatInput } from '@/components/messaging/PremiumChatInput';
import { ChatHeader } from '@/components/messaging/ChatHeader';
import { ConversationListSkeleton, MessagesListSkeleton } from '@/components/messaging/MessagingSkeletons';
import { FloatingParticles, MeshGradientBackground, ChatPatternBackground } from '@/components/messaging/FloatingParticles';
import DateSeparator from '@/components/messaging/DateSeparator';
import { MessageAttachmentUploader } from '@/components/MessageAttachmentUploader';
import { formatSwissTime } from '@/lib/dateUtils';

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

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Conversations sidebar */}
      <div className={cn(
        'w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col bg-card/50 backdrop-blur-sm',
        selectedConv && 'hidden md:flex'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <SidebarTrigger className="md:hidden" />
            <div className="p-2 rounded-xl bg-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Messagerie</h1>
              <p className="text-xs text-muted-foreground">Échanges avec votre agent</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {isLoadingConversations ? (
            <ConversationListSkeleton />
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-foreground/70">Aucune conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {agentInfo ? 'Démarrez une conversation avec votre agent' : 'Aucun agent assigné'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv, index) => (
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
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className={cn(
        'flex-1 flex flex-col relative',
        !selectedConv && 'hidden md:flex'
      )}>
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <MeshGradientBackground />
          <ChatPatternBackground />
          <FloatingParticles />
        </div>

        {selectedConv && selectedConversation ? (
          <>
            {/* Chat header */}
            <ChatHeader
              name={agentInfo?.name || 'Agent'}
              avatarUrl={agentInfo?.avatarUrl}
              isOnline={agentInfo?.isOnline}
              lastSeenAt={agentInfo?.lastSeenAt}
              isArchived={selectedConversation.is_archived}
              onBackClick={() => setSelectedConv(null)}
              className="relative z-10"
            />

            {/* Messages */}
            <ScrollArea 
              className="flex-1 relative z-10"
              viewportRef={scrollViewportRef}
            >
              <div className="p-4 space-y-4 min-h-full">
                {isLoadingMessages ? (
                  <MessagesListSkeleton />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-2xl bg-primary/10 mb-4">
                      <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold">Démarrez la conversation</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Envoyez un message à votre agent
                    </p>
                  </div>
                ) : (
                  groupedMessages.map((item, idx) => {
                    if (item.type === 'date') {
                      return <DateSeparator key={`date-${idx}`} date={item.date} />;
                    }
                    
                    const msg = item.data;
                    const isSent = msg.sender_type === 'proprietaire';
                    
                    return (
                      <PremiumMessageBubble
                        key={msg.id}
                        content={msg.content}
                        timestamp={msg.created_at}
                        isSent={isSent}
                        read={msg.read}
                        senderName={isSent ? 'Vous' : agentInfo?.name}
                        attachmentUrl={msg.attachment_url}
                        attachmentType={msg.attachment_type}
                        attachmentName={msg.attachment_name}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="relative z-10 p-4 border-t border-border/50 bg-card/80 backdrop-blur-xl">
              <PremiumChatInput
                message={messageText}
                onMessageChange={setMessageText}
                onSendMessage={handleSendMessage}
                placeholder="Écrivez votre message..."
                disabled={selectedConversation.is_archived}
                attachmentSlot={
                  <MessageAttachmentUploader
                    conversationId={selectedConv}
                    onAttachmentReady={(attachment) => {
                      setPendingAttachment(attachment);
                    }}
                  />
                }
                pendingAttachment={pendingAttachment}
                onRemoveAttachment={() => setPendingAttachment(null)}
              />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 shadow-xl">
              <MessageSquare className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Messagerie</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              Sélectionnez une conversation pour échanger avec votre agent immobilier
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
