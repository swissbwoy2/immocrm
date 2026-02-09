import { useEffect, useRef } from 'react';
import { trackTikTokEvent } from '@/lib/tiktok-pixel';

const ELFSIGHT_WIDGET_SELECTOR = '.elfsight-app-015a7ee8-3cf5-416f-a607-eb9d4a46e860';
const DEBOUNCE_MS = 3000;

export function useWhatsAppTracking() {
  const lastFiredRef = useRef<number>(0);

  useEffect(() => {
    const handleBlur = () => {
      // Small delay to let activeElement update
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName !== 'IFRAME') return;

        // Check if the iframe is inside the Elfsight widget container
        const widgetContainer = document.querySelector(ELFSIGHT_WIDGET_SELECTOR);
        if (!widgetContainer || !widgetContainer.contains(activeEl)) return;

        // Debounce: skip if fired recently
        const now = Date.now();
        if (now - lastFiredRef.current < DEBOUNCE_MS) return;
        lastFiredRef.current = now;

        // Fire Meta Pixel Contact event
        if (window.fbq) {
          window.fbq('track', 'Contact');
        }

        // Fire TikTok Pixel Contact event
        trackTikTokEvent('Contact');

        console.log('[WhatsApp Tracking] Contact event fired (Meta + TikTok)');
      }, 50);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);
}
