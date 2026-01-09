import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sun, 
  Trees, 
  Car, 
  Waves, 
  Accessibility,
  Wifi,
  WashingMachine,
  Refrigerator,
  AirVent,
  Lock
} from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepEquipementsProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

const parkingTypes = [
  { value: 'interieur', label: 'Intérieur' },
  { value: 'exterieur', label: 'Extérieur' },
  { value: 'souterrain', label: 'Souterrain' },
  { value: 'box', label: 'Box fermé' },
];

const equipementsList = [
  { key: 'cuisine_equipee', label: 'Cuisine équipée', icon: Refrigerator },
  { key: 'lave_vaisselle', label: 'Lave-vaisselle', icon: WashingMachine },
  { key: 'lave_linge', label: 'Lave-linge', icon: WashingMachine },
  { key: 'seche_linge', label: 'Sèche-linge', icon: WashingMachine },
  { key: 'climatisation', label: 'Climatisation', icon: AirVent },
  { key: 'internet', label: 'Internet inclus', icon: Wifi },
  { key: 'interphone', label: 'Interphone', icon: Lock },
  { key: 'digicode', label: 'Digicode', icon: Lock },
  { key: 'ascenseur', label: 'Ascenseur', icon: Accessibility },
  { key: 'cave', label: 'Cave', icon: Lock },
  { key: 'grenier', label: 'Grenier', icon: Lock },
  { key: 'buanderie', label: 'Buanderie commune', icon: WashingMachine },
];

export function StepEquipements({ formData, updateFormData }: StepEquipementsProps) {
  const toggleEquipement = (key: string, checked: boolean) => {
    updateFormData({
      equipements: {
        ...formData.equipements,
        [key]: checked,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Extérieur */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Espaces extérieurs</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="balcon">Balcon</Label>
            </div>
            <Switch
              id="balcon"
              checked={formData.balcon}
              onCheckedChange={(checked) => updateFormData({ balcon: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="terrasse">Terrasse</Label>
            </div>
            <Switch
              id="terrasse"
              checked={formData.terrasse}
              onCheckedChange={(checked) => updateFormData({ terrasse: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Trees className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="jardin">Jardin</Label>
            </div>
            <Switch
              id="jardin"
              checked={formData.jardin}
              onCheckedChange={(checked) => updateFormData({ jardin: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Waves className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="piscine">Piscine</Label>
            </div>
            <Switch
              id="piscine"
              checked={formData.piscine}
              onCheckedChange={(checked) => updateFormData({ piscine: checked })}
            />
          </div>
        </div>
      </div>

      {/* Parking */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base font-semibold">Parking</Label>
          </div>
          <Switch
            checked={formData.parking_inclus}
            onCheckedChange={(checked) => updateFormData({ parking_inclus: checked })}
          />
        </div>
        
        {formData.parking_inclus && (
          <div className="grid gap-4 sm:grid-cols-2 pl-8">
            <div className="space-y-2">
              <Label htmlFor="nb_places_parking">Nombre de places</Label>
              <Input
                id="nb_places_parking"
                type="number"
                placeholder="1"
                value={formData.nb_places_parking || ''}
                onChange={(e) => updateFormData({ nb_places_parking: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de parking</Label>
              <Select
                value={formData.type_parking}
                onValueChange={(value) => updateFormData({ type_parking: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {parkingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Accessibilité */}
      <div className="flex items-center justify-between p-3 rounded-lg border">
        <div className="flex items-center gap-3">
          <Accessibility className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label htmlFor="acces_pmr">Accès PMR</Label>
            <p className="text-xs text-muted-foreground">Personnes à mobilité réduite</p>
          </div>
        </div>
        <Switch
          id="acces_pmr"
          checked={formData.acces_pmr}
          onCheckedChange={(checked) => updateFormData({ acces_pmr: checked })}
        />
      </div>

      {/* Équipements intérieurs */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Équipements intérieurs</Label>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {equipementsList.map((equip) => {
            const Icon = equip.icon;
            return (
              <div key={equip.key} className="flex items-center gap-3 p-3 rounded-lg border">
                <Checkbox
                  id={equip.key}
                  checked={formData.equipements[equip.key] || false}
                  onCheckedChange={(checked) => toggleEquipement(equip.key, checked as boolean)}
                />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor={equip.key} className="cursor-pointer">
                  {equip.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
