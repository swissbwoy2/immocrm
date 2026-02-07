import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SectionBruitProps {
  data: {
    bruit_routier_jour: number | string;
    bruit_routier_nuit: number | string;
    bruit_ferroviaire_jour: number | string;
    bruit_ferroviaire_nuit: number | string;
  };
  onChange: (field: string, value: any) => void;
}

export function SectionBruit({ data, onChange }: SectionBruitProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label className="text-sm font-semibold">🚗 Trafic routier</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Jour (dB)</Label>
              <Input
                type="number"
                value={data.bruit_routier_jour || ''}
                onChange={(e) => onChange('bruit_routier_jour', e.target.value)}
                placeholder="49"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nuit (dB)</Label>
              <Input
                type="number"
                value={data.bruit_routier_nuit || ''}
                onChange={(e) => onChange('bruit_routier_nuit', e.target.value)}
                placeholder="43"
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Label className="text-sm font-semibold">🚂 Ferroviaire</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Jour (dB)</Label>
              <Input
                type="number"
                value={data.bruit_ferroviaire_jour || ''}
                onChange={(e) => onChange('bruit_ferroviaire_jour', e.target.value)}
                placeholder="32"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nuit (dB)</Label>
              <Input
                type="number"
                value={data.bruit_ferroviaire_nuit || ''}
                onChange={(e) => onChange('bruit_ferroviaire_nuit', e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
