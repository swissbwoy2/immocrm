import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { MandatFormData } from './types';
import SignaturePad from './SignaturePad';
import CGVContent from './CGVContent';
import MandatRecapitulatif from './MandatRecapitulatif';
import { FileCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep7({ data, onChange }: Props) {
  const hasSignature = !!data.signature_data;
  const hasCGVAccepted = data.cgv_acceptees;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Récapitulatif et Signature</h2>
        <p className="text-sm text-muted-foreground">Vérifiez vos informations et signez le mandat</p>
      </div>

      {/* Récapitulatif complet */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Récapitulatif de votre dossier</h3>
        </div>
        <MandatRecapitulatif data={data} />
      </div>

      {/* Code promo */}
      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="code_promo">Code promo (optionnel)</Label>
          <Input
            id="code_promo"
            value={data.code_promo}
            onChange={(e) => onChange({ code_promo: e.target.value })}
            placeholder="Entrez votre code promo si vous en avez un"
          />
        </div>
      </Card>

      {/* CGV */}
      <div className="space-y-4">
        <h3 className="font-semibold">Dispositions du mandat</h3>
        <p className="text-sm text-muted-foreground">*À lire attentivement et approuver avant de signer</p>
        <CGVContent typeRecherche={data.type_recherche} />
      </div>

      {/* Signature */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Signature électronique *</Label>
            {hasSignature && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <FileCheck className="h-4 w-4" />
                Signé
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Utilisez votre souris, votre doigt ou un stylet pour signer dans le cadre ci-dessous.
          </p>
          <SignaturePad
            value={data.signature_data}
            onChange={(value) => onChange({ signature_data: value })}
          />
        </div>
      </Card>

      {/* Checkbox CGV */}
      <Card className={`p-4 ${hasCGVAccepted ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-muted/30'}`}>
        <div className="flex items-start space-x-3">
          <Checkbox
            id="cgv"
            checked={data.cgv_acceptees}
            onCheckedChange={(checked) => onChange({ cgv_acceptees: checked as boolean })}
          />
          <Label htmlFor="cgv" className="text-sm leading-relaxed cursor-pointer">
            En cochant cette case, je confirme avoir répondu aux questions en bonne conscience et que j'ai pris connaissance qu'en cas de réponses non conforme à la vérité, les offreurs de logement ont le droit de résilier le contrat de (sous-)location avec effet immédiat - et sous réserve d'autres revendications. En outre, je confirme accepter sans condition les dispositions de contrat pour chercheurs de logement. <span className="text-destructive">*</span>
          </Label>
        </div>
      </Card>

      {/* Alert si manque signature ou CGV */}
      {(!hasSignature || !hasCGVAccepted) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!hasSignature && !hasCGVAccepted && 'Veuillez signer le mandat et accepter les dispositions pour continuer.'}
            {!hasSignature && hasCGVAccepted && 'Veuillez signer le mandat pour continuer.'}
            {hasSignature && !hasCGVAccepted && 'Veuillez accepter les dispositions pour continuer.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Info envoi PDF */}
      {hasSignature && hasCGVAccepted && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <FileCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            Après validation, une copie de votre mandat signé vous sera envoyée par email au format PDF.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
