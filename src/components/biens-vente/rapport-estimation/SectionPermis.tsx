import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import type { PermisConstruire } from './types';

interface SectionPermisProps {
  permis: PermisConstruire[];
  onPermisChange: (permis: PermisConstruire[]) => void;
}

export function SectionPermis({ permis, onPermisChange }: SectionPermisProps) {
  const addPermis = () => {
    onPermisChange([
      ...permis,
      {
        id: crypto.randomUUID(),
        reference: '',
        description: '',
        nature_travaux: '',
        architecte: '',
        date: '',
        statut: '',
      },
    ]);
  };

  const updatePermis = (index: number, field: keyof PermisConstruire, value: string) => {
    const updated = [...permis];
    updated[index] = { ...updated[index], [field]: value };
    onPermisChange(updated);
  };

  const removePermis = (index: number) => {
    onPermisChange(permis.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Historique des permis de construire déposés autour de cette adresse
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addPermis}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un permis
        </Button>
      </div>
      {permis.map((p, index) => (
        <div key={p.id} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Permis #{index + 1}</Label>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePermis(index)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Référence</Label>
              <Input
                value={p.reference}
                onChange={(e) => updatePermis(index, 'reference', e.target.value)}
                placeholder="P-137-53-1-2024-ME"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                value={p.date}
                onChange={(e) => updatePermis(index, 'date', e.target.value)}
                placeholder="01/07/2024"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <Input
                value={p.statut}
                onChange={(e) => updatePermis(index, 'statut', e.target.value)}
                placeholder="En traitement à la Camac"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nature des travaux</Label>
              <Input
                value={p.nature_travaux}
                onChange={(e) => updatePermis(index, 'nature_travaux', e.target.value)}
                placeholder="Construction nouvelle"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Architecte</Label>
              <Input
                value={p.architecte}
                onChange={(e) => updatePermis(index, 'architecte', e.target.value)}
                placeholder="NOM PRÉNOM BUREAU"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={p.description}
              onChange={(e) => updatePermis(index, 'description', e.target.value)}
              placeholder="Description du permis de construire..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      ))}
      {permis.length === 0 && (
        <p className="text-center text-muted-foreground py-4">Aucun permis de construire renseigné</p>
      )}
    </div>
  );
}
