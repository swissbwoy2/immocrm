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
    <div className="home-tokens pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden">{/* taste-skill-ignore : barre fixe superposée */}
      {/* Bulle flottante en verre liquide, comme la barre du bas de l'app */}
      <div className="imr-glass-nav pointer-events-auto flex w-full max-w-[520px] items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2">
        <div className="min-w-0">
          <p className="relative text-[16px] font-semibold text-foreground">{isAchat ? "2'500 CHF" : '300 CHF'}</p>
          <p className="relative truncate text-[13px] text-foreground/75">
            {isAchat ? 'activation, imputée sur la commission' : 'activation, déduite de la commission'}
          </p>
        </div>
        <Cta to="/nouveau-mandat" className="relative flex-none px-5">
          {isAchat ? 'Trouver mon bien' : 'Activer ma recherche'}
        </Cta>
      </div>
    </div>
  );
}
