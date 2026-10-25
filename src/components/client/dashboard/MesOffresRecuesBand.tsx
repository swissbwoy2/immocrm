import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Home } from 'lucide-react';
import {
  ShowcaseItem,
  usePreviewImage,
} from '@/components/public-site/showcase/useShowcase';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

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

function OffreBubble({ offre, onClick, candidature = false }: { offre: OffreRow; onClick: () => void; candidature?: boolean }) {
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
        <span className="block rounded-full p-[2.5px] bg-primary transition-transform duration-150 active:scale-[0.98]">
          <span className="block rounded-full p-[2px] bg-background">
            <span className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full bg-muted">
              {img ? (
                <img src={img} alt={label} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                 candidature ? <FileCheck className="h-6 w-6 text-muted-foreground" /> : <Home className="h-6 w-6 text-muted-foreground" />
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
  title?: string;
  onItemClick?: (id: string) => void;
}

/** Bande horizontale statique des offres reçues du client connecté. */
export function MesOffresRecuesBand({ offres, title = 'Offres reçues', onItemClick }: Props) {
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
    <section className={`${DASH_CARD} p-4 md:p-5`}>
      <h3 className="mb-3 text-base font-semibold text-foreground">
         {title}
      </h3>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {list.map((o) => (
          <OffreBubble
            key={o.id}
            offre={o}
             candidature={!!onItemClick}
             onClick={() => onItemClick ? onItemClick(o.id) : navigate(`/client/offres-recues?offre=${o.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
