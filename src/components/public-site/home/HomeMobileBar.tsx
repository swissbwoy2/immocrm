import { useEffect, useState } from 'react';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { useStoryDialogOpen } from '../showcase/storyDialogState';
import { Cta } from './homeUi';

/**
 * Barre fixe en bas sur téléphone et tablette (comme le tunnel /courtier) :
 * le prix d’activation du parcours choisi et l’action principale.
 */
export function HomeMobileBar() {
  const { isAchat } = useSearchType();
  const dialogOpen = useStoryDialogOpen();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible || dialogOpen) return null;

  return (
    <div className="home-tokens fixed inset-x-0 bottom-0 z-[55] bg-white shadow-[0_-1px_0_var(--home-rule)] lg:hidden">{/* taste-skill-ignore : barre fixe superposée */}
      <div className="flex items-center justify-between gap-4 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-foreground">{isAchat ? "2'500 CHF" : '300 CHF'}</p>
          <p className="truncate text-[13px] text-foreground/75">
            {isAchat ? 'activation, imputée sur la commission' : 'activation, déduite de la commission'}
          </p>
        </div>
        <Cta to="/nouveau-mandat" className="flex-none px-5">
          {isAchat ? 'Trouver mon bien' : 'Activer ma recherche'}
        </Cta>
      </div>
    </div>
  );
}
