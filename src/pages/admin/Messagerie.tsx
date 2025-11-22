import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Messagerie = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadConversations();
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

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (data) {
      setConversations(data);
      
      // Charger tous les profils nécessaires - cast text to uuid
      const clientIds = data.map(c => c.client_id).filter(Boolean);
      const agentIds = data.map(c => c.agent_id).filter(Boolean);
      
      // Charger les clients - utiliser le cast uuid explicite pour correspondance
      const clientQueries = clientIds.map(id => 
        supabase
          .from('clients')
          .select('id, user_id')
          .eq('id', id)
          .single()
      );
      
      const clientResults = await Promise.all(clientQueries);
      const clientsData = clientResults
        .filter(r => r.data)
        .map(r => r.data!);
      
      const clientUserIds = clientsData.map(c => c.user_id);
      
      // Charger les agents
      const agentQueries = agentIds.map(id => 
        supabase
          .from('agents')
          .select('id, user_id')
          .eq('id', id)
          .single()
      );
      
      const agentResults = await Promise.all(agentQueries);
      const agentsData = agentResults
        .filter(r => r.data)
        .map(r => r.data!);
      
      const agentUserIds = agentsData.map(a => a.user_id);
      
      // Charger tous les profils
      const allUserIds = [...clientUserIds, ...agentUserIds];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', allUserIds);
      
      // Créer les maps pour accès rapide - utiliser string comme clé pour correspondance
      const clientsMap = new Map(clientsData.map(c => [c.id.toString(), c.user_id]));
      const agentsMap = new Map(agentsData.map(a => [a.id.toString(), a.user_id]));
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      
      // Enrichir les conversations avec les noms
      const enrichedConvs = data.map(conv => {
        const clientUserId = clientsMap.get(conv.client_id);
        const agentUserId = agentsMap.get(conv.agent_id);
        const clientProfile = clientUserId ? profilesMap.get(clientUserId) : null;
        const agentProfile = agentUserId ? profilesMap.get(agentUserId) : null;
        
        return {
          ...conv,
          clientName: clientProfile ? `${clientProfile.prenom} ${clientProfile.nom}` : 'Client inconnu',
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
    if (!messageText.trim() || !selectedConv || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: 'admin',
        content: messageText.trim(),
      });

    if (error) {
      console.error('Erreur envoi message:', error);
      return;
    }

    setMessageText('');
    
    // Mettre à jour le timestamp de la conversation
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', selectedConv);
  };

  const selectedMessages = messages.filter(m => m.conversation_id === selectedConv);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Conversations</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-73px)]">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${selectedConv === conv.id ? 'bg-muted' : ''}`}
            >
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium text-sm">
                  {conv.clientName} ↔ {conv.agentName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {conv.subject || 'Conversation'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(conv.last_message_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b bg-card">
              <h2 className="font-semibold">
                {conversations.find(c => c.id === selectedConv)?.clientName} ↔ {conversations.find(c => c.id === selectedConv)?.agentName}
              </h2>
              <p className="text-xs text-muted-foreground">
                {conversations.find(c => c.id === selectedConv)?.subject}
              </p>
            </div>
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
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
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
