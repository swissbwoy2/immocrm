import { useMemo, useState } from 'react';
import { CalendarClock, ExternalLink, Home, MapPin, Phone, StickyNote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShowcaseItem,
  galleryUrls,
  usePreviewImage,
} from '@/components/public-site/showcase/useShowcase';

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

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('fr-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

function VisiteBubble({ visite, onClick }: { visite: VisiteRow; onClick: () => void }) {
  const item = useMemo(() => toShowcase(visite), [visite]);
  const img = usePreviewImage(item);
  const adresse = item.adresse || 'Visite programmée';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5 w-[84px] group"
    >
      <span className="rounded-full p-[2.5px] bg-gradient-to-br from-primary to-accent transition-transform group-hover:scale-105">
        <span className="block rounded-full p-[2px] bg-background">
          <span className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full bg-muted">
            {img ? (
              <img src={img} alt={adresse} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <Home className="h-6 w-6 text-muted-foreground" />
            )}
          </span>
        </span>
      </span>
      <span className="w-full text-center leading-tight">
        <span className="block truncate text-[11px] font-semibold text-foreground">{adresse}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{fmtDate(visite.date_visite)}</span>
      </span>
    </button>
  );
}

function VisiteDetail({ visite }: { visite: VisiteRow }) {
  const item = useMemo(() => toShowcase(visite), [visite]);
  const cover = usePreviewImage(item);
  const gallery = galleryUrls(item);
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];
  const o = visite.offres || {};

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-lg leading-snug">
          {o.titre || item.adresse || 'Ma visite'}
        </DialogTitle>
      </DialogHeader>

      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-xl">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Photo ${i + 1}`}
              loading="lazy"
              className="h-44 w-full shrink-0 rounded-xl object-cover sm:w-[400px]"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl bg-muted">
          <Home className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <p className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4 text-primary" />
        {new Date(visite.date_visite).toLocaleString('fr-CH', {
          timeZone: 'Europe/Zurich',
          dateStyle: 'full',
          timeStyle: 'short',
        })}
      </p>

      {item.adresse && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {item.adresse}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {item.type_bien && <Badge variant="secondary">{item.type_bien}</Badge>}
        {item.pieces != null && <Badge variant="secondary">{item.pieces} pièces</Badge>}
        {item.surface != null && <Badge variant="secondary">{item.surface} m²</Badge>}
        {item.etage && <Badge variant="secondary">Étage {item.etage}</Badge>}
        {visite.statut && <Badge>{visite.statut === 'planifiee' ? 'Planifiée' : visite.statut}</Badge>}
      </div>

      {item.prix != null && (
        <p className="text-xl font-bold text-primary">
          {new Intl.NumberFormat('fr-CH').format(Number(item.prix))} CHF
        </p>
      )}

      {o.contact_visite && (
        <p className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-primary" />
          {o.contact_visite}
        </p>
      )}

      {visite.notes && (
        <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="whitespace-pre-wrap">{visite.notes}</span>
        </p>
      )}

      {item.lien_annonce && (
        <Button asChild variant="outline" className="w-full">
          <a href={item.lien_annonce} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Voir l'annonce
          </a>
        </Button>
      )}
    </div>
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
    <section className="mb-6 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
        Visites à venir
      </h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {upcoming.map((v) => (
          <VisiteBubble key={v.id} visite={v} onClick={() => setSelected(v)} />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {selected && <VisiteDetail visite={selected} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
