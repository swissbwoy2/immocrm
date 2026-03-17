import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker with aggressive auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New version available — update will apply on next manual reload');
    // Don't force reload here; useAppVersionCheck handles real version updates
  },
  onOfflineReady() {
    console.log('App ready for offline use');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('Service Worker registered:', swUrl);
    
    // If there's a waiting SW, force it to activate immediately
    if (registration?.waiting) {
      console.log('Found waiting SW, forcing activation...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // Listen for new SW waiting
    registration?.addEventListener('waiting', () => {
      console.log('New SW waiting, forcing activation...');
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
    
    // Check for updates every 2 minutes (more aggressive)
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 2 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('Service Worker registration error:', error);
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
