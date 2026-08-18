import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  ShowcaseItem,
  usePreviewImage,
} from '@/components/public-site/showcase/useShowcase';

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
  statut?: string | null;
}

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

function OffreBubble({ offre, onClick }: { offre: OffreRow; onClick: () => void }) {
  const item = useMemo(() => toShowcase(offre), [offre]);
  const img = usePreviewImage(item);
  const label = offre.titre || offre.adresse || 'Offre reçue';
  const sub =
    offre.prix != null
      ? `${new Intl.NumberFormat('fr-CH').format(Number(offre.prix))} CHF`
      : offre.adresse || '';

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 w-[84px]">
      <button type="button" onClick={onClick} className="rounded-full" aria-label={label}>
        <span className="block rounded-full p-[2.5px] bg-gradient-to-br from-primary to-accent transition-transform hover:scale-105">
          <span className="block rounded-full p-[2px] bg-background">
            <span className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full bg-muted">
              {img ? (
                <img src={img} alt={label} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Home className="h-6 w-6 text-muted-foreground" />
              )}
            </span>
          </span>
        </span>
      </button>
      <button type="button" onClick={onClick} className="w-full text-center leading-tight">
        <span className="block truncate text-[11px] font-semibold text-foreground">{label}</span>
        {sub && <span className="block truncate text-[10px] text-muted-foreground">{sub}</span>}
      </button>
    </div>
  );
}

interface Props {
  offres: OffreRow[];
}

/** Bande horizontale statique des offres reçues du client connecté. */
export function MesOffresRecuesBand({ offres }: Props) {
  const navigate = useNavigate();

  const list = useMemo(
    () =>
      (offres || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
        )
        .slice(0, 20),
    [offres],
  );

  if (list.length === 0) return null;

  return (
    <section className="mb-4 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
        Offres reçues
      </h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {list.map((o) => (
          <OffreBubble
            key={o.id}
            offre={o}
            onClick={() => navigate(`/client/offres-recues?offre=${o.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
