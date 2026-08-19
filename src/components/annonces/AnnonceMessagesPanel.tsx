import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Send,
  Search,
  Home,
  ChevronLeft,
  Paperclip,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Ban,
  Loader2,
  FileDown,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AnnonceConversation,
  fetchAnnonceConversations,
  fetchAnnonceMessages,
  getAttachmentUrl,
  isArchived,
  isBlockedByMe,
  isBlockedByOther,
  isGuestConversation,
  lastMessage,
  markAnnonceMessagesRead,
  sendAnnonceMessage,
  setConversationFlag,
  unreadCount,
} from '@/lib/annonceMessaging';

interface Props {
  userId: string;
  initialConversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
  emptyLabel?: string;
}

export function AnnonceMessagesPanel({
  userId,
  initialConversationId,
  onConversationChange,
  emptyLabel = 'Aucune conversation',
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(initialConversationId || null);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['annonce-conversations', userId],
    queryFn: () => fetchAnnonceConversations(userId),
    enabled: !!userId,
  });

  const { data: messages } = useQuery({
    queryKey: ['annonce-messages', selected],
    queryFn: () => fetchAnnonceMessages(selected as string),
    enabled: !!selected,
  });

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`annonce-messaging-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages_annonces' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['annonce-conversations', userId] });
          queryClient.invalidateQueries({ queryKey: ['annonce-messages'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  useEffect(() => {
    onConversationChange?.(selected);
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selected || !messages?.length) return;
    const hasUnread = messages.some((m) => !m.lu && m.expediteur_id !== userId);
    if (hasUnread) {
      markAnnonceMessagesRead(selected, userId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['annonce-conversations', userId] });
      });
    }
  }, [selected, messages, userId]);

  const visibleConversations = useMemo(() => {
    return (conversations || [])
      .filter((c) => isArchived(c, userId) === showArchived)
      .filter((c) => {
        if (!search) return true;
        const t = `${c.annonces_publiques?.titre || ''} ${c.annonces_publiques?.ville || ''}`;
        return t.toLowerCase().includes(search.toLowerCase());
      });
  }, [conversations, search, showArchived, userId]);

  const conv = conversations?.find((c) => c.id === selected) || null;
  const blockedByMe = conv ? isBlockedByMe(conv, userId) : false;
  const blockedByOther = conv ? isBlockedByOther(conv, userId) : false;

  const handleSend = async () => {
    if (!selected || (!newMessage.trim() && !file) || sending) return;
    setSending(true);
    try {
      await sendAnnonceMessage({ conversationId: selected, userId, contenu: newMessage.trim(), file });
      setNewMessage('');
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['annonce-messages', selected] });
      queryClient.invalidateQueries({ queryKey: ['annonce-conversations', userId] });
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const toggleFlag = async (c: AnnonceConversation, flag: 'archive' | 'bloque') => {
    const current = flag === 'archive' ? isArchived(c, userId) : isBlockedByMe(c, userId);
    try {
      await setConversationFlag(c, userId, flag, !current);
      queryClient.invalidateQueries({ queryKey: ['annonce-conversations', userId] });
      toast.success(
        flag === 'archive'
          ? !current ? 'Conversation archivée' : 'Conversation désarchivée'
          : !current ? 'Interlocuteur bloqué' : 'Blocage retiré',
      );
    } catch (e: any) {
      toast.error(e?.message || 'Action impossible');
    }
  };

  const openAttachment = async (path: string) => {
    const url = await getAttachmentUrl(path);
    if (url) window.open(url, '_blank');
    else toast.error('Fichier indisponible');
  };

  return (
    <div className="h-full flex rounded-xl border border-border overflow-hidden bg-card">
      {/* List */}
      <div className={cn('w-full md:w-80 border-r border-border flex flex-col', selected && 'hidden md:flex')}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une annonce..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showArchived ? 'outline' : 'default'}
              onClick={() => setShowArchived(false)}
              className="flex-1"
            >
              Actives
            </Button>
            <Button
              size="sm"
              variant={showArchived ? 'default' : 'outline'}
              onClick={() => setShowArchived(true)}
              className="flex-1"
            >
              Archivées
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-sm">{emptyLabel}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleConversations.map((c) => {
                const last = lastMessage(c);
                const unread = unreadCount(c, userId);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={cn(
                      'w-full text-left p-4 hover:bg-muted/60 transition-colors',
                      selected === c.id && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {c.annonces_publiques?.titre || 'Annonce'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {isGuestConversation(c)
                            ? `${c.guest_nom || 'Visiteur'} · ${c.guest_email || ''}`
                            : c.annonces_publiques?.ville || ''}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {last?.contenu || 'Nouvelle conversation'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.dernier_message_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {isToday(new Date(c.dernier_message_at))
                              ? format(new Date(c.dernier_message_at), 'HH:mm')
                              : format(new Date(c.dernier_message_at), 'dd MMM', { locale: fr })}
                          </span>
                        )}
                        {unread > 0 && <Badge className="h-5 min-w-5 px-1.5">{unread}</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Thread */}
      <div className={cn('flex-1 flex flex-col', !selected && 'hidden md:flex')}>
        {!conv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-14 w-14 mb-4 opacity-30" />
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelected(null)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">
                  {conv.annonces_publiques?.titre || 'Annonce'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isGuestConversation(conv)
                    ? `${conv.guest_nom || 'Visiteur'} · ${conv.guest_email || ''}${conv.guest_telephone ? ` · ${conv.guest_telephone}` : ''}`
                    : conv.annonces_publiques?.ville}
                </p>
              </div>
              {conv.annonces_publiques?.slug && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={`/annonces/${conv.annonces_publiques.slug}`} target="_blank" rel="noreferrer">
                    <Home className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleFlag(conv, 'archive')}>
                    {isArchived(conv, userId) ? (
                      <><ArchiveRestore className="h-4 w-4 mr-2" />Désarchiver</>
                    ) : (
                      <><Archive className="h-4 w-4 mr-2" />Archiver</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleFlag(conv, 'bloque')}>
                    <Ban className="h-4 w-4 mr-2" />
                    {blockedByMe ? 'Débloquer' : 'Bloquer'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {(messages || []).map((m) => {
                  const mine = !!m.expediteur_id && m.expediteur_id === userId;
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                          mine
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm',
                        )}
                      >
                        {m.contenu && <p className="whitespace-pre-wrap break-words">{m.contenu}</p>}
                        {m.piece_jointe_url && (
                          <button
                            onClick={() => openAttachment(m.piece_jointe_url as string)}
                            className="mt-2 flex items-center gap-2 text-xs underline"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            {m.piece_jointe_nom || 'Pièce jointe'}
                          </button>
                        )}
                        <p className={cn('text-[10px] mt-1', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          {format(new Date(m.created_at), 'dd MMM HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border">
              {isGuestConversation(conv) ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-center text-xs text-muted-foreground">
                    Demande envoyée par un visiteur non inscrit — répondez-lui par e-mail.
                  </p>
                  {conv.guest_email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${conv.guest_email}?subject=${encodeURIComponent(conv.annonces_publiques?.titre || 'Votre demande')}`}>
                        <Send className="h-4 w-4 mr-2" /> Répondre par e-mail
                      </a>
                    </Button>
                  )}
                </div>
              ) : blockedByMe || blockedByOther ? (
                <p className="text-center text-sm text-muted-foreground py-2">
                  {blockedByMe
                    ? 'Vous avez bloqué cette conversation.'
                    : 'Cette conversation a été bloquée par votre interlocuteur.'}
                </p>
              ) : (
                <>
                  {file && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{file.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Retirer</Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}>
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Écrivez votre message..."
                      rows={1}
                      className="min-h-[42px] max-h-32 resize-none"
                    />
                    <Button onClick={handleSend} disabled={sending || (!newMessage.trim() && !file)}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
