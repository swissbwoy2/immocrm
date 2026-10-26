import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Aperçu PDF compatible iPhone.
 * Navigateur ordinateur / Android : <object> natif (comme avant).
 * App iOS (WKWebView) et Safari iOS : un <object>/<iframe> n'affiche que la 1re page
 * ou reste blanc → rendu de toutes les pages avec pdf.js, défilables.
 */
export function needsPdfJs(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function PdfPreview({ src, title, className, fallback }: {
  src: string;
  title?: string;
  className?: string;
  /** Contenu affiché si le PDF ne peut pas être lu. */
  fallback?: ReactNode;
}) {
  if (!needsPdfJs()) {
    return (
      <object data={src} type="application/pdf" className={className} aria-label={title}>
        {fallback}
      </object>
    );
  }
  return <PdfCanvasPages src={src} title={title} className={className} fallback={fallback} />;
}

function PdfCanvasPages({ src, title, className, fallback }: { src: string; title?: string; className?: string; fallback?: ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let pdf: any = null;
    const el = holder.current;
    if (!el || !src) return;
    el.innerHTML = '';
    setState('loading');
    (async () => {
      try {
        const { pdfjsLib } = await import('@/features/postulation-auto/lib/pdfjs');
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        const width = Math.max(280, el.clientWidth - 16);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelled) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale: scale * ratio });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
          canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
          canvas.className = 'mx-auto mb-3 block rounded-lg bg-white shadow-sm';
          canvas.setAttribute('aria-label', `${title ?? 'Document'} — page ${n}`);
          el.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
          if (n === 1 && !cancelled) setState('ready');
        }
      } catch (e) {
        console.error('[PdfPreview]', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
      try { pdf?.destroy(); } catch { /* noop */ }
    };
  }, [src, title]);

  return (
    <div className={cn('relative overflow-auto overscroll-contain bg-muted/40 p-2 [-webkit-overflow-scrolling:touch]', className)}>
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Chargement du document" />
        </div>
      )}
      {state === 'error' && (fallback ?? (
        <p className="py-10 text-center text-sm text-muted-foreground">Impossible d'afficher ce PDF.</p>
      ))}
      <div ref={holder} />
    </div>
  );
}
