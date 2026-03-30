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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Critères de recherche</h2>
        <p className="text-sm text-muted-foreground mt-1">Décrivez le bien que vous recherchez.</p>
      </div>

      {/* Type de recherche - visual toggle */}
      <div className="space-y-2">
        <Label>Type de recherche *</Label>
        <div className="grid grid-cols-2 gap-2">
          {['Louer', 'Acheter'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ type_recherche: type })}
              className={`min-h-[48px] rounded-xl border-2 text-sm font-medium transition-all ${
                data.type_recherche === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50'
              }`}
            >
              {type === 'Louer' ? '🏠 Location' : '🔑 Achat'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <Label>Type de bien</Label>
          <Select value={data.type_bien} onValueChange={(v) => onChange({ type_bien: v })}>
            <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {TYPES_BIEN.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Nombre de pièces minimum</Label>
          <Select value={data.pieces_min} onValueChange={(v) => onChange({ pieces_min: v })}>
            <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {PIECES_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Zone / Région</Label>
        <Input
          list="regions-list"
          value={data.zone_recherche}
          onChange={(e) => onChange({ zone_recherche: e.target.value })}
          placeholder="Tapez ou sélectionnez une région"
          className="min-h-[44px]"
        />
        <datalist id="regions-list">
          {REGIONS.map((r) => <option key={r} value={r} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="budget">Budget maximum (CHF)</Label>
          <Input id="budget" type="number" value={data.budget_max || ''} onChange={(e) => onChange({ budget_max: Number(e.target.value) })} placeholder="Ex: 2500" className="min-h-[44px]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_entree">Date d'entrée souhaitée</Label>
          <Input id="date_entree" type="date" value={data.date_entree_souhaitee} onChange={(e) => onChange({ date_entree_souhaitee: e.target.value })} className="min-h-[44px]" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="criteres_obligatoires">Critères obligatoires</Label>
        <Textarea id="criteres_obligatoires" value={data.criteres_obligatoires} onChange={(e) => onChange({ criteres_obligatoires: e.target.value })} placeholder="Ex: parking, balcon, animaux acceptés..." rows={3} className="min-h-[80px]" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="criteres_souhaites">Critères souhaités (non obligatoires)</Label>
        <Textarea id="criteres_souhaites" value={data.criteres_souhaites} onChange={(e) => onChange({ criteres_souhaites: e.target.value })} placeholder="Ex: proche transports, vue dégagée..." rows={3} className="min-h-[80px]" />
      </div>
    </div>
  );
}
