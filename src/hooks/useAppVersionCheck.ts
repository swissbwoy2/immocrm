import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_VERSION_KEY = 'app_local_version';
const LOCAL_BUILD_KEY = 'app_build_id';
const RELOAD_THROTTLE_KEY = '__app_version_reload_at';
const TOAST_DEDUPE_KEY = '__app_version_toast_for';
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 min
const RELOAD_MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const BUILD_VERSION = (import.meta.env as ImportMetaEnv & { VITE_APP_BUILD_ID?: string }).VITE_APP_BUILD_ID ?? 'dev';

const isUserTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  );
};

const recentlyReloaded = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_THROTTLE_KEY) || '0');
    return Date.now() - last < RELOAD_MIN_INTERVAL_MS;
  } catch {
    return false;
  }
};

export const useAppVersionCheck = () => {
  const hasNotified = useRef(false);

  useEffect(() => {
    // Bypass complet en dev / preview Lovable : le build id change à chaque HMR.
    if (import.meta.env.DEV || BUILD_VERSION === 'dev') {
      return;
    }

    const clearAppCaches = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((r) => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (error) {
        console.error('Failed to clear app caches:', error);
      }
    };

    const doReload = async (storageKey: string, version: string) => {
      if (recentlyReloaded()) {
        console.warn('[VersionCheck] Reload throttled (last reload <5min ago)');
        return;
      }
      try {
        sessionStorage.setItem(RELOAD_THROTTLE_KEY, String(Date.now()));
      } catch {}
      localStorage.setItem(storageKey, version);
      await clearAppCaches();
      window.location.reload();
    };

    const promptReload = (storageKey: string, version: string) => {
      // Dédoublonnage : un seul toast par version détectée
      try {
        const lastToastVersion = sessionStorage.getItem(TOAST_DEDUPE_KEY);
        if (lastToastVersion === version) return;
        sessionStorage.setItem(TOAST_DEDUPE_KEY, version);
      } catch {}

      if (hasNotified.current) return;
      hasNotified.current = true;

      toast('Nouvelle version disponible', {
        description: 'Recharge la page pour appliquer la mise à jour.',
        duration: Infinity,
        action: {
          label: 'Recharger',
          onClick: () => {
            if (isUserTyping()) {
              toast.info('Termine ta saisie puis recharge la page.');
              return;
            }
            void doReload(storageKey, version);
          },
        },
      });
    };

    const syncBuildVersion = async () => {
      const localBuildVersion = localStorage.getItem(LOCAL_BUILD_KEY);
      if (!localBuildVersion) {
        localStorage.setItem(LOCAL_BUILD_KEY, BUILD_VERSION);
        return false;
      }
      if (localBuildVersion !== BUILD_VERSION) {
        promptReload(LOCAL_BUILD_KEY, BUILD_VERSION);
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

          if (localVersion && localVersion !== serverVersion) {
            promptReload(LOCAL_VERSION_KEY, serverVersion);
          } else if (!localVersion) {
            localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
          }
        }
      } catch (err) {
        console.error('Version check failed:', err);
      }
    };

    void checkVersion();
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL_MS);

    const channel = supabase
      .channel('app-updates')
      .on('broadcast', { event: 'force-refresh' }, (payload) => {
        const newVersion = payload.payload?.version ?? BUILD_VERSION;
        promptReload(LOCAL_VERSION_KEY, newVersion);
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);
};
