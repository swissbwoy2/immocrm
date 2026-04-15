import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    description?: string;
    severity: string;
    is_blocking?: boolean;
    cost_impact?: number;
    delay_impact_days?: number;
  }) => void;
  isLoading: boolean;
}

export function RenovationIncidentForm({ open, onClose, onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [isBlocking, setIsBlocking] = useState(false);
  const [costImpact, setCostImpact] = useState('');
  const [delayDays, setDelayDays] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      severity,
      is_blocking: isBlocking,
      cost_impact: costImpact ? Number(costImpact) : undefined,
      delay_impact_days: delayDays ? Number(delayDays) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler un incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Description courte" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Gravité</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isBlocking} onCheckedChange={setIsBlocking} />
            <Label>Bloquant</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Impact coût (CHF)</Label>
              <Input type="number" value={costImpact} onChange={(e) => setCostImpact(e.target.value)} />
            </div>
            <div>
              <Label>Impact délai (jours)</Label>
              <Input type="number" value={delayDays} onChange={(e) => setDelayDays(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {isLoading ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
