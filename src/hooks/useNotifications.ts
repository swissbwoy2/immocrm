import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  client_removed: number;
  client_updated: number;
  new_message: number;
  new_offer: number;
  new_visit: number;
  visit_reminder: number;
  activation_request: number;
  candidature_acceptee: number;
  candidature_refusee: number;
  candidature_bail_conclu: number;
  candidature_attente_bail: number;
  candidature_bail_recu: number;
  candidature_signature_planifiee: number;
  candidature_signature_effectuee: number;
  candidature_etat_lieux_fixe: number;
  candidature_cles_remises: number;
  candidature_admin: number;
  visit_confirmed: number;
  visit_refused: number;
  client_interesse: number;
  new_proprietaire_invited: number;
  new_interet_acheteur: number;
  new_projet_developpement: number;
  projet_statut_change: number;
}

const INITIAL_COUNTS: NotificationCounts = {
  total: 0,
  new_client_activated: 0,
  client_assigned: 0,
  client_removed: 0,
  client_updated: 0,
  new_message: 0,
  new_offer: 0,
  new_visit: 0,
  visit_reminder: 0,
  activation_request: 0,
  candidature_acceptee: 0,
  candidature_refusee: 0,
  candidature_bail_conclu: 0,
  candidature_attente_bail: 0,
  candidature_bail_recu: 0,
  candidature_signature_planifiee: 0,
  candidature_signature_effectuee: 0,
  candidature_etat_lieux_fixe: 0,
  candidature_cles_remises: 0,
  candidature_admin: 0,
  visit_confirmed: 0,
  visit_refused: 0,
  client_interesse: 0,
  new_proprietaire_invited: 0,
  new_interet_acheteur: 0,
  new_projet_developpement: 0,
  projet_statut_change: 0,
};

// Helper function to calculate counts - defined outside hook for stability
const calculateCounts = (notifs: Notification[]): NotificationCounts => {
  const unread = notifs.filter(n => !n.read);
  const countByType = (type: string) => unread.filter(n => n.type === type).length;
  
  return {
    total: unread.length,
    new_client_activated: countByType('new_client_activated'),
    client_assigned: countByType('client_assigned'),
    client_removed: countByType('client_removed'),
    client_updated: countByType('client_updated'),
    new_message: countByType('new_message'),
    new_offer: countByType('new_offer'),
    new_visit: countByType('new_visit'),
    visit_reminder: countByType('visit_reminder'),
    activation_request: countByType('activation_request'),
    candidature_acceptee: countByType('candidature_acceptee'),
    candidature_refusee: countByType('candidature_refusee'),
    candidature_bail_conclu: countByType('candidature_bail_conclu'),
    candidature_attente_bail: countByType('candidature_attente_bail'),
    candidature_bail_recu: countByType('candidature_bail_recu'),
    candidature_signature_planifiee: countByType('candidature_signature_planifiee'),
    candidature_signature_effectuee: countByType('candidature_signature_effectuee'),
    candidature_etat_lieux_fixe: countByType('candidature_etat_lieux_fixe'),
    candidature_cles_remises: countByType('candidature_cles_remises'),
    candidature_admin: unread.filter(n => n.type.includes('_admin') || n.type.startsWith('candidature_')).length,
    visit_confirmed: countByType('visit_confirmed'),
    visit_refused: countByType('visit_refused'),
    client_interesse: unread.filter(n => n.type === 'client_interesse' || n.type === 'client_visite_planifiee' || n.type === 'client_candidature').length,
    new_proprietaire_invited: countByType('new_proprietaire_invited'),
    new_interet_acheteur: countByType('new_interet_acheteur'),
    new_projet_developpement: countByType('new_projet_developpement'),
    projet_statut_change: countByType('projet_statut_change'),
  };
};

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize counts calculation
  const counts = useMemo(() => calculateCounts(notifications), [notifications]);

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

      const typedNotifications = (data || []).map(n => ({
        ...n,
        metadata: n.metadata as Record<string, any> | null
      })) as Notification[];

      setNotifications(typedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
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

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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

      setNotifications(prev => 
        prev.map(n => n.type === type ? { ...n, read: true } : n)
      );
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

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user]);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Setup realtime subscription
  // CRITICAL: never throw — a crash here would take down the whole dashboard
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      // Unique channel name per user + per mount to avoid
      // "cannot add postgres_changes callbacks after subscribe()" when
      // the hook re-mounts (StrictMode, navigation) before the previous
      // channel is fully cleaned up.
      const channelName = `notifications:${user.id}:${Math.random().toString(36).slice(2, 10)}`;

      channel = supabase
        .channel(channelName)
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

            setNotifications(prev => [newNotification, ...prev]);

            try {
              toastRef.current({
                title: newNotification.title,
                description: newNotification.message || undefined,
              });
            } catch (e) {
              console.error('[useNotifications] toast failed:', e);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev =>
              prev.map(n =>
                n.id === payload.new.id
                  ? { ...payload.new, metadata: payload.new.metadata as Record<string, any> | null } as Notification
                  : n
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        )
        .subscribe();
    } catch (err) {
      // Realtime failure must NEVER crash the dashboard.
      console.error('[useNotifications] realtime setup failed:', err);
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (err) {
        console.error('[useNotifications] removeChannel failed:', err);
      }
    };
  }, [user]);

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
