import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
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

const isPreviewHost = window.location.hostname.includes("id-preview--");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else {
  registerSW({
    onNeedRefresh() {
      console.log('[PWA] New version available — will apply on next navigation. Close & reopen the app if a stale screen persists.');
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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
