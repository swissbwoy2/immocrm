import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import SignaturePad from '@/components/mandat/SignaturePad';
import { MandatV3FormData, LEGAL_CHECKBOXES } from './types';

interface Props {
  data: MandatV3FormData;
  mandateId: string | null;
  onChange: (data: Partial<MandatV3FormData>) => void;
  onSubmitSignature: () => Promise<void>;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

export default function MandatV3Step7Signature({ data, mandateId, onChange, onSubmitSignature, isSubmitting, isSubmitted }: Props) {
  const allLegalChecked = LEGAL_CHECKBOXES.every((cb) => data[cb.key as keyof MandatV3FormData] === true);
  const hasSignature = !!data.signature_data;
  const canSubmit = allLegalChecked && hasSignature && mandateId && !isSubmitting && !isSubmitted;

  if (isSubmitted) {
    return (
      <div className="space-y-5 text-center py-8 sm:py-12">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Mandat signé avec succès !</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto px-4">
          Un email de confirmation avec votre lien de suivi personnel vous a été envoyé à <strong>{data.email}</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Conservez cet email pour suivre l'avancement de votre dossier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Signature</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifiez le récapitulatif puis signez votre mandat.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 rounded-xl p-3 sm:p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-sm">Récapitulatif</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs sm:text-sm">
          <span className="text-muted-foreground">Nom</span>
          <span className="font-medium truncate">{data.prenom} {data.nom}</span>
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium truncate">{data.email}</span>
          <span className="text-muted-foreground">Recherche</span>
          <span className="font-medium">{data.type_recherche}</span>
          {data.type_bien && <>
            <span className="text-muted-foreground">Bien</span>
            <span className="font-medium">{data.type_bien}</span>
          </>}
          {data.zone_recherche && <>
            <span className="text-muted-foreground">Zone</span>
            <span className="font-medium">{data.zone_recherche}</span>
          </>}
          {data.budget_max > 0 && <>
            <span className="text-muted-foreground">Budget max</span>
            <span className="font-medium">CHF {data.budget_max.toLocaleString()}</span>
          </>}
          <span className="text-muted-foreground">Tiers</span>
          <span className="font-medium">{data.related_parties.length}</span>
          <span className="text-muted-foreground">Documents</span>
          <span className="font-medium">{data.documents.length}</span>
          <span className="text-muted-foreground">Clauses</span>
          <span className="font-medium text-green-600">{LEGAL_CHECKBOXES.length}/{LEGAL_CHECKBOXES.length} ✓</span>
        </div>
      </div>

      {!allLegalChecked && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-destructive">
          Vous devez accepter toutes les clauses juridiques avant de signer (étape 6).
        </div>
      )}

      {/* Signature pad */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Votre signature</h3>
        <SignaturePad value={data.signature_data} onChange={(sig) => onChange({ signature_data: sig })} />
      </div>

      <Button
        type="button"
        onClick={onSubmitSignature}
        disabled={!canSubmit}
        className="w-full min-h-[52px] text-base"
        variant="success"
      >
        {isSubmitting ? (
          <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Signature en cours...</>
        ) : (
          'Signer le mandat'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground px-2">
        En signant, vous acceptez les conditions du contrat. Votre IP et la date seront enregistrées.
      </p>
    </div>
  );
}
