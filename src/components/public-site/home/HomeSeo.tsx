import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SeoLocalSection } from '@/components/landing/SeoLocalSection';
import { cn } from '@/lib/utils';
import { CONTAINER } from './homeUi';

/**
 * Texte de référencement local : présent en entier dans la page (lisible par Google),
 * replié derrière « Lire la suite » pour ne pas allonger la page.
 */
export function HomeSeo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-14 md:mt-20">
      <div id="seo-local" className={cn('relative overflow-hidden', !open && 'max-h-[300px]')}>
        <SeoLocalSection />
      </div>
      <div className={cn(CONTAINER, 'flex justify-center pb-10 pt-4')}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="seo-local"
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-white px-6 text-[16px] font-medium text-foreground ring-1 ring-inset ring-foreground/80 transition-colors duration-150 hover:bg-[var(--home-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
        >
          {open ? 'Réduire' : 'Lire la suite'}
          <ChevronDown className={cn('h-5 w-5 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
