import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    warranty_type?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    duration_months?: number;
    category?: string;
    equipment?: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    installation_date?: string;
    maintenance_frequency?: string;
  }) => void;
  isLoading: boolean;
}

export function RenovationWarrantyForm({ open, onClose, onSubmit, isLoading }: Props) {
  const [form, setForm] = useState({
    warranty_type: '',
    description: '',
    start_date: '',
    end_date: '',
    duration_months: '',
    category: '',
    equipment: '',
    brand: '',
    model: '',
    serial_number: '',
    installation_date: '',
    maintenance_frequency: '',
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une garantie</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Input value={form.warranty_type} onChange={(e) => set('warranty_type', e.target.value)} placeholder="Décennale, biennale..." />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Gros œuvre, CVC..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Équipement</Label>
              <Input value={form.equipment} onChange={(e) => set('equipment', e.target.value)} />
            </div>
            <div>
              <Label>Marque</Label>
              <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modèle</Label>
              <Input value={form.model} onChange={(e) => set('model', e.target.value)} />
            </div>
            <div>
              <Label>N° série</Label>
              <Input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date début</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
            <div>
              <Label>Durée (mois)</Label>
              <Input type="number" value={form.duration_months} onChange={(e) => set('duration_months', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date installation</Label>
              <Input type="date" value={form.installation_date} onChange={(e) => set('installation_date', e.target.value)} />
            </div>
            <div>
              <Label>Fréquence entretien</Label>
              <Input value={form.maintenance_frequency} onChange={(e) => set('maintenance_frequency', e.target.value)} placeholder="Annuel, semestriel..." />
            </div>
          </div>
          <div>
            <Label>Description / Notes</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => {
              const payload: Record<string, any> = {};
              for (const [k, v] of Object.entries(form)) {
                if (v.trim()) {
                  payload[k] = k === 'duration_months' ? Number(v) : v.trim();
                }
              }
              onSubmit(payload);
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
