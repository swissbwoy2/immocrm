import { useEffect } from 'react';
import { setStoryDialogOpen } from './storyDialogState';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, ExternalLink, Home, MapPin } from 'lucide-react';
import { ShowcaseItem, galleryUrls, usePreviewImage, formatPrix } from './useShowcase';
import { Link } from 'react-router-dom';
import { StoryPhotoLink } from './StoryPhotoLink';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { useSourcedListingAccess } from '@/hooks/useSourcedListingAccess';
import { useImmoRamaCandidacyDialog } from '@/hooks/useImmoRamaCandidacyDialog';


interface Props {
  item: ShowcaseItem | null;
  onOpenChange: (open: boolean) => void;
}

export function ShowcaseDetailDialog({ item, onOpenChange }: Props) {
  const { openDialog, dialog, isOpen: disclaimer } = useImmoRamaCandidacyDialog();
  const open = !!item || disclaimer;

  useEffect(() => {
    if (!open) return;
    setStoryDialogOpen(true);
    return () => setStoryDialogOpen(false);
  }, [open]);

  return (
    <>
      <Dialog open={!!item} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto z-[200] pb-24">
          {item && <DetailBody item={item} onDeposer={openDialog} />}
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}


function DetailBody({ item, onDeposer }: { item: ShowcaseItem; onDeposer: () => void }) {
  const { canViewInternalListing } = useSourcedListingAccess();
  const allowImages = canViewInternalListing || !!item.is_native;
  const gallery = allowImages ? galleryUrls(item) : [];
  const cover = usePreviewImage(item, allowImages);
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-lg leading-snug">{item.titre || 'Bien immobilier'}</DialogTitle>
      </DialogHeader>

      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-xl">
          {images.map((src, i) => (
            <StoryPhotoLink key={i} href={item.lien_annonce} className="w-full shrink-0 sm:w-[420px]">
              <img
                src={src}
                alt={`${item.titre || 'Bien'} — photo ${i + 1}`}
                loading="lazy"
                className="h-48 w-full rounded-xl object-cover"
              />
            </StoryPhotoLink>
          ))}
        </div>

      ) : allowImages ? (
        <div className="flex h-40 items-center justify-center rounded-xl bg-muted">
          <Home className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <StoryPhotoLink href={item.lien_annonce} className="block">
          <div className="h-40 overflow-hidden rounded-xl border border-border">
            <ExternalListingPlaceholder />
          </div>
        </StoryPhotoLink>
      )}

      <div className="flex flex-wrap gap-2">
        {item.est_mise_en_avant && (
          <Badge className="border-0 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shadow-md">
            Excellente offre
          </Badge>
        )}
        {item.type_bien && <Badge variant="secondary">{item.type_bien}</Badge>}
        {item.pieces != null && <Badge variant="secondary">{item.pieces} pièces</Badge>}
        {item.surface != null && <Badge variant="secondary">{item.surface} m²</Badge>}
        {item.etage && <Badge variant="secondary">Étage {item.etage}</Badge>}
      </div>

      {item.adresse && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {item.adresse}
        </p>
      )}

      {item.date_visite && (
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" />
          Visite le{' '}
          {new Date(item.date_visite).toLocaleString('fr-CH', {
            timeZone: 'Europe/Zurich',
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </p>
      )}

      {item.prix != null && <p className="text-xl font-bold text-primary">{formatPrix(item.prix)}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={onDeposer}>
          Déposer mon dossier
        </Button>
        {item.lien_annonce && (
          <Button asChild variant="outline" className="flex-1">
            {item.lien_annonce.startsWith('/') ? (
              <Link to={item.lien_annonce}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir l'annonce
              </Link>
            ) : (
              <a href={item.lien_annonce} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir l'annonce
              </a>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
