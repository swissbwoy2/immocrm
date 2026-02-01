import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { MandatFormData, AFFECTATIONS_COMMERCIALES, ETAGES_COMMERCIAUX, BESOINS_COMMERCIAUX } from './types';
import { Ruler, Building2, Layers, ListChecks } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function CommercialSearchFields({ data, onChange }: Props) {
  const handleBesoinChange = (value: string, checked: boolean) => {
    const currentBesoins = data.besoins_commerciaux || [];
    if (checked) {
      onChange({ besoins_commerciaux: [...currentBesoins, value] });
    } else {
      onChange({ besoins_commerciaux: currentBesoins.filter((b) => b !== value) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Surface souhaitée */}
        <div className="space-y-2">
          <Label htmlFor="surface_souhaitee" className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary/70" />
            Surface souhaitée (m²) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="surface_souhaitee"
              type="number"
              value={data.surface_souhaitee || ''}
              onChange={(e) => onChange({ surface_souhaitee: Number(e.target.value) })}
              placeholder="Ex: 100"
              required
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              m²
            </span>
          </div>
        </div>

        {/* Affectation commerciale */}
        <div className="space-y-2">
          <Label htmlFor="affectation_commerciale" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary/70" />
            Type d'affectation <span className="text-destructive">*</span>
          </Label>
          <Select value={data.affectation_commerciale} onValueChange={(value) => onChange({ affectation_commerciale: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {AFFECTATIONS_COMMERCIALES.map((aff) => (
                <SelectItem key={aff} value={aff}>{aff}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Étage souhaité */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="etage_souhaite" className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary/70" />
            Étage souhaité <span className="text-destructive">*</span>
          </Label>
          <Select value={data.etage_souhaite} onValueChange={(value) => onChange({ etage_souhaite: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {ETAGES_COMMERCIAUX.map((etage) => (
                <SelectItem key={etage} value={etage}>{etage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Besoins spécifiques */}
      <Card className="p-4 bg-background/50">
        <Label className="flex items-center gap-2 mb-4">
          <ListChecks className="h-4 w-4 text-primary/70" />
          Besoins spécifiques
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BESOINS_COMMERCIAUX.map((besoin) => (
            <div key={besoin.value} className="flex items-center space-x-3">
              <Checkbox
                id={`besoin-${besoin.value}`}
                checked={(data.besoins_commerciaux || []).includes(besoin.value)}
                onCheckedChange={(checked) => handleBesoinChange(besoin.value, checked === true)}
              />
              <Label 
                htmlFor={`besoin-${besoin.value}`} 
                className="text-sm font-normal cursor-pointer"
              >
                {besoin.label}
              </Label>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
