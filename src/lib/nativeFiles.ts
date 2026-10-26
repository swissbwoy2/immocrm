import { Capacitor } from '@capacitor/core';

/**
 * Fichiers et liens dans l'app native (WKWebView iOS / WebView Android).
 * Dans une WebView, `window.open`, `target="_blank"`, `<a download>` et les liens blob:
 * ne font rien : on les redirige vers
 *  - le navigateur intégré (SFSafariViewController / Custom Tabs) pour les liens http(s)
 *    externes et les fichiers en ligne (PDF, images, vidéos s'y affichent nativement) ;
 *  - la feuille de partage iOS/Android (aperçu, « Enregistrer dans Fichiers ») pour les
 *    fichiers générés dans l'app (blob:, data:).
 * Aucun effet sur le web.
 */

const FILE_RX = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|rtf|zip|jpe?g|png|gif|webp|heic|mp4|mov|m4v|webm)(\?|#|$)/i;

function isAppRoute(url: URL): boolean {
  return url.origin === window.location.origin && !FILE_RX.test(url.pathname);
}

export async function openInAppBrowser(url: string) {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

function guessName(href: string, fallback?: string | null): string {
  if (fallback) return fallback;
  try {
    const last = decodeURIComponent(new URL(href).pathname.split('/').pop() || '');
    if (last && last.includes('.')) return last;
  } catch { /* noop */ }
  return `document-${Date.now()}.pdf`;
}

/** Enregistre un fichier local (blob:/data:) dans le cache puis ouvre la feuille de partage. */
export async function shareLocalFile(href: string, name?: string | null) {
  const fileName = guessName(href, name).replace(/[\\/:*?"<>|]+/g, '-');
  const blob = await (await fetch(href)).blob();
  const b64: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const written = await Filesystem.writeFile({ path: fileName, data: b64, directory: Directory.Cache });
  await Share.share({ url: written.uri, title: fileName, dialogTitle: fileName });
}

/** Ouvre un lien ou un fichier de la bonne façon dans l'app native. Renvoie false si rien à faire. */
export async function openNative(href: string, opts: { name?: string | null; download?: boolean } = {}): Promise<boolean> {
  if (!href) return false;
  if (/^(tel|mailto|sms|maps|geo):/i.test(href)) {
    window.location.href = href;
    return true;
  }
  if (/^(blob|data):/i.test(href)) {
    await shareLocalFile(href, opts.name);
    return true;
  }
  let url: URL;
  try { url = new URL(href, window.location.href); } catch { return false; }
  if (!/^https?:$/.test(url.protocol)) return false;
  if (isAppRoute(url)) {
    window.location.assign(url.href);
    return true;
  }
  await openInAppBrowser(url.href);
  return true;
}

let installed = false;

export function installNativeFileHandling() {
  if (installed || !Capacitor.isNativePlatform()) return;
  installed = true;

  const report = (e: unknown) => console.error('[nativeFiles]', e);

  // 1) window.open(...) → navigateur intégré / partage.
  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = url ? String(url) : '';
    if (!href) return originalOpen(url as any, target, features);
    void openNative(href).then((done) => { if (!done) originalOpen(href, target, features); }).catch(report);
    return null;
  }) as typeof window.open;

  // 2) Liens créés en JS puis cliqués (a.click() sur un élément détaché, souvent blob: + download).
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const href = this.href;
    const wants = this.hasAttribute('download') || this.target === '_blank' || /^(blob|data):/i.test(href) || FILE_RX.test(href);
    if (href && wants) {
      void openNative(href, { name: this.getAttribute('download'), download: this.hasAttribute('download') })
        .then((done) => { if (!done) originalClick.call(this); })
        .catch(report);
      return;
    }
    originalClick.call(this);
  };

  // 3) Clics sur de vrais liens de la page.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    const a = (e.target as Element | null)?.closest?.('a') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    const abs = a.href;
    const wants = a.hasAttribute('download') || a.target === '_blank' || /^(blob|data):/i.test(abs) || FILE_RX.test(abs);
    if (!wants) return;
    let sameAppRoute = false;
    try { sameAppRoute = isAppRoute(new URL(abs)) && !a.hasAttribute('download'); } catch { /* noop */ }
    if (sameAppRoute) return; // navigation interne normale
    e.preventDefault();
    e.stopPropagation();
    void openNative(abs, { name: a.getAttribute('download'), download: a.hasAttribute('download') }).catch(report);
  }, true);

  // 4) Les URL blob: sont souvent révoquées juste après a.click() : on laisse le temps de les lire.
  const originalRevoke = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = (u: string) => { setTimeout(() => originalRevoke(u), 60_000); };
}
