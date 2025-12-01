import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Users, Shield } from "lucide-react";
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

// Fonction pour retirer les accents des chaînes pour une recherche plus flexible
const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const Messagerie = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [contactsMap, setContactsMap] = useState<Record<string, { name: string; type: string }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    loadAgentAndConversations();
    // Mark new_message notifications as read when visiting this page
    markTypeAsRead('new_message');
  }, [user]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConv]);

  // Setup realtime subscription
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
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;
      
      const agentIdStr = agentData.id;
      setAgentId(agentIdStr);

      // Load all conversations where agent is involved
      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentIdStr)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setConversations(convData || []);

      // Build contacts map for display
      const clientIds = convData?.filter(c => c.client_id).map(c => c.client_id) || [];
      const adminUserIds = convData?.filter(c => c.admin_user_id).map(c => c.admin_user_id) || [];
      
      const contactsMapping: Record<string, { name: string; type: string }> = {};

      // Load client profiles
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
          contactsMapping[client.id] = { name: fullName || 'Inconnu', type: 'client' };
        });
      }

      // Load admin profiles
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

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv);

      // Get agent name for notification
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
        // If it's an admin-agent conversation, notify the admin
        if (conversation.conversation_type === 'admin-agent' && conversation.admin_user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: conversation.admin_user_id,
            p_type: 'new_message',
            p_title: 'Nouveau message agent',
            p_message: `${agentName} vous a envoyé un message`,
            p_link: '/admin/messagerie',
            p_metadata: { conversation_id: selectedConv }
          });

          await supabase.functions.invoke('send-notification-email', {
            body: {
              user_id: conversation.admin_user_id,
              notification_type: 'new_message',
              title: 'Nouveau message agent',
              message: `${agentName} vous a envoyé un message`,
              link: '/admin/messagerie'
            }
          });
        } else if (conversation.client_id) {
          // Client-agent conversation - notify client
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

            await supabase.functions.invoke('send-notification-email', {
              body: {
                user_id: clientData.user_id,
                notification_type: 'new_message',
                title: 'Nouveau message',
                message: `${agentName} vous a envoyé un message`,
                link: '/client/messagerie'
              }
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
            <Card key={msg.id} className={`p-4 ${msg.sender_type === 'agent' ? 'ml-auto max-w-[70%] bg-primary/10' : 'mr-auto max-w-[70%]'}`}>
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