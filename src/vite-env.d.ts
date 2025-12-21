/// <reference types="vite/client" />
/// <reference types="@types/google.maps" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
