import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

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
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('[PWA] New version available.');
      toast('Nouvelle version disponible', {
        description: 'Rechargez pour appliquer la mise à jour.',
        duration: Infinity,
        action: {
          label: 'Recharger',
          onClick: () => updateSW(true),
        },
      });
    },
    onOfflineReady() {
      console.log('[PWA] App ready for offline use');
    },
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);

      if (registration) {
        // Check for updates more aggressively (every 60s when tab is visible)
        setInterval(() => {
          if (!document.hidden) {
            registration.update().catch((err) => {
              console.warn('[PWA] update check failed:', err);
            });
          }
        }, 60 * 1000);
      }
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

