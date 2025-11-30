import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MandatFormData, UTILISATIONS_LOGEMENT } from './types';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep3({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Situation financière et professionnelle</h2>
        <p className="text-sm text-muted-foreground">Vos revenus et informations professionnelles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="profession">Profession *</Label>
          <Input
            id="profession"
            value={data.profession}
            onChange={(e) => onChange({ profession: e.target.value })}
            placeholder="Votre profession"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeur">Employeur *</Label>
          <Input
            id="employeur"
            value={data.employeur}
            onChange={(e) => onChange({ employeur: e.target.value })}
            placeholder="Nom de l'entreprise"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revenus_mensuels">Revenu mensuel net (CHF) *</Label>
          <Input
            id="revenus_mensuels"
            type="number"
            value={data.revenus_mensuels || ''}
            onChange={(e) => onChange({ revenus_mensuels: Number(e.target.value) })}
            placeholder="Ex: 5000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_engagement">Date d'engagement au poste</Label>
          <Input
            id="date_engagement"
            type="date"
            value={data.date_engagement}
            onChange={(e) => onChange({ date_engagement: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utilisation_logement">Utilisation du logement à titre *</Label>
          <Select value={data.utilisation_logement} onValueChange={(value) => onChange({ utilisation_logement: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {UTILISATIONS_LOGEMENT.map((util) => (
                <SelectItem key={util} value={util}>{util}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-3">
          <Label>Avez-vous des charges extraordinaires ? (Leasing, crédit, pension alimentaire, etc.) *</Label>
          <RadioGroup
            value={data.charges_extraordinaires ? 'oui' : 'non'}
            onValueChange={(value) => onChange({ charges_extraordinaires: value === 'oui' })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id="charges-oui" />
              <Label htmlFor="charges-oui" className="font-normal">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id="charges-non" />
              <Label htmlFor="charges-non" className="font-normal">Non</Label>
            </div>
          </RadioGroup>
        </div>

        {data.charges_extraordinaires && (
          <div className="space-y-2 pl-4 border-l-2 border-primary/30">
            <Label htmlFor="montant_charges_extra">Montant des charges / échéance (CHF)</Label>
            <Input
              id="montant_charges_extra"
              type="number"
              value={data.montant_charges_extra || ''}
              onChange={(e) => onChange({ montant_charges_extra: Number(e.target.value) })}
              placeholder="Ex: 500"
            />
          </div>
        )}

        <div className="space-y-3">
          <Label>Avez-vous des poursuites ou actes de défaut de biens ? *</Label>
          <RadioGroup
            value={data.poursuites ? 'oui' : 'non'}
            onValueChange={(value) => onChange({ poursuites: value === 'oui' })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id="poursuites-oui" />
              <Label htmlFor="poursuites-oui" className="font-normal">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id="poursuites-non" />
              <Label htmlFor="poursuites-non" className="font-normal">Non</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Êtes-vous sous curatelle ? *</Label>
          <RadioGroup
            value={data.curatelle ? 'oui' : 'non'}
            onValueChange={(value) => onChange({ curatelle: value === 'oui' })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id="curatelle-oui" />
              <Label htmlFor="curatelle-oui" className="font-normal">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id="curatelle-non" />
              <Label htmlFor="curatelle-non" className="font-normal">Non</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
