import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MandatFormData, DECOUVERTES_AGENCE, TYPES_BIEN, PIECES_OPTIONS, REGIONS } from './types';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep4({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Critères de recherche</h2>
        <p className="text-sm text-muted-foreground">Informez notre équipe de vos critères</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Comment avez-vous découvert notre agence ? *</Label>
          <Select value={data.decouverte_agence} onValueChange={(value) => onChange({ decouverte_agence: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {DECOUVERTES_AGENCE.map((dec) => (
                <SelectItem key={dec} value={dec}>{dec}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Sélectionnez ce qui correspond *</Label>
          <RadioGroup
            value={data.type_recherche}
            onValueChange={(value) => onChange({ type_recherche: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Louer" id="type-louer" />
              <Label htmlFor="type-louer" className="font-normal">Louer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Acheter" id="type-acheter" />
              <Label htmlFor="type-acheter" className="font-normal">Acheter</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_occupants">Combien de personnes occuperaient l'appartement ? *</Label>
            <Input
              id="nombre_occupants"
              type="number"
              min="1"
              value={data.nombre_occupants || ''}
              onChange={(e) => onChange({ nombre_occupants: Number(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type_bien">Type d'objet *</Label>
            <Select value={data.type_bien} onValueChange={(value) => onChange({ type_bien: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                {TYPES_BIEN.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pieces_recherche">Nombre de pièces *</Label>
            <Select value={data.pieces_recherche} onValueChange={(value) => onChange({ pieces_recherche: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                {PIECES_OPTIONS.map((piece) => (
                  <SelectItem key={piece} value={piece}>{piece}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region_recherche">Région *</Label>
            <Select value={data.region_recherche} onValueChange={(value) => onChange({ region_recherche: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="budget_max">Budget maximum (CHF) *</Label>
            <Input
              id="budget_max"
              type="number"
              value={data.budget_max || ''}
              onChange={(e) => onChange({ budget_max: Number(e.target.value) })}
              placeholder="Le loyer brut ne devant pas dépasser le tiers du salaire"
              required
            />
            <p className="text-xs text-muted-foreground">
              Budget conseillé max: {data.revenus_mensuels ? Math.floor(data.revenus_mensuels / 3) : '---'} CHF (1/3 de vos revenus)
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="souhaits_particuliers">Souhaits particuliers (étage, quartier, vue...)</Label>
            <Textarea
              id="souhaits_particuliers"
              value={data.souhaits_particuliers}
              onChange={(e) => onChange({ souhaits_particuliers: e.target.value })}
              placeholder="Décrivez vos souhaits particuliers..."
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-3">
            <Label>Avez-vous des animaux ?</Label>
            <RadioGroup
              value={data.animaux ? 'oui' : 'non'}
              onValueChange={(value) => onChange({ animaux: value === 'oui' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="animaux-oui" />
                <Label htmlFor="animaux-oui" className="font-normal">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="animaux-non" />
                <Label htmlFor="animaux-non" className="font-normal">Non</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Jouez-vous d'un instrument de musique ? *</Label>
            <RadioGroup
              value={data.instrument_musique ? 'oui' : 'non'}
              onValueChange={(value) => onChange({ instrument_musique: value === 'oui' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="instrument-oui" />
                <Label htmlFor="instrument-oui" className="font-normal">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="instrument-non" />
                <Label htmlFor="instrument-non" className="font-normal">Non</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Avez-vous un ou plusieurs véhicules ? *</Label>
            <RadioGroup
              value={data.vehicules ? 'oui' : 'non'}
              onValueChange={(value) => onChange({ vehicules: value === 'oui' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="vehicules-oui" />
                <Label htmlFor="vehicules-oui" className="font-normal">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="vehicules-non" />
                <Label htmlFor="vehicules-non" className="font-normal">Non</Label>
              </div>
            </RadioGroup>
          </div>

          {data.vehicules && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
              <Label htmlFor="numero_plaques">Numéro(s) de plaque(s)</Label>
              <Input
                id="numero_plaques"
                value={data.numero_plaques}
                onChange={(e) => onChange({ numero_plaques: e.target.value })}
                placeholder="Ex: VD 123456"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
