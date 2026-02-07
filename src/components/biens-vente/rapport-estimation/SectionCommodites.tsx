import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type { CommoditesScores } from './types';

interface SectionCommoditesProps {
  scores: CommoditesScores;
  onScoresChange: (s: CommoditesScores) => void;
}

const SCORE_FIELDS: { key: keyof CommoditesScores; label: string; icon: string }[] = [
  { key: 'shopping', label: 'Shopping', icon: '🛍️' },
  { key: 'alimentation', label: 'Alimentation', icon: '🛒' },
  { key: 'culture_loisirs', label: 'Culture & Loisirs', icon: '🎭' },
  { key: 'restaurants_bars', label: 'Restaurants & Bars', icon: '🍽️' },
  { key: 'education', label: 'Éducation', icon: '🎓' },
  { key: 'bien_etre', label: 'Bien-être', icon: '💆' },
  { key: 'sante', label: 'Santé', icon: '🏥' },
  { key: 'transport', label: 'Transport', icon: '🚌' },
  { key: 'commodites_base', label: 'Commodités de base', icon: '🏛️' },
];

export function SectionCommodites({ scores, onScoresChange }: SectionCommoditesProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Scores de commodités sur 100 pour chaque catégorie</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCORE_FIELDS.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-lg">{icon}</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <span className="text-sm font-semibold text-primary">
                  {scores[key] ?? '-'}/100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={scores[key] ?? 0} className="h-2 flex-1" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={scores[key] ?? ''}
                  onChange={(e) => onScoresChange({ ...scores, [key]: e.target.value ? Number(e.target.value) : null })}
                  className="h-7 w-16 text-xs text-center"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
