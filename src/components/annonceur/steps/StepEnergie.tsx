import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Flame, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepEnergieProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

const classesEnergetiques = [
  { value: 'A', color: 'bg-green-600' },
  { value: 'B', color: 'bg-green-500' },
  { value: 'C', color: 'bg-lime-500' },
  { value: 'D', color: 'bg-yellow-500' },
  { value: 'E', color: 'bg-orange-500' },
  { value: 'F', color: 'bg-red-500' },
  { value: 'G', color: 'bg-red-700' },
];

const typesChauffage = [
  { value: 'central', label: 'Chauffage central' },
  { value: 'individuel', label: 'Chauffage individuel' },
  { value: 'sol', label: 'Chauffage au sol' },
  { value: 'poele', label: 'Poêle' },
  { value: 'cheminee', label: 'Cheminée' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'pompe_chaleur', label: 'Pompe à chaleur' },
];

const sourcesEnergie = [
  { value: 'gaz', label: 'Gaz naturel' },
  { value: 'mazout', label: 'Mazout' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'bois', label: 'Bois / Pellets' },
  { value: 'solaire', label: 'Solaire' },
  { value: 'geothermie', label: 'Géothermie' },
  { value: 'district', label: 'Chauffage à distance' },
];

export function StepEnergie({ formData, updateFormData }: StepEnergieProps) {
  return (
    <div className="space-y-6">
      {/* Classe énergétique */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="h-5 w-5" />
          <span>Classe énergétique (CECB)</span>
        </div>
        
        <div className="flex gap-2">
          {classesEnergetiques.map((classe) => (
            <button
              key={classe.value}
              type="button"
              onClick={() => updateFormData({ classe_energetique: classe.value })}
              className={cn(
                "flex-1 py-3 rounded-lg font-bold text-white transition-all",
                classe.color,
                formData.classe_energetique === classe.value
                  ? "ring-2 ring-offset-2 ring-primary scale-105"
                  : "opacity-70 hover:opacity-100"
              )}
            >
              {classe.value}
            </button>
          ))}
        </div>
      </div>

      {/* Indices */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="indice_energetique">Indice énergétique (kWh/m²/an)</Label>
          <Input
            id="indice_energetique"
            type="number"
            placeholder="150"
            value={formData.indice_energetique || ''}
            onChange={(e) => updateFormData({ indice_energetique: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emissions_co2">Émissions CO₂ (kg/m²/an)</Label>
          <Input
            id="emissions_co2"
            type="number"
            placeholder="25"
            value={formData.emissions_co2 || ''}
            onChange={(e) => updateFormData({ emissions_co2: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* Chauffage */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame className="h-5 w-5" />
          <span>Chauffage</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type de chauffage</Label>
            <Select
              value={formData.type_chauffage}
              onValueChange={(value) => updateFormData({ type_chauffage: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {typesChauffage.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source d'énergie</Label>
            <Select
              value={formData.source_energie}
              onValueChange={(value) => updateFormData({ source_energie: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {sourcesEnergie.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
        <div className="flex items-start gap-3">
          <Leaf className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              Certificat énergétique
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Le certificat énergétique cantonal des bâtiments (CECB) n'est pas obligatoire 
              mais fortement recommandé pour informer les futurs locataires ou acheteurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
