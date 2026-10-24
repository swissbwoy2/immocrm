import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { cn } from '@/lib/utils';
import { CONTAINER, Cta, H2, Reveal } from './homeUi';

/** Les annonces Immo-Rama mises en avant (« Notre sélection ! »). */
export function useSelectionAnnonces() {
  return useQuery({
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
}

/**
 * « Notre sélection ! » dans le haut de page, à la place de la photo :
 * grille de 4 annonces sur ordinateur, carrousel sur téléphone et tablette,
 * avec les deux actions du portail en dessous.
 */
export function SelectionCarousel({ className }: { className?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data: annonces = [], isLoading } = useSelectionAnnonces();
  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  const arrow =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-foreground ring-1 ring-inset ring-foreground/20 transition-colors duration-150 hover:ring-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

  if (!isLoading && annonces.length === 0) return null;

  const skeleton = (key: number) => (
    <div key={key} className="space-y-3" aria-hidden="true">
      <div className="aspect-[4/3] rounded-[14px] bg-muted" />
      <div className="h-4 w-4/5 rounded bg-muted" />
      <div className="h-3.5 w-1/2 rounded bg-muted" />
    </div>
  );

  return (
    <div className={cn('min-w-0', className)} aria-labelledby="home-selection-carousel-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="home-selection-carousel-title" className="text-[20px] leading-snug text-foreground md:text-[22px]">
            Notre sélection !
          </h2>
          <p className="mt-0.5 text-[15px] text-foreground/75">Les meilleures offres Immo-Rama, avant tout le monde</p>
        </div>
        <div className="hidden flex-none gap-2 sm:flex lg:hidden">
          <button type="button" className={arrow} aria-label="Annonce précédente" onClick={() => scrollBy(-300)}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" className={arrow} aria-label="Annonce suivante" onClick={() => scrollBy(300)}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Ordinateur : grille de 4 annonces */}
      <div className="hidden grid-cols-2 gap-x-4 gap-y-5 lg:grid">
        {isLoading
          ? [0, 1, 2, 3].map(skeleton)
          : annonces.slice(0, 4).map((a: any) => (
              <PublicAnnonceCard key={a.id} annonce={a} featured compact={false} />
            ))}
      </div>

      {/* Téléphone et tablette : carrousel au pouce */}
      <div
        ref={scrollerRef}
        className="-mx-4 flex scroll-pl-4 snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-pl-0 md:px-0 lg:hidden [scrollbar-width:none]"
      >
        {isLoading
          ? [0, 1].map((i) => <div key={i} className="w-[78vw] max-w-[270px] flex-none">{skeleton(i)}</div>)
          : annonces.map((a: any) => (
              <div key={a.id} className="w-[78vw] max-w-[270px] flex-none snap-start">
                <PublicAnnonceCard annonce={a} featured compact={false} />
              </div>
            ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
  );
}

/** Accroche « Nous aidons nos clients… » (les actions du portail sont sous « Notre sélection »). */
export function HomeSelection() {
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
      </div>
    </section>
  );
}
