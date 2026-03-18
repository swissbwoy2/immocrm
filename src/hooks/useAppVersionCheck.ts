import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_VERSION_KEY = 'app_local_version';
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes

export const useAppVersionCheck = () => {
  const hasRefreshed = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      if (document.hidden) return;
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('value, updated_at')
          .eq('key', 'app_version')
          .single();

        if (error) {
          console.error('Error checking app version:', error);
          return;
        }

        if (data) {
          const serverVersion = data.value;
          const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);

          console.log('Version check:', { serverVersion, localVersion });

          if (localVersion && localVersion !== serverVersion && !hasRefreshed.current) {
            console.log('New version detected, refreshing...');
            hasRefreshed.current = true;
            localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
            window.location.reload();
          } else if (!localVersion) {
            // First time, just store the version
            localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
          }
        }
      } catch (err) {
        console.error('Version check failed:', err);
      }
    };

    // Initial check
    checkVersion();

    // Periodic checks
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL_MS);

    // Subscribe to realtime broadcast for immediate updates
    const channel = supabase
      .channel('app-updates')
      .on('broadcast', { event: 'force-refresh' }, (payload) => {
        console.log('Force refresh broadcast received:', payload);
        if (!hasRefreshed.current) {
          hasRefreshed.current = true;
          const newVersion = payload.payload?.version;
          if (newVersion) {
            localStorage.setItem(LOCAL_VERSION_KEY, newVersion);
          }
          window.location.reload();
        }
      })
      .subscribe((status) => {
        console.log('App updates channel status:', status);
      });

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);
};
