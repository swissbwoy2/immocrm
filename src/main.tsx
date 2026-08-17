import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { installAuthStorageGuard } from "./lib/authStorageGuard";
import { installAudioUnlock } from "./lib/callRingtone";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Protège la session persistante contre les suppressions déclenchées par des
// erreurs temporaires (500, 429, timeout) — doit être installé très tôt.
installAuthStorageGuard();

// Déverrouille l'audio au premier geste utilisateur : indispensable pour que la
// sonnerie d'appel entrant puisse démarrer plus tard (autoplay policy).
installAudioUnlock();

// Domaine canonique : www.logisorama.ch et logisorama.ch sont deux origines
// distinctes côté stockage navigateur. On normalise très tôt pour qu'une seule
// origine détienne la session persistante.
if (window.location.hostname === "www.logisorama.ch") {
  window.location.replace(
    `https://logisorama.ch${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}



const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else {
  // Jamais de rechargement pendant un appel audio/vidéo en cours.
  const isInCall = () => (window as any).__logisorama_in_call === true;

  // Un seul rechargement quand le nouveau SW prend le contrôle.
  let reloadedOnControllerChange = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (reloadedOnControllerChange) return;
    if (isInCall()) {
      console.log('[PWA] Reload ignoré : appel en cours.');
      return;
    }
    reloadedOnControllerChange = true;
    window.location.reload();
  });

  const isUserBusy = () => {
    if (isInCall()) return true;
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable === true
    );
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] New version available.');
      if (!isUserBusy()) {
        toast('Mise à jour en cours…', { duration: 1200 });
        setTimeout(() => void updateSW(true), 800);
        return;
      }
      if (isInCall()) return;
      toast('Nouvelle version disponible', {
        duration: Infinity,
        action: { label: 'Actualiser', onClick: () => void updateSW(true) },
      });
    },
    onOfflineReady() {
      console.log('[PWA] App ready for offline use');
    },
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);
      if (!registration) return;

      const checkForUpdate = () => {
        if (document.hidden) return;
        registration.update().catch((err) => console.warn('[PWA] update check failed:', err));
      };

      checkForUpdate();
      setInterval(checkForUpdate, 60 * 1000);
      document.addEventListener('visibilitychange', checkForUpdate);
      window.addEventListener('online', checkForUpdate);
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    }
  });
}


// Global safety net: stale lazy chunks after a redeploy → force one clean reload.
const CHUNK_RELOAD_KEY = '__lovable_chunk_reload_at';
const isChunkLoadError = (msg: string) =>
  /Importing a module script failed/i.test(msg) ||
  /Failed to fetch dynamically imported module/i.test(msg) ||
  /ChunkLoadError/i.test(msg) ||
  /error loading dynamically imported module/i.test(msg);

const handleStaleChunk = (msg: string) => {
  if (!isChunkLoadError(msg)) return;
  if ((window as any).__logisorama_in_call === true) return; // jamais pendant un appel
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
    if (Date.now() - last < 5 * 60_000) return; // 5 min throttle to avoid reload loops
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {}
  console.warn('[App] Stale lazy chunk detected, reloading…', { url: window.location.href, msg });
  window.location.reload();
};

window.addEventListener('error', (e) => handleStaleChunk(e?.message || String(e?.error || '')));
window.addEventListener('unhandledrejection', (e: any) =>
  handleStaleChunk(e?.reason?.message || String(e?.reason || '')),
);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

