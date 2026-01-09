import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Home, Building2, Warehouse, TreePine, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepTypeBienProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

const transactionTypes = [
  { value: 'location', label: 'Location', description: 'Mettre en location' },
  { value: 'vente', label: 'Vente', description: 'Mettre en vente' },
];

const propertyTypes = [
  { value: 'appartement', label: 'Appartement', icon: Building2 },
  { value: 'maison', label: 'Maison', icon: Home },
  { value: 'studio', label: 'Studio', icon: Building2 },
  { value: 'loft', label: 'Loft', icon: Warehouse },
  { value: 'villa', label: 'Villa', icon: Home },
  { value: 'chalet', label: 'Chalet', icon: TreePine },
  { value: 'terrain', label: 'Terrain', icon: TreePine },
  { value: 'commerce', label: 'Commerce', icon: Warehouse },
  { value: 'bureau', label: 'Bureau', icon: Building2 },
  { value: 'parking', label: 'Parking', icon: Car },
];

export function StepTypeBien({ formData, updateFormData }: StepTypeBienProps) {
  return (
    <div className="space-y-8">
      {/* Transaction Type */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Type de transaction</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          {transactionTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateFormData({ type_transaction: type.value as 'location' | 'vente' })}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all",
                formData.type_transaction === type.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <p className="font-medium">{type.label}</p>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Type de bien</Label>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
          {propertyTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ sous_type: type.value })}
                className={cn(
                  "p-4 rounded-lg border-2 text-center transition-all flex flex-col items-center gap-2",
                  formData.sous_type === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className={cn(
                  "h-6 w-6",
                  formData.sous_type === type.value ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
