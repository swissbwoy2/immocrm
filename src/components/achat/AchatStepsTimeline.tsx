import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { ACHAT_STEPS, AchatStep } from '@/lib/purchaseFinancing';
import { cn } from '@/lib/utils';

interface AchatStepsTimelineProps {
  steps: Array<{ step_key: string; statut: string; date_fait?: string | null }>;
}

const GROUP_LABEL: Record<AchatStep['group'], string> = {
  activation: 'Activation',
  financement: 'Financement',
  recherche: 'Recherche',
  visite: 'Visites',
  offre: 'Offre & négociation',
  notaire: 'Notaire & remise des clés',
};

export function AchatStepsTimeline({ steps }: AchatStepsTimelineProps) {
  const statutByKey = new Map(steps.map((s) => [s.step_key, s.statut]));

  const groups: Record<string, AchatStep[]> = {};
  ACHAT_STEPS.forEach((s) => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });

  return (
    <Card className="p-6 border-primary/20">
      <h2 className="text-lg font-semibold mb-4">Les 17 étapes de votre parcours d'achat</h2>
      <div className="space-y-5">
        {Object.entries(groups).map(([group, stepsInGroup]) => (
          <div key={group}>
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
              {GROUP_LABEL[group as AchatStep['group']]}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stepsInGroup.map((s) => {
                const statut = statutByKey.get(s.key) || 'a_faire';
                const done = statut === 'fait';
                const enCours = statut === 'en_cours';
                return (
                  <div
                    key={s.key}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border transition',
                      done ? 'bg-emerald-50/40 border-emerald-100'
                        : enCours ? 'bg-primary/5/40 border-primary/20'
                        : 'bg-muted/30 border-border',
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      : enCours ? <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <span
                      className={cn(
                        'text-sm',
                        done ? 'text-emerald-900 font-medium'
                          : enCours ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      <span className="text-xs opacity-70 mr-1">{s.ordre}.</span>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
