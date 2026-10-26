import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AGENCE, HUB_PATH, ZONES } from '@/content/seoPages';
import { cn } from '@/lib/utils';
import { CONTAINER, H2, Reveal, SURFACE } from './homeUi';

/**
 * Liens vers les pages de référencement local (une page par zone), à la place du long texte
 * qui était affiché sur l'accueil. Chaque zone a désormais sa propre page.
 */
export function HomeZones() {
  return (
    <section className="bg-white pt-14 md:pt-20" aria-labelledby="home-zones-title">
      <div className={CONTAINER}>
        <Reveal>
          <h2 id="home-zones-title" className={H2}>Nos zones de recherche en Suisse romande</h2>
          <p className="mt-2 max-w-[60ch] text-[16px] text-foreground/80">
            Un accompagnement local pour chaque région : marché, communes et conseils propres à chaque zone.
          </p>
        </Reveal>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ZONES.map((z) => (
            <li key={z.slug}>
              <Link
                to={z.path}
                className={cn(
                  'flex min-h-12 items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-[16px] font-semibold text-foreground transition-colors duration-150 hover:bg-[var(--home-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground',
                  SURFACE,
                )}
              >
                {z.name}
                <ArrowRight className="h-4 w-4 flex-none" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          <Link to={HUB_PATH} className="font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">
            Recherche d’appartement en Suisse romande
          </Link>
          <Link to={AGENCE.path} className="font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">
            Notre agence à Crissier
          </Link>
        </p>
      </div>
    </section>
  );
}
