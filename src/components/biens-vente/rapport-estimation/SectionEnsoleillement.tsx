import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EnsoleillementData } from './types';

interface SectionEnsoleillementProps {
  data: EnsoleillementData;
  onChange: (data: EnsoleillementData) => void;
}

function PeriodForm({ label, icon, period, onChange }: {
  label: string;
  icon: string;
  period: { lever: string; duree: string; coucher: string };
  onChange: (p: { lever: string; duree: string; coucher: string }) => void;
}) {
  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <Label className="text-sm font-semibold">{icon} {label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Lever du soleil</Label>
          <Input
            value={period.lever || ''}
            onChange={(e) => onChange({ ...period, lever: e.target.value })}
            placeholder="07h21"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Durée du jour</Label>
          <Input
            value={period.duree || ''}
            onChange={(e) => onChange({ ...period, duree: e.target.value })}
            placeholder="12h"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Coucher du soleil</Label>
          <Input
            value={period.coucher || ''}
            onChange={(e) => onChange({ ...period, coucher: e.target.value })}
            placeholder="19h33"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export function SectionEnsoleillement({ data, onChange }: SectionEnsoleillementProps) {
  return (
    <div className="space-y-4">
      <PeriodForm
        label="Aujourd'hui"
        icon="☀️"
        period={data.aujourd_hui}
        onChange={(p) => onChange({ ...data, aujourd_hui: p })}
      />
      <PeriodForm
        label="Équinoxe d'hiver (21 décembre)"
        icon="❄️"
        period={data.hiver}
        onChange={(p) => onChange({ ...data, hiver: p })}
      />
      <PeriodForm
        label="Équinoxe d'été (21 juin)"
        icon="🌞"
        period={data.ete}
        onChange={(p) => onChange({ ...data, ete: p })}
      />
    </div>
  );
}
