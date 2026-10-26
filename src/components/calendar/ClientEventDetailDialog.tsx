import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { Home, Lightbulb, MessageSquareText, ExternalLink, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { VisitCompteRenduAttachments } from '@/components/calendar/VisitCompteRenduAttachments';
import { VisitVideoPlayer } from '@/components/calendar/VisitVideoPlayer';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { buildVisiteICSDescription } from '@/utils/generateICS';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  VISIT_DIALOG_CLASS,
  VisitActionBar,
  VisitBody,
  VisitHero,
  VisitInfoTiles,
  VisitNote,
  VisitSection,
  VisitStatusBadge,
  CompteRenduView,
  formatCHF,
  offrePhotoUrl,
} from '@/components/visites/VisitDetailParts';
import { formatZurichDay, formatZurichTime } from '@/lib/dateZurich';
import { eventTypeLabels, CalendarEvent } from './types';

interface ClientEventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A visite row (with joined offres) when the clicked item is a visit */
  visite?: any | null;
  /** A calendar_events row when the clicked item is a generic event */
  event?: CalendarEvent | null;
  /** Optional: navigate to the offers page */
  onVoirOffre?: () => void;
  /** Parcours achat : prix de vente au lieu d'un loyer mensuel. */
  isAchat?: boolean;
}

export function ClientEventDetailDialog({
  open,
  onOpenChange,
  visite,
  event,
  onVoirOffre,
  isAchat = false,
}: ClientEventDetailDialogProps) {
  const offre = visite?.offres;
  const cr = visite?.compte_rendu && typeof visite.compte_rendu === 'object' ? visite.compte_rendu : null;

  const voirOffreBtn = visite && onVoirOffre ? (
    <Button
      onClick={() => {
        onOpenChange(false);
        onVoirOffre();
      }}
    >
      <Home className="h-4 w-4" /> {isAchat ? 'Voir le bien' : "Voir l'offre"}
    </Button>
  ) : (
    <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={VISIT_DIALOG_CLASS} onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* ---------- VISITE ---------- */}
        {visite && (
          <>
            <VisitHero
              TitleAs={DialogTitle}
              date={visite.date_visite}
              endDate={visite.date_visite_fin}
              kicker="Détails de la visite"
              badges={<VisitStatusBadge statut={visite.statut} />}
              address={visite.adresse}
              photoUrl={offrePhotoUrl(offre)}
              title={offre?.titre}
            />

            <VisitBody>
              {/* Live de visite en cours (spectateur) */}
              <VisitLiveButton visiteId={visite.id} size="default" className="h-12 w-full" />

              {offre && (
                <VisitInfoTiles
                  items={[
                    { icon: Home, label: 'Type', value: offre.type_bien },
                    { label: 'Pièces', value: offre.pieces },
                    { label: 'Surface', value: offre.surface ? `${offre.surface} m²` : undefined },
                    { label: 'Étage', value: offre.etage },
                    { label: isAchat ? 'Prix de vente' : 'Loyer', value: offre.prix ? formatCHF(offre.prix, isAchat ? '' : ' / mois') : undefined },
                    { label: 'Disponibilité', value: offre.disponibilite },
                  ]}
                />
              )}

              {visite.notes && (
                <VisitSection icon={Lightbulb} title="Informations">
                  <VisitNote>{visite.notes}</VisitNote>
                </VisitSection>
              )}

              {visite.feedback_agent && (
                <VisitSection icon={MessageSquareText} title="Retour de votre agent">
                  <VisitNote>{visite.feedback_agent}</VisitNote>
                </VisitSection>
              )}

              {offre?.description && (
                <VisitSection icon={Home} title="Description du bien">
                  <VisitNote>{offre.description}</VisitNote>
                </VisitSection>
              )}

              {/* Vidéo(s) de la visite */}
              <VisitVideoPlayer medias={visite.medias} />

              {/* Compte rendu (lecture seule côté client) */}
              <CompteRenduView legacy={cr} title="Compte rendu de visite" />

              {/* Pièces jointes du compte rendu (lecture seule) */}
              <VisitCompteRenduAttachments visite={visite} readOnly />

              {offre?.lien_annonce && (
                <VisitSection icon={ExternalLink} title="Annonce">
                  <div className="min-w-0 overflow-hidden">
                    <LinkPreviewCard url={offre.lien_annonce} showInline />
                  </div>
                </VisitSection>
              )}
            </VisitBody>

            <VisitActionBar primary={voirOffreBtn}>
              <AddToCalendarButton
                event={{
                  uid: `${visite.id}@immocrm`,
                  title: `Visite - ${visite.adresse}`,
                  description: buildVisiteICSDescription({
                    adresse: visite.adresse,
                    prix: offre?.prix ? (isAchat ? `CHF ${Number(offre.prix).toLocaleString('fr-CH')} (prix de vente)` : `${offre.prix} CHF/mois`) : undefined,
                    pieces: offre?.pieces,
                    surface: offre?.surface,
                    etage: offre?.etage,
                    notes: visite.notes,
                    lien_annonce: offre?.lien_annonce,
                    description: offre?.description,
                  }),
                  location: visite.adresse,
                  startDate: new Date(visite.date_visite),
                }}
                size="sm"
                variant="outline"
              />
            </VisitActionBar>
          </>
        )}

        {/* ---------- EVENT ---------- */}
        {!visite && event && (
          <>
            <header className="space-y-3 px-4 pb-2 pt-2 pr-14 sm:px-6 sm:pt-6 sm:pr-16">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détails de l'événement</span>
                <DashBadge tone="neutral">{eventTypeLabels[event.event_type] || event.event_type}</DashBadge>
              </div>
              <DialogTitle className="block text-left">
                <span className="block text-[22px] font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                  {formatZurichDay(event.event_date)}
                </span>
                <span className="mt-0.5 block text-lg font-semibold text-primary">
                  {event.all_day || !formatZurichTime(event.event_date) ? 'Journée entière' : formatZurichTime(event.event_date)}
                </span>
              </DialogTitle>
              <p className="break-words text-[15px] font-medium text-foreground">{event.title}</p>
            </header>
            <VisitBody>
              {event.description && (
                <VisitSection icon={CalendarDays} title="Description">
                  <VisitNote>{event.description}</VisitNote>
                </VisitSection>
              )}
            </VisitBody>
            <VisitActionBar primary={<Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>}>
              <AddToCalendarButton
                event={{
                  uid: `${event.id}@immocrm`,
                  title: event.title,
                  description: event.description || '',
                  location: '',
                  startDate: new Date(event.event_date),
                }}
                size="sm"
                variant="outline"
              />
            </VisitActionBar>
          </>
        )}

        {!visite && !event && <DialogTitle className="sr-only">Détails</DialogTitle>}
      </DialogContent>
    </Dialog>
  );
}
