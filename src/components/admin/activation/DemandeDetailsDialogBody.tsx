import { Paperclip, Mail, Phone, MapPin } from 'lucide-react';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  DetailHeader, DetailBody, KeyFacts, DetailSection, DetailRow, DetailText, DetailNotice,
  chfDetail, dateCH, dateTimeCH,
} from '@/components/details/DetailPrimitives';
import { nbDocuments, STATUT_LABEL, type DemandeMandat } from './activationModel';

/**
 * Fiche d'une demande de mandat (mêmes informations que l'ancien dialogue « Voir », regroupées).
 * À placer directement dans <DialogContent className={DETAIL_DIALOG}> : rend l'en-tête et le corps.
 */
export function DemandeDetailsDialogBody({ demande }: { demande: DemandeMandat }) {
  const docs = nbDocuments(demande);
  const statut = STATUT_LABEL[demande.statut];
  const revenus = chfDetail(demande.revenus_mensuels);
  const budget = chfDetail(demande.budget_max);
  return (
    <>
      <DetailHeader
        titleAs={DialogTitle}
        descriptionAs={DialogDescription}
        eyebrow="Demande de mandat"
        title={`${demande.prenom ?? ''} ${demande.nom ?? ''}`.trim() || demande.email}
        subtitle={demande.created_at ? `Soumise le ${dateTimeCH(demande.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}` : undefined}
        badge={statut ? <DashBadge tone={statut.tone}>{statut.label}</DashBadge> : undefined}
      />
      <DetailBody>
        <KeyFacts
          items={[
            revenus ? { label: 'Revenus / mois', value: revenus } : null,
            budget ? { label: 'Budget max', value: budget, emphasis: true } : null,
            demande.pieces_recherche ? { label: 'Pièces', value: demande.pieces_recherche } : null,
          ]}
        />

        <DetailSection title="Coordonnées">
          <DetailRow icon={Mail} label="Email" value={demande.email} href={demande.email ? `mailto:${demande.email}` : undefined} />
          <DetailRow icon={Phone} label="Téléphone" value={demande.telephone} href={demande.telephone ? `tel:${demande.telephone}` : undefined} />
          <DetailRow icon={MapPin} label="Adresse" value={demande.adresse} />
          <DetailRow label="Nationalité" value={demande.nationalite} />
          <DetailRow label="Permis" value={demande.type_permis} />
          <DetailRow label="État civil" value={demande.etat_civil} />
        </DetailSection>

        <DetailSection title="Situation financière">
          <DetailRow label="Profession" value={demande.profession} />
          <DetailRow label="Employeur" value={demande.employeur} />
          <DetailRow label="Revenus" value={revenus ? `${revenus} / mois` : null} />
          <DetailRow label="Budget max" value={budget} />
        </DetailSection>

        <DetailSection title="Recherche">
          <DetailRow label="Type" value={demande.type_recherche} />
          <DetailRow label="Type de bien" value={demande.type_bien} />
          <DetailRow label="Pièces" value={demande.pieces_recherche} />
          <DetailRow label="Région" value={demande.region_recherche} />
        </DetailSection>

        {demande.souhaits_particuliers && (
          <DetailSection title="Souhaits particuliers">
            <DetailText>{demande.souhaits_particuliers}</DetailText>
          </DetailSection>
        )}

        <DetailNotice icon={Paperclip}>
          <span className="block">
            {docs === 0 ? 'Aucun document joint' : `${docs} document${docs > 1 ? 's' : ''} joint${docs > 1 ? 's' : ''}`}
          </span>
          {demande.date_paiement && <span className="block">Payée le {dateCH(demande.date_paiement, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          {demande.abaninja_invoice_ref && <span className="block">Facture AbaNinja : {demande.abaninja_invoice_ref}</span>}
        </DetailNotice>
      </DetailBody>
    </>
  );
}
