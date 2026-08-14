import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { computeProgression, ACHAT_STEPS } from '@/lib/purchaseFinancing';

interface AchatProgressionBarProps {
  dateDebut: string | null;
  dureeJours?: number;
  stepsDone?: number;
}

export function AchatProgressionBar({ dateDebut, dureeJours = 180, stepsDone = 0 }: AchatProgressionBarProps) {
  const { pourcentage, tempsRestantLabel, jourRestant } = computeProgression(dateDebut, dureeJours);

  const countdownColor =
    jourRestant > 60
      ? 'bg-primary/10 text-primary border-primary/20'
      : jourRestant > 21
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  return (
    <Card className="p-6 border-primary/20">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Progression de votre accompagnement achat
        </h2>
        <Badge variant="outline" className={`border ${countdownColor}`}>
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Temps restant : {tempsRestantLabel}
        </Badge>
      </div>
      <Progress value={pourcentage} className="h-2 mb-3" />
      <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>Mandat actif — durée contractuelle de 6 mois</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-foreground">{stepsDone}/{ACHAT_STEPS.length} étapes complétées</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Votre projet d'achat avance étape par étape avec Immo-Rama. Le mandat d'accompagnement à l'achat est conclu pour une durée de 6 mois à compter de son activation par Immo-Rama.ch.
      </p>
    </Card>
  );
}
