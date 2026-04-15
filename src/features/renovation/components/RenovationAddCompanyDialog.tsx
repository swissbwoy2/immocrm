import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useRenovationCompanies } from '../hooks/useRenovationCompanies';

interface Props {
  projectId: string;
  onClose: () => void;
}

const ROLES = [
  { value: 'contractor', label: 'Entrepreneur' },
  { value: 'architect', label: 'Architecte' },
  { value: 'engineer', label: 'Ingénieur' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'subcontractor', label: 'Sous-traitant' },
  { value: 'supplier', label: 'Fournisseur' },
];

export function RenovationAddCompanyDialog({ projectId, onClose }: Props) {
  const { allCompanies, addCompany } = useRenovationCompanies(projectId);
  const [companyId, setCompanyId] = useState('');
  const [role, setRole] = useState('contractor');
  const [lotName, setLotName] = useState('');

  const handleSubmit = async () => {
    await addCompany.mutateAsync({ companyId, role, lotName: lotName || undefined });
    onClose();
  };

  const companiesList = allCompanies.data || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une entreprise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Entreprise *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {companiesList.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.city ? ` — ${c.city}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lot / Spécialité</Label>
            <Input value={lotName} onChange={e => setLotName(e.target.value)} placeholder="Ex: Lot peinture" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!companyId || addCompany.isPending}>
            {addCompany.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
