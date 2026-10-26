import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  DETAIL_DIALOG,
  DetailHeader,
  DetailBody,
  KeyFacts,
  DetailSection,
  DetailRow,
  DetailText,
  DetailContact,
  chfDetail,
  dateCH,
} from '@/components/details/DetailPrimitives';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddressLink } from '@/components/AddressLink';
import { 
  Home, 
  Maximize, 
  Building, 
  Calendar, 
  KeyRound, 
  User, 
  Phone, 
  MessageSquare,
  Layers
} from 'lucide-react';
import { AdresseMap } from '@/components/maps/AdresseMap';

interface AgentOffreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
}

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'Envoyée';
    case 'vue': return 'Vue';
    case 'interesse': return 'Intéressé';
    case 'visite_planifiee': return 'Visite planifiée';
    case 'visite_effectuee': return 'Visite effectuée';
    case 'candidature_deposee': return 'Candidature déposée';
    case 'acceptee': return 'Acceptée';
    case 'refusee': return 'Refusée';
    default: return statut;
  }
};

const getStatutTone = (statut: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted' => {
  switch (statut) {
    case 'interesse':
    case 'candidature_deposee':
      return 'warning';
    case 'visite_planifiee':
    case 'visite_effectuee':
    case 'acceptee':
      return 'success';
    case 'refusee':
      return 'danger';
    case 'envoyee':
    case 'vue':
      return 'neutral';
    default:
      return 'muted';
  }
};

export function AgentOffreDetailsDialog({
  open,
  onOpenChange,
  offre
}: AgentOffreDetailsDialogProps) {
  if (!offre) return null;

  const hasContacts = offre.contact_gerance || offre.contact_annonceur || offre.contact_visite;
  const hasPratique = offre.code_immeuble || offre.concierge_nom || offre.locataire_nom;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          title={
            <AddressLink
              address={offre.adresse}
              showIcon={false}
              className="text-[19px] font-semibold sm:text-xl"
            />
          }
          subtitle={offre.date_envoi ? `Envoyée le ${dateCH(offre.date_envoi)}` : undefined}
          badge={<DashBadge tone={getStatutTone(offre.statut)}>{getStatutLabel(offre.statut)}</DashBadge>}
        />

        <DetailBody>
          <KeyFacts
            items={[
              { label: 'Loyer / mois', value: chfDetail(offre.prix) ?? '-', emphasis: true, wide: true },
              { label: 'Pièces', value: offre.pieces || '-', icon: Home },
              { label: 'Surface', value: offre.surface ? `${offre.surface} m²` : '-', icon: Maximize },
              { label: 'Étage', value: offre.etage || '-', icon: Layers },
              { label: 'Disponibilité', value: offre.disponibilite, icon: Calendar },
            ]}
          />
          <AdresseMap address={offre.adresse} />

          {(offre.type_bien || offre.annee_construction || offre.orientation || offre.type_chauffage || offre.classe_energetique) && (
            <DetailSection title="Caractéristiques" icon={Home}>
              <DetailRow icon={Building} label="Type de bien" value={offre.type_bien} />
              <DetailRow icon={Building} label="Année de construction" value={offre.annee_construction} />
              <DetailRow icon={Home} label="Orientation" value={offre.orientation} />
              <DetailRow icon={Home} label="Chauffage" value={offre.type_chauffage} />
              <DetailRow icon={Home} label="Classe énergétique" value={offre.classe_energetique} />
            </DetailSection>
          )}

          {hasContacts && (
            <DetailSection title="Contacts" icon={Phone}>
              <DetailRow icon={Building} label="Contact gérance" value={offre.contact_gerance} />
              <DetailRow icon={User} label="Contact annonceur" value={offre.contact_annonceur} />
              <DetailRow icon={Calendar} label="Contact visite" value={offre.contact_visite} />
            </DetailSection>
          )}

          {offre.description && (
            <DetailSection title="Description">
              <DetailText>{offre.description}</DetailText>
            </DetailSection>
          )}

          {hasPratique && (
            <DetailSection title="Informations pratiques" icon={Layers}>
              <DetailRow icon={KeyRound} label="Code immeuble" value={offre.code_immeuble} />
              {offre.concierge_nom && (
                <DetailContact icon={User} role="Concierge" name={offre.concierge_nom} phone={offre.concierge_tel} />
              )}
              {offre.locataire_nom && (
                <DetailContact icon={User} role="Locataire actuel" name={offre.locataire_nom} phone={offre.locataire_tel} />
              )}
            </DetailSection>
          )}

          {offre.commentaires && (
            <DetailSection title="Vos commentaires" icon={MessageSquare}>
              <DetailText>{offre.commentaires}</DetailText>
            </DetailSection>
          )}

          {offre.lien_annonce && offre.lien_annonce.trim() && (
            <DetailSection title="Annonce originale" bare>
              <LinkPreviewCard url={offre.lien_annonce} showInline />
            </DetailSection>
          )}
        </DetailBody>
      </DialogContent>
    </Dialog>
  );
}
