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
      console.log('New version available — update will apply automatically');
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
    onRegisteredSW(swUrl, registration) {
      console.log('Service Worker registered:', swUrl);

      if (registration) {
        setInterval(() => {
          if (!document.hidden) {
            registration.update();
          }
        }, 2 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
