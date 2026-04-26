import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FloatingMessengerContextValue {
  isOpen: boolean;
  activeConversationId: string | null;
  unreadCount: number;
  hasNew: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openWith: (conversationId: string) => void;
  setActiveConversation: (id: string | null) => void;
  acknowledgeNew: () => void;
  refreshUnread: () => void;
}

const FloatingMessengerContext = createContext<FloatingMessengerContextValue | undefined>(undefined);

export function FloatingMessengerProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!user || !userRole) {
      setUnreadCount(0);
      return;
    }
    try {
      // Get conversation IDs the user is part of
      let convIds: string[] = [];
      if (userRole === 'client') {
        const { data: cli } = await supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle();
        if (!cli) return;
        const { data: convs } = await supabase.from('conversations').select('id').eq('client_id', cli.id);
        convIds = convs?.map(c => c.id) || [];
      } else if (userRole === 'agent') {
        const { data: ag } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
        if (!ag) return;
        const { data: convs } = await supabase.from('conversations').select('id').eq('agent_id', ag.id);
        convIds = convs?.map(c => c.id) || [];
      } else if (userRole === 'proprietaire' || userRole === 'admin') {
        const { data: convs } = await supabase.from('conversations').select('id');
        convIds = convs?.map(c => c.id) || [];
      }

      if (convIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Count messages where read=false and sender is not me (sender_id != my user.id)
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('read', false)
        .neq('sender_id', user.id);

      setUnreadCount(count || 0);
    } catch (e) {
      console.error('[FloatingMessenger] refreshUnread error', e);
    }
  }, [user, userRole]);

  // Initial load + refresh on user change
  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // Realtime subscription on messages
  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`floating-messenger-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const m = payload.new;
          if (!m) return;
          if (m.sender_id === user.id) return; // own message
          // bump unread + show pulse
          setUnreadCount(c => c + 1);
          setHasNew(true);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          // a read flag could have changed → refresh
          refreshUnread();
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, refreshUnread]);

  const open = useCallback(() => {
    setIsOpen(true);
    setHasNew(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setHasNew(false);
      return !prev;
    });
  }, []);
  const openWith = useCallback((id: string) => {
    setActiveConversationId(id);
    setIsOpen(true);
    setHasNew(false);
  }, []);
  const acknowledgeNew = useCallback(() => setHasNew(false), []);
  const setActiveConversation = useCallback((id: string | null) => setActiveConversationId(id), []);

  const value = useMemo<FloatingMessengerContextValue>(() => ({
    isOpen,
    activeConversationId,
    unreadCount,
    hasNew,
    open,
    close,
    toggle,
    openWith,
    setActiveConversation,
    acknowledgeNew,
    refreshUnread,
  }), [isOpen, activeConversationId, unreadCount, hasNew, open, close, toggle, openWith, setActiveConversation, acknowledgeNew, refreshUnread]);

  return (
    <FloatingMessengerContext.Provider value={value}>
      {children}
    </FloatingMessengerContext.Provider>
  );
}

export function useFloatingMessenger() {
  const ctx = useContext(FloatingMessengerContext);
  if (!ctx) throw new Error('useFloatingMessenger must be used inside FloatingMessengerProvider');
  return ctx;
}
