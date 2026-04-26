import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';
import { Loader2, MessagesSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConversationItem {
  id: string;
  otherName: string;
  otherAvatar?: string | null;
  isOnline?: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unread: number;
}

interface Props {
  onSelect: (conversationId: string) => void;
}

const PAGE_SIZE = 20;

export function FloatingConversationList({ onSelect }: Props) {
  const { user, userRole } = useAuth();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Caches scoped per render lifecycle (kept across pages)
  const seenConvIds = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageIndex: number): Promise<ConversationItem[]> => {
      if (!user || !userRole) return [];
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1) Get conversations relevant to the user
      let convQuery = supabase
        .from('conversations')
        .select('id, agent_id, client_id, conversation_type, last_message_at')
        .order('last_message_at', { ascending: false })
        .range(from, to);

      if (userRole === 'client') {
        const { data: cli } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cli) return [];
        convQuery = convQuery.eq('client_id', cli.id);
      } else if (userRole === 'agent') {
        const { data: ag } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!ag) return [];
        convQuery = convQuery.eq('agent_id', ag.id);
      }
      // admin / proprietaire → all (RLS will filter)

      const { data: convRows, error: convErr } = await convQuery;
      if (convErr) {
        console.error('[FloatingConversationList] conv query error', convErr);
        return [];
      }
      if (!convRows || convRows.length === 0) return [];

      // 2) Resolve other-party identities
      const clientIds = Array.from(new Set(convRows.map(c => c.client_id).filter(Boolean)));
      const agentIds = Array.from(new Set(convRows.map(c => c.agent_id).filter(Boolean)));

      const [clientsRes, agentsRes] = await Promise.all([
        clientIds.length
          ? supabase.from('clients').select('id, user_id').in('id', clientIds)
          : Promise.resolve({ data: [] as any[] }),
        agentIds.length
          ? supabase.from('agents').select('id, user_id').in('id', agentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const clientUserIds = (clientsRes.data || []).map((c: any) => c.user_id).filter(Boolean);
      const agentUserIds = (agentsRes.data || []).map((a: any) => a.user_id).filter(Boolean);
      const allUserIds = Array.from(new Set([...clientUserIds, ...agentUserIds]));

      const { data: profiles } = allUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, prenom, nom, avatar_url, is_online')
            .in('id', allUserIds)
        : { data: [] as any[] };

      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
      const clientById = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
      const agentById = new Map((agentsRes.data || []).map((a: any) => [a.id, a]));

      // 3) Last message + unread per conversation (only this page)
      const convIds = convRows.map(c => c.id);
      const [lastMsgsRes, unreadRes] = await Promise.all([
        supabase
          .from('messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('read', false)
          .neq('sender_id', user.id),
      ]);

      const lastByConv = new Map<string, { content: string | null; created_at: string }>();
      (lastMsgsRes.data || []).forEach((m: any) => {
        if (!lastByConv.has(m.conversation_id)) {
          lastByConv.set(m.conversation_id, { content: m.content, created_at: m.created_at });
        }
      });
      const unreadByConv = new Map<string, number>();
      (unreadRes.data || []).forEach((m: any) => {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) || 0) + 1);
      });

      // 4) Build items
      return convRows.map(conv => {
        let otherProfile: any = null;
        if (userRole === 'client') {
          const ag = agentById.get(conv.agent_id);
          otherProfile = ag ? profileById.get(ag.user_id) : null;
        } else if (userRole === 'agent') {
          const cli = clientById.get(conv.client_id);
          otherProfile = cli?.user_id ? profileById.get(cli.user_id) : null;
        } else {
          const cli = conv.client_id ? clientById.get(conv.client_id) : null;
          const ag = conv.agent_id ? agentById.get(conv.agent_id) : null;
          otherProfile = cli?.user_id ? profileById.get(cli.user_id) : null;
          if (!otherProfile && ag) otherProfile = profileById.get(ag.user_id);
        }
        const fullName = otherProfile
          ? `${otherProfile.prenom || ''} ${otherProfile.nom || ''}`.trim() || 'Conversation'
          : 'Conversation';
        const last = lastByConv.get(conv.id);
        return {
          id: conv.id,
          otherName: fullName,
          otherAvatar: otherProfile?.avatar_url ?? null,
          isOnline: !!otherProfile?.is_online,
          lastMessage: last?.content ?? null,
          lastMessageAt: last?.created_at ?? conv.last_message_at ?? null,
          unread: unreadByConv.get(conv.id) || 0,
        };
      });
    },
    [user, userRole]
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      seenConvIds.current = new Set();
      setPage(0);
      setHasMore(true);
      try {
        const first = await fetchPage(0);
        if (cancelled) return;
        first.forEach(i => seenConvIds.current.add(i.id));
        setItems(first);
        setHasMore(first.length === PAGE_SIZE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInitial();
    return () => { cancelled = true; };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const more = await fetchPage(nextPage);
      const fresh = more.filter(i => !seenConvIds.current.has(i.id));
      fresh.forEach(i => seenConvIds.current.add(i.id));
      setItems(prev => [...prev, ...fresh]);
      setPage(nextPage);
      // If we got less than a full page, no more data
      if (more.length < PAGE_SIZE) setHasMore(false);
    } catch (e) {
      console.error('[FloatingConversationList] loadMore error', e);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  // IntersectionObserver to auto-load when sentinel enters view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { root, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, items.length]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
        <MessagesSquare className="h-10 w-10 opacity-40" />
        <p className="text-sm">Aucune conversation pour le moment</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border/50">
        {items.map((item, idx) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx, 10) * 0.02, duration: 0.2 }}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 active:bg-accent transition-colors text-left min-h-[64px]"
            >
              <ChatAvatar
                name={item.otherName}
                avatarUrl={item.otherAvatar || undefined}
                online={item.isOnline}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{item.otherName}</span>
                  {item.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(item.lastMessageAt), { locale: fr, addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">
                    {item.lastMessage || 'Pas de message'}
                  </span>
                  {item.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {item.unread > 9 ? '9+' : item.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </motion.li>
        ))}
      </ul>

      {/* Sentinel + manual fallback */}
      <div ref={sentinelRef} className="py-3 flex items-center justify-center">
        {loadingMore ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="text-xs text-primary hover:underline"
          >
            Charger plus
          </button>
        ) : items.length > PAGE_SIZE ? (
          <span className="text-[10px] text-muted-foreground">— Fin des conversations —</span>
        ) : null}
      </div>
    </div>
  );
}
