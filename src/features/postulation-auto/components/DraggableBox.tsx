import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  /** coordonnées en points PDF (origine haut-gauche) */
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  selected?: boolean;
  resizable?: boolean;
  label?: string;
  variant?: 'mapping' | 'value';
  children?: React.ReactNode;
  onSelect?: () => void;
  onChange: (next: { x: number; y: number; w: number; h: number }) => void;
}

export default function DraggableBox({
  x, y, w, h, scale, selected, resizable = true, label, variant = 'mapping', children, onSelect, onChange,
}: Props) {
  const start = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number; mode: 'move' | 'resize' } | null>(null);

  const begin = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x, y, w, h, mode };
    onSelect?.();
  };

  const move = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = (e.clientX - s.px) / scale;
    const dy = (e.clientY - s.py) / scale;
    if (s.mode === 'move') {
      onChange({ x: Math.max(0, s.x + dx), y: Math.max(0, s.y + dy), w: s.w, h: s.h });
    } else {
      onChange({ x: s.x, y: s.y, w: Math.max(20, s.w + dx), h: Math.max(10, s.h + dy) });
    }
  };

  const end = (e: React.PointerEvent) => {
    start.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      data-overlay="true"
      className={cn(
        'absolute touch-none cursor-move rounded-[3px] transition-shadow',
        variant === 'mapping'
          ? 'border-2 bg-primary/10 border-primary/60'
          : 'border border-dashed border-primary/40 hover:bg-primary/5',
        selected && 'ring-2 ring-primary shadow-lg bg-primary/20',
      )}
      style={{ left: x * scale, top: y * scale, width: w * scale, height: h * scale, touchAction: 'none' }}
      onPointerDown={(e) => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {children}
      {label && (
        <span
          data-overlay="true"
          className="pointer-events-none absolute -top-4 left-0 whitespace-nowrap rounded bg-primary px-1 text-[9px] font-medium leading-4 text-primary-foreground"
        >
          {label}
        </span>
      )}
      {resizable && (
        <span
          data-overlay="true"
          className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border-2 border-background bg-primary cursor-se-resize touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => begin(e, 'resize')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </div>
  );
}
