declare global {
  interface Window {
    ttq: any;
    TiktokAnalyticsObject: string;
  }
}

export const TIKTOK_PIXEL_ID = 'D5JTFAJC77U6R4DE28Q0';

export function initTikTokPixel() {
  if (typeof window === 'undefined') return;
  if (window.ttq) return; // Already initialized
  
  const w = window as any;
  const d = document;
  const t = 'ttq';
  
  w.TiktokAnalyticsObject = t;
  const ttq = w[t] = w[t] || [];
  ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
  ttq.setAndDefer = function(t: any, e: string) {
    t[e] = function() {
      t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  for (let i = 0; i < ttq.methods.length; i++) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }
  ttq.instance = function(t: string) {
    const e = ttq._i[t] || [];
    for (let n = 0; n < ttq.methods.length; n++) {
      ttq.setAndDefer(e, ttq.methods[n]);
    }
    return e;
  };
  ttq.load = function(e: string, n?: any) {
    const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[e] = [];
    ttq._i[e]._u = r;
    ttq._t = ttq._t || {};
    ttq._t[e] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[e] = n || {};
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = r + "?sdkid=" + e + "&lib=" + t;
    const first = document.getElementsByTagName("script")[0];
    first.parentNode?.insertBefore(script, first);
  };
  
  ttq.load(TIKTOK_PIXEL_ID);
  ttq.page();
}

export function trackTikTokPageView() {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.page();
  }
}

export function trackTikTokEvent(event: string, params?: object) {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track(event, params);
  }
}

// Predefined event helpers
export const TikTokEvents = {
  submitForm: (params?: object) => trackTikTokEvent('SubmitForm', params),
  completeRegistration: (params?: object) => trackTikTokEvent('CompleteRegistration', params),
  contact: (params?: object) => trackTikTokEvent('Contact', params),
  viewContent: (params?: object) => trackTikTokEvent('ViewContent', params),
  clickButton: (params?: object) => trackTikTokEvent('ClickButton', params),
};
