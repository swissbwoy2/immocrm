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

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (data) {
      setConversations(data);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const getParticipantName = (participantId: string) => {
    return participantId; // TODO: Load profiles
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
                  {conv.subject || 'Conversation'}
                </p>
              </div>
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
              <h2 className="font-semibold">Conversation</h2>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedMessages.map((msg) => (
                  <Card key={msg.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{getParticipantName(msg.sender_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <p className="text-sm">{msg.content}</p>
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
  );
};

export default Messagerie;
