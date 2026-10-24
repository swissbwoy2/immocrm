import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { cn } from '@/lib/utils';
import { CONTAINER, Cta, H2, H3, Reveal } from './homeUi';

/**
 * « Notre sélection ! » : les annonces Immo-Rama mises en avant, en carrousel,
 * avec les mêmes cartes que le portail /annonces.
 */
export function HomeSelection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data: annonces = [] } = useQuery({
    queryKey: ['landing-biens-exception', 'v2'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(
          'id, slug, titre, adresse, ville, prix, nombre_pieces, surface_habitable, type_transaction, est_mise_en_avant, photos_annonces_publiques(url, est_principale)',
        )
        .eq('statut', 'publie')
        .eq('est_mise_en_avant', true)
        .eq('source', 'immo-rama.ch')
        .or(`date_expiration.is.null,date_expiration.gt.${new Date().toISOString()}`)
        .order('mise_en_avant_rang', { ascending: true, nullsFirst: false })
        .order('date_publication', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  const arrow =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-foreground ring-1 ring-inset ring-foreground/20 transition-colors duration-150 hover:ring-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

  return (
    <section className="bg-white pt-14 md:pt-20" aria-labelledby="home-selection-title">
      <div className={CONTAINER}>
        <Reveal>
          <h2 id="home-selection-title" className={cn(H2, 'max-w-[28ch]')}>
            Nous aidons nos clients à trouver rapidement leur futur appartement en Suisse romande
          </h2>
          <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.55] text-foreground/80">
            L’expertise Immo-rama.ch pour sécuriser ton dossier et emménager rapidement, partout en Suisse romande.
          </p>
        </Reveal>

        {annonces.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h3 className={H3}>Notre sélection !</h3>
                <p className="mt-1 text-[15px] text-foreground/75">Les meilleures offres Immo-Rama, avant tout le monde</p>
              </div>
              <div className="hidden flex-none gap-2 sm:flex">
                <button type="button" className={arrow} aria-label="Annonce précédente" onClick={() => scrollBy(-320)}>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button type="button" className={arrow} aria-label="Annonce suivante" onClick={() => scrollBy(320)}>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div
              ref={scrollerRef}
              className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6 [scrollbar-width:none]"
            >
              {annonces.map((a: any) => (
                <div key={a.id} className="w-[78vw] max-w-[300px] flex-none snap-start">
                  <PublicAnnonceCard annonce={a} featured compact={false} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Cta to="/annonces">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
            Voir les annonces
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Cta>
          <Cta to="/inscription-annonceur" variant="secondary">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
            Déposer une annonce
          </Cta>
        </div>
      </div>
    </section>
  );
}
