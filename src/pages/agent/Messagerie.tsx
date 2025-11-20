import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { getConversations, getMessages, getClients, getCurrentUser } from "@/utils/localStorage";

const Messagerie = () => {
  const currentUser = getCurrentUser();
  const agentId = `agent-${currentUser?.id.split('-')[1]}`;
  
  const allConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
  const [conversations] = useState(allConversations.filter((c: any) => c.agentId === agentId));
  
  const allMessages = JSON.parse(localStorage.getItem('messages') || '[]');
  const [messages] = useState(allMessages);
  
  const [clients] = useState(getClients());
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConv) return;

    const allMessages = JSON.parse(localStorage.getItem('messages') || '[]');
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: selectedConv,
      sender_id: agentId,
      sender_type: 'agent',
      content: messageText,
      created_at: new Date().toISOString(),
      read: false,
    };
    
    allMessages.push(newMessage);
    localStorage.setItem('messages', JSON.stringify(allMessages));
    
    // Update conversation last message time
    const allConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const convIndex = allConversations.findIndex((c: any) => c.id === selectedConv);
    if (convIndex !== -1) {
      allConversations[convIndex].last_message_at = new Date().toISOString();
      localStorage.setItem('conversations', JSON.stringify(allConversations));
    }
    
    setMessageText("");
    window.location.reload(); // Refresh to show new message
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.prenom} ${client.nom}` : "Inconnu";
  };

  const selectedMessages = selectedConv ? messages.filter((m: any) => m.conversation_id === selectedConv) : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Mes Conversations</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-73px)]">
            {conversations.map((conv: any) => {
              const convMessages = messages.filter((m: any) => m.conversation_id === conv.id);
              const lastMessage = convMessages[convMessages.length - 1];
              const unreadCount = convMessages.filter((m: any) => !m.read && m.sender_id !== agentId).length;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${selectedConv === conv.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm">{getClientName(conv.clientId)}</p>
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
                  {getClientName(conversations.find((c: any) => c.id === selectedConv)?.clientId)}
                </h2>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedMessages.map((msg: any) => (
                    <Card key={msg.id} className={`p-4 ${msg.sender_id === agentId ? 'ml-auto max-w-[70%] bg-primary/10' : 'mr-auto max-w-[70%]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm">
                          {msg.sender_id === agentId ? 'Vous' : getClientName(msg.sender_id)}
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
    </div>
  );
};

export default Messagerie;
