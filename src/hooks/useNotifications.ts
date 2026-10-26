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

export interface UseNotificationsOptions {
  /** Nombre maximum de notifications chargées (50 par défaut) ; `null` = sans limite. */
  limit?: number | null;
  /**
   * Réception en direct (temps réel + relecture de secours). À n'activer que sur UNE instance
   * par écran (la cloche), pour ne pas multiplier les abonnements.
   */
  live?: boolean;
  /** Appelé une fois par nouvelle notification reçue en direct. */
  onNew?: (n: Notification) => void;
}

/** Préférence locale (cet appareil) : bannières des nouvelles notifications. */
export const NOTIF_BANNERS_KEY = 'imr_notif_banners';
export const notifBannersEnabled = (): boolean => {
  try {
    return localStorage.getItem(NOTIF_BANNERS_KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setNotifBannersEnabled = (on: boolean) => {
  try {
    localStorage.setItem(NOTIF_BANNERS_KEY, on ? 'on' : 'off');
  } catch {
    /* stockage indisponible */
  }
};

/** Notifications déjà signalées (évite les doublons si deux cloches sont montées). */
const announced = new Set<string>();

/** Signal « les notifications ont changé » : cloche, page Notifications et badges se remettent à jour. */
export const NOTIFICATIONS_CHANGED_EVENT = 'imr:notifications-changed';
export const emitNotificationsChanged = (source?: string) => {
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: { source } }));
  } catch {
    /* hors navigateur */
  }
};

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const limit = options.limit === undefined ? 50 : options.limit;
  const live = options.live === true;
  const onNewRef = useRef(options.onNew);
  onNewRef.current = options.onNew;
  const { user } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2));
  const changed = useCallback(() => emitNotificationsChanged(instanceId.current), []);

  // Memoize counts calculation
  const counts = useMemo(() => calculateCounts(notifications), [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (limit !== null) query = query.limit(limit);
      // Les non lues sont toujours chargées en entier : jamais « perdues » derrière la limite,
      // et les compteurs de la cloche restent justes.
      const [{ data, error }, { data: unreadRows }] = await Promise.all([
        query,
        limit !== null
          ? supabase
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .eq('read', false)
              .order('created_at', { ascending: false })
              .limit(1000)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      if (error) throw error;

      const byId = new Map<string, any>();
      for (const n of [...(data || []), ...((unreadRows as any[]) || [])]) byId.set(n.id, n);
      const typedNotifications = [...byId.values()]
        .map(n => ({ ...n, metadata: n.metadata as Record<string, any> | null }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Notification[];

      setNotifications(typedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

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
      changed();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user, changed]);

  const recordClick = useCallback(async (notificationId: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('communication_notification_click', { p_id: notificationId });
    if (error) { console.error('Notification click tracking unavailable'); await markAsRead(notificationId); return; }
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    changed();
  }, [user, markAsRead, changed]);

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
      changed();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user, changed]);

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
      changed();
    } catch (error) {
      console.error('Error marking type notifications as read:', error);
    }
  }, [user, changed]);

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
      changed();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user, changed]);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Un autre écran a lu / supprimé / reçu une notification : on se remet à jour.
  useEffect(() => {
    const onChanged = (e: Event) => {
      if ((e as CustomEvent).detail?.source === instanceId.current) return;
      void loadNotifications();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [loadNotifications]);

  // Réception en direct : un seul abonnement (nom de canal unique par instance) + relecture
  // de secours toutes les 60 s et au retour sur l'app, pour ne rien manquer si le temps réel coupe.
  useEffect(() => {
    if (!live || !user) return;
    let stopped = false;
    const startedAt = Date.now();

    const accept = (raw: any) => {
      if (!raw?.id || raw.user_id !== user.id) return;
      const n = { ...raw, metadata: (raw.metadata ?? null) as Record<string, any> | null } as Notification;
      setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
      if (!n.read) emitNotificationsChanged(instanceId.current);
      const fresh = new Date(n.created_at).getTime() >= startedAt - 5000;
      if (!n.read && fresh && !announced.has(n.id)) {
        announced.add(n.id);
        onNewRef.current?.(n);
      }
    };

    const channel = supabase
      .channel(`notifications-live-${user.id}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => accept(payload.new),
      )
      .subscribe();

    const catchUp = async () => {
      if (stopped || document.hidden) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(20);
      (data || []).forEach(accept);
    };
    const timer = window.setInterval(() => void catchUp(), 60_000);
    const onVisible = () => {
      if (!document.hidden) void loadNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      supabase.removeChannel(channel);
    };
  }, [live, user, loadNotifications]);

  return {
    notifications,
    counts,
    loading,
    markAsRead,
    recordClick,
    markAllAsRead,
    markTypeAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
};
