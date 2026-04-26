import { useEffect, useState } from 'react';
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

export function FloatingConversationList({ onSelect }: Props) {
  const { user, userRole } = useAuth();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !userRole) return;
      setLoading(true);
      try {
        // 1) Get conversations relevant to the user
        let convRows: any[] = [];
        if (userRole === 'client') {
          const { data: cli } = await supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle();
          if (!cli) { setItems([]); return; }
          const { data } = await supabase
            .from('conversations')
            .select('id, agent_id, client_id, conversation_type, updated_at')
            .eq('client_id', cli.id)
            .order('updated_at', { ascending: false });
          convRows = data || [];
        } else if (userRole === 'agent') {
          const { data: ag } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
          if (!ag) { setItems([]); return; }
          const { data } = await supabase
            .from('conversations')
            .select('id, agent_id, client_id, conversation_type, updated_at')
            .eq('agent_id', ag.id)
            .order('updated_at', { ascending: false });
          convRows = data || [];
        } else {
          // admin / proprietaire → all (RLS will filter)
          const { data } = await supabase
            .from('conversations')
            .select('id, agent_id, client_id, conversation_type, updated_at')
            .order('updated_at', { ascending: false })
            .limit(50);
          convRows = data || [];
        }

        if (convRows.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        // 2) Resolve other party names: clients via clients+profiles, agents via agents+profiles
        const clientIds = Array.from(new Set(convRows.map(c => c.client_id).filter(Boolean)));
        const agentIds = Array.from(new Set(convRows.map(c => c.agent_id).filter(Boolean)));

        const [clientsRes, agentsRes] = await Promise.all([
          clientIds.length
            ? supabase.from('clients').select('id, prenom, nom, user_id').in('id', clientIds)
            : Promise.resolve({ data: [] as any[] }),
          agentIds.length
            ? supabase.from('agents').select('id, user_id').in('id', agentIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const clientUserIds = (clientsRes.data || []).map((c: any) => c.user_id).filter(Boolean);
        const agentUserIds = (agentsRes.data || []).map((a: any) => a.user_id).filter(Boolean);
        const allUserIds = Array.from(new Set([...clientUserIds, ...agentUserIds]));

        const { data: profiles } = allUserIds.length
          ? await supabase.from('profiles').select('id, prenom, nom, avatar_url, is_online').in('id', allUserIds)
          : { data: [] as any[] };

        const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
        const clientById = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
        const agentById = new Map((agentsRes.data || []).map((a: any) => [a.id, a]));

        // 3) Last message + unread per conversation
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
        const built: ConversationItem[] = convRows.map(conv => {
          // Determine "other party" perspective
          let otherProfile: any = null;
          if (userRole === 'client') {
            const ag = agentById.get(conv.agent_id);
            otherProfile = ag ? profileById.get(ag.user_id) : null;
          } else if (userRole === 'agent') {
            const cli = clientById.get(conv.client_id);
            // For client, prefer profile (if user_id) else client own prenom/nom
            otherProfile = cli?.user_id ? profileById.get(cli.user_id) : null;
            if (!otherProfile && cli) {
              otherProfile = { prenom: cli.prenom, nom: cli.nom };
            }
          } else {
            // admin/proprio → show client name as primary
            const cli = conv.client_id ? clientById.get(conv.client_id) : null;
            const ag = conv.agent_id ? agentById.get(conv.agent_id) : null;
            otherProfile = cli?.user_id ? profileById.get(cli.user_id) : null;
            if (!otherProfile && cli) otherProfile = { prenom: cli.prenom, nom: cli.nom };
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
            lastMessageAt: last?.created_at ?? conv.updated_at ?? null,
            unread: unreadByConv.get(conv.id) || 0,
          };
        });

        if (!cancelled) setItems(built);
      } catch (e) {
        console.error('[FloatingConversationList] load error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, userRole]);

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
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border/50">
        {items.map((item, idx) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.2 }}
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
    </div>
  );
}
