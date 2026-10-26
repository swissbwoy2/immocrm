import { AlertCircle, Briefcase, Building2, DollarSign, FileText, Home } from 'lucide-react';
import { KeyFacts, dateCH } from '@/components/details/DetailPrimitives';
import { FicheCard, Field, FieldGrid, Notice } from './parts';
import { calculateAnciennete, chf, type Client } from './model';

/** Situation financière (chercheur) : revenus, budget max, budget recommandé, alertes. */
export function FinancialSituationCard({ client, budgetRecommande }: { client: Client; budgetRecommande: number }) {
  return (
    <FicheCard icon={DollarSign} title="Situation financière">
      <KeyFacts items={[
        { label: 'Revenus mensuels', value: chf(client.revenus_mensuels || 0) },
        { label: 'Budget maximum', value: chf(client.budget_max || 0), emphasis: true },
        { label: 'Budget recommandé', value: chf(budgetRecommande), hint: 'Revenus ÷ 3' },
      ]} />
      {(client.charges_extraordinaires || client.poursuites || client.curatelle) && (
        <div className="mt-3 space-y-2">
          {client.charges_extraordinaires && (
            <Notice icon={AlertCircle} tone="warning" title="Charges extraordinaires">
              {client.montant_charges_extra ? chf(client.montant_charges_extra) : 'Oui'}
            </Notice>
          )}
          {(client.poursuites || client.curatelle) && (
            <Notice icon={AlertCircle} tone="danger" title={(
              <>
                {client.poursuites && 'Poursuites en cours'}
                {client.poursuites && client.curatelle && ' • '}
                {client.curatelle && 'Sous curatelle'}
              </>
            )} />
          )}
        </div>
      )}
    </FicheCard>
  );
}

/** Situation actuelle (chercheur) : gérance, loyer, ancienneté du bail, motif. */
export function CurrentSituationCard({ client }: { client: Client }) {
  return (
    <FicheCard icon={Building2} title="Situation actuelle">
      <FieldGrid>
        <Field label="Gérance actuelle" value={client.gerance_actuelle} />
        <Field label="Contact gérance" value={client.contact_gerance} />
        <Field label="Loyer brut actuel" value={chf(client.loyer_actuel || 0)} />
        <Field label="Depuis le" value={client.depuis_le ? dateCH(client.depuis_le) : null} />
        <Field label="Pièces actuel" value={client.pieces_actuel || null} />
        <Field label="Motif du changement" value={client.motif_changement} />
      </FieldGrid>
    </FicheCard>
  );
}

/** Situation professionnelle (chercheur) : profession, employeur, revenus nets, engagement, ancienneté. */
export function ProfessionalSituationCard({ client }: { client: Client }) {
  const anciennete = calculateAnciennete(client.date_engagement);
  return (
    <FicheCard icon={Briefcase} title="Situation professionnelle">
      <FieldGrid>
        <Field label="Profession" value={client.profession} />
        <Field label="Employeur" value={client.employeur} />
        <Field label="Revenus mensuels nets" value={chf(client.revenus_mensuels || 0)} emphasis />
        <Field label="Date d'engagement" value={client.date_engagement ? dateCH(client.date_engagement) : null} />
        {anciennete && <Field label="Ancienneté" value={anciennete} wide emphasis />}
      </FieldGrid>
    </FicheCard>
  );
}

/** Critères de recherche (chercheur). */
export function SearchCriteriaCard({ client }: { client: Client }) {
  return (
    <FicheCard icon={Home} title="Critères de recherche">
      <FieldGrid>
        <Field label="Type de bien" value={client.type_bien} />
        <Field label="Nombre de pièces" value={client.pieces || null} />
        <Field label="Région de recherche" value={client.region_recherche} wide emphasis />
        {client.nombre_occupants && <Field label="Nombre d'occupants" value={client.nombre_occupants} />}
        {client.souhaits_particuliers && <Field label="Souhaits particuliers" value={client.souhaits_particuliers} wide />}
      </FieldGrid>
    </FicheCard>
  );
}

/** Autres informations (chercheur) : usage, animaux, instrument, véhicules, découverte de l'agence. */
export function OtherInfoCard({ client }: { client: Client }) {
  return (
    <FicheCard icon={FileText} title="Autres informations">
      <FieldGrid>
        {client.utilisation_logement && <Field label="Utilisation du logement" value={client.utilisation_logement} wide />}
        <Field label="Animaux" value={client.animaux ? 'Oui' : 'Non'} />
        <Field label="Instrument de musique" value={client.instrument_musique ? 'Oui' : 'Non'} />
        {client.vehicules && <Field label="Véhicules" value={client.numero_plaques || 'Oui'} />}
        {client.decouverte_agence && <Field label="Comment a découvert l'agence" value={client.decouverte_agence} wide />}
      </FieldGrid>
    </FicheCard>
  );
}
