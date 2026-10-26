import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Carte Google Maps d'une adresse (intégration sans clé, chargée seulement quand elle
 * devient visible). Responsive : hauteur adaptée mobile / tablette / ordinateur,
 * boutons « Itinéraire » et « Ouvrir dans Maps » en verre par-dessus la carte.
 */
export function AdresseMap({ address, className, height = 'default', label }: {
  address?: string | null;
  className?: string;
  /** 'compact' pour les en-têtes à côté d'une photo. */
  height?: 'default' | 'compact';
  /** Libellé accessible (par défaut l'adresse). */
  label?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const clean = (address || '').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    if (!clean || visible) return;
    const el = holder.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [clean, visible]);

  if (!clean) return null;

  const q = encodeURIComponent(/suisse|switzerland|schweiz/i.test(clean) ? clean : `${clean}, Suisse`);
  const precise = /\d/.test(clean);
  const embed = `https://www.google.com/maps?q=${q}&hl=fr&z=${precise ? 15 : 12}&output=embed`;
  const route = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  const open = `https://www.google.com/maps/search/?api=1&query=${q}`;

  return (
    <div
      ref={holder}
      className={cn(
        'relative isolate w-full overflow-hidden rounded-[20px] bg-muted/60 ring-1 ring-black/[0.06] dark:ring-white/10',
        height === 'compact' ? 'h-44 sm:h-52' : 'h-52 sm:h-64 lg:h-72',
        className,
      )}
    >
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden>
          <MapPin className="h-6 w-6 text-primary/70" />
          <span className="max-w-[80%] truncate text-xs">{clean}</span>
        </div>
      )}
      {visible && (
        <iframe
          title={label || `Carte : ${clean}`}
          src={embed}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      )}
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-between gap-2">
        <a
          href={route}
          target="_blank"
          rel="noopener noreferrer"
          className="imr-lg-tint pointer-events-auto inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold active:scale-[0.97]"
        >
          <Navigation className="h-4 w-4" /> Itinéraire
        </a>
        <a
          href={open}
          target="_blank"
          rel="noopener noreferrer"
          className="imr-lg-glass pointer-events-auto inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium text-foreground active:scale-[0.97]"
          aria-label="Ouvrir dans Google Maps"
        >
          <ExternalLink className="h-4 w-4" />{height === 'compact' ? <span>Maps</span> : <><span className="hidden sm:inline">Ouvrir dans Maps</span><span className="sm:hidden">Maps</span></>}
        </a>
      </div>
    </div>
  );
}
