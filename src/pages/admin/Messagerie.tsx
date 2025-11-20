import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { getConversations, getMessages, getAgents, getClients } from "@/utils/localStorage";

const Messagerie = () => {
  const [conversations] = useState(getConversations());
  const [messages] = useState(getMessages());
  const [agents] = useState(getAgents());
  const [clients] = useState(getClients());
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const getParticipantName = (participantId: string) => {
    const agent = agents.find(a => a.id === participantId);
    if (agent) return `${agent.prenom} ${agent.nom}`;
    const client = clients.find(c => c.id === participantId);
    if (client) return `${client.prenom} ${client.nom}`;
    return "Inconnu";
  };

  const selectedMessages = selectedConv ? messages.filter(m => m.conversationId === selectedConv) : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
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
                    {conv.participants.map(p => getParticipantName(p)).join(' & ')}
                  </p>
                  {conv.nonLus > 0 && (
                    <Badge variant="default" className="ml-2">{conv.nonLus}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{conv.dernierMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(conv.dateDernierMessage).toLocaleDateString('fr-FR')}
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
                  {conversations.find(c => c.id === selectedConv)?.participants.map(p => getParticipantName(p)).join(' & ')}
                </h2>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedMessages.map((msg) => (
                    <Card key={msg.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm">{getParticipantName(msg.expediteurId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(msg.dateEnvoi).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <p className="text-sm">{msg.contenu || "(Offre envoyée)"}</p>
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
