import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';
import { useDashboardBanner } from '@/hooks/useDashboardBanner';
import { cn } from '@/lib/utils';

export { useDashboardBanner as useActiveBanner };

interface Props {
  /** Classes appliquées au conteneur (marges, largeur max…). */
  wrapperClassName?: string;
  /** Classes appliquées à la bannière elle-même. */
  className?: string;
}

/**
 * Bannière publicitaire admin réutilisable sur tous les dashboards (tous rôles),
 * la landing et le portail d'annonces. Ne rend rien si aucune bannière active.
 */
export function DashboardBanner({ wrapperClassName, className }: Props) {
  const { banner } = useDashboardBanner();
  if (!banner?.image_url) return null;

  return (
    <div className={cn('mb-3 md:mb-4', wrapperClassName)}>
      <DashboardAdBanner
        banner={banner}
        className={cn('max-h-[132px] md:max-h-[168px]', className)}
      />
    </div>
  );
}

