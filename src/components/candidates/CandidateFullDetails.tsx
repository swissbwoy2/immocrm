import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientCandidate, CANDIDATE_TYPE_LABELS } from '@/hooks/useClientCandidates';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  value?: string | number | null;
  required?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function chf(value?: number | null) {
  if (value === undefined || value === null || value === 0) return undefined;
  return `CHF ${value.toLocaleString('fr-CH')}`;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const visible = rows.filter(r => r.required || (r.value !== undefined && r.value !== null && r.value !== ''));
  if (visible.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 mb-1">{title}</p>
      <dl className="space-y-0.5">
        {visible.map(r => {
          const empty = r.value === undefined || r.value === null || r.value === '';
          return (
            <div key={r.label} className="flex items-baseline gap-2 text-xs min-w-0">
              <dt className="text-muted-foreground shrink-0">{r.label} :</dt>
              <dd className={cn('min-w-0 truncate', empty ? 'text-orange-600 font-medium' : 'text-foreground')}>
                {empty ? 'manquant' : String(r.value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function CandidateFullDetails({ candidate }: { candidate: ClientCandidate }) {
  const [open, setOpen] = useState(false);

  const chargesTotal =
    (candidate.charges_mensuelles || 0) +
    (candidate.charges_extraordinaires ? candidate.montant_charges_extra || 0 : 0);

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
        {open ? 'Masquer les détails' : 'Voir tout / Détails'}
      </Button>

      {open && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2 rounded-lg border border-border/60 bg-background/60 p-3">
          <Section
            title="Type"
            rows={[
              { label: 'Type de candidat', value: CANDIDATE_TYPE_LABELS[candidate.type], required: true },
              { label: 'Lien avec le client', value: candidate.lien_avec_client },
            ]}
          />
          <Section
            title="Personnel"
            rows={[
              { label: 'Prénom', value: candidate.prenom, required: true },
              { label: 'Nom', value: candidate.nom, required: true },
              { label: 'Date de naissance', value: formatDate(candidate.date_naissance), required: true },
              { label: 'Nationalité', value: candidate.nationalite, required: true },
              { label: 'État civil', value: candidate.situation_familiale },
              { label: 'Type de permis', value: candidate.type_permis, required: true },
            ]}
          />
          <Section
            title="Contact"
            rows={[
              { label: 'E-mail', value: candidate.email, required: true },
              { label: 'Téléphone', value: candidate.telephone, required: true },
              { label: 'Adresse actuelle', value: candidate.adresse },
            ]}
          />
          <Section
            title="Emploi"
            rows={[
              { label: 'Profession', value: candidate.profession, required: true },
              { label: 'Employeur', value: candidate.employeur, required: true },
              { label: 'Secteur', value: candidate.secteur_activite },
              { label: 'Type de contrat', value: candidate.type_contrat, required: true },
              { label: "Date d'engagement", value: formatDate(candidate.date_engagement) },
              { label: 'Ancienneté', value: candidate.anciennete_mois ? `${candidate.anciennete_mois} mois` : undefined },
              { label: 'Source des revenus', value: candidate.source_revenus, required: true },
            ]}
          />
          <Section
            title="Finances"
            rows={[
              { label: 'Revenus mensuels', value: chf(candidate.revenus_mensuels), required: true },
              { label: 'Charges mensuelles', value: chf(chargesTotal) },
              { label: 'Charges extraordinaires', value: candidate.charges_extraordinaires ? chf(candidate.montant_charges_extra) ?? 'Oui' : undefined },
              { label: 'Autres crédits', value: candidate.autres_credits ? 'Oui' : undefined },
              { label: 'Apport personnel', value: chf(candidate.apport_personnel) },
              { label: 'Poursuites', value: candidate.poursuites ? 'Oui' : 'Non' },
              { label: 'Curatelle', value: candidate.curatelle ? 'Oui' : undefined },
            ]}
          />
          <Section
            title="Logement actuel"
            rows={[
              { label: 'Gérance actuelle', value: candidate.gerance_actuelle },
              { label: 'Contact gérance', value: candidate.contact_gerance },
              { label: 'Loyer actuel', value: chf(candidate.loyer_actuel) },
              { label: 'Depuis le', value: formatDate(candidate.depuis_le) },
              { label: 'Pièces', value: candidate.pieces_actuel || undefined },
              { label: 'Motif du changement', value: candidate.motif_changement },
            ]}
          />
        </div>
      )}
    </div>
  );
}
