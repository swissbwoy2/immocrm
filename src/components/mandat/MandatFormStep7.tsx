import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { MandatFormData } from './types';
import SignaturePad from './SignaturePad';
import CGVContent from './CGVContent';
import MandatRecapitulatif from './MandatRecapitulatif';
import { FileCheck, AlertCircle, PenLine, FileText, Gift, CheckCircle2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep7({ data, onChange }: Props) {
  const hasSignature = !!data.signature_data;
  const hasCGVAccepted = data.cgv_acceptees;
  const isComplete = hasSignature && hasCGVAccepted;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative">
          <PenLine className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-[hsl(38_55%_70%)] via-[hsl(38_55%_60%)] to-[hsl(38_45%_48%)] bg-clip-text text-transparent">
          Récapitulatif et Signature
        </h2>
        <p className="text-sm text-foreground/70 mt-1">Vérifiez vos informations et signez le mandat</p>
      </div>

      {/* Récapitulatif complet */}
      <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold">Récapitulatif de votre dossier</h3>
        </div>
        <MandatRecapitulatif data={data} />
      </Card>

      {/* Code promo */}
      <Card className="p-4 backdrop-blur-sm bg-gradient-to-r from-accent/5 to-primary/5 border-border/50">
        <div className="space-y-2">
          <Label htmlFor="code_promo" className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Code promo (optionnel)
          </Label>
          <Input
            id="code_promo"
            value={data.code_promo}
            onChange={(e) => onChange({ code_promo: e.target.value })}
            placeholder="Entrez votre code promo si vous en avez un"
            className="bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      {/* CGV */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Dispositions du mandat</h3>
            <p className="text-xs text-muted-foreground">*À lire attentivement et approuver avant de signer</p>
          </div>
        </div>
        <CGVContent typeRecherche={data.type_recherche} />
      </div>

      {/* Signature */}
      <Card className={`p-4 backdrop-blur-sm transition-all duration-500 ${
        hasSignature 
          ? 'bg-green-500/5 border-green-500/30 shadow-lg shadow-green-500/10' 
          : 'bg-card/80 border-border/50'
      }`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <PenLine className={`h-4 w-4 ${hasSignature ? 'text-green-600' : 'text-primary'}`} />
              Signature électronique <span className="text-destructive">*</span>
            </Label>
            {hasSignature && (
              <span className="text-sm text-green-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
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
      <Card className={`p-4 backdrop-blur-sm transition-all duration-500 ${
        hasCGVAccepted 
          ? 'bg-green-500/5 border-green-500/30 shadow-lg shadow-green-500/10' 
          : 'bg-muted/30 border-border/50'
      }`}>
        <div className="flex items-start space-x-3">
          <Checkbox
            id="cgv"
            checked={data.cgv_acceptees}
            onCheckedChange={(checked) => onChange({ cgv_acceptees: checked as boolean })}
            className="mt-1 border-2 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
          />
          <Label htmlFor="cgv" className="text-sm leading-relaxed cursor-pointer">
            En cochant cette case, je confirme avoir répondu aux questions en bonne conscience et que j'ai pris connaissance qu'en cas de réponses non conforme à la vérité, les offreurs de logement ont le droit de résilier le contrat de (sous-)location avec effet immédiat - et sous réserve d'autres revendications. En outre, je confirme accepter sans condition les dispositions de contrat pour chercheurs de logement. <span className="text-destructive">*</span>
          </Label>
        </div>
      </Card>

      {/* Alert si manque signature ou CGV */}
      {!isComplete && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!hasSignature && !hasCGVAccepted && 'Veuillez signer le mandat et accepter les dispositions pour continuer.'}
            {!hasSignature && hasCGVAccepted && 'Veuillez signer le mandat pour continuer.'}
            {hasSignature && !hasCGVAccepted && 'Veuillez accepter les dispositions pour continuer.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {isComplete && (
        <Alert className="border-green-500/30 bg-green-500/5 animate-fade-in">
          <Sparkles className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400 flex items-center gap-2">
            <span>Après validation, une copie de votre mandat signé vous sera envoyée par email au format PDF.</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
