import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import SignaturePad from '@/components/mandat/SignaturePad';
import { MandatV3FormData, LEGAL_CHECKBOXES } from './types';
import { toast } from 'sonner';

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
      <div className="space-y-6 text-center py-12">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Mandat signé avec succès !</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Un email de confirmation avec votre lien de suivi personnel vous a été envoyé à <strong>{data.email}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          Conservez cet email pour suivre l'avancement de votre dossier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Signature</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifiez le récapitulatif puis signez électroniquement votre mandat.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3 text-sm">
        <h3 className="font-semibold">Récapitulatif</h3>
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Nom complet</span>
          <span className="font-medium">{data.prenom} {data.nom}</span>
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{data.email}</span>
          <span className="text-muted-foreground">Type de recherche</span>
          <span className="font-medium">{data.type_recherche}</span>
          {data.type_bien && <>
            <span className="text-muted-foreground">Type de bien</span>
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
          <span className="text-muted-foreground">Tiers liés</span>
          <span className="font-medium">{data.related_parties.length}</span>
          <span className="text-muted-foreground">Documents</span>
          <span className="font-medium">{data.documents.length}</span>
          <span className="text-muted-foreground">Clauses acceptées</span>
          <span className="font-medium text-green-600">{LEGAL_CHECKBOXES.length}/{LEGAL_CHECKBOXES.length} ✓</span>
        </div>
      </div>

      {!allLegalChecked && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
          Vous devez accepter toutes les clauses juridiques avant de pouvoir signer (étape 6).
        </div>
      )}

      {/* Signature pad */}
      <div className="space-y-2">
        <h3 className="font-semibold">Votre signature</h3>
        <SignaturePad value={data.signature_data} onChange={(sig) => onChange({ signature_data: sig })} />
      </div>

      <Button
        type="button"
        onClick={onSubmitSignature}
        disabled={!canSubmit}
        className="w-full h-12 text-base"
        variant="success"
      >
        {isSubmitting ? (
          <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Signature en cours...</>
        ) : (
          'Signer le mandat'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        En signant, vous acceptez les conditions du contrat de mandat de recherche immobilière.
        Votre IP et la date de signature seront enregistrées à des fins de preuve.
      </p>
    </div>
  );
}
