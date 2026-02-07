import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SectionMarcheProps {
  data: {
    prix_median_secteur: number | string;
    evolution_prix_median_1an: number | string;
    nb_biens_comparables: number | string;
    nb_nouvelles_annonces: number | string;
  };
  onChange: (field: string, value: any) => void;
}

export function SectionMarche({ data, onChange }: SectionMarcheProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prix médian du secteur (CHF)</Label>
          <Input
            type="number"
            value={data.prix_median_secteur || ''}
            onChange={(e) => onChange('prix_median_secteur', e.target.value)}
            placeholder="1'646'364"
          />
        </div>
        <div className="space-y-2">
          <Label>Évolution prix médian 1 an (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.evolution_prix_median_1an || ''}
            onChange={(e) => onChange('evolution_prix_median_1an', e.target.value)}
            placeholder="11.15"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre de biens comparables</Label>
          <Input
            type="number"
            value={data.nb_biens_comparables || ''}
            onChange={(e) => onChange('nb_biens_comparables', e.target.value)}
            placeholder="83"
          />
        </div>
        <div className="space-y-2">
          <Label>Nouvelles annonces récentes</Label>
          <Input
            type="number"
            value={data.nb_nouvelles_annonces || ''}
            onChange={(e) => onChange('nb_nouvelles_annonces', e.target.value)}
            placeholder="16"
          />
        </div>
      </div>
    </div>
  );
}
