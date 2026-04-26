import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingMessenger } from '@/hooks/useFloatingMessenger';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';
import { PremiumMessageBubble } from '@/components/messaging/PremiumMessageBubble';
import { ChevronLeft, Loader2, Maximize2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props {
  conversationId: string;
  onBack: () => void;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string | null;
  content: string | null;
  created_at: string;
  read: boolean | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

export function FloatingConversationView({ conversationId, onBack }: Props) {
  const { user, userRole } = useAuth();
  const { close, refreshUnread } = useFloatingMessenger();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [otherName, setOtherName] = useState('Conversation');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load conversation header info
  useEffect(() => {
    let cancelled = false;
    async function loadHeader() {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, agent_id, client_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv || cancelled) return;

      let otherUserId: string | null = null;
      let fallbackName = 'Conversation';
      if (userRole === 'client' && conv.agent_id) {
        const { data: ag } = await supabase.from('agents').select('user_id').eq('id', conv.agent_id).maybeSingle();
        otherUserId = ag?.user_id ?? null;
      } else if (userRole === 'agent' && conv.client_id) {
        const { data: cli } = await supabase.from('clients').select('user_id, prenom, nom').eq('id', conv.client_id).maybeSingle();
        otherUserId = cli?.user_id ?? null;
        if (cli) fallbackName = `${cli.prenom || ''} ${cli.nom || ''}`.trim() || 'Client';
      } else if (conv.client_id) {
        const { data: cli } = await supabase.from('clients').select('user_id, prenom, nom').eq('id', conv.client_id).maybeSingle();
        otherUserId = cli?.user_id ?? null;
        if (cli) fallbackName = `${cli.prenom || ''} ${cli.nom || ''}`.trim() || 'Client';
      }

      if (otherUserId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('prenom, nom, avatar_url, is_online')
          .eq('id', otherUserId)
          .maybeSingle();
        if (prof && !cancelled) {
          setOtherName(`${prof.prenom || ''} ${prof.nom || ''}`.trim() || fallbackName);
          setOtherAvatar(prof.avatar_url || null);
          setOtherOnline(!!prof.is_online);
          return;
        }
      }
      if (!cancelled) setOtherName(fallbackName);
    }
    loadHeader();
    return () => { cancelled = true; };
  }, [conversationId, userRole]);

  // Load messages + mark as read
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        if (!error) setMessages((data || []) as MessageRow[]);
        setLoading(false);
      }
      // mark unread (sent by other) as read
      if (user) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .eq('read', false)
          .neq('sender_id', user.id);
        refreshUnread();
      }
    }
    load();
    return () => { cancelled = true; };
  }, [conversationId, user, refreshUnread]);

  // Realtime for this conversation
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const channel = supabase
      .channel(`floating-conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new as MessageRow]);
          // auto-mark as read if from other
          if (user && payload.new.sender_id !== user.id) {
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', payload.new.id)
              .then(() => refreshUnread());
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, refreshUnread]);

  // Auto scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const senderType = userRole || 'client';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: senderType,
        content: text,
      });
      if (error) throw error;
      setDraft('');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || "Impossible d'envoyer", variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleOpenFullscreen = () => {
    close();
    const route =
      userRole === 'admin' ? `/admin/messagerie?conversationId=${conversationId}` :
      userRole === 'agent' ? `/agent/messagerie?conversationId=${conversationId}` :
      userRole === 'proprietaire' ? `/proprietaire/messagerie?conversationId=${conversationId}` :
      `/client/messagerie?conversationId=${conversationId}`;
    navigate(route);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <ChatAvatar name={otherName} avatarUrl={otherAvatar || undefined} online={otherOnline} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{otherName}</p>
          <p className="text-[10px] text-muted-foreground">
            {otherOnline ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleOpenFullscreen}
          aria-label="Ouvrir en plein écran"
          title="Ouvrir en plein écran"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 bg-muted/20">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Démarrez la conversation
          </div>
        ) : (
          messages.map((m, idx) => (
            <PremiumMessageBubble
              key={m.id}
              content={m.content || ''}
              isSent={m.sender_id === user?.id}
              timestamp={m.created_at}
              read={!!m.read}
              attachmentUrl={m.attachment_url}
              attachmentName={m.attachment_name}
              attachmentType={m.attachment_type}
              attachmentSize={m.attachment_size}
              index={idx}
            />
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-2 border-t border-border/50 bg-background/95 backdrop-blur flex items-end gap-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend(e as any);
            }
          }}
          placeholder={`Message à ${otherName}...`}
          rows={1}
          className="resize-none min-h-[40px] max-h-[120px] text-sm"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} className="h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
