import { MandatFormData, ETATS_CIVILS } from '../types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LandingSelect } from '@/components/forms-premium/LandingSelect';
import { LandingRadioGroup } from '@/components/forms-premium/LandingRadioGroup';
import { User, Briefcase } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatAchatStepPersonal({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-primary">
        <User className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Situation personnelle &amp; professionnelle</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LandingSelect
          label="État civil"
          value={data.etat_civil}
          onValueChange={(v) => onChange({ etat_civil: v })}
          options={ETATS_CIVILS.map((e) => ({ value: e, label: e }))}
        />
        <LandingInput
          label="Nombre d'enfants à charge"
          type="number"
          value={data.achat_nombre_enfants || ''}
          onChange={(e) => onChange({ achat_nombre_enfants: Number(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LandingInput
          label="Profession"
          icon={Briefcase}
          value={data.profession}
          onChange={(e) => onChange({ profession: e.target.value })}
          placeholder="ex. Ingénieur"
        />
        <LandingInput
          label="Employeur"
          value={data.employeur}
          onChange={(e) => onChange({ employeur: e.target.value })}
          placeholder="ex. SA XYZ"
        />
      </div>

      <LandingRadioGroup
        label="Avez-vous des poursuites en cours ?"
        value={data.poursuites ? 'oui' : 'non'}
        onChange={(v) => onChange({ poursuites: v === 'oui' })}
        options={[
          { value: 'non', label: 'Non' },
          { value: 'oui', label: 'Oui' },
        ]}
      />

      <LandingRadioGroup
        label="Êtes-vous sous curatelle ?"
        value={data.curatelle ? 'oui' : 'non'}
        onChange={(v) => onChange({ curatelle: v === 'oui' })}
        options={[
          { value: 'non', label: 'Non' },
          { value: 'oui', label: 'Oui' },
        ]}
      />
    </div>
  );
}
