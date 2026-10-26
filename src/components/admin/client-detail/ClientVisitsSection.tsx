import { Calendar, ExternalLink, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DashBadge, DashSectionLink } from '@/components/client/dashboard/DashPrimitives';
import { DETAIL_DIALOG, DetailActions, DetailBody, DetailHeader, DetailLinkCard, DetailSection, DetailText, KeyFacts } from '@/components/details/DetailPrimitives';
import { AdresseMap } from '@/components/maps/AdresseMap';
import { formatZurichDateTime, formatZurichShortDate, formatZurichTime } from '@/lib/dateZurich';
import { FicheCard, ListRow, Notice, OffreContacts, TimeChip } from './parts';
import { VISITE_A_VENIR_STATUT, chf, getStatutLabel } from './model';

const statutOf = (s: string) => VISITE_A_VENIR_STATUT[s] || { label: s, tone: 'muted' as const };

function delegationText(v: any, coursiersMap: Record<string, string>) {
  return `Déléguée au coursier${coursiersMap[v.coursier_id as string] ? ` — ${coursiersMap[v.coursier_id as string]}` : ''}${v.statut_coursier ? ` · ${v.statut_coursier}` : ''}`;
}

/** Visites à venir du client (statuts actifs, futures). `limit` pour la vue d'ensemble. */
export function UpcomingVisitsCard({ visites, coursiersMap, onSelect, limit, onSeeAll }: {
  visites: any[];
  coursiersMap: Record<string, string>;
  onSelect: (v: any) => void;
  limit?: number;
  onSeeAll?: () => void;
}) {
  const shown = limit ? visites.slice(0, limit) : visites;
  return (
    <FicheCard
      icon={Calendar}
      title={`Visites à venir${visites.length ? ` (${visites.length})` : ''}`}
      action={onSeeAll && visites.length > (limit ?? 0) ? <DashSectionLink label="Tout voir" onClick={onSeeAll} /> : undefined}
    >
      {visites.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">Aucune visite à venir</p>
      ) : (
        <div className="-mx-2.5 space-y-0.5">
          {shown.map((v) => {
            const cfg = statutOf(v.statut);
            const isDeleguee = v.est_deleguee || !!v.coursier_id;
            const adresse = v.adresse || v.offres?.adresse || 'Adresse non renseignée';
            return (
              <ListRow
                key={v.id}
                onClick={() => onSelect(v)}
                leading={<TimeChip top={formatZurichShortDate(v.date_visite).slice(0, 5)} bottom={formatZurichTime(v.date_visite)} />}
                title={adresse}
                sub={isDeleguee
                  ? delegationText(v, coursiersMap)
                  : (v.offre_id && v.offres?.adresse && v.adresse ? `Offre liée : ${v.offres.adresse}` : undefined)}
                trailing={<DashBadge tone={cfg.tone}>{cfg.label}</DashBadge>}
              />
            );
          })}
        </div>
      )}
    </FicheCard>
  );
}

/** Détail d'une visite + offre liée + contacts. */
export function VisitDetailDialog({ visite, coursiersMap, onClose }: { visite: any | null; coursiersMap: Record<string, string>; onClose: () => void }) {
  const offre = visite?.offres;
  const cfg = visite ? statutOf(visite.statut) : null;
  const adresse = visite?.adresse || visite?.offres?.adresse;
  return (
    <Dialog open={!!visite} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          eyebrow="Visite"
          title={adresse || 'Visite'}
          subtitle={visite ? formatZurichDateTime(visite.date_visite) : undefined}
          badge={cfg ? <DashBadge tone={cfg.tone}>{cfg.label}</DashBadge> : undefined}
        />
        {visite && (
          <DetailBody>
            {(visite.est_deleguee || visite.coursier_id) && (
              <Notice icon={UserCheck} tone="primary">{delegationText(visite, coursiersMap)}</Notice>
            )}
            {offre && (
              <>
                <KeyFacts items={[
                  { label: 'Prix', value: `${chf(Number(offre.prix) || 0)} CC`, emphasis: true },
                  offre.pieces ? { label: 'Pièces', value: String(offre.pieces) } : null,
                  offre.surface ? { label: 'Surface', value: `${offre.surface} m²` } : null,
                  offre.etage != null && offre.etage !== '' ? { label: 'Étage', value: String(offre.etage) } : null,
                  offre.disponibilite ? { label: 'Disponibilité', value: String(offre.disponibilite) } : null,
                  offre.type_bien ? { label: 'Type de bien', value: String(offre.type_bien) } : null,
                  offre.statut ? { label: 'Statut offre', value: getStatutLabel(String(offre.statut)) } : null,
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
              </>
            )}
            {adresse && <AdresseMap address={adresse} />}
          </DetailBody>
        )}
        <DetailActions>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}
