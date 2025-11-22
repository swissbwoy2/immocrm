import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Messagerie = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({});
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    loadClientAndConversations();
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
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConv || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConv,
          sender_id: user.id,
          sender_type: 'client',
          content: messageText,
        });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv);

      setMessageText("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const getAgentName = (agentId: string) => {
    return agentsMap[agentId] || "Mon agent";
  };

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-73px)]">
          {conversations.map((conv) => {
            const convMessages = messages.filter(m => m.conversation_id === conv.id);
            const lastMessage = convMessages[convMessages.length - 1];
            const unreadCount = convMessages.filter(m => !m.read && m.sender_type === 'agent').length;
            
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv.id)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${selectedConv === conv.id ? 'bg-muted' : ''}`}
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
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b bg-card">
              <h2 className="font-semibold">
                {getAgentName(conversations.find(c => c.id === selectedConv)?.agent_id)}
              </h2>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedMessages.map((msg) => (
                  <Card key={msg.id} className={`p-4 ${msg.sender_type === 'client' ? 'ml-auto max-w-[70%] bg-primary/10' : 'mr-auto max-w-[70%]'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">
                        {msg.sender_type === 'client' ? 'Vous' : getAgentName(conversations.find(c => c.id === selectedConv)?.agent_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Écrire un message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  );
};

export default Messagerie;