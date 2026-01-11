import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { GoogleAddressAutocomplete, type AddressComponents } from '@/components/GoogleAddressAutocomplete';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepLocalisationProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

const cantons = [
  'Genève', 'Vaud', 'Valais', 'Neuchâtel', 'Fribourg', 'Jura',
  'Berne', 'Zurich', 'Bâle-Ville', 'Bâle-Campagne', 'Argovie',
  'Soleure', 'Lucerne', 'Zoug', 'Schwyz', 'Uri', 'Nidwald',
  'Obwald', 'Glaris', 'Schaffhouse', 'Thurgovie', 'Saint-Gall',
  'Appenzell Rhodes-Extérieures', 'Appenzell Rhodes-Intérieures',
  'Grisons', 'Tessin',
];

export function StepLocalisation({ formData, updateFormData }: StepLocalisationProps) {
  const handleAddressChange = (address: AddressComponents) => {
    updateFormData({
      adresse: address.fullAddress,
      code_postal: address.postalCode || formData.code_postal,
      ville: address.city || formData.ville,
      canton: address.canton || formData.canton,
      latitude: address.latitude,
      longitude: address.longitude,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <MapPin className="h-5 w-5" />
        <span>Localisation du bien</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adresse">Adresse *</Label>
        <GoogleAddressAutocomplete
          value={formData.adresse}
          onChange={handleAddressChange}
          onInputChange={(value) => updateFormData({ adresse: value })}
          placeholder="Rechercher une adresse..."
          restrictToSwitzerland={true}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adresse_complementaire">Complément d'adresse</Label>
        <Input
          id="adresse_complementaire"
          placeholder="Bâtiment, étage, etc."
          value={formData.adresse_complementaire}
          onChange={(e) => updateFormData({ adresse_complementaire: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code_postal">Code postal *</Label>
          <Input
            id="code_postal"
            placeholder="1000"
            value={formData.code_postal}
            onChange={(e) => updateFormData({ code_postal: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ville">Ville *</Label>
          <Input
            id="ville"
            placeholder="Lausanne"
            value={formData.ville}
            onChange={(e) => updateFormData({ ville: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Canton *</Label>
        <Select
          value={formData.canton}
          onValueChange={(value) => updateFormData({ canton: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un canton" />
          </SelectTrigger>
          <SelectContent>
            {cantons.map((canton) => (
              <SelectItem key={canton} value={canton}>
                {canton}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
        <div>
          <Label htmlFor="afficher_adresse">Afficher l'adresse exacte</Label>
          <p className="text-sm text-muted-foreground">
            Si désactivé, seule la ville sera visible
          </p>
        </div>
        <Switch
          id="afficher_adresse"
          checked={formData.afficher_adresse_exacte}
          onCheckedChange={(checked) => updateFormData({ afficher_adresse_exacte: checked })}
        />
      </div>
    </div>
  );
}
