import { useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeBack?: () => void; // Navigation arrière
  threshold?: number;
  edgeThreshold?: number;
  enableHaptics?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeBack,
  threshold = 50,
  edgeThreshold = 30,
  enableHaptics = true,
}: SwipeGestureOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);
  const isLeftEdgeSwipe = useRef(false);

  const triggerHaptic = useCallback(async () => {
    if (!enableHaptics) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics not available
    }
  }, [enableHaptics]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    // Check if swipe starts from left edge (for back navigation)
    isLeftEdgeSwipe.current = touchStartX.current < edgeThreshold;
    // Check if swipe starts from right edge (for opening sidebar)
    isEdgeSwipe.current = touchStartX.current < edgeThreshold;
  }, [edgeThreshold]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null || touchStartY.current === null) {
      return;
    }

    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = Math.abs(touchEndX.current - touchStartX.current);

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0 && isLeftEdgeSwipe.current) {
        // Swipe right from left edge - back navigation or open sidebar
        triggerHaptic();
        if (onSwipeBack) {
          onSwipeBack();
        } else if (onSwipeRight) {
          onSwipeRight();
        }
      } else if (deltaX > 0 && isEdgeSwipe.current) {
        // Swipe right from edge - open sidebar
        triggerHaptic();
        onSwipeRight?.();
      } else if (deltaX < 0) {
        // Swipe left - close sidebar
        triggerHaptic();
        onSwipeLeft?.();
      }
    }

    // Reset values
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    isEdgeSwipe.current = false;
    isLeftEdgeSwipe.current = false;
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeBack, triggerHaptic]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
