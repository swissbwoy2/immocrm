import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { POLICY_VERSION } from '@/lib/legal-version';

interface Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  required?: boolean;
  className?: string;
}

/**
 * Checkbox de consentement explicite pour l'upload de documents sensibles.
 * À placer dans tout formulaire qui collecte fiche de salaire, extrait de poursuites,
 * pièce d'identité, permis de séjour ou contrat de travail.
 *
 * Version de la politique liée : `POLICY_VERSION` (lib/legal-version).
 * Le consentement doit être enregistré dans `documents.metadata` lors de l'insert
 * sous la forme : { consent: true, consent_at: ISO, policy_version: POLICY_VERSION }.
 */
export function SensitiveDocConsentCheckbox({
  checked,
  onCheckedChange,
  id = 'sensitive-doc-consent',
  required = true,
  className,
}: Props) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 ${className ?? ''}`}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-1"
        required={required}
      />
      <Label htmlFor={id} className="text-xs leading-relaxed font-normal cursor-pointer">
        J'accepte que les documents transmis (fiche de salaire, extrait de poursuites,
        pièce d'identité, permis de séjour, contrat de travail) soient traités par{' '}
        <strong>Immo-rama.ch</strong> (Christ Ramazani) pour la constitution de mon
        dossier locataire et leur transmission aux régies, propriétaires ou bailleurs,
        conformément à la{' '}
        <Link to="/politique-confidentialite" target="_blank" className="text-primary underline">
          politique de confidentialité
        </Link>{' '}
        — base : exécution du mandat (art. 31 al. 2 let. a nLPD) + consentement
        explicite (art. 6 al. 7 nLPD).{required && <span className="text-destructive ml-1">*</span>}
      </Label>
    </div>
  );
}

/**
 * Helper à appeler lors de l'insert dans `documents` pour persister la preuve de consentement.
 */
export function buildConsentMetadata() {
  return {
    consent: true,
    consent_at: new Date().toISOString(),
    policy_version: POLICY_VERSION,
  };
}
