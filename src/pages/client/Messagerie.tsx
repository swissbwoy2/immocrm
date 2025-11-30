import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Home, Heart, Calendar, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { markTypeAsRead } = useNotifications();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [offresMap, setOffresMap] = useState<Record<string, any>>({});
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({});
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
    size: number;
  } | null>(null);

  useEffect(() => {
    loadClientAndConversations();
    // Mark new_message notifications as read when visiting this page
    markTypeAsRead('new_message');
  }, [user]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv]);

  // Setup realtime subscription
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

    try {
      // Get client ID
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

      // Load conversations
      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', clientIdStr)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setConversations(convData || []);

      // Load agent profiles for display
      const agentIds = convData?.map(c => c.agent_id) || [];
      if (agentIds.length > 0) {
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, user_id')
          .in('id', agentIds);

        const userIds = agentsData?.map(a => a.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        const agentsMapping: Record<string, string> = {};
        
        agentsData?.forEach(agent => {
          const profile = profilesMap.get(agent.user_id);
          const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim();
          agentsMapping[agent.id] = fullName || 'Mon agent';
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

      // Create map of offers for quick access
      const offresMapping: Record<string, any> = {};
      data?.forEach(msg => {
        if (msg.offre_id && msg.offres) {
          offresMapping[msg.offre_id] = msg.offres;
        }
      });
      setOffresMap(offresMapping);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .eq('sender_type', 'agent');
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !pendingAttachment) || !selectedConv || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'client',
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

      // Get agent user_id to send notification
      const conversation = conversations.find(c => c.id === selectedConv);
      if (conversation) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', conversation.agent_id)
          .single();

        if (agentData) {
          // Get client name for notification
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('prenom, nom')
            .eq('id', user.id)
            .single();

          const clientName = clientProfile 
            ? `${clientProfile.prenom} ${clientProfile.nom}`.trim() 
            : 'Un client';

          // Create notification for agent
          await supabase.rpc('create_notification', {
            p_user_id: agentData.user_id,
            p_type: 'new_message',
            p_title: 'Nouveau message',
            p_message: `${clientName} vous a envoyé un message`,
            p_link: '/agent/messagerie',
            p_metadata: { conversation_id: selectedConv }
          });

          // Also directly call the edge function to ensure email is sent
          await supabase.functions.invoke('send-notification-email', {
            body: {
              user_id: agentData.user_id,
              notification_type: 'new_message',
              title: 'Nouveau message',
              message: `${clientName} vous a envoyé un message`,
              link: '/agent/messagerie'
            }
          });
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

  const handleOffreAction = async (offreId: string, action: string) => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      if (action === 'interesse') {
        await supabase
          .from('offres')
          .update({ statut: 'interesse' })
          .eq('id', offreId);

        await supabase.from('messages').insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'client',
          content: `✅ Je suis intéressé(e) par cette offre !`
        });

        toast({ title: "Succès", description: "Agent notifié de votre intérêt" });
        
      } else if (action === 'visite') {
        navigate(`/client/offres-recues?offre=${offreId}&action=visite`);
        
      } else if (action === 'details') {
        navigate(`/client/offres-recues?offre=${offreId}`);
        
      } else if (action === 'refuser') {
        await supabase
          .from('offres')
          .update({ statut: 'refusee' })
          .eq('id', offreId);

        await supabase.from('messages').insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'client',
          content: `❌ Cette offre ne correspond pas à mes critères.`
        });

        toast({ title: "Succès", description: "Offre refusée" });
      }

      loadMessages(selectedConv!);
      
    } catch (error) {
      console.error('Error handling offer action:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer cette action",
        variant: "destructive"
      });
    }
  };

  const getAgentName = (agentId: string) => {
    return agentsMap[agentId] || "Mon agent";
  };

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);
  const currentConversation = conversations.find(c => c.id === selectedConv);

  const OffreCard = ({ offre }: { offre: any }) => (
    <div className="mt-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-2 mb-2">
        <Home className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{offre.adresse}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span>💰 {offre.prix.toLocaleString()} CHF</span>
            <span>📐 {offre.surface} m²</span>
            <span>🏠 {offre.pieces} pcs</span>
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

  const OffreActions = ({ offre, onAction }: { offre: any, onAction: (action: string) => void }) => {
    if (!offre) return null;

    if (['acceptee', 'refusee', 'candidature_deposee', 'interesse'].includes(offre.statut)) {
      return (
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            {offre.statut === 'acceptee' && '✅ Vous avez accepté cette offre'}
            {offre.statut === 'refusee' && '❌ Vous avez refusé cette offre'}
            {offre.statut === 'candidature_deposee' && '📝 Candidature déposée'}
            {offre.statut === 'interesse' && '✅ Vous êtes intéressé(e) par cette offre'}
          </p>
        </div>
      );
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onAction('interesse')}
          className="flex-1"
        >
          <Heart className="h-4 w-4 mr-1" />
          Intéressé(e)
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onAction('visite')}
          className="flex-1"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Visite
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onAction('details')}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Détails
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => onAction('refuser')}
        >
          <X className="h-4 w-4 mr-1" />
          Refuser
        </Button>
      </div>
    );
  };

  const conversationsList = (
    <>
      <div className="p-4 border-b">
        <h2 className="font-semibold">Messages</h2>
      </div>
      <ScrollArea className="flex-1">
        {conversations.map((conv) => {
          const convMessages = messages.filter(m => m.conversation_id === conv.id);
          const lastMessage = convMessages[convMessages.length - 1];
          const unreadCount = convMessages.filter(m => !m.read && m.sender_type === 'agent').length;
          
          return (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConv === conv.id ? 'bg-muted' : ''}`}
            >
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium text-sm">{getAgentName(conv.agent_id)}</p>
                {unreadCount > 0 && (
                  <Badge variant="default" className="ml-2">{unreadCount}</Badge>
                )}
              </div>
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
    <h2 className="font-semibold truncate">
      {getAgentName(currentConversation.agent_id)}
    </h2>
  );

  const chatView = selectedConv ? (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {selectedMessages.map((msg) => (
            <Card key={msg.id} className={`p-4 ${msg.sender_type === 'client' ? 'ml-auto max-w-[70%] bg-primary/10' : 'mr-auto max-w-[70%]'}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-sm">
                  {msg.sender_type === 'client' ? 'Vous' : getAgentName(currentConversation?.agent_id)}
                </p>
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
