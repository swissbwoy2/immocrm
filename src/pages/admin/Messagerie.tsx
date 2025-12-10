import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Users, UserCog } from "lucide-react";
import { ScrollToTopButton } from "@/components/messaging/ScrollToTopButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageAttachmentUploader } from "@/components/MessageAttachmentUploader";
import { MessageAttachment } from "@/components/MessageAttachment";
import { parseMessageWithLinks } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { MessagingLayout } from "@/components/MessagingLayout";
import { AdminNewConversationDialog } from "@/components/AdminNewConversationDialog";
import { ChatAvatar } from "@/components/messaging/ChatAvatar";
import { PremiumMessageBubble } from "@/components/messaging/PremiumMessageBubble";
import { PremiumConversationItem } from "@/components/messaging/PremiumConversationItem";
import { PremiumChatInput } from "@/components/messaging/PremiumChatInput";
import { ChatHeader } from "@/components/messaging/ChatHeader";
import { ChatPatternBackground } from "@/components/messaging/FloatingParticles";
import { FloatingParticles, MeshGradientBackground } from "@/components/messaging/FloatingParticles";
import { ConversationListSkeleton, MessagesListSkeleton } from "@/components/messaging/MessagingSkeletons";
import DateSeparator from "@/components/messaging/DateSeparator";
import { isSameDay, parseISO } from "date-fns";

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
          ? await supabase.from('profiles').select('id, prenom, nom, email').in('id', allUserIds)
          : { data: [] as { id: string; prenom: string; nom: string; email: string }[] };

        // Charger les derniers messages de chaque conversation
        const { data: lastMessagesData } = conversationIds.length > 0
          ? await supabase
              .from('messages')
              .select('conversation_id, content, attachment_name, created_at')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false })
          : { data: [] as { conversation_id: string; content: string | null; attachment_name: string | null; created_at: string }[] };

        // Créer une map du dernier message par conversation
        const lastMessagesMap = new Map<string, { content: string | null; attachment_name: string | null }>();
        lastMessagesData?.forEach(msg => {
          if (!lastMessagesMap.has(msg.conversation_id)) {
            lastMessagesMap.set(msg.conversation_id, {
              content: msg.content,
              attachment_name: msg.attachment_name
            });
          }
        });
        
        const clientsMap = new Map<string, string>(clientsData?.map(c => [c.id, c.user_id] as [string, string]) || []);
        const agentsMap = new Map<string, string>(agentsData?.map(a => [a.id, a.user_id] as [string, string]) || []);
        const profilesMap = new Map<string, { id: string; prenom: string; nom: string; email: string }>(
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

  const filteredConversations = conversations.filter(conv => {
    const searchTerm = removeAccents(searchQuery.toLowerCase());
    const clientName = removeAccents((conv.clientName || '').toLowerCase());
    const agentName = removeAccents((conv.agentName || '').toLowerCase());
    return clientName.includes(searchTerm) || agentName.includes(searchTerm);
  });

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);
  const currentConversation = conversations.find(c => c.id === selectedConv);

  const getConversationDisplayName = (conv: any) => {
    if (conv.conversation_type === 'admin-agent') {
      return (
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" />
          <span>{conv.agentName}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{conv.clientName || 'Client'}</span>
      </div>
    );
  };

  const conversationsList = (
    <>
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="shrink-0" />
            <h2 className="font-semibold text-lg">Conversations</h2>
          </div>
          <AdminNewConversationDialog onConversationCreated={handleConversationCreated} />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client ou agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <ConversationListSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Aucune conversation trouvée
          </div>
        ) : (
          filteredConversations.map((conv, index) => {
            const displayName = conv.conversation_type === 'admin-agent' 
              ? conv.agentName 
              : conv.clientName || 'Client';
            
            return (
              <PremiumConversationItem
                key={conv.id}
                name={displayName}
                avatarUrl={null}
                lastMessage={conv.lastMessageText}
                lastMessageTime={conv.last_message_at}
                unreadCount={unreadCountsMap.get(conv.id) || 0}
                isSelected={selectedConv === conv.id}
                onClick={() => setSelectedConv(conv.id)}
                index={index}
              />
            );
          })
        )}
      </ScrollArea>
    </>
  );

  const chatHeader = currentConversation && (
    <ChatHeader
      name={
        currentConversation.conversation_type === 'admin-agent'
          ? currentConversation.agentName
          : `${currentConversation.clientName} ↔ ${currentConversation.agentName}`
      }
      avatarUrl={null}
      status={currentConversation.subject}
    />
  );

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 chat-background relative overflow-hidden">
      <ChatPatternBackground />
      <MeshGradientBackground />
      <FloatingParticles count={12} />
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
            {selectedMessages.map((msg, index) => {
              const isSent = msg.sender_type === 'admin';
              const senderName = isSent ? undefined : msg.senderName;
              
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
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