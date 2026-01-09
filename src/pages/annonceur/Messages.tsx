import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Search,
  Home,
  ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function Messages() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch annonceur
  const { data: annonceur } = useQuery({
    queryKey: ['annonceur', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonceurs')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['annonceur-conversations', annonceur?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations_annonces')
        .select(`
          *,
          annonces_publiques(id, titre, ville),
          messages_annonces(contenu, created_at, lu, expediteur_id)
        `)
        .or(`participant_1_id.eq.${annonceur?.id},participant_2_id.eq.${annonceur?.id}`)
        .order('dernier_message_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!annonceur?.id,
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['conversation-messages', selectedConversation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages_annonces')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation,
  });

  // Mark messages as read
  useEffect(() => {
    if (selectedConversation && messages && annonceur) {
      const unreadMessages = messages.filter(
        m => !m.lu && m.expediteur_id !== annonceur.id
      );
      if (unreadMessages.length > 0) {
        supabase
          .from('messages_annonces')
          .update({ lu: true })
          .in('id', unreadMessages.map(m => m.id))
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['annonceur-conversations'] });
          });
      }
    }
  }, [selectedConversation, messages, annonceur]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (contenu: string) => {
      const { error } = await supabase
        .from('messages_annonces')
        .insert({
          conversation_id: selectedConversation,
          expediteur_id: annonceur?.id,
          contenu,
        });
      if (error) throw error;

      // Update conversation dernier_message_at
      await supabase
        .from('conversations_annonces')
        .update({ dernier_message_at: new Date().toISOString() })
        .eq('id', selectedConversation);
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      queryClient.invalidateQueries({ queryKey: ['annonceur-conversations'] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const getUnreadCount = (conversation: any) => {
    return conversation.messages_annonces?.filter(
      (m: any) => !m.lu && m.expediteur_id !== annonceur?.id
    ).length || 0;
  };

  const getLastMessage = (conversation: any) => {
    const msgs = conversation.messages_annonces || [];
    return msgs[msgs.length - 1];
  };

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  const filteredConversations = conversations?.filter(conv => {
    if (!searchQuery) return true;
    const annonce = conv.annonces_publiques;
    return annonce?.titre?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <AnnonceurLayout>
      <div className="h-[calc(100vh-8rem)] flex">
        {/* Conversations List */}
        <div className={cn(
          "w-full md:w-80 border-r flex flex-col",
          selectedConversation && "hidden md:flex"
        )}>
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune conversation</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations?.map((conv) => {
                  const lastMsg = getLastMessage(conv);
                  const unread = getUnreadCount(conv);
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                        selectedConversation === conv.id && "bg-muted"
                      )}
                    >
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>V</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">Visiteur</p>
                            {unread > 0 && (
                              <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            {conv.annonces_publiques?.titre}
                          </p>
                          {lastMsg && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {lastMsg.contenu}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedConversation && "hidden md:flex"
        )}>
          {selectedConversation && selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar>
                  <AvatarFallback>V</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">Visiteur</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedConv.annonces_publiques?.titre}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                        <Skeleton className="h-16 w-48 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages?.map((message) => {
                      const isMe = message.expediteur_id === annonceur?.id;
                      
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isMe ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-lg px-4 py-2",
                              isMe
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{message.contenu}</p>
                            <p className={cn(
                              "text-xs mt-1",
                              isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(new Date(message.created_at || ''), 'HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnnonceurLayout>
  );
}
