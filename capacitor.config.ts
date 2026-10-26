import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ch.logisorama.app',
  appName: 'Logisorama',
  webDir: 'dist',
  server: {
    url: 'https://logisorama.ch',
    cleartext: false,
  },
  ios: {
    // 'never' : la vue web occupe tout l'écran (sous la barre d'état et l'indicateur d'accueil).
    // Les marges de sécurité sont gérées en CSS (env(safe-area-inset-*), viewport-fit=cover).
    // 'automatic' rétrécissait l'app : bandes vides en haut et en bas.
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#ffffff'
  },
  android: {
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#A8C9A5'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
