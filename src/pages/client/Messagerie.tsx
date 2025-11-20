import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { getConversations, getMessages, getAgents, getCurrentUser } from "@/utils/localStorage";

const Messagerie = () => {
  const currentUser = getCurrentUser();
  const clientId = currentUser?.id || '';
  
  const allConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
  const [conversations] = useState(allConversations.filter((c: any) => c.clientId === clientId));
  
  const allMessages = JSON.parse(localStorage.getItem('messages') || '[]');
  const [messages] = useState(allMessages);
  
  const [agents] = useState(getAgents());
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.prenom} ${agent.nom}` : "Mon agent";
  };

  const selectedMessages = selectedConv ? messages.filter((m: any) => m.conversation_id === selectedConv) : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Messages</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-73px)]">
            {conversations.map((conv: any) => {
              const convMessages = messages.filter((m: any) => m.conversation_id === conv.id);
              const lastMessage = convMessages[convMessages.length - 1];
              const unreadCount = convMessages.filter((m: any) => !m.read && m.sender_id !== clientId).length;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${selectedConv === conv.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm">{getAgentName(conv.agentId)}</p>
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
                  {getAgentName(conversations.find((c: any) => c.id === selectedConv)?.agentId)}
                </h2>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedMessages.map((msg: any) => (
                    <Card key={msg.id} className={`p-4 ${msg.sender_id === clientId ? 'ml-auto max-w-[70%] bg-primary/10' : 'mr-auto max-w-[70%]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm">
                          {msg.sender_id === clientId ? 'Vous' : getAgentName(msg.sender_id)}
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
                  />
                  <Button>
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
