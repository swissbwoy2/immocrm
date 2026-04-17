import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_VERSION_KEY = 'app_local_version';
const LOCAL_BUILD_KEY = 'app_build_id';
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes
const BUILD_VERSION = (import.meta.env as ImportMetaEnv & { VITE_APP_BUILD_ID?: string }).VITE_APP_BUILD_ID ?? 'dev';

export const useAppVersionCheck = () => {
  const hasRefreshed = useRef(false);

  useEffect(() => {
    const clearAppCaches = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
        }
      } catch (error) {
        console.error('Failed to clear app caches:', error);
      }
    };

    const forceRefresh = async (storageKey: string, version: string) => {
      if (hasRefreshed.current) return;

      hasRefreshed.current = true;
      localStorage.setItem(storageKey, version);
      await clearAppCaches();
      window.location.reload();
    };

    const syncBuildVersion = async () => {
      const localBuildVersion = localStorage.getItem(LOCAL_BUILD_KEY);

      if (!localBuildVersion) {
        localStorage.setItem(LOCAL_BUILD_KEY, BUILD_VERSION);
        return false;
      }

      if (localBuildVersion !== BUILD_VERSION) {
        console.log('New build detected, clearing caches and refreshing...');
        await forceRefresh(LOCAL_BUILD_KEY, BUILD_VERSION);
        return true;
      }

      return false;
    };

    const checkVersion = async () => {
      if (document.hidden) return;

      const buildChanged = await syncBuildVersion();
      if (buildChanged) return;

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
            console.log('New backend version detected, clearing caches and refreshing...');
            await forceRefresh(LOCAL_VERSION_KEY, serverVersion);
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
    void checkVersion();

    // Periodic checks
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL_MS);

    // Subscribe to realtime broadcast for immediate updates
    const channel = supabase
      .channel('app-updates')
      .on('broadcast', { event: 'force-refresh' }, async (payload) => {
        console.log('Force refresh broadcast received:', payload);
        if (!hasRefreshed.current) {
          const newVersion = payload.payload?.version;
          await forceRefresh(LOCAL_VERSION_KEY, newVersion ?? BUILD_VERSION);
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
