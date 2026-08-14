import { MandatFormData, TYPES_BIEN, DECOUVERTES_AGENCE } from '../types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LandingSelect } from '@/components/forms-premium/LandingSelect';
import { LandingTextarea } from '@/components/forms-premium/LandingTextarea';
import { LandingRadioGroup } from '@/components/forms-premium/LandingRadioGroup';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { Building2, Calendar, MapPin, Target } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatAchatStepProject({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-primary">
        <Building2 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Votre projet d'achat</h2>
      </div>

      <LandingSelect
        label="Comment avez-vous découvert notre agence ?"
        value={data.decouverte_agence}
        onValueChange={(v) => onChange({ decouverte_agence: v })}
        options={DECOUVERTES_AGENCE.map((d) => ({ value: d, label: d }))}
        required
      />

      <LandingSelect
        label="Type de bien recherché"
        value={data.type_bien}
        onValueChange={(v) => onChange({ type_bien: v })}
        options={TYPES_BIEN.filter((t) => t !== 'Sous-location' && t !== 'Colocation').map((t) => ({ value: t, label: t }))}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LandingInput
          label="Budget cible (CHF)"
          type="number"
          icon={<Target className="h-4 w-4" />}
          value={data.budget_max || ''}
          onChange={(e) => onChange({ budget_max: Number(e.target.value) || 0 })}
          placeholder="ex. 750 000"
          required
        />
        <LandingInput
          label="Nombre de pièces minimum"
          type="text"
          value={data.pieces_recherche}
          onChange={(e) => onChange({ pieces_recherche: e.target.value })}
          placeholder="ex. 3.5"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          Villes / zones recherchées <span className="text-destructive ml-0.5">*</span>
        </label>
        <GooglePlacesAutocomplete
          value={data.region_recherche}
          onChange={(v) => onChange({ region_recherche: v })}
          placeholder="Ex: Lausanne, Morges, Nyon, Genève, Pully..."
          types={['locality', 'sublocality', 'administrative_area_level_1', 'administrative_area_level_2', 'postal_code']}
          restrictToSwitzerland={true}
          multiSelect
        />
        <p className="text-xs text-muted-foreground">
          Vous pouvez sélectionner <strong>plusieurs</strong> communes, villes, quartiers, régions ou districts suisses.
        </p>
      </div>


      <LandingInput
        label="Surface minimum (m²)"
        type="number"
        value={data.surface_souhaitee || ''}
        onChange={(e) => onChange({ surface_souhaitee: Number(e.target.value) || 0 })}
        placeholder="ex. 90"
      />

      <LandingRadioGroup
        label="Usage du bien"
        value={data.achat_usage || ''}
        onChange={(v) => onChange({ achat_usage: v as any })}
        options={[
          { value: 'residence_principale', label: 'Résidence principale' },
          { value: 'residence_secondaire', label: 'Résidence secondaire' },
          { value: 'investissement', label: 'Investissement locatif' },
        ]}
      />

      <LandingRadioGroup
        label="Horizon de réalisation"
        value={String(data.achat_horizon_mois || 6)}
        onChange={(v) => onChange({ achat_horizon_mois: Number(v) })}
        options={[
          { value: '3', label: '0-3 mois' },
          { value: '6', label: '3-6 mois' },
          { value: '12', label: '6-12 mois' },
        ]}
      />

      <LandingTextarea
        label="Souhaits particuliers (optionnel)"
        value={data.souhaits_particuliers}
        onChange={(e) => onChange({ souhaits_particuliers: e.target.value })}
        placeholder="Vue, jardin, garage, contraintes spécifiques..."
        rows={3}
      />

      <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md p-3 flex items-start gap-2">
        <Calendar className="h-4 w-4 text-primary mt-0.5" />
        <span>Acompte d'activation du parcours : <strong>CHF 2&apos;499.–</strong>. Aucune progression ne démarre tant que l'admin n'a pas activé votre dossier.</span>
      </div>
    </div>
  );
}
