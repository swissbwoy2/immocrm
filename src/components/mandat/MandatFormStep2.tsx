import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MandatFormData } from './types';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep2({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Situation actuelle</h2>
        <p className="text-sm text-muted-foreground">Informations sur votre logement actuel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gerance_actuelle">Gérance ou propriétaire actuel(le) *</Label>
          <Input
            id="gerance_actuelle"
            value={data.gerance_actuelle}
            onChange={(e) => onChange({ gerance_actuelle: e.target.value })}
            placeholder="Nom de la gérance ou du propriétaire"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_gerance">Contact gérance *</Label>
          <Input
            id="contact_gerance"
            value={data.contact_gerance}
            onChange={(e) => onChange({ contact_gerance: e.target.value })}
            placeholder="Téléphone ou email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="loyer_actuel">Loyer brut actuel (CHF) *</Label>
          <Input
            id="loyer_actuel"
            type="number"
            value={data.loyer_actuel || ''}
            onChange={(e) => onChange({ loyer_actuel: Number(e.target.value) })}
            placeholder="Ex: 1500"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="depuis_le">Depuis le *</Label>
          <Input
            id="depuis_le"
            type="date"
            value={data.depuis_le}
            onChange={(e) => onChange({ depuis_le: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pieces_actuel">Nombre de pièces actuel *</Label>
          <Input
            id="pieces_actuel"
            type="number"
            step="0.5"
            min="1"
            value={data.pieces_actuel || ''}
            onChange={(e) => onChange({ pieces_actuel: Number(e.target.value) })}
            placeholder="Ex: 3.5"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="motif_changement">Motif du changement de domicile *</Label>
          <Input
            id="motif_changement"
            value={data.motif_changement}
            onChange={(e) => onChange({ motif_changement: e.target.value })}
            placeholder="Ex: Agrandissement de la famille, rapprochement travail..."
            required
          />
        </div>
      </div>
    </div>
  );
}
