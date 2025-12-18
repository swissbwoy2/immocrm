import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';

export function useHapticFeedback() {
  const isNative = Capacitor.isNativePlatform();

  // Light tap - for buttons, toggles
  const tapLight = useCallback(async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  }, [isNative]);

  // Medium tap - for important actions
  const tapMedium = useCallback(async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  }, [isNative]);

  // Heavy tap - for destructive actions, confirmations
  const tapHeavy = useCallback(async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  }, [isNative]);

  // Success notification
  const notifySuccess = useCallback(async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  }, [isNative]);

  // Error notification
  const notifyError = useCallback(async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Error });
    }
  }, [isNative]);

  // Warning notification
  const notifyWarning = useCallback(async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Warning });
    }
  }, [isNative]);

  // Selection changed - for pickers, sliders
  const selectionChanged = useCallback(async () => {
    if (isNative) {
      await Haptics.selectionChanged();
    }
  }, [isNative]);

  // Start selection - for drag gestures
  const selectionStart = useCallback(async () => {
    if (isNative) {
      await Haptics.selectionStart();
    }
  }, [isNative]);

  // End selection - for drag gestures
  const selectionEnd = useCallback(async () => {
    if (isNative) {
      await Haptics.selectionEnd();
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
