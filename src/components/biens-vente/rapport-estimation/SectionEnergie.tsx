import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SystemeEnergie, PotentielSolaire } from './types';

interface SectionEnergieProps {
  data: {
    source_energie_chauffage: string;
    installation_solaire_actuelle: string;
  };
  systemeChauffagePrincipal: SystemeEnergie;
  systemeEauChaude: SystemeEnergie;
  systemeChauffageSupp: SystemeEnergie;
  systemeEauChaudeSupp: SystemeEnergie;
  potentielSolaire: PotentielSolaire;
  onChange: (field: string, value: any) => void;
  onSystemeChange: (key: string, systeme: SystemeEnergie) => void;
  onPotentielChange: (p: PotentielSolaire) => void;
}

function SystemeForm({ label, systeme, onChange }: { label: string; systeme: SystemeEnergie; onChange: (s: SystemeEnergie) => void }) {
  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Générateur</Label>
          <Input
            value={systeme.generateur || ''}
            onChange={(e) => onChange({ ...systeme, generateur: e.target.value })}
            placeholder="Pompe à chaleur PAC"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Source d'énergie</Label>
          <Input
            value={systeme.source || ''}
            onChange={(e) => onChange({ ...systeme, source: e.target.value })}
            placeholder="Selon permis de construire"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date d'information</Label>
          <Input
            value={systeme.date_info || ''}
            onChange={(e) => onChange({ ...systeme, date_info: e.target.value })}
            placeholder="22/10/2014"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export function SectionEnergie({
  data, systemeChauffagePrincipal, systemeEauChaude, systemeChauffageSupp, systemeEauChaudeSupp,
  potentielSolaire, onChange, onSystemeChange, onPotentielChange
}: SectionEnergieProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source d'énergie chauffage</Label>
          <Input
            value={data.source_energie_chauffage || ''}
            onChange={(e) => onChange('source_energie_chauffage', e.target.value)}
            placeholder="Indéterminé"
          />
        </div>
        <div className="space-y-2">
          <Label>Installation solaire actuelle</Label>
          <Input
            value={data.installation_solaire_actuelle || ''}
            onChange={(e) => onChange('installation_solaire_actuelle', e.target.value)}
            placeholder="-"
          />
        </div>
      </div>

      <SystemeForm
        label="Système de chauffage principal"
        systeme={systemeChauffagePrincipal}
        onChange={(s) => onSystemeChange('systeme_chauffage_principal', s)}
      />
      <SystemeForm
        label="Système eau chaude principal"
        systeme={systemeEauChaude}
        onChange={(s) => onSystemeChange('systeme_eau_chaude', s)}
      />
      <SystemeForm
        label="Système de chauffage supplémentaire"
        systeme={systemeChauffageSupp}
        onChange={(s) => onSystemeChange('systeme_chauffage_supplementaire', s)}
      />
      <SystemeForm
        label="Système eau chaude supplémentaire"
        systeme={systemeEauChaudeSupp}
        onChange={(s) => onSystemeChange('systeme_eau_chaude_supplementaire', s)}
      />

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Potentiel solaire toiture</Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Aptitude solaire</Label>
            <Input
              value={potentielSolaire.aptitude || ''}
              onChange={(e) => onPotentielChange({ ...potentielSolaire, aptitude: e.target.value })}
              placeholder="Très bon"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Exposition (kWh/m²)</Label>
            <Input
              type="number"
              value={potentielSolaire.exposition_kwh_m2 || ''}
              onChange={(e) => onPotentielChange({ ...potentielSolaire, exposition_kwh_m2: Number(e.target.value) || null })}
              placeholder="1217"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Surface toits (m²)</Label>
            <Input
              type="number"
              value={potentielSolaire.surface_toits_m2 || ''}
              onChange={(e) => onPotentielChange({ ...potentielSolaire, surface_toits_m2: Number(e.target.value) || null })}
              placeholder="216"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Exposition globale (kWh)</Label>
            <Input
              type="number"
              value={potentielSolaire.exposition_globale_kwh || ''}
              onChange={(e) => onPotentielChange({ ...potentielSolaire, exposition_globale_kwh: Number(e.target.value) || null })}
              placeholder="262923"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Rendement électrique (kWh)</Label>
            <Input
              type="number"
              value={potentielSolaire.rendement_electrique_kwh || ''}
              onChange={(e) => onPotentielChange({ ...potentielSolaire, rendement_electrique_kwh: Number(e.target.value) || null })}
              placeholder="42067"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Rendement thermique (kWh)</Label>
            <Input
              type="number"
              value={potentielSolaire.rendement_thermique_kwh || ''}
              onChange={(e) => onPotentielChange({ ...potentielSolaire, rendement_thermique_kwh: Number(e.target.value) || null })}
              placeholder="31550"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
