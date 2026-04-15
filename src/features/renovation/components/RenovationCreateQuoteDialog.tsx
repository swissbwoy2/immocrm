import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useRenovationQuotes } from '../hooks/useRenovationQuotes';
import { useRenovationCompanies } from '../hooks/useRenovationCompanies';

interface Props {
  projectId: string;
  onClose: () => void;
}

export function RenovationCreateQuoteDialog({ projectId, onClose }: Props) {
  const { createQuote } = useRenovationQuotes(projectId);
  const { companies } = useRenovationCompanies(projectId);
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [reference, setReference] = useState('');

  const handleSubmit = async () => {
    await createQuote.mutateAsync({
      projectId,
      companyId,
      title,
      reference: reference || undefined,
    });
    onClose();
  };

  const projectCompanies = companies.data || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un devis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Devis peinture" />
          </div>
          <div>
            <Label>Entreprise *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {projectCompanies.map((pc: any) => (
                  <SelectItem key={pc.company_id} value={pc.company_id}>
                    {pc.renovation_companies?.name || pc.company_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Référence</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Numéro de devis" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || !companyId || createQuote.isPending}
          >
            {createQuote.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
