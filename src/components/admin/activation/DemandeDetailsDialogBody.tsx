import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Paperclip } from 'lucide-react';
import { nbDocuments, type DemandeMandat } from './activationModel';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid gap-x-4 gap-y-1.5 rounded-xl border border-border/70 p-3 text-sm sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Ligne({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <span className="text-muted-foreground">{label}:</span> <span className="text-foreground">{children}</span>
    </div>
  );
}

/** Fiche d'une demande de mandat (mêmes informations que l'ancien dialogue « Voir », regroupées). */
export function DemandeDetailsDialogBody({ demande }: { demande: DemandeMandat }) {
  const docs = nbDocuments(demande);
  return (
    <div className="space-y-4 py-2">
      <Section title="Coordonnées">
        <Ligne label="Email">{demande.email}</Ligne>
        <Ligne label="Téléphone">{demande.telephone}</Ligne>
        <Ligne label="Adresse" full>{demande.adresse}</Ligne>
        <Ligne label="Nationalité">{demande.nationalite}</Ligne>
        <Ligne label="Permis">{demande.type_permis}</Ligne>
        <Ligne label="État civil">{demande.etat_civil}</Ligne>
      </Section>
      <Section title="Situation financière">
        <Ligne label="Profession">{demande.profession}</Ligne>
        <Ligne label="Employeur">{demande.employeur}</Ligne>
        <Ligne label="Revenus">{demande.revenus_mensuels?.toLocaleString()} CHF/mois</Ligne>
        <Ligne label="Budget max">{demande.budget_max?.toLocaleString()} CHF</Ligne>
      </Section>
      <Section title="Recherche">
        <Ligne label="Type">{demande.type_recherche}</Ligne>
        <Ligne label="Type de bien">{demande.type_bien}</Ligne>
        <Ligne label="Pièces">{demande.pieces_recherche}</Ligne>
        <Ligne label="Région">{demande.region_recherche}</Ligne>
        {demande.souhaits_particuliers && (
          <Ligne label="Souhaits" full>{demande.souhaits_particuliers}</Ligne>
        )}
      </Section>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />{docs === 0 ? 'Aucun document joint' : `${docs} document${docs > 1 ? 's' : ''} joint${docs > 1 ? 's' : ''}`}
        </span>
        <span>
          Soumis le {format(new Date(demande.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
          {demande.date_paiement && (
            <> • Payé le {format(new Date(demande.date_paiement), 'dd MMM yyyy', { locale: fr })}</>
          )}
        </span>
        {demande.abaninja_invoice_ref && <span>Facture AbaNinja: {demande.abaninja_invoice_ref}</span>}
      </p>
    </div>
  );
}
