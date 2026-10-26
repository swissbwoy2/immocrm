import { ExternalLink, Mail, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DashBadge, DashSectionLink } from '@/components/client/dashboard/DashPrimitives';
import { DETAIL_DIALOG, DetailActions, DetailBody, DetailHeader, DetailLinkCard, DetailSection, DetailText, KeyFacts } from '@/components/details/DetailPrimitives';
import { AdresseMap } from '@/components/maps/AdresseMap';
import { formatZurichShortDate, formatZurichTime } from '@/lib/dateZurich';
import { FicheCard, InlineEmpty, ListRow, OffreContacts, TimeChip } from './parts';
import { chf, getStatutLabel, getStatutTone } from './model';

/** Offres reçues aujourd'hui (jour calendaire suisse). */
export function TodayOffersCard({ offres, onSelect, onSeeAll }: { offres: any[]; onSelect: (o: any) => void; onSeeAll?: () => void }) {
  return (
    <FicheCard
      icon={Mail}
      title={`Offres reçues aujourd'hui${offres.length ? ` (${offres.length})` : ''}`}
      action={onSeeAll ? <DashSectionLink label="Toutes les offres" onClick={onSeeAll} /> : undefined}
    >
      {offres.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">Aucune offre reçue aujourd'hui</p>
      ) : (
        <div className="-mx-2.5 space-y-0.5">
          {offres.map((o) => (
            <ListRow
              key={o.id}
              onClick={() => onSelect(o)}
              leading={<TimeChip top={formatZurichTime(o.date_envoi)} />}
              title={o.adresse || o.titre || 'Offre'}
              sub={`${chf(Number(o.prix) || 0)} CC`}
              trailing={o.statut ? <DashBadge tone={getStatutTone(o.statut)}>{getStatutLabel(o.statut)}</DashBadge> : undefined}
            />
          ))}
        </div>
      )}
    </FicheCard>
  );
}

/** Offres envoyées au client + bouton « Envoyer une offre ». */
export function SentOffersCard({ offres, onSelect, onSendOffer }: { offres: any[]; onSelect: (o: any) => void; onSendOffer: () => void }) {
  return (
    <FicheCard
      icon={Send}
      title={`Offres envoyées (${offres.length})`}
      action={(
        <Button onClick={onSendOffer}>
          <Send className="h-4 w-4" />
          Envoyer une offre
        </Button>
      )}
    >
      {offres.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {offres.map((offre) => (
            <button
              key={offre.id}
              type="button"
              onClick={() => onSelect(offre)}
              className="imr-lg-plain min-w-0 rounded-2xl bg-muted/40 p-3.5 text-left dark:bg-white/[0.04]"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block break-words text-[15px] font-medium text-foreground">{offre.adresse}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{formatZurichShortDate(offre.date_envoi)}</span>
                </span>
                <DashBadge tone={getStatutTone(offre.statut)}>{getStatutLabel(offre.statut)}</DashBadge>
              </span>
              <span className="mt-2.5 grid grid-cols-3 gap-2 text-sm">
                <span className="min-w-0"><span className="block text-[13px] text-muted-foreground">Prix</span><span className="block truncate font-medium">{chf(offre.prix, '—')}</span></span>
                <span className="min-w-0"><span className="block text-[13px] text-muted-foreground">Surface</span><span className="block truncate font-medium">{offre.surface || 'N/A'} m²</span></span>
                <span className="min-w-0"><span className="block text-[13px] text-muted-foreground">Pièces</span><span className="block truncate font-medium">{offre.pieces || 'N/A'}</span></span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <InlineEmpty icon={Send} title="Aucune offre envoyée" />
      )}
    </FicheCard>
  );
}

/** Détail d'une offre + contacts + clients ayant reçu la même offre. */
export function OfferDetailDialog({ offre, recipients, recipientsLoading, onClose }: {
  offre: any | null;
  recipients: { name: string; statut: string }[];
  recipientsLoading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!offre} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          eyebrow="Offre"
          title={offre?.adresse || offre?.titre || 'Offre'}
          subtitle={offre?.date_envoi ? `Envoyée le ${formatZurichShortDate(offre.date_envoi)} à ${formatZurichTime(offre.date_envoi)}` : undefined}
          badge={offre?.statut ? <DashBadge tone={getStatutTone(offre.statut)}>{getStatutLabel(offre.statut)}</DashBadge> : undefined}
        />
        {offre && (
          <DetailBody>
            <KeyFacts items={[
              { label: 'Prix', value: `${chf(Number(offre.prix) || 0)} CC`, emphasis: true },
              { label: 'Envoyée à', value: formatZurichTime(offre.date_envoi) },
              offre.pieces ? { label: 'Pièces', value: String(offre.pieces) } : null,
              offre.surface ? { label: 'Surface', value: `${offre.surface} m²` } : null,
              offre.etage != null && offre.etage !== '' ? { label: 'Étage', value: String(offre.etage) } : null,
              offre.disponibilite ? { label: 'Disponibilité', value: String(offre.disponibilite) } : null,
              offre.type_bien ? { label: 'Type de bien', value: String(offre.type_bien) } : null,
              offre.statut ? { label: 'Statut', value: String(offre.statut) } : null,
            ]} />
            {offre.description && (
              <DetailSection title="Description"><DetailText>{offre.description}</DetailText></DetailSection>
            )}
            {offre.lien_annonce && (
              <DetailLinkCard href={offre.lien_annonce} title="Voir l'annonce" subtitle={offre.lien_annonce} icon={ExternalLink} />
            )}
            {(offre.contact_gerance || offre.contact_annonceur || offre.contact_visite || offre.concierge_nom || offre.concierge_tel) && (
              <DetailSection title="Contacts"><OffreContacts offre={offre} /></DetailSection>
            )}
            <DetailSection title="Clients ayant reçu cette offre" icon={Users}>
              {recipientsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : (
                <>
                  <p className="text-[15px] font-medium">{recipients.length} client(s) ont reçu cette offre</p>
                  <div className="mt-2 divide-y divide-border/50">
                    {recipients.map((r, idx) => (
                      <div key={idx} className="flex min-h-[44px] items-center justify-between gap-2 py-2">
                        <span className="min-w-0 truncate text-[15px]">{r.name}</span>
                        {r.statut && <DashBadge tone="muted">{getStatutLabel(r.statut)}</DashBadge>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </DetailSection>
            {offre.adresse && <AdresseMap address={offre.adresse} />}
          </DetailBody>
        )}
        <DetailActions>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}
