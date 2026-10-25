import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingMessenger } from '@/hooks/useFloatingMessenger';
import { useMessageDraft } from '@/hooks/useMessageDraft';
import { useClientDossier } from '@/hooks/useClientDossier';
import { postDossierDocumentMessage, type FiledDocument } from '@/lib/clientDossier';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';
import { PremiumMessageBubble } from '@/components/messaging/PremiumMessageBubble';
import { PremiumChatInput } from '@/components/messaging/PremiumChatInput';
import { SteeveHandoffBar } from '@/components/messaging/SteeveHandoffBar';
import { MessageAttachmentUploader } from '@/components/MessageAttachmentUploader';
import { ChevronLeft, Loader2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isDuplicateClientMessage, isSteeveSender, newClientMessageId } from '@/lib/steeve';

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
  payload?: unknown;
  masque_messagerie?: boolean | null;
}

interface PendingAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
  thumbnail_url?: string;
}

/** Ajoute des messages sans doublon (même id), triés par date. */
function mergeMessages(prev: MessageRow[], incoming: MessageRow[]): MessageRow[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) {
    if (!m?.id || m.masque_messagerie) continue;
    byId.set(m.id, { ...byId.get(m.id), ...m });
  }
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function FloatingConversationView({ conversationId, onBack }: Props) {
  const { user, userRole } = useAuth();
  // Identifiant stable : l'objet user est recréé à chaque rafraîchissement de session (retour sur l'onglet, jeton).
  const userId = user?.id ?? null;
  // Client : le trombone propose les pièces du dossier, classées dès l'envoi.
  const dossier = useClientDossier();
  const { close, refreshUnread } = useFloatingMessenger();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useMessageDraft(conversationId);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [otherName, setOtherName] = useState('Conversation');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesRef = useRef<MessageRow[]>([]);
  messagesRef.current = messages;
  // Identifiant d'envoi réutilisé tant que le même message est renvoyé après un échec.
  const pendingSendRef = useRef<{ signature: string; clientMsgId: string } | null>(null);

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
        const { data: cli } = await supabase.from('clients').select('user_id').eq('id', conv.client_id).maybeSingle();
        otherUserId = cli?.user_id ?? null;
        fallbackName = 'Client';
      } else if (conv.client_id) {
        const { data: cli } = await supabase.from('clients').select('user_id').eq('id', conv.client_id).maybeSingle();
        otherUserId = cli?.user_id ?? null;
        fallbackName = 'Client';
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

  const markIncomingAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', userId);
    refreshUnread();
  }, [conversationId, userId, refreshUnread]);

  // Changement de conversation uniquement : on repart d'une liste vide, sans pièce jointe en attente.
  useEffect(() => {
    setMessages([]);
    setPendingAttachment(null);
    pendingSendRef.current = null;
  }, [conversationId]);

  // Load messages + mark as read
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('masque_messagerie', false)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        if (!error) setMessages((prev) => mergeMessages(prev, (data || []) as MessageRow[]));
        setLoading(false);
      }
      await markIncomingAsRead();
    }
    load();
    return () => { cancelled = true; };
  }, [conversationId, markIncomingAsRead]);

  // Realtime for this conversation (sans doublon ; rattrapage des messages manqués après une coupure)
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    let subscribedOnce = false;

    const catchUp = async () => {
      const known = messagesRef.current;
      const last = known.length > 0 ? known[known.length - 1].created_at : null;
      let query = supabase
        .from('messages')
        .select('*')
        .eq('masque_messagerie', false)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (last) query = query.gte('created_at', last);
      const { data, error } = await query;
      if (!error && data) {
        setMessages((prev) => mergeMessages(prev, data as MessageRow[]));
        await markIncomingAsRead();
      }
    };

    const channel = supabase
      .channel(`floating-conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: { new: MessageRow }) => {
          if (payload.new?.masque_messagerie) return;
          setMessages((prev) => mergeMessages(prev, [payload.new as MessageRow]));
          // auto-mark as read if from other
          if (userId && payload.new.sender_id !== userId) {
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', payload.new.id)
              .then(() => refreshUnread());
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        if (subscribedOnce) void catchUp();
        subscribedOnce = true;
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, refreshUnread, markIncomingAsRead]);

  // Rattrapage au retour sur l'onglet ou au retour du réseau
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return;
      const known = messagesRef.current;
      const last = known.length > 0 ? known[known.length - 1].created_at : null;
      let query = supabase
        .from('messages')
        .select('*')
        .eq('masque_messagerie', false)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (last) query = query.gte('created_at', last);
      query.then(({ data, error }) => {
        if (!error && data) setMessages((prev) => mergeMessages(prev, data as MessageRow[]));
      });
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('online', onReturn);
    };
  }, [conversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Les noms ne s'affichent que lorsque plusieurs interlocuteurs écrivent (ex. Steeve et un agent).
  const incomingSenderKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const m of messages) {
      if (m.sender_id === user?.id) continue;
      keys.add(isSteeveSender(m.sender_type) ? 'steeve' : m.sender_id);
    }
    return keys;
  }, [messages, user?.id]);
  const showSenderNames = incomingSenderKeys.size > 1;

  useEffect(() => {
    if (!showSenderNames) return;
    const missing = [...incomingSenderKeys].filter(
      (k) => k !== 'steeve' && !(k in senderNames) && /^[0-9a-f-]{36}$/i.test(k),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, prenom, nom')
      .in('id', missing)
      .then(({ data }) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const id of missing) next[id] = '';
        for (const p of data || []) next[p.id] = `${p.prenom || ''} ${p.nom || ''}`.trim();
        setSenderNames((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
  }, [showSenderNames, incomingSenderKeys, senderNames]);

  const senderType = userRole || 'client';

  const handleSend = async (text: string) => {
    if (!user || (!text && !pendingAttachment)) return;
    const attachment = pendingAttachment;
    const signature = `${text}\u0000${attachment?.url || ''}`;
    if (!pendingSendRef.current || pendingSendRef.current.signature !== signature) {
      pendingSendRef.current = { signature, clientMsgId: newClientMessageId() };
    }
    const { clientMsgId } = pendingSendRef.current;

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: senderType,
        content: text || null,
        attachment_url: attachment?.url || null,
        attachment_thumbnail_url: attachment?.thumbnail_url || null,
        attachment_type: attachment?.type || null,
        attachment_name: attachment?.name || null,
        attachment_size: attachment?.size || null,
        client_msg_id: clientMsgId,
      })
      .select()
      .maybeSingle();

    // Déjà enregistré lors d'une tentative précédente (réponse perdue) : rien à renvoyer.
    if (error && !isDuplicateClientMessage(error)) {
      toast({ title: 'Erreur', description: error.message || "Impossible d'envoyer", variant: 'destructive' });
      // Rejeté pour que la zone de saisie conserve le texte.
      throw error;
    }

    if (inserted) setMessages((prev) => mergeMessages(prev, [inserted as MessageRow]));
    pendingSendRef.current = null;
    setPendingAttachment(null);
  };

  const handleDocumentFiled = async (doc: FiledDocument): Promise<boolean> => {
    if (!userId) return false;
    const { data: inserted, error } = await postDossierDocumentMessage({
      conversationId,
      senderId: userId,
      senderType,
      doc,
      clientMsgId: newClientMessageId(),
    });
    if (error) {
      // La pièce est bien dans le dossier ; seule l'annonce dans la conversation a échoué (message unique côté sélecteur).
      return false;
    }
    if (inserted) setMessages((prev) => mergeMessages(prev, [inserted as MessageRow]));
    return true;
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
      <div className="flex items-center gap-3 border-b border-border/70 px-3 py-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full hover:bg-muted" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <ChatAvatar name={otherName} avatarUrl={otherAvatar || undefined} online={otherOnline} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{otherName}</p>
          <p className="text-xs text-muted-foreground">
            {otherOnline ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full hover:bg-muted"
          onClick={handleOpenFullscreen}
          aria-label="Ouvrir en plein écran"
          title="Ouvrir en plein écran"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Qui répond : Steeve ou un humain (invisible tant que Steeve n'est pas activé) */}
      <SteeveHandoffBar conversationId={conversationId} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 p-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Démarrez la conversation
          </div>
        ) : (
          messages.map((m, idx) => (
            <PremiumMessageBubble
              key={m.id}
              content={m.content || ''}
              isSent={m.sender_id === user?.id}
              senderType={m.sender_type}
              senderName={showSenderNames ? senderNames[m.sender_id] || undefined : undefined}
              timestamp={m.created_at}
              read={!!m.read}
              attachmentUrl={m.attachment_url}
              attachmentName={m.attachment_name}
              attachmentType={m.attachment_type}
              attachmentSize={m.attachment_size}
              payload={(m.payload as ComponentProps<typeof PremiumMessageBubble>['payload']) ?? null}
              index={idx}
            />
          ))
        )}
      </div>

      {/* Input : même zone de saisie que la page Messagerie (texte, fichiers, photos, vocal) */}
      <PremiumChatInput
        onSendMessage={handleSend}
        message={draft}
        onMessageChange={setDraft}
        placeholder={`Message à ${otherName}...`}
        pendingAttachment={pendingAttachment}
        onRemoveAttachment={() => setPendingAttachment(null)}
        attachmentSlot={
          <MessageAttachmentUploader
            conversationId={conversationId}
            value={pendingAttachment}
            onAttachmentReady={setPendingAttachment}
            dossier={dossier}
            onDocumentFiled={handleDocumentFiled}
          />
        }
      />
    </div>
  );
}
