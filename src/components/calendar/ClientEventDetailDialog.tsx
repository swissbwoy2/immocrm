import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, Home, Maximize, Building, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AddressLink } from '@/components/AddressLink';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { VisitVideoPlayer } from '@/components/calendar/VisitVideoPlayer';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { buildVisiteICSDescription } from '@/utils/generateICS';
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
}

const statutLabels: Record<string, string> = {
  planifiee: 'Planifiée',
  proposee: 'Créneau proposé',
  effectuee: 'Effectuée',
  annulee: 'Annulée',
  refusee: 'Refusée',
};

export function ClientEventDetailDialog({
  open,
  onOpenChange,
  visite,
  event,
  onVoirOffre,
}: ClientEventDetailDialogProps) {
  const offre = visite?.offres;
  const cr = visite?.compte_rendu && typeof visite.compte_rendu === 'object' ? visite.compte_rendu : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {visite ? 'Détails de la visite' : "Détails de l'événement"}
            {visite?.statut && (
              <Badge variant={visite.statut === 'effectuee' ? 'secondary' : 'outline'}>
                {statutLabels[visite.statut] || visite.statut}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ---------- VISITE ---------- */}
        {visite && (
          <div className="space-y-5 min-w-0">
            <div className="p-4 bg-muted rounded-lg min-w-0">
              <AddressLink
                address={visite.adresse}
                className="font-semibold text-lg break-words"
                iconClassName="h-5 w-5 text-primary"
              />
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground pl-7">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(visite.date_visite), 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(visite.date_visite), 'HH:mm')}
                </span>
              </div>
            </div>

            {offre && (
              <div className="space-y-3 min-w-0">
                <h5 className="font-medium flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Détails du bien
                </h5>
                <div className="p-4 border rounded-lg space-y-4 min-w-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Prix</p>
                      <p className="font-medium">{offre.prix?.toLocaleString('fr-CH')} CHF/mois</p>
                    </div>
                    {offre.pieces && (
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Pièces</p>
                        <p className="font-medium">{offre.pieces}</p>
                      </div>
                    )}
                    {offre.surface && (
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Maximize className="h-3 w-3" /> Surface
                        </p>
                        <p className="font-medium">{offre.surface} m²</p>
                      </div>
                    )}
                    {offre.etage && (
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" /> Étage
                        </p>
                        <p className="font-medium">{offre.etage}</p>
                      </div>
                    )}
                  </div>

                  {offre.disponibilite && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Disponibilité</Label>
                      <p className="text-sm break-words">{offre.disponibilite}</p>
                    </div>
                  )}

                  {offre.description && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Description</Label>
                      <p className="text-sm whitespace-pre-wrap break-words mt-1 p-3 bg-muted/50 rounded max-h-40 overflow-y-auto">
                        {offre.description}
                      </p>
                    </div>
                  )}

                  {offre.lien_annonce && (
                    <div className="min-w-0">
                      <Label className="text-muted-foreground text-xs">Annonce</Label>
                      <div className="mt-1">
                        <LinkPreviewCard url={offre.lien_annonce} showInline />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {visite.notes && (
              <div className="space-y-2">
                <h5 className="font-medium">💡 Informations</h5>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap break-words">{visite.notes}</p>
                </div>
              </div>
            )}

            {visite.feedback_agent && (
              <div className="space-y-2">
                <h5 className="font-medium">📝 Retour de votre agent</h5>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap break-words">{visite.feedback_agent}</p>
                </div>
              </div>
            )}

            {/* Vidéo(s) de la visite */}
            <VisitVideoPlayer medias={visite.medias} />

            {/* Compte-rendu (lecture seule côté client) */}
            {cr && (
              <div className="space-y-2">
                <h5 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Compte-rendu de visite
                </h5>
                <div className="p-3 border rounded-lg space-y-2 text-sm">
                  <div className="grid gap-1 sm:grid-cols-2">
                    {cr.ascenseur && (
                      <p>🛗 Ascenseur : {cr.ascenseur === 'oui' ? 'Oui' : 'Non'}</p>
                    )}
                    {cr.type_sol && <p>🧱 Sol : {cr.type_sol}</p>}
                    {cr.etat_general && <p className="sm:col-span-2">🏠 État : {cr.etat_general}</p>}
                  </div>
                  {cr.avantages && (
                    <p className="whitespace-pre-wrap break-words">👍 Avantages : {cr.avantages}</p>
                  )}
                  {cr.inconvenients && (
                    <p className="whitespace-pre-wrap break-words">👎 Inconvénients : {cr.inconvenients}</p>
                  )}
                  {cr.autres_infos && (
                    <p className="whitespace-pre-wrap break-words">📝 {cr.autres_infos}</p>
                  )}
                </div>
              </div>
            )}

            <AddToCalendarButton
              event={{
                uid: `${visite.id}@immocrm`,
                title: `Visite - ${visite.adresse}`,
                description: buildVisiteICSDescription({
                  adresse: visite.adresse,
                  prix: offre?.prix ? `${offre.prix} CHF/mois` : undefined,
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
              className="w-full"
            />
          </div>
        )}

        {/* ---------- EVENT ---------- */}
        {!visite && event && (
          <div className="space-y-4 min-w-0">
            <Badge variant="outline">
              {eventTypeLabels[event.event_type] || event.event_type}
            </Badge>
            <h3 className="text-lg font-semibold break-words">{event.title}</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
              </span>
              {!event.all_day ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(event.event_date), 'HH:mm')}
                </span>
              ) : (
                <Badge variant="outline">Journée entière</Badge>
              )}
            </div>
            {event.description && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap break-words">{event.description}</p>
              </div>
            )}
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
              className="w-full"
            />
          </div>
        )}

        <DialogFooter className="gap-2 pt-4 border-t flex-wrap">
          {visite && onVoirOffre && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onVoirOffre();
              }}
            >
              Voir l'offre
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
