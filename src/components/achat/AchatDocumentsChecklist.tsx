import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AchatRequiredDoc {
  type: string;
  label: string;
  count: number;
  hint?: string;
}

/** Liste documentaire spécifique au parcours ACHAT (plus fournie que la location) */
export const ACHAT_REQUIRED_DOCUMENTS: AchatRequiredDoc[] = [
  { type: 'piece_identite', label: "Pièce d'identité", count: 1 },
  { type: 'fiche_salaire', label: 'Fiches de salaire (3 dernières)', count: 3 },
  { type: 'avis_taxation', label: 'Avis de taxation (3 dernières années)', count: 3 },
  { type: 'attestation_fonds_propres', label: 'Attestation de fonds propres', count: 1 },
  { type: 'attestation_pilier', label: 'Attestation 2e / 3e pilier', count: 1 },
  { type: 'decompte_credits', label: 'Décompte crédits / leasing', count: 1, hint: 'Ou attestation « aucun crédit »' },
  { type: 'extrait_poursuites', label: 'Extrait des poursuites', count: 1 },
];

interface Props {
  documents: Array<{ type_document?: string | null }>;
  onUpload?: () => void;
  className?: string;
  compact?: boolean;
}

export function AchatDocumentsChecklist({ documents, onUpload, className, compact }: Props) {
  const rows = ACHAT_REQUIRED_DOCUMENTS.map((req) => {
    const have = documents.filter((d) => d.type_document === req.type).length;
    return { ...req, have, complete: have >= req.count };
  });
  const done = rows.filter((r) => r.complete).length;
  const pct = Math.round((done / rows.length) * 100);

  return (
    <Card className={cn('relative overflow-hidden border-border/60 bg-card/80 backdrop-blur-xl p-5', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Dossier acheteur</h3>
              <p className="text-xs text-muted-foreground">Documents requis pour le financement</p>
            </div>
          </div>
          <Badge variant={done === rows.length ? 'default' : 'outline'}>
            {done}/{rows.length}
          </Badge>
        </div>

        <Progress value={pct} className="h-2 mb-4" />

        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.type}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors',
                r.complete ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-muted/20',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {r.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  {!compact && r.hint && <p className="text-[11px] text-muted-foreground">{r.hint}</p>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {r.have}/{r.count}
              </span>
            </div>
          ))}
        </div>

        {done < rows.length && (
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {rows.length - done} document{rows.length - done > 1 ? 's' : ''} manquant
              {rows.length - done > 1 ? 's' : ''} pour finaliser votre dossier
            </p>
            {onUpload && (
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80" onClick={onUpload}>
                Compléter
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
