import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PRESENCE_INTERVAL = 60000; // 60 seconds

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      if (!isActiveRef.current) return;
      
      try {
        await supabase.rpc('update_user_presence');
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const setOffline = async () => {
      try {
        await supabase.rpc('set_user_offline');
      } catch (error) {
        console.error('Error setting offline:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActiveRef.current = false;
      } else {
        isActiveRef.current = true;
        updatePresence();
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline notification
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/set_user_offline`;
      navigator.sendBeacon(url, JSON.stringify({}));
    };

    // Initial presence update
    updatePresence();

    // Set up interval
    intervalRef.current = setInterval(updatePresence, PRESENCE_INTERVAL);

    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [user]);
}

// Hook to check if a user is online (for display purposes)
export function isUserOnline(lastSeenAt: string | null | undefined, isOnline: boolean | null | undefined): boolean {
  if (isOnline === true) return true;
  if (!lastSeenAt) return false;
  
  // Consider online if last seen within 2 minutes
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  return diffMinutes <= 2;
}

// Format last seen time for display
export function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return '';
  
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  
  return lastSeen.toLocaleDateString('fr-CH', { 
    day: 'numeric', 
    month: 'short' 
  });
}
