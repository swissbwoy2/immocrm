import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, PawPrint, Cigarette, Clock } from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepConditionsProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

export function StepConditions({ formData, updateFormData }: StepConditionsProps) {
  return (
    <div className="space-y-6">
      {/* Disponibilité */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span>Disponibilité</span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div>
            <Label htmlFor="disponible_immediatement">Disponible immédiatement</Label>
            <p className="text-sm text-muted-foreground">
              Le bien peut être occupé dès maintenant
            </p>
          </div>
          <Switch
            id="disponible_immediatement"
            checked={formData.disponible_immediatement}
            onCheckedChange={(checked) => updateFormData({ 
              disponible_immediatement: checked,
              disponible_des: checked ? '' : formData.disponible_des 
            })}
          />
        </div>

        {!formData.disponible_immediatement && (
          <div className="space-y-2">
            <Label htmlFor="disponible_des">Date de disponibilité</Label>
            <Input
              id="disponible_des"
              type="date"
              value={formData.disponible_des}
              onChange={(e) => updateFormData({ disponible_des: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Durée bail (location only) */}
      {formData.type_transaction === 'location' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-5 w-5" />
            <span>Durée de bail</span>
          </div>
          <Label htmlFor="duree_bail_min">Durée minimum (mois)</Label>
          <Input
            id="duree_bail_min"
            type="number"
            placeholder="12"
            value={formData.duree_bail_min || ''}
            onChange={(e) => updateFormData({ duree_bail_min: e.target.value ? Number(e.target.value) : null })}
          />
          <p className="text-xs text-muted-foreground">
            Laissez vide si pas de durée minimum requise
          </p>
        </div>
      )}

      {/* Animaux */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <PawPrint className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label htmlFor="animaux_autorises">Animaux autorisés</Label>
            <p className="text-sm text-muted-foreground">
              Les locataires peuvent avoir des animaux de compagnie
            </p>
          </div>
        </div>
        <Switch
          id="animaux_autorises"
          checked={formData.animaux_autorises}
          onCheckedChange={(checked) => updateFormData({ animaux_autorises: checked })}
        />
      </div>

      {/* Fumeurs */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <Cigarette className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label htmlFor="fumeurs_acceptes">Fumeurs acceptés</Label>
            <p className="text-sm text-muted-foreground">
              Il est permis de fumer dans le logement
            </p>
          </div>
        </div>
        <Switch
          id="fumeurs_acceptes"
          checked={formData.fumeurs_acceptes}
          onCheckedChange={(checked) => updateFormData({ fumeurs_acceptes: checked })}
        />
      </div>
    </div>
  );
}
