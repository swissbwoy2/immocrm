import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Home } from 'lucide-react';
import { VISIT_DIALOG_CLASS, VisitBody, VisitHero, VisitInfoTiles } from '@/components/visites/VisitDetailParts';
import { ShowcaseItem, galleryUrls, usePreviewImage, formatPrix } from '@/components/public-site/showcase/useShowcase';
import { StoryPhotoLink } from '@/components/public-site/showcase/StoryPhotoLink';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { useSourcedListingAccess } from '@/hooks/useSourcedListingAccess';


interface Props {
  item: ShowcaseItem | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only detail dialog for the anonymized "Visites à venir" bubbles shown
 * inside the in-app messaging stories bar. No client data, no CTA.
 */
export function ShowcaseVisitDialog({ item, onOpenChange }: Props) {
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className={`${VISIT_DIALOG_CLASS} z-[200]`}>
        {item ? <Body item={item} /> : <DialogTitle className="sr-only">Visite</DialogTitle>}
      </DialogContent>
    </Dialog>
  );
}

function Body({ item }: { item: ShowcaseItem }) {
  const { canViewInternalListing } = useSourcedListingAccess();
  const gallery = canViewInternalListing ? galleryUrls(item) : [];
  const cover = usePreviewImage(item, canViewInternalListing);
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];

  return (
    <>
      <VisitHero
        TitleAs={DialogTitle}
        date={item.date_visite}
        kicker="Visite à venir"
        address={item.adresse}
        title={item.titre || 'Bien immobilier'}
      >
        {images.length > 0 ? (
          <div className="flex snap-x gap-2 overflow-x-auto no-scrollbar">
            {images.map((src, i) => (
              <StoryPhotoLink key={i} href={item.lien_annonce} className="w-[85%] shrink-0 snap-start sm:w-[380px]">
                <img
                  src={src}
                  alt={`${item.titre || 'Bien'} — photo ${i + 1}`}
                  loading="lazy"
                  className="h-48 w-full rounded-[20px] object-cover"
                />
              </StoryPhotoLink>
            ))}
          </div>
        ) : canViewInternalListing ? (
          <div className="flex h-40 items-center justify-center rounded-[20px] bg-muted">
            <Home className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <StoryPhotoLink href={item.lien_annonce} className="block">
            <div className="h-40 overflow-hidden rounded-[20px]">
              <ExternalListingPlaceholder />
            </div>
          </StoryPhotoLink>
        )}
      </VisitHero>

      <VisitBody>
        <VisitInfoTiles
          items={[
            { icon: Home, label: 'Type', value: item.type_bien },
            { label: 'Pièces', value: item.pieces != null ? item.pieces : undefined },
            { label: 'Surface', value: item.surface != null ? `${item.surface} m²` : undefined },
            { label: 'Étage', value: item.etage },
            { label: 'Loyer / prix', value: item.prix != null ? formatPrix(item.prix) : undefined },
          ]}
        />
      </VisitBody>
    </>
  );
}
