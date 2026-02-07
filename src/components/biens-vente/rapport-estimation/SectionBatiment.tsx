import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import type { LogementDetail } from './types';

interface SectionBatimentProps {
  data: {
    categorie_ofs: string;
    classification_ofs: string;
    numero_officiel_batiment: string;
    emprise_sol_m2: number | string;
    surface_logement_totale: number | string;
  };
  logements: LogementDetail[];
  onChange: (field: string, value: any) => void;
  onLogementsChange: (logements: LogementDetail[]) => void;
}

export function SectionBatiment({ data, logements, onChange, onLogementsChange }: SectionBatimentProps) {
  const addLogement = () => {
    onLogementsChange([
      ...logements,
      {
        id: crypto.randomUUID(),
        etage: '',
        type: '',
        surface: 0,
        pieces: 0,
        sdb: 0,
        annee_construction: '',
      },
    ]);
  };

  const updateLogement = (index: number, field: keyof LogementDetail, value: any) => {
    const updated = [...logements];
    updated[index] = { ...updated[index], [field]: value };
    onLogementsChange(updated);
  };

  const removeLogement = (index: number) => {
    onLogementsChange(logements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Catégorie OFS</Label>
          <Input
            value={data.categorie_ofs || ''}
            onChange={(e) => onChange('categorie_ofs', e.target.value)}
            placeholder="Bâtiment exclusivement à deux logements"
          />
        </div>
        <div className="space-y-2">
          <Label>Classification OFS</Label>
          <Input
            value={data.classification_ofs || ''}
            onChange={(e) => onChange('classification_ofs', e.target.value)}
            placeholder="Maisons usage d'habitation"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Numéro officiel bâtiment</Label>
          <Input
            value={data.numero_officiel_batiment || ''}
            onChange={(e) => onChange('numero_officiel_batiment', e.target.value)}
            placeholder="1096"
          />
        </div>
        <div className="space-y-2">
          <Label>Emprise au sol (m²)</Label>
          <Input
            type="number"
            value={data.emprise_sol_m2 || ''}
            onChange={(e) => onChange('emprise_sol_m2', e.target.value)}
            placeholder="174"
          />
        </div>
        <div className="space-y-2">
          <Label>Surface logement totale (m²)</Label>
          <Input
            type="number"
            value={data.surface_logement_totale || ''}
            onChange={(e) => onChange('surface_logement_totale', e.target.value)}
            placeholder="236"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Liste des logements</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLogement}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
        {logements.map((logement, index) => (
          <div key={logement.id} className="grid grid-cols-6 gap-2 items-end p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Étage</Label>
              <Input
                value={logement.etage}
                onChange={(e) => updateLogement(index, 'etage', e.target.value)}
                placeholder="RDC"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Input
                value={logement.type}
                onChange={(e) => updateLogement(index, 'type', e.target.value)}
                placeholder="5 Pièces"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Surface (m²)</Label>
              <Input
                type="number"
                value={logement.surface || ''}
                onChange={(e) => updateLogement(index, 'surface', Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pièces</Label>
              <Input
                type="number"
                value={logement.pieces || ''}
                onChange={(e) => updateLogement(index, 'pieces', Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SDB</Label>
              <Input
                type="number"
                value={logement.sdb || ''}
                onChange={(e) => updateLogement(index, 'sdb', Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeLogement(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
