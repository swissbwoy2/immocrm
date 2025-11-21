import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationCounts {
  unreadMessages: number;
  newOffers: number;
}

export const useRealtimeNotifications = (userId: string | undefined, userRole: string | null) => {
  const { toast } = useToast();
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadMessages: 0,
    newOffers: 0,
  });

  useEffect(() => {
    if (!userId || !userRole) return;

    loadInitialCounts();

    // Subscribe to messages changes
    const messagesChannel = supabase
      .channel('notifications-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          // Check if this message is for the current user
          const { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', payload.new.conversation_id)
            .single();

          if (!conversation) return;

          const isForCurrentUser = 
            (userRole === 'client' && conversation.client_id === userId && payload.new.sender_type === 'agent') ||
            (userRole === 'agent' && conversation.agent_id === userId && payload.new.sender_type === 'client');

          if (isForCurrentUser) {
            setCounts(prev => ({ ...prev, unreadMessages: prev.unreadMessages + 1 }));
            toast({
              title: 'Nouveau message',
              description: 'Vous avez reçu un nouveau message',
            });
          }
        }
      )
      .subscribe();

    // Subscribe to offers changes (for clients only)
    let offersChannel: any;
    if (userRole === 'client') {
      offersChannel = supabase
        .channel('notifications-offers')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'offres',
          },
          async (payload) => {
            // Get client ID
            const { data: clientData } = await supabase
              .from('clients')
              .select('id')
              .eq('user_id', userId)
              .single();

            if (clientData && payload.new.client_id === clientData.id) {
              setCounts(prev => ({ ...prev, newOffers: prev.newOffers + 1 }));
              toast({
                title: 'Nouvelle offre',
                description: 'Vous avez reçu une nouvelle offre immobilière',
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(messagesChannel);
      if (offersChannel) {
        supabase.removeChannel(offersChannel);
      }
    };
  }, [userId, userRole, toast]);

  const loadInitialCounts = async () => {
    if (!userId || !userRole) return;

    try {
      // Count unread messages
      if (userRole === 'client') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (clientData) {
          const { data: conversations } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', clientData.id);

          const conversationIds = conversations?.map(c => c.id) || [];

          if (conversationIds.length > 0) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', conversationIds)
              .eq('sender_type', 'agent')
              .eq('read', false);

            setCounts(prev => ({ ...prev, unreadMessages: count || 0 }));
          }
        }
      } else if (userRole === 'agent') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (agentData) {
          const { data: conversations } = await supabase
            .from('conversations')
            .select('id')
            .eq('agent_id', agentData.id);

          const conversationIds = conversations?.map(c => c.id) || [];

          if (conversationIds.length > 0) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', conversationIds)
              .eq('sender_type', 'client')
              .eq('read', false);

            setCounts(prev => ({ ...prev, unreadMessages: count || 0 }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  const markMessagesAsRead = (conversationId: string) => {
    setCounts(prev => ({ ...prev, unreadMessages: Math.max(0, prev.unreadMessages - 1) }));
  };

  const markOffersAsViewed = () => {
    setCounts(prev => ({ ...prev, newOffers: 0 }));
  };

  return { counts, markMessagesAsRead, markOffersAsViewed };
};
