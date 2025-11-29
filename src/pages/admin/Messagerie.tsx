import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageAttachmentUploader } from "@/components/MessageAttachmentUploader";
import { MessageAttachment } from "@/components/MessageAttachment";
import { parseMessageWithLinks } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { MessagingLayout } from "@/components/MessagingLayout";

// Fonction pour retirer les accents des chaînes pour une recherche plus flexible
const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const Messagerie = () => {
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);

  useEffect(() => {
    loadConversations();
    // Mark new_message notifications as read when visiting this page
    markTypeAsRead('new_message');
  }, []);

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

  // Fonction pour extraire le nom du client depuis le subject
  const extractClientName = (subject: string) => {
    // Format attendu : "Conversation avec [Nom]"
    const match = subject?.match(/Conversation avec (.+)/i);
    return match ? match[1] : 'Client inconnu';
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (data) {
      // Charger uniquement les agents (la table clients est vide)
      const agentIds = [...new Set(data.map(c => c.agent_id).filter(Boolean))];
      
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, user_id')
        .in('id', agentIds);
      
      const agentUserIds = agentsData?.map(a => a.user_id) || [];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', agentUserIds);
      
      const agentsMap = new Map(agentsData?.map(a => [a.id, a.user_id]));
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      
      // Enrichir les conversations
      const enrichedConvs = data.map(conv => {
        const agentUserId = agentsMap.get(conv.agent_id);
        const agentProfile = agentUserId ? profilesMap.get(agentUserId) : null;
        
        return {
          ...conv,
          clientName: extractClientName(conv.subject), // Extraction depuis subject
          agentName: agentProfile ? `${agentProfile.prenom} ${agentProfile.nom}` : 'Agent inconnu',
        };
      });
      
      setConversations(enrichedConvs);
      setProfiles(profilesMap);
    }
  };

  const loadMessages = async (convId: string) => {
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
          : msg.sender_type === 'client' ? 'Client' : 'Agent'
      }));
      
      setMessages(enrichedMessages);
      
      // Marquer les messages comme lus
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .eq('read', false);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !pendingAttachment) || !selectedConv || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'admin',
        content: messageText.trim() || null,
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
  };

  const filteredConversations = conversations.filter(conv => {
    const searchTerm = removeAccents(searchQuery.toLowerCase());
    const clientName = removeAccents((conv.clientName || '').toLowerCase());
    const agentName = removeAccents((conv.agentName || '').toLowerCase());
    return clientName.includes(searchTerm) || agentName.includes(searchTerm);
  });

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);
  const currentConversation = conversations.find(c => c.id === selectedConv);

  const conversationsList = (
    <>
      <div className="p-4 border-b space-y-2">
        <h2 className="font-semibold">Conversations</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client ou agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setSelectedConv(conv.id)}
            className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConv === conv.id ? 'bg-muted' : ''}`}
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium text-sm">
                {conv.clientName}
              </p>
              <p className="text-xs text-muted-foreground">
                Agent: {conv.agentName}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(conv.last_message_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        ))}
      </ScrollArea>
    </>
  );

  const chatHeader = currentConversation && (
    <div>
      <h2 className="font-semibold truncate">
        {currentConversation.clientName} ↔ {currentConversation.agentName}
      </h2>
      <p className="text-xs text-muted-foreground truncate">
        {currentConversation.subject}
      </p>
    </div>
  );

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {selectedMessages.map((msg) => (
            <Card key={msg.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{msg.senderName}</p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-1 ${
                      msg.sender_type === 'admin' 
                        ? 'border-primary text-primary' 
                        : msg.sender_type === 'agent'
                        ? 'border-blue-500 text-blue-500'
                        : 'border-green-500 text-green-500'
                    }`}
                  >
                    {msg.sender_type === 'client' ? 'Client' : msg.sender_type === 'admin' ? 'Admin' : 'Agent'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              {msg.content && (
                <div className="text-sm whitespace-pre-line">
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
        </div>
      </ScrollArea>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
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
