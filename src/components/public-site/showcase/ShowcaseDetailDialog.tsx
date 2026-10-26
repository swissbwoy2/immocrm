import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { setStoryDialogOpen } from './storyDialogState';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  DETAIL_DIALOG, DetailHeader, DetailBody, KeyFacts, DetailActions, DetailNotice, chfDetail, dateTimeCH,
} from '@/components/details/DetailPrimitives';
import { cn } from '@/lib/utils';
import { CalendarClock, ExternalLink, Home, Layers, Maximize } from 'lucide-react';
import { ShowcaseItem, galleryUrls, usePreviewImage } from './useShowcase';
import { Link } from 'react-router-dom';
import { StoryPhotoLink } from './StoryPhotoLink';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { useSourcedListingAccess } from '@/hooks/useSourcedListingAccess';
import { useImmoRamaCandidacyDialog } from '@/hooks/useImmoRamaCandidacyDialog';
import { AdresseMap } from '@/components/maps/AdresseMap';


interface Props {
  item: ShowcaseItem | null;
  onOpenChange: (open: boolean) => void;
}

type Reloc = { id: string; statut: string; visite: string | null } | null;

export function ShowcaseDetailDialog({ item, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reloc, setReloc] = useState<Reloc>(null);

  useEffect(() => {
    setReloc(null);
    if (!item?.is_native || !user) return;
    (async () => {
      const { data } = await (supabase as any).from('candidatures_location')
        .select('id, statut, date_visite, annonce_creneaux(date_heure)')
        .eq('annonce_id', item.id).eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setReloc({ id: data.id, statut: data.statut, visite: data.annonce_creneaux?.date_heure || data.date_visite });
    })();
  }, [item?.id, item?.is_native, user]);

  const deposer = async () => {
    if (!reloc) { navigate('/nouveau-mandat'); return; }
    const { error } = await (supabase as any).rpc('candidat_deposer_candidature', { _id: reloc.id });
    if (error) { console.error('[deposer]', error); toast.error(error.message || 'Impossible de déposer la candidature'); return; }
    supabase.functions.invoke('candidature-relocation-notify', { body: { candidature_id: reloc.id, etape: 'candidature_deposee' } }).catch(() => {});
    toast.success('Candidature déposée');
    setReloc({ ...reloc, statut: 'candidature_deposee' });
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
  };

  const { openDialog, dialog, isOpen: disclaimer } = useImmoRamaCandidacyDialog({ onConfirm: deposer });
  const open = !!item || disclaimer;

  useEffect(() => {
    if (!open) return;
    setStoryDialogOpen(true);
    return () => setStoryDialogOpen(false);
  }, [open]);

  return (
    <>
      <Dialog open={!!item} onOpenChange={onOpenChange}>
        <DialogContent className={cn(DETAIL_DIALOG, 'z-[200]')}>
          {item && <ShowcaseDetailContent item={item} onDeposer={openDialog} reloc={reloc} />}
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}


function ShowcaseDetailContent({ item, onDeposer, reloc }: { item: ShowcaseItem; onDeposer: () => void; reloc: Reloc }) {
  const visitePassee = !!reloc?.visite && new Date(reloc.visite).getTime() < Date.now();
  const deja = !!reloc && reloc.statut !== 'en_attente';
  const { canViewInternalListing } = useSourcedListingAccess();
  const allowImages = canViewInternalListing || !!item.is_native;
  const gallery = allowImages ? galleryUrls(item) : [];
  const cover = usePreviewImage(item, allowImages);
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];

  const media = images.length > 0 ? (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar">
      {images.map((src, i) => (
        <StoryPhotoLink key={i} href={item.lien_annonce} className="w-full shrink-0 snap-center sm:w-[85%]">
          <img
            src={src}
            alt={`${item.titre || 'Bien'} — photo ${i + 1}`}
            loading="lazy"
            className="aspect-[16/10] w-full rounded-2xl object-cover"
          />
        </StoryPhotoLink>
      ))}
    </div>
  ) : allowImages ? (
    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-muted">
      <Home className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
    </div>
  ) : (
    <StoryPhotoLink href={item.lien_annonce} className="block">
      <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-border/70">
        <ExternalListingPlaceholder />
      </div>
    </StoryPhotoLink>
  );

  const vente = item.type_transaction === 'vente';

  return (
    <>
      <DetailHeader
        titleAs={DialogTitle}
        descriptionAs={DialogDescription}
        media={media}
        eyebrow={item.type_bien || undefined}
        title={item.titre || 'Bien immobilier'}
        subtitle={item.adresse || undefined}
        badge={item.est_mise_en_avant ? <DashBadge tone="primary">Excellente offre</DashBadge> : undefined}
      />

      <DetailBody>
        <KeyFacts
          items={[
            item.prix != null ? { label: vente ? 'Prix de vente' : 'Loyer / mois', value: chfDetail(item.prix), emphasis: true } : null,
            item.pieces != null ? { label: 'Pièces', value: item.pieces, icon: Home } : null,
            item.surface != null ? { label: 'Surface', value: `${item.surface} m²`, icon: Maximize } : null,
            item.etage ? { label: 'Étage', value: item.etage, icon: Layers } : null,
          ]}
        />
        <AdresseMap address={item.adresse} />

        {item.date_visite && (
          <DetailNotice icon={CalendarClock} tone="primary">
            <span className="font-medium">Visite le {dateTimeCH(item.date_visite)}</span>
          </DetailNotice>
        )}

        {!vente && reloc && !deja && !visitePassee && (
          <DetailNotice>Le dépôt du dossier sera disponible après la visite.</DetailNotice>
        )}
      </DetailBody>

      {(!vente || item.lien_annonce) && (
        <DetailActions>
          {item.lien_annonce && (
            <Button asChild variant="outline">
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
          {!vente && (
            reloc && deja ? (
              <Button disabled>Candidature déposée</Button>
            ) : reloc && !visitePassee ? (
              <Button disabled>Déposer mon dossier</Button>
            ) : (
              <Button onClick={onDeposer}>Déposer mon dossier</Button>
            )
          )}
        </DetailActions>
      )}
    </>
  );
}
