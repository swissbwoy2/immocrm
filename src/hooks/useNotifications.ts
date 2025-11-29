import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
}

export interface NotificationCounts {
  total: number;
  new_client_activated: number;
  client_assigned: number;
  new_message: number;
  new_offer: number;
  new_visit: number;
  visit_reminder: number;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    new_client_activated: 0,
    client_assigned: 0,
    new_message: 0,
    new_offer: 0,
    new_visit: 0,
    visit_reminder: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Cast the data to our Notification type
      const typedNotifications = (data || []).map(n => ({
        ...n,
        metadata: n.metadata as Record<string, any> | null
      })) as Notification[];

      setNotifications(typedNotifications);
      updateCounts(typedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateCounts = (notifs: Notification[]) => {
    const unread = notifs.filter(n => !n.read);
    setCounts({
      total: unread.length,
      new_client_activated: unread.filter(n => n.type === 'new_client_activated').length,
      client_assigned: unread.filter(n => n.type === 'client_assigned').length,
      new_message: unread.filter(n => n.type === 'new_message').length,
      new_offer: unread.filter(n => n.type === 'new_offer').length,
      new_visit: unread.filter(n => n.type === 'new_visit').length,
      visit_reminder: unread.filter(n => n.type === 'visit_reminder').length,
    });
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => {
        const updated = prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        updateCounts(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        updateCounts(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  const markTypeAsRead = useCallback(async (type: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => {
        const updated = prev.map(n => 
          n.type === type ? { ...n, read: true } : n
        );
        updateCounts(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error marking type notifications as read:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        updateCounts(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user]);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      // Écouter les nouvelles notifications
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = {
            ...payload.new,
            metadata: payload.new.metadata as Record<string, any> | null
          } as Notification;
          
          setNotifications(prev => {
            const updated = [newNotification, ...prev];
            updateCounts(updated);
            return updated;
          });

          // Afficher un toast pour la nouvelle notification
          toast({
            title: newNotification.title,
            description: newNotification.message || undefined,
          });
        }
      )
      // Écouter les mises à jour (mark as read depuis autre appareil)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => {
            const updated = prev.map(n => 
              n.id === payload.new.id 
                ? { ...payload.new, metadata: payload.new.metadata as Record<string, any> | null } as Notification 
                : n
            );
            updateCounts(updated);
            return updated;
          });
        }
      )
      // Écouter les suppressions
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => {
            const updated = prev.filter(n => n.id !== payload.old.id);
            updateCounts(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return {
    notifications,
    counts,
    loading,
    markAsRead,
    markAllAsRead,
    markTypeAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
};
