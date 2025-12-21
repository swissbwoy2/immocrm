import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New version available, updating...');
    // Force immediate update without user prompt
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready for offline use');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('Service Worker registered:', swUrl);
    // Check for updates every 5 minutes
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);
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
