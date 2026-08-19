import { MandatFormData } from './types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LandingCheckbox } from '@/components/forms-premium/LandingCheckbox';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconSignature } from '@/components/forms-premium/icons/LuxuryIcons';
import SignaturePad from './SignaturePad';
import MandatLegalConsents from './MandatLegalConsents';
import MandatRecapitulatif from './MandatRecapitulatif';
import { FileCheck, AlertCircle, PenLine, FileText, Gift, CheckCircle2, Sparkles } from 'lucide-react';

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Récapitulatif et signature</h2>
        <p className="text-sm text-muted-foreground mt-1">Vérifiez vos informations et signez le mandat.</p>
      </div>

      {/* Récapitulatif */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck size={14} className="text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Récapitulatif de votre dossier</h3>
        </div>
        <MandatRecapitulatif data={data} onChange={onChange} />
      </div>

      {/* Code promo */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={15} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Code promo (optionnel)</span>
        </div>
        <LandingInput
          label=""
          value={data.code_promo}
          onChange={(e) => onChange({ code_promo: e.target.value })}
          placeholder="Entrez votre code promo si vous en avez un"
        />
      </div>

      {/* Dispositions du mandat + 12 consentements */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Dispositions du mandat</p>
            <p className="text-[10px] text-muted-foreground">*À lire attentivement et approuver avant de signer</p>
          </div>
        </div>
        <MandatLegalConsents data={data} onChange={onChange} />
      </div>

      {/* Signature */}
      <div className={`rounded-xl border p-4 transition-all duration-500 ${
        hasSignature
          ? 'border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_20px_hsl(142_60%_40%/0.08)]'
          : 'border-border bg-muted/40'
      }`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine size={15} className={hasSignature ? 'text-emerald-600' : 'text-primary'} />
              <span className="text-sm font-semibold text-foreground">
                Signature électronique <span className="text-destructive">*</span>
              </span>
            </div>
            {hasSignature && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Signé
              </span>
            )}
          </div>
          {hasCGVAccepted ? (
            <>
              <p className="text-xs text-muted-foreground">Utilisez votre souris, votre doigt ou un stylet pour signer dans le cadre ci-dessous.</p>
              <SignaturePad value={data.signature_data} onChange={(value) => onChange({ signature_data: value })} />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-5 text-center">
              <p className="text-xs text-muted-foreground">
                La signature électronique se débloquera dès que les 12 dispositions auront été acceptées.
              </p>
            </div>
          )}
        </div>
      </div>


      {/* Alert état incomplet */}
      {!isComplete && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/15 p-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            {!hasSignature && !hasCGVAccepted && 'Veuillez signer le mandat et accepter les dispositions pour continuer.'}
            {!hasSignature && hasCGVAccepted && 'Veuillez signer le mandat pour continuer.'}
            {hasSignature && !hasCGVAccepted && 'Veuillez accepter les dispositions pour continuer.'}
          </p>
        </div>
      )}

      {/* Success */}
      {isComplete && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 flex items-start gap-2">
          <Sparkles size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700">Après validation, une copie de votre mandat signé vous sera envoyée par email au format PDF.</p>
        </div>
      )}
    </div>
  );
}
