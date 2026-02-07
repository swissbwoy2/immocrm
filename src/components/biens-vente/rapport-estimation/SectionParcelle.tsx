import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import type { RestrictionsParcelle } from './types';

interface SectionParcelleProps {
  data: {
    surface_parcelle: number | string;
    egrid: string;
    type_parcelle: string;
    plan_affectation_type: string;
    plan_affectation_nom: string;
  };
  restrictions: RestrictionsParcelle;
  onChange: (field: string, value: any) => void;
  onRestrictionsChange: (r: RestrictionsParcelle) => void;
}

export function SectionParcelle({ data, restrictions, onChange, onRestrictionsChange }: SectionParcelleProps) {
  const [newRestriction, setNewRestriction] = useState('');
  const [newNonRestriction, setNewNonRestriction] = useState('');

  const addRestriction = (type: 'affectant' | 'non_affectant', value: string) => {
    if (!value.trim()) return;
    onRestrictionsChange({
      ...restrictions,
      [type]: [...(restrictions[type] || []), value.trim()],
    });
    if (type === 'affectant') setNewRestriction('');
    else setNewNonRestriction('');
  };

  const removeRestriction = (type: 'affectant' | 'non_affectant', index: number) => {
    onRestrictionsChange({
      ...restrictions,
      [type]: restrictions[type].filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Surface parcelle (m²)</Label>
          <Input
            type="number"
            value={data.surface_parcelle || ''}
            onChange={(e) => onChange('surface_parcelle', e.target.value)}
            placeholder="1278"
          />
        </div>
        <div className="space-y-2">
          <Label>EGRID</Label>
          <Input
            value={data.egrid || ''}
            onChange={(e) => onChange('egrid', e.target.value)}
            placeholder="CH674575208309"
          />
        </div>
        <div className="space-y-2">
          <Label>Type de parcelle</Label>
          <Input
            value={data.type_parcelle || ''}
            onChange={(e) => onChange('type_parcelle', e.target.value)}
            placeholder="Parcelle privée"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Plan d'affectation (type)</Label>
          <Input
            value={data.plan_affectation_type || ''}
            onChange={(e) => onChange('plan_affectation_type', e.target.value)}
            placeholder="PQ adopté le 04/07/1947"
          />
        </div>
        <div className="space-y-2">
          <Label>Plan d'affectation (nom)</Label>
          <Input
            value={data.plan_affectation_nom || ''}
            onChange={(e) => onChange('plan_affectation_nom', e.target.value)}
            placeholder="Schéma directeur aménagements publics"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Restrictions affectant la parcelle</Label>
          <div className="flex gap-2">
            <Input
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              placeholder="Ajouter..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRestriction('affectant', newRestriction))}
            />
            <Button type="button" size="icon" variant="outline" onClick={() => addRestriction('affectant', newRestriction)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(restrictions.affectant || []).map((r, i) => (
              <Badge key={i} variant="secondary">
                {r}
                <button onClick={() => removeRestriction('affectant', i)} className="ml-1"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {(!restrictions.affectant || restrictions.affectant.length === 0) && (
              <span className="text-xs text-muted-foreground">Pas de restrictions</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Restrictions n'affectant PAS la parcelle</Label>
          <div className="flex gap-2">
            <Input
              value={newNonRestriction}
              onChange={(e) => setNewNonRestriction(e.target.value)}
              placeholder="Ajouter..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRestriction('non_affectant', newNonRestriction))}
            />
            <Button type="button" size="icon" variant="outline" onClick={() => addRestriction('non_affectant', newNonRestriction)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(restrictions.non_affectant || []).map((r, i) => (
              <Badge key={i} variant="outline">
                {r}
                <button onClick={() => removeRestriction('non_affectant', i)} className="ml-1"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
