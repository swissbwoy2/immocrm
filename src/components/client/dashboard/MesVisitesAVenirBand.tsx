import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { useMemo, useState } from 'react';
import { ExternalLink, Home, Phone, StickyNote } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VISIT_DIALOG_CLASS, VisitActionBar, VisitBody, VisitHero, VisitInfoTiles, VisitNote, VisitSection, VisitStatusBadge, formatCHF } from '@/components/visites/VisitDetailParts';
import { formatZurichDateTime } from '@/lib/dateZurich';
import { Button } from '@/components/ui/button';
import {
  ShowcaseItem,
  galleryUrls,
  usePreviewImage,
} from '@/components/public-site/showcase/useShowcase';
import { StoryPhotoLink } from '@/components/public-site/showcase/StoryPhotoLink';

interface VisiteRow {
  id: string;
  date_visite: string;
  statut: string;
  adresse?: string | null;
  notes?: string | null;
  offres?: Record<string, any> | null;
}

const toShowcase = (v: VisiteRow): ShowcaseItem => ({
  id: v.id,
  titre: v.offres?.titre ?? null,
  type_bien: v.offres?.type_bien ?? null,
  adresse: v.offres?.adresse ?? v.adresse ?? null,
  prix: v.offres?.prix ?? null,
  pieces: v.offres?.pieces ?? null,
  surface: v.offres?.surface ?? null,
  etage: v.offres?.etage ?? null,
  lien_annonce: v.offres?.lien_annonce ?? null,
  medias_galerie: v.offres?.medias_galerie ?? null,
  date_visite: v.date_visite,
});

const fmtDate = (d: string) => formatZurichDateTime(d, { short: true, weekday: false });

function VisiteBubble({ visite, onClick }: { visite: VisiteRow; onClick: () => void }) {
  const item = useMemo(() => toShowcase(visite), [visite]);
  const img = usePreviewImage(item);
  const adresse = item.adresse || 'Visite programmée';

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 w-[84px]">
      <button type="button" onClick={onClick} className="rounded-full">
        <span className="block rounded-full p-[2.5px] bg-primary transition-transform hover:scale-105">
          <span className="block rounded-full p-[2px] bg-white/90 dark:bg-background">
            <span className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full bg-muted">
              {img ? (
                <img src={img} alt={adresse} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Home className="h-6 w-6 text-muted-foreground" />
              )}
            </span>
          </span>
        </span>
      </button>
      <button type="button" onClick={onClick} className="w-full text-center leading-tight">
        <span className="block truncate text-[11px] font-semibold text-foreground">{adresse}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{fmtDate(visite.date_visite)}</span>
      </button>
    </div>
  );
}

function VisiteDetail({ visite }: { visite: VisiteRow }) {
  const item = useMemo(() => toShowcase(visite), [visite]);
  const cover = usePreviewImage(item);
  const gallery = galleryUrls(item);
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];
  const o = visite.offres || {};

  return (
    <>
      <VisitHero
        TitleAs={DialogTitle}
        date={visite.date_visite}
        endDate={(visite as any).date_visite_fin}
        kicker="Ma visite"
        badges={<VisitStatusBadge statut={visite.statut} />}
        address={item.adresse}
        title={o.titre || undefined}
      >
        {images.length > 0 && (
          <div className="flex snap-x gap-2 overflow-x-auto no-scrollbar">
            {images.map((src, i) => (
              <StoryPhotoLink key={i} href={item.lien_annonce} className="w-[85%] shrink-0 snap-start sm:w-[360px]">
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  loading="lazy"
                  className="h-44 w-full rounded-[20px] object-cover sm:h-52"
                />
              </StoryPhotoLink>
            ))}
          </div>
        )}
      </VisitHero>

      <VisitBody>
        <VisitInfoTiles
          items={[
            { icon: Home, label: 'Type', value: item.type_bien },
            { label: 'Pièces', value: item.pieces != null ? item.pieces : undefined },
            { label: 'Surface', value: item.surface != null ? `${item.surface} m²` : undefined },
            { label: 'Étage', value: item.etage },
            { label: 'Loyer / prix', value: item.prix != null ? formatCHF(item.prix) : undefined },
            { icon: Phone, label: 'Contact sur place', value: o.contact_visite },
          ]}
        />

        {visite.notes && (
          <VisitSection icon={StickyNote} title="Notes">
            <VisitNote>{visite.notes}</VisitNote>
          </VisitSection>
        )}

        <VisitLiveButton visiteId={visite.id} size="default" className="h-12 w-full" />
      </VisitBody>

      {item.lien_annonce && (
        <VisitActionBar
          primary={
            <Button asChild variant="outline">
              <a href={item.lien_annonce} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Voir l'annonce
              </a>
            </Button>
          }
        />
      )}
    </>
  );
}

interface Props {
  visites: VisiteRow[];
}

/** Bande horizontale statique des visites à venir du client connecté. */
export function MesVisitesAVenirBand({ visites }: Props) {
  const [selected, setSelected] = useState<VisiteRow | null>(null);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (visites || [])
      .filter(
        (v) =>
          ['planifiee', 'confirmee'].includes(v.statut) &&
          v.date_visite &&
          new Date(v.date_visite).getTime() >= now,
      )
      .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());
  }, [visites]);

  if (upcoming.length === 0) return null;

  return (
    <section className="imr-lg-card mb-6 rounded-[22px] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
        Visites à venir
      </h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {upcoming.map((v) => (
          <VisiteBubble key={v.id} visite={v} onClick={() => setSelected(v)} />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className={VISIT_DIALOG_CLASS}>
          {selected ? <VisiteDetail visite={selected} /> : <DialogTitle className="sr-only">Ma visite</DialogTitle>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
