import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ruler, Home, Calendar } from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepCaracteristiquesProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

const etats = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'recent', label: 'Récent / Excellent état' },
  { value: 'bon_etat', label: 'Bon état' },
  { value: 'a_rafraichir', label: 'À rafraîchir' },
  { value: 'a_renover', label: 'À rénover' },
];

export function StepCaracteristiques({ formData, updateFormData }: StepCaracteristiquesProps) {
  return (
    <div className="space-y-6">
      {/* Surfaces */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Ruler className="h-5 w-5" />
          <span>Surfaces</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="surface_habitable">Surface habitable (m²) *</Label>
            <Input
              id="surface_habitable"
              type="number"
              placeholder="85"
              value={formData.surface_habitable || ''}
              onChange={(e) => updateFormData({ surface_habitable: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surface_terrain">Surface terrain (m²)</Label>
            <Input
              id="surface_terrain"
              type="number"
              placeholder="500"
              value={formData.surface_terrain || ''}
              onChange={(e) => updateFormData({ surface_terrain: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
      </div>

      {/* Pièces */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Home className="h-5 w-5" />
          <span>Pièces</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_pieces">Nombre de pièces *</Label>
            <Input
              id="nombre_pieces"
              type="number"
              step="0.5"
              placeholder="3.5"
              value={formData.nombre_pieces || ''}
              onChange={(e) => updateFormData({ nombre_pieces: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nb_chambres">Chambres</Label>
            <Input
              id="nb_chambres"
              type="number"
              placeholder="2"
              value={formData.nb_chambres || ''}
              onChange={(e) => updateFormData({ nb_chambres: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nb_salles_bain">Salles de bain</Label>
            <Input
              id="nb_salles_bain"
              type="number"
              placeholder="1"
              value={formData.nb_salles_bain || ''}
              onChange={(e) => updateFormData({ nb_salles_bain: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nb_wc">WC</Label>
            <Input
              id="nb_wc"
              type="number"
              placeholder="1"
              value={formData.nb_wc || ''}
              onChange={(e) => updateFormData({ nb_wc: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
      </div>

      {/* Étages */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="etage">Étage</Label>
          <Input
            id="etage"
            type="number"
            placeholder="2"
            value={formData.etage || ''}
            onChange={(e) => updateFormData({ etage: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb_etages_immeuble">Nombre d'étages de l'immeuble</Label>
          <Input
            id="nb_etages_immeuble"
            type="number"
            placeholder="5"
            value={formData.nb_etages_immeuble || ''}
            onChange={(e) => updateFormData({ nb_etages_immeuble: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* Construction */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span>Construction</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="annee_construction">Année de construction</Label>
            <Input
              id="annee_construction"
              type="number"
              placeholder="1990"
              value={formData.annee_construction || ''}
              onChange={(e) => updateFormData({ annee_construction: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annee_renovation">Dernière rénovation</Label>
            <Input
              id="annee_renovation"
              type="number"
              placeholder="2020"
              value={formData.annee_renovation || ''}
              onChange={(e) => updateFormData({ annee_renovation: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label>État du bien</Label>
            <Select
              value={formData.etat_bien}
              onValueChange={(value) => updateFormData({ etat_bien: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {etats.map((etat) => (
                  <SelectItem key={etat.value} value={etat.value}>
                    {etat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
