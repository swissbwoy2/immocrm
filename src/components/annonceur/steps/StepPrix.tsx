import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Banknote, Shield } from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepPrixProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

export function StepPrix({ formData, updateFormData }: StepPrixProps) {
  const isLocation = formData.type_transaction === 'location';

  return (
    <div className="space-y-6">
      {/* Prix principal */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Banknote className="h-5 w-5" />
          <span>{isLocation ? 'Loyer' : 'Prix de vente'}</span>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="prix">
            {isLocation ? 'Loyer mensuel (CHF) *' : 'Prix de vente (CHF) *'}
          </Label>
          <Input
            id="prix"
            type="number"
            placeholder={isLocation ? '1500' : '850000'}
            value={formData.prix || ''}
            onChange={(e) => updateFormData({ prix: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* Charges (location only) */}
      {isLocation && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="charges_mensuelles">Charges mensuelles (CHF)</Label>
              <Input
                id="charges_mensuelles"
                type="number"
                placeholder="200"
                value={formData.charges_mensuelles || ''}
                onChange={(e) => updateFormData({ charges_mensuelles: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="flex items-center gap-4 pt-8">
              <Switch
                id="charges_comprises"
                checked={formData.charges_comprises}
                onCheckedChange={(checked) => updateFormData({ charges_comprises: checked })}
              />
              <Label htmlFor="charges_comprises">Charges comprises dans le loyer</Label>
            </div>
          </div>
        </div>
      )}

      {/* Garantie (location only) */}
      {isLocation && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5" />
            <span>Garantie de loyer</span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nb_mois_garantie">Nombre de mois de garantie</Label>
              <Input
                id="nb_mois_garantie"
                type="number"
                placeholder="3"
                value={formData.nb_mois_garantie || ''}
                onChange={(e) => updateFormData({ nb_mois_garantie: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depot_garantie">Montant de la garantie (CHF)</Label>
              <Input
                id="depot_garantie"
                type="number"
                placeholder="4500"
                value={formData.depot_garantie || ''}
                onChange={(e) => updateFormData({ depot_garantie: e.target.value ? Number(e.target.value) : null })}
              />
              {formData.prix && formData.nb_mois_garantie && (
                <p className="text-xs text-muted-foreground">
                  Calculé : {(formData.prix * formData.nb_mois_garantie).toLocaleString('fr-CH')} CHF
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {formData.prix && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="font-medium mb-2">Récapitulatif</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{isLocation ? 'Loyer mensuel' : 'Prix de vente'}</span>
              <span className="font-medium">{formData.prix.toLocaleString('fr-CH')} CHF</span>
            </div>
            {isLocation && formData.charges_mensuelles && !formData.charges_comprises && (
              <div className="flex justify-between">
                <span>Charges</span>
                <span>{formData.charges_mensuelles.toLocaleString('fr-CH')} CHF</span>
              </div>
            )}
            {isLocation && formData.charges_mensuelles && !formData.charges_comprises && (
              <div className="flex justify-between pt-1 border-t">
                <span className="font-medium">Total mensuel</span>
                <span className="font-medium">
                  {(formData.prix + formData.charges_mensuelles).toLocaleString('fr-CH')} CHF
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
