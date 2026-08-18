import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  doc: any;
  pageNumber: number;
  /** largeur d'affichage souhaitée en px */
  width: number;
  className?: string;
  /** children reçoit l'échelle px/point pour positionner les overlays */
  children?: (scale: number) => React.ReactNode;
  onPointerDownPage?: (pt: { x: number; y: number }) => void;
}

export default function PdfPage({ doc, pageNumber, width, className, children, onPointerDownPage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    if (!doc) return;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const s = width / base.width;
      const viewport = page.getViewport({ scale: s * (window.devicePixelRatio || 1) });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
      setScale(s);
      setSize({ w: base.width * s, h: base.height * s });
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, width]);

  return (
    <div
      className={cn('relative bg-white shadow-sm rounded-md overflow-hidden border border-border mx-auto', className)}
      style={{ width: size.w || width, height: size.h || undefined }}
      onPointerDown={(e) => {
        if (!onPointerDownPage || !scale) return;
        if ((e.target as HTMLElement).dataset.overlay === 'true') return;
        const rect = e.currentTarget.getBoundingClientRect();
        onPointerDownPage({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-auto select-none" />
      {scale > 0 && children?.(scale)}
    </div>
  );
}
