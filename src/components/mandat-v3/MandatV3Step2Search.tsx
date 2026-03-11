import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MandatV3FormData } from './types';
import { TYPES_BIEN, PIECES_OPTIONS, REGIONS } from '@/components/mandat/types';

interface Props {
  data: MandatV3FormData;
  onChange: (data: Partial<MandatV3FormData>) => void;
}

export default function MandatV3Step2Search({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Critères de recherche</h2>
        <p className="text-sm text-muted-foreground mt-1">Décrivez le bien que vous recherchez.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de recherche *</Label>
          <Select value={data.type_recherche} onValueChange={(v) => onChange({ type_recherche: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Louer">Location</SelectItem>
              <SelectItem value="Acheter">Achat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type de bien</Label>
          <Select value={data.type_bien} onValueChange={(v) => onChange({ type_bien: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {TYPES_BIEN.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Zone / Région</Label>
          <Input
            list="regions-list"
            value={data.zone_recherche}
            onChange={(e) => onChange({ zone_recherche: e.target.value })}
            placeholder="Tapez ou sélectionnez une région (ex: Vaud)"
          />
          <datalist id="regions-list">
            {REGIONS.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label>Nombre de pièces minimum</Label>
          <Select value={data.pieces_min} onValueChange={(v) => onChange({ pieces_min: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {PIECES_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Budget maximum (CHF)</Label>
          <Input id="budget" type="number" value={data.budget_max || ''} onChange={(e) => onChange({ budget_max: Number(e.target.value) })} placeholder="Ex: 2500" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_entree">Date d'entrée souhaitée</Label>
          <Input id="date_entree" type="date" value={data.date_entree_souhaitee} onChange={(e) => onChange({ date_entree_souhaitee: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="criteres_obligatoires">Critères obligatoires</Label>
        <Textarea id="criteres_obligatoires" value={data.criteres_obligatoires} onChange={(e) => onChange({ criteres_obligatoires: e.target.value })} placeholder="Ex: parking, balcon, animaux acceptés..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criteres_souhaites">Critères souhaités (non obligatoires)</Label>
        <Textarea id="criteres_souhaites" value={data.criteres_souhaites} onChange={(e) => onChange({ criteres_souhaites: e.target.value })} placeholder="Ex: proche transports, vue dégagée..." rows={3} />
      </div>
    </div>
  );
}
