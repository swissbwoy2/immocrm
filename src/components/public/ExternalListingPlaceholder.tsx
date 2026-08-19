import { cn } from '@/lib/utils';

/** Vert Logisorama (charte) */
export const LOGISORAMA_GREEN = 'hsl(158, 55%, 38%)';

/**
 * Visuel générique affiché à la place de toute image tierce
 * pour les annonces « sourcées » vues par un visiteur public.
 * Aucun asset externe : bloc stylé + SVG inline.
 */
export function ExternalListingPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-full h-full bg-white flex items-center justify-center select-none',
        className,
      )}
      aria-label="Annonce externe"
      role="img"
    >
      <span
        className="font-extrabold tracking-[0.18em] text-center text-[11px] sm:text-sm uppercase px-2"
        style={{ color: LOGISORAMA_GREEN }}
      >
        Annonce externe
      </span>
    </div>
  );
}

/** Même visuel en HTML brut (pour les InfoWindow Google Maps). */
export function externalListingPlaceholderHtml(height = 120) {
  return `<div style="width:100%;height:${height}px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;">
    <span style="color:${LOGISORAMA_GREEN};font-weight:800;letter-spacing:0.18em;font-size:12px;text-transform:uppercase;text-align:center;">Annonce externe</span>
  </div>`;
}
