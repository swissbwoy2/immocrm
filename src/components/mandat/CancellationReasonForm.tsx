import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export type CancellationReason = 'found_alone' | 'not_searching_anymore' | 'searching_alone';

interface Props {
  onSubmit: (reason: CancellationReason, details?: string) => void;
  onCancel: () => void;
  withRefund: boolean;
  loading?: boolean;
  daysSinceSignature: number;
}

const REASONS: Array<{ value: CancellationReason; label: string; warning?: string }> = [
  {
    value: 'found_alone',
    label: "J'ai trouvé par moi-même",
    warning: "⚠️ Non éligible au remboursement (selon nos CGV)",
  },
  { value: 'not_searching_anymore', label: 'Je ne cherche plus' },
  { value: 'searching_alone', label: 'Je continue mes recherches seul' },
];

export function CancellationReasonForm({ onSubmit, onCancel, withRefund, loading, daysSinceSignature }: Props) {
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [details, setDetails] = useState('');

  const isFoundAlone = reason === 'found_alone';
  const willHaveRefund = withRefund && !isFoundAlone;

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold mb-3 block">
          Pourquoi souhaitez-vous annuler votre mandat ? *
        </Label>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as CancellationReason)}>
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-start gap-2 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition">
              <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
              <Label htmlFor={r.value} className="flex-1 cursor-pointer font-normal">
                <span className="block">{r.label}</span>
                {r.warning && reason === r.value && (
                  <span className="block text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {r.warning}
                  </span>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="details" className="text-sm font-medium mb-2 block">
          Précisions (optionnel)
        </Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Vos remarques nous aident à améliorer notre service…"
          rows={3}
        />
      </div>

      {withRefund && (
        <div className={`p-3 rounded-lg border text-sm ${
          willHaveRefund
            ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
            : 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400'
        }`}>
          {willHaveRefund ? (
            <>✅ Vous serez <strong>remboursé(e)</strong>. Le traitement aura lieu sous 30 jours après le 90ème jour de votre mandat.</>
          ) : isFoundAlone ? (
            <>⚠️ Vous ne serez <strong>pas remboursé(e)</strong> (vous avez trouvé par vous-même).</>
          ) : (
            <>Sélectionnez une raison.</>
          )}
        </div>
      )}

      {!withRefund && (
        <div className="p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
          ℹ️ Le remboursement n'est disponible qu'à partir du 82ème jour de votre mandat (jour actuel : {daysSinceSignature}).
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          Retour
        </Button>
        <Button
          type="button"
          variant={withRefund && willHaveRefund ? 'default' : 'destructive'}
          onClick={() => reason && onSubmit(reason, details || undefined)}
          disabled={!reason || loading}
          className="flex-1"
        >
          {loading ? 'Traitement…' : 'Confirmer l\'annulation'}
        </Button>
      </div>
    </div>
  );
}
