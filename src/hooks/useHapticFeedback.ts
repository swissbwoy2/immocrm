import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';

export function useHapticFeedback() {
  const isNative = Capacitor.isNativePlatform();

  // Light tap - for buttons, toggles
  const tapLight = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Medium tap - for important actions
  const tapMedium = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Heavy tap - for destructive actions, confirmations
  const tapHeavy = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Success notification
  const notifySuccess = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Error notification
  const notifyError = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Warning notification
  const notifyWarning = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Selection changed - for pickers, sliders
  const selectionChanged = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.selectionChanged();
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // Start selection - for drag gestures
  const selectionStart = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.selectionStart();
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  // End selection - for drag gestures
  const selectionEnd = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.selectionEnd();
      } catch {
        // Haptics not available, ignore silently
      }
    }
  }, [isNative]);

  return {
    isNative,
    tapLight,
    tapMedium,
    tapHeavy,
    notifySuccess,
    notifyError,
    notifyWarning,
    selectionChanged,
    selectionStart,
    selectionEnd,
  };
}
