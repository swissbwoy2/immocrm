import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Home, MapPin } from 'lucide-react';
import { usePreviewImage, type ShowcaseItem } from '@/components/public-site/showcase/useShowcase';

interface OffreRow {
  id: string;
  titre?: string | null;
  type_bien?: string | null;
  adresse?: string | null;
  prix?: number | null;
  pieces?: number | null;
  surface?: number | null;
  etage?: string | null;
  lien_annonce?: string | null;
  medias_galerie?: any;
  created_at?: string | null;
  date_envoi?: string | null;
  statut?: string | null;
}

const STATUT_LABELS: Record<string, string> = {
  envoyee: 'Nouvelle',
  vue: 'Vue',
  interesse: 'Intéressé',
  visite_planifiee: 'Visite planifiée',
  visite_effectuee: 'Visite effectuée',
  demande_postulation: 'Demande en attente',
  candidature_deposee: 'Candidature déposée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
};

const toShowcase = (o: OffreRow): ShowcaseItem => ({
  id: o.id,
  titre: o.titre ?? null,
  type_bien: o.type_bien ?? null,
  adresse: o.adresse ?? null,
  prix: o.prix ?? null,
  pieces: o.pieces ?? null,
  surface: o.surface ?? null,
  etage: o.etage ?? null,
  lien_annonce: o.lien_annonce ?? null,
  medias_galerie: o.medias_galerie ?? null,
});

const formatPrix = (prix?: number | null) =>
  prix != null && Number(prix) > 0
    ? `CHF ${new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 0 }).format(Number(prix))}`
    : null;

/** Carte d'offre reçue, même style que les cartes « Notre sélection » de l'accueil. */
function OffreCard({ offre, onClick }: { offre: OffreRow; onClick: () => void }) {
  const item = useMemo(() => toShowcase(offre), [offre]);
  const img = usePreviewImage(item);
  const titre = offre.titre || offre.type_bien || 'Offre reçue';
  const prix = formatPrix(offre.prix);
  const details = [
    offre.pieces ? `${offre.pieces} pièces` : null,
    offre.surface ? `${offre.surface} m²` : null,
  ].filter(Boolean).join(' · ');
  const statut = offre.statut ? STATUT_LABELS[offre.statut] : null;
  const nouvelle = offre.statut === 'envoyee';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-muted">
        {img ? (
          <img
            src={img}
            alt={titre}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        {statut && (
          <span
            className={
              nouvelle
                ? 'absolute left-3 top-3 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold leading-4 text-primary-foreground'
                : 'absolute left-3 top-3 inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[11px] font-medium leading-4 text-foreground'
            }
          >
            {statut}
          </span>
        )}
      </div>
      <div className="mt-2.5 space-y-0.5">
        <p className="truncate text-[15px] font-semibold text-foreground">{titre}</p>
        {offre.adresse && (
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{offre.adresse}</span>
          </p>
        )}
        {details && <p className="truncate text-sm text-muted-foreground">{details}</p>}
        {prix && (
          <p className="pt-0.5 text-[15px] text-foreground">
            <span className="font-semibold">{prix}</span>
            <span className="text-muted-foreground"> /mois</span>
          </p>
        )}
      </div>
    </button>
  );
}

/** « Offres reçues » : carrousel de cartes avec photo, comme « Notre sélection ». */
export function OffresRecuesCarousel({ offres }: { offres: OffreRow[] }) {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  const list = useMemo(
    () =>
      (offres || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.date_envoi || b.created_at || 0).getTime() -
            new Date(a.date_envoi || a.created_at || 0).getTime(),
        )
        .slice(0, 12),
    [offres],
  );

  if (list.length === 0) return null;

  const arrow =
    'flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-inset ring-foreground/20 transition-colors duration-150 hover:ring-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

  return (
    <div className="min-w-0" aria-labelledby="client-offres-recues-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 id="client-offres-recues-title" className="text-[18px] font-semibold leading-snug text-foreground md:text-[20px]">
            Offres reçues
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Les biens que votre agent a sélectionnés pour vous</p>
        </div>
        <div className="hidden flex-none gap-2 sm:flex">
          <button type="button" className={arrow} aria-label="Offre précédente" onClick={() => scrollBy(-300)}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" className={arrow} aria-label="Offre suivante" onClick={() => scrollBy(300)}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-4 flex scroll-pl-4 snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-pl-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((o) => (
          <div key={o.id} className="w-[78vw] max-w-[270px] flex-none snap-start md:w-[260px]">
            <OffreCard offre={o} onClick={() => navigate(`/client/offres-recues?offre=${o.id}`)} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate('/client/offres-recues')}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.99] sm:w-auto"
      >
        Voir toutes mes offres
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
