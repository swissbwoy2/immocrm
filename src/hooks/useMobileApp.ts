import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';

export function useMobileApp() {
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    const initializeMobileApp = async () => {
      try {
        // Configure StatusBar
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#A8C9A5' });
        }

        // Hide splash screen after app is ready
        await SplashScreen.hide();
      } catch (error) {
        console.error('Error initializing mobile app:', error);
      }
    };

    initializeMobileApp();

    // Handle Android back button
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Handle keyboard events for iOS
    let keyboardShowListener: any;
    let keyboardHideListener: any;
    
    if (Capacitor.getPlatform() === 'ios') {
      keyboardShowListener = Keyboard.addListener('keyboardWillShow', (info) => {
        document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      });

      keyboardHideListener = Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.setProperty('--keyboard-height', '0px');
      });
    }

    return () => {
      backButtonListener.then(listener => listener.remove());
      if (keyboardShowListener) {
        keyboardShowListener.then((listener: any) => listener.remove());
      }
      if (keyboardHideListener) {
        keyboardHideListener.then((listener: any) => listener.remove());
      }
    };
  }, [isNative]);

  // Haptic feedback functions
  const hapticLight = async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const hapticMedium = async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  const hapticHeavy = async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  };

  return {
    isNative,
    hapticLight,
    hapticMedium,
    hapticHeavy,
  };
}
