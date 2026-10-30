import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PARKING_OPTIONS, STATUT_LOGEMENT_OPTIONS, type InfosCoCandidat, type InfosPostulation } from '@/lib/infosPostulation';

const CHAMP = 'w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300';

function Libelle({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-muted-foreground">
      {children} <span className="text-destructive">*</span>
    </label>
  );
}

function OuiNon({ value, onChange, name }: { value: '' | 'oui' | 'non'; onChange: (v: 'oui' | 'non') => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-2">
      {(['oui', 'non'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'min-h-[44px] rounded-xl border px-4 text-sm font-medium transition-colors',
            value === v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40 text-foreground hover:bg-muted',
          )}
        >
          {v === 'oui' ? 'Oui' : 'Non'}
        </button>
      ))}
    </div>
  );
}

/**
 * Champs « Informations pour vos dossiers de candidature » : utilisés dans /nouveau-mandat
 * et dans le dialogue obligatoire des clients déjà inscrits.
 */
export function InfosPostulationFields({
  value,
  onChange,
  idPrefix = 'ip',
}: {
  value: InfosPostulation;
  onChange: (patch: Partial<InfosPostulation>) => void;
  idPrefix?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Libelle>Avez-vous une assurance RC ménage ?</Libelle>
        <OuiNon name="Assurance RC ménage" value={value.rc_menage} onChange={(v) => onChange({ rc_menage: v, ...(v === 'non' ? { rc_compagnie: '' } : {}) })} />
      </div>

      {value.rc_menage === 'oui' && (
        <div className="space-y-1.5">
          <Libelle htmlFor={idPrefix + '-rc'}>Compagnie d’assurance RC</Libelle>
          <input
            id={idPrefix + '-rc'}
            className={CHAMP}
            value={value.rc_compagnie}
            onChange={(e) => onChange({ rc_compagnie: e.target.value })}
            placeholder="Ex : Mobilière, AXA, Helvetia, Zurich…"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Libelle htmlFor={idPrefix + '-parking'}>Parking souhaité</Libelle>
        <select
          id={idPrefix + '-parking'}
          className={CHAMP}
          value={value.parking_souhaite}
          onChange={(e) => onChange({ parking_souhaite: e.target.value })}
        >
          <option value="">Choisir…</option>
          {PARKING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Libelle htmlFor={idPrefix + '-enfants'}>Nombre d’enfants qui vivront dans le logement</Libelle>
        <input
          id={idPrefix + '-enfants'}
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          className={CHAMP}
          value={value.nombre_enfants ?? ''}
          onChange={(e) => onChange({ nombre_enfants: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
          placeholder="0 si aucun"
        />
      </div>

      {(value.nombre_enfants ?? 0) > 0 && (
        <div className="space-y-1.5">
          <label htmlFor={idPrefix + '-ages'} className="block text-sm font-medium text-muted-foreground">Âge des enfants</label>
          <input
            id={idPrefix + '-ages'}
            className={CHAMP}
            value={value.enfants_ages}
            onChange={(e) => onChange({ enfants_ages: e.target.value })}
            placeholder="Ex : 4 et 9 ans"
          />
        </div>
      )}

      <div className="space-y-1.5 md:col-span-2">
        <Libelle htmlFor={idPrefix + '-statut'}>Votre statut dans votre logement actuel</Libelle>
        <select
          id={idPrefix + '-statut'}
          className={CHAMP}
          value={value.statut_logement_actuel}
          onChange={(e) => onChange({ statut_logement_actuel: e.target.value })}
        >
          <option value="">Choisir…</option>
          {STATUT_LOGEMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Libelle>La gérance peut-elle vous joindre directement sur votre mobile pour le suivi du dossier ?</Libelle>
        <OuiNon name="Mobile de suivi autorisé" value={value.mobile_suivi_autorise} onChange={(v) => onChange({ mobile_suivi_autorise: v })} />
      </div>
    </div>
  );
}

/** Mêmes questions pour un co-candidat (colocataire, conjoint, co-débiteur, occupant). */
export function InfosCoCandidatFields({
  value,
  onChange,
  idPrefix = 'cc',
}: {
  value: InfosCoCandidat;
  onChange: (patch: Partial<InfosCoCandidat>) => void;
  idPrefix?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Libelle>Assurance RC ménage ?</Libelle>
        <OuiNon name="Assurance RC ménage du co-candidat" value={value.rc_menage} onChange={(v) => onChange({ rc_menage: v, ...(v === 'non' ? { rc_compagnie: '' } : {}) })} />
      </div>
      {value.rc_menage === 'oui' && (
        <div className="space-y-1.5">
          <Libelle htmlFor={idPrefix + '-rc'}>Compagnie d’assurance RC</Libelle>
          <input id={idPrefix + '-rc'} className={CHAMP} value={value.rc_compagnie} onChange={(e) => onChange({ rc_compagnie: e.target.value })} placeholder="Ex : Mobilière, AXA, Allianz…" />
        </div>
      )}
      <div className="space-y-1.5 md:col-span-2">
        <Libelle htmlFor={idPrefix + '-statut'}>Statut dans son logement actuel</Libelle>
        <select id={idPrefix + '-statut'} className={CHAMP} value={value.statut_logement_actuel} onChange={(e) => onChange({ statut_logement_actuel: e.target.value })}>
          <option value="">Choisir…</option>
          {STATUT_LOGEMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Libelle>La gérance peut-elle le/la joindre directement sur son mobile ?</Libelle>
        <OuiNon name="Mobile de suivi du co-candidat" value={value.mobile_suivi_autorise} onChange={(v) => onChange({ mobile_suivi_autorise: v })} />
      </div>
    </div>
  );
}
