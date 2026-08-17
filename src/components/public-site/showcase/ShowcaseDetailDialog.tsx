import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, ExternalLink, Home, MapPin } from 'lucide-react';
import { ShowcaseItem, galleryUrls, usePreviewImage, formatPrix } from './useShowcase';

interface Props {
  item: ShowcaseItem | null;
  onOpenChange: (open: boolean) => void;
}

export function ShowcaseDetailDialog({ item, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [disclaimer, setDisclaimer] = useState(false);

  return (
    <>
      <Dialog open={!!item} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {item && <DetailBody item={item} onDeposer={() => setDisclaimer(true)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={disclaimer} onOpenChange={setDisclaimer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avant de continuer</AlertDialogTitle>
            <AlertDialogDescription>
              Pour obtenir plus d'informations sur ce bien, souscrivez au mandat de recherche Logisorama.ch. En cas
              d'attribution d'un logement, une commission équivalente à un mois de loyer sera due à Logisorama.ch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/nouveau-mandat')}>OK, je continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailBody({ item, onDeposer }: { item: ShowcaseItem; onDeposer: () => void }) {
  const gallery = galleryUrls(item);
  const cover = usePreviewImage(item);
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-lg leading-snug">{item.titre || 'Bien immobilier'}</DialogTitle>
      </DialogHeader>

      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-xl">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${item.titre || 'Bien'} — photo ${i + 1}`}
              loading="lazy"
              className="h-48 w-full shrink-0 rounded-xl object-cover sm:w-[420px]"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl bg-muted">
          <Home className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
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
            <a href={item.lien_annonce} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir l'annonce
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
