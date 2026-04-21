import { MandatFormData } from './types';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumCheckbox } from '@/components/forms-premium/PremiumCheckbox';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconSignature } from '@/components/forms-premium/icons/LuxuryIcons';
import SignaturePad from './SignaturePad';
import CGVContent from './CGVContent';
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
      <div className="flex flex-col items-center gap-3 mb-6">
        <LuxuryIconBadge size="lg"><IconSignature size={26} /></LuxuryIconBadge>
        <div className="text-center">
          <h2 className="text-xl font-serif font-bold text-[hsl(40_20%_88%)]">Récapitulatif et Signature</h2>
          <p className="text-xs text-[hsl(40_20%_45%)] mt-1">Vérifiez vos informations et signez le mandat</p>
        </div>
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.6)] to-transparent" />
      </div>

      {/* Récapitulatif */}
      <div className="rounded-xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-[hsl(38_45%_48%/0.15)] flex items-center justify-center">
            <FileCheck size={14} className="text-[hsl(38_55%_65%)]" />
          </div>
          <h3 className="text-sm font-semibold text-[hsl(40_20%_75%)]">Récapitulatif de votre dossier</h3>
        </div>
        <MandatRecapitulatif data={data} />
      </div>

      {/* Code promo */}
      <div className="rounded-xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={15} className="text-[hsl(38_55%_65%)]" />
          <span className="text-sm font-medium text-[hsl(40_20%_70%)]">Code promo (optionnel)</span>
        </div>
        <PremiumInput
          label=""
          value={data.code_promo}
          onChange={(e) => onChange({ code_promo: e.target.value })}
          placeholder="Entrez votre code promo si vous en avez un"
        />
      </div>

      {/* CGV */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[hsl(38_45%_48%/0.15)] flex items-center justify-center">
            <FileText size={14} className="text-[hsl(38_55%_65%)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[hsl(40_20%_75%)]">Dispositions du mandat</p>
            <p className="text-[10px] text-[hsl(40_20%_40%)]">*À lire attentivement et approuver avant de signer</p>
          </div>
        </div>
        <CGVContent typeRecherche={data.type_recherche} />
      </div>

      {/* Signature */}
      <div className={`rounded-xl border p-4 transition-all duration-500 ${
        hasSignature
          ? 'border-emerald-500/25 bg-emerald-950/10 shadow-[0_0_20px_hsl(142_60%_40%/0.08)]'
          : 'border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)]'
      }`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine size={15} className={hasSignature ? 'text-emerald-400' : 'text-[hsl(38_55%_65%)]'} />
              <span className="text-sm font-semibold text-[hsl(40_20%_75%)]">
                Signature électronique <span className="text-red-400">*</span>
              </span>
            </div>
            {hasSignature && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Signé
              </span>
            )}
          </div>
          <p className="text-xs text-[hsl(40_20%_45%)]">Utilisez votre souris, votre doigt ou un stylet pour signer dans le cadre ci-dessous.</p>
          <SignaturePad value={data.signature_data} onChange={(value) => onChange({ signature_data: value })} />
        </div>
      </div>

      {/* CGV checkbox */}
      <PremiumCheckbox
        checked={data.cgv_acceptees}
        onCheckedChange={(checked) => onChange({ cgv_acceptees: checked })}
        required
        label="En cochant cette case, je confirme avoir répondu aux questions en bonne conscience et que j'ai pris connaissance qu'en cas de réponses non conforme à la vérité, les offreurs de logement ont le droit de résilier le contrat de (sous-)location avec effet immédiat - et sous réserve d'autres revendications. En outre, je confirme accepter sans condition les dispositions de contrat pour chercheurs de logement."
      />

      {/* Alert état incomplet */}
      {!isComplete && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/15 p-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            {!hasSignature && !hasCGVAccepted && 'Veuillez signer le mandat et accepter les dispositions pour continuer.'}
            {!hasSignature && hasCGVAccepted && 'Veuillez signer le mandat pour continuer.'}
            {hasSignature && !hasCGVAccepted && 'Veuillez accepter les dispositions pour continuer.'}
          </p>
        </div>
      )}

      {/* Success */}
      {isComplete && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-3 flex items-start gap-2">
          <Sparkles size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300">Après validation, une copie de votre mandat signé vous sera envoyée par email au format PDF.</p>
        </div>
      )}
    </div>
  );
}
