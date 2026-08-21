import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImage } from '@/components/SignedImage';
import { useDashboardBanner, resolveBannerLink, type DashboardBanner } from '@/hooks/useDashboardBanner';

interface Props {
  /** Permet un aperçu (admin) sans requête réseau. */
  banner?: DashboardBanner | null;
  className?: string;
  /** Mode compact : hauteur fixe + image en object-cover (rétrocompatible, off par défaut). */
  compact?: boolean;
}

/**
 * Bannière publicitaire (annonce / promo / mise à jour) affichée en haut du dashboard client.
 * Ne rend rien si aucune bannière active n'est définie.
 */
export function DashboardAdBanner({ banner: override, className, compact = false }: Props) {
  const navigate = useNavigate();
  const { banner: fetched } = useDashboardBanner();
  const banner = override !== undefined ? override : fetched;

  if (!banner?.image_url) return null;

  const link = resolveBannerLink(banner);
  const isExternal = /^https?:\/\//i.test(link);
  const clickable = !!link;
  const showOverlay = !!banner.afficher_overlay && !!(banner.titre || banner.texte);


  const content = (
    <>
      <SignedImage
        src={banner.image_url}
        alt={banner.titre || 'Bannière'}
        className={cn('block w-full', compact ? 'h-full object-cover' : 'h-auto')}
      />
      {showOverlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/45 to-transparent" />
          <div className="absolute inset-0 z-10 flex flex-col justify-center gap-1 max-w-[75%] p-3 sm:p-5 md:p-6">
            {banner.titre && (
              <h2 className="text-base sm:text-xl md:text-2xl font-bold text-foreground leading-tight line-clamp-2">
                {banner.titre}
              </h2>
            )}
            {banner.texte && (
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-2">
                {banner.texte}
              </p>
            )}
            {clickable && (
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                En savoir plus
                {isExternal ? <ExternalLink className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            )}
          </div>
        </>
      )}
    </>
  );

  const shell = cn(
    'relative block w-full overflow-hidden rounded-2xl border border-primary/20 bg-muted',
    compact && 'h-[132px] md:h-[168px]',
    clickable && 'cursor-pointer transition-transform duration-200 hover:scale-[1.005] hover:border-primary/40',
    className,
  );

  if (!clickable) {
    return <div className={shell}>{content}</div>;
  }

  if (isExternal) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className={shell} aria-label={banner.titre || 'Voir'}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => navigate(link)} className={cn(shell, 'text-left')}>
      {content}
    </button>
  );
}

