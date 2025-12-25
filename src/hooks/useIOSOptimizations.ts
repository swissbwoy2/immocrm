import { useEffect, useMemo } from 'react';

// Static iOS detection (no re-renders)
const isIOSDevice = typeof window !== 'undefined' && (
  /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) ||
  (/^((?!chrome|android).)*safari/i.test(window.navigator.userAgent) && 'ontouchend' in document) ||
  !!(window as any).webkit?.messageHandlers
);

const isMobileDevice = typeof window !== 'undefined' && (
  /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(window.navigator.userAgent.toLowerCase()) ||
  window.innerWidth < 768
);

// Check for low-end device (older iOS devices)
const isLowEndDevice = typeof window !== 'undefined' && (
  navigator.hardwareConcurrency <= 4 ||
  (navigator as any).deviceMemory <= 4
);

export interface IOSOptimizations {
  isIOS: boolean;
  isMobile: boolean;
  isLowEnd: boolean;
  // Reduce particle count for performance
  particleCount: number;
  // Disable heavy animations
  shouldReduceMotion: boolean;
  // Disable blur effects
  shouldDisableBlur: boolean;
  // Animation duration multiplier (1 = normal, 0.5 = faster)
  animationSpeed: number;
  // CSS classes to apply for iOS optimizations
  blurClass: string;
  transitionClass: string;
}

export function useIOSOptimizations(): IOSOptimizations {
  // Apply iOS-specific CSS class to body
  useEffect(() => {
    if (isIOSDevice) {
      document.body.classList.add('ios-device');
    }
    if (isMobileDevice) {
      document.body.classList.add('mobile-device');
    }
    if (isLowEndDevice) {
      document.body.classList.add('low-end-device');
    }
    
    return () => {
      document.body.classList.remove('ios-device', 'mobile-device', 'low-end-device');
    };
  }, []);

  return useMemo(() => {
    const shouldReduceMotion = isIOSDevice || isLowEndDevice || 
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    
    return {
      isIOS: isIOSDevice,
      isMobile: isMobileDevice,
      isLowEnd: isLowEndDevice,
      particleCount: isIOSDevice ? 5 : (isMobileDevice ? 8 : 15),
      shouldReduceMotion,
      shouldDisableBlur: isIOSDevice || isLowEndDevice,
      animationSpeed: shouldReduceMotion ? 0.5 : 1,
      blurClass: isIOSDevice ? 'ios-no-blur' : '',
      transitionClass: shouldReduceMotion ? 'ios-instant-render' : '',
    };
  }, []);
}

// Static version for non-hook usage
export const iosOptimizations = {
  isIOS: isIOSDevice,
  isMobile: isMobileDevice,
  isLowEnd: isLowEndDevice,
  particleCount: isIOSDevice ? 5 : (isMobileDevice ? 8 : 15),
  shouldReduceMotion: isIOSDevice || isLowEndDevice,
  shouldDisableBlur: isIOSDevice || isLowEndDevice,
  animationSpeed: (isIOSDevice || isLowEndDevice) ? 0.5 : 1,
};
