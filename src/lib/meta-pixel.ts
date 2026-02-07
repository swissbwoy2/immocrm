export const META_PIXEL_ID = '1270471197464641';

let isInitialized = false;

export function initMetaPixel(withConsent: boolean = false) {
  if (typeof window === 'undefined') return;
  if (!withConsent) return;
  if (isInitialized) return;
  if (document.getElementById('meta-pixel-sdk')) return;

  isInitialized = true;

  // Initialize fbq queue
  const w = window as any;
  const n = 'fbq';

  if (!w[n]) {
    const fbq: any = function () {
      fbq.callMethod
        ? fbq.callMethod.apply(fbq, arguments)
        : fbq.queue.push(arguments);
    };
    w[n] = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
  }

  // Inject fbevents.js
  const script = document.createElement('script');
  script.id = 'meta-pixel-sdk';
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const first = document.getElementsByTagName('script')[0];
  first.parentNode?.insertBefore(script, first);

  // Init pixel and send first PageView
  window.fbq!('init', META_PIXEL_ID);
  window.fbq!('track', 'PageView');
}

export function grantMetaConsent() {
  initMetaPixel(true);
}

export function trackMetaPageView() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

export function trackMetaEvent(event: string, params?: object) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, params);
  }
}
