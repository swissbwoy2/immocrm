import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { ShowcaseItem, usePreviewImage, villeFromAdresse, formatPrix } from './useShowcase';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { useSourcedListingAccess } from '@/hooks/useSourcedListingAccess';

function StoryBubble({ item, onClick }: { item: ShowcaseItem; onClick: () => void }) {
  const { canViewInternalListing } = useSourcedListingAccess();
  const allowImages = canViewInternalListing || !!item.is_native;
  const img = usePreviewImage(item, allowImages);
  const ville = villeFromAdresse(item.adresse);
  const prix = formatPrix(item.prix);

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 w-[100px]">
      <button type="button" onClick={onClick} className="rounded-full">
        <span className="block rounded-full p-[3px] bg-gradient-to-br from-primary to-accent transition-transform hover:scale-105">
          <span className="block rounded-full p-[2px] bg-background">
            <span className="block h-[76px] w-[76px] sm:h-[84px] sm:w-[84px] rounded-full overflow-hidden bg-muted">
              {img ? (
                <img
                  src={img}
                  alt={item.titre || 'Bien immobilier'}
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : allowImages ? (
                <span className="flex h-full w-full items-center justify-center">
                  <Home className="h-7 w-7 text-muted-foreground" />
                </span>
              ) : (
                <ExternalListingPlaceholder className="rounded-full" />
              )}
            </span>
          </span>
        </span>
      </button>
      <button type="button" onClick={onClick} className="w-full text-center leading-tight">
        <span className="block text-[11px] font-semibold text-foreground truncate">{ville || 'Suisse romande'}</span>
        {prix && <span className="block text-[10px] text-muted-foreground truncate">{prix}</span>}
      </button>
    </div>
  );
}


interface Props {
  title: string;
  items: ShowcaseItem[];
  onSelect: (item: ShowcaseItem) => void;
}

export function ShowcaseStoryRow({ title, items, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);

  // Continuous right-to-left auto scroll with seamless loop
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused && !dragging.current) {
        const half = el.scrollWidth / 2;
        el.scrollLeft += (dt / 1000) * 30;
        if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, items.length]);

  const normalize = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    if (el.scrollLeft >= half) el.scrollLeft -= half;
    if (el.scrollLeft < 0) el.scrollLeft += half;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // native touch scrolling
    const el = scrollerRef.current;
    if (!el) return;
    dragging.current = true;
    dragMoved.current = false;
    startX.current = e.clientX;
    startScroll.current = el.scrollLeft;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) dragMoved.current = true;
    el.scrollLeft = startScroll.current - dx;
    normalize();
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const doubled = [...items, ...items];

  return (
    <div className="relative">
      <h3 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-primary">{title}</h3>

      <button
        type="button"
        aria-label="Précédent"
        onClick={() => nudge(-1)}
        className="hidden md:flex absolute left-0 top-1/2 z-10 h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur hover:bg-background"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Suivant"
        onClick={() => nudge(1)}
        className="hidden md:flex absolute right-0 top-1/2 z-10 h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur hover:bg-background"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div
        ref={scrollerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          setPaused(false);
          endDrag();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onScroll={() => {
          if (!dragging.current) return;
        }}
        className="flex gap-4 overflow-x-auto no-scrollbar px-1 py-2 select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ scrollbarWidth: 'none' }}
      >
        {doubled.map((item, i) => (
          <StoryBubble
            key={`${item.id}-${i}`}
            item={item}
            onClick={() => {
              if (dragMoved.current) return;
              onSelect(item);
            }}
          />
        ))}
      </div>
    </div>
  );
}
