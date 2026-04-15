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
    title?: string;
    description?: string;
    severity?: string;
    is_blocking?: boolean;
    location?: string;
  }) => void;
  isLoading: boolean;
}

export function RenovationReservationForm({ open, onClose, onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [isBlocking, setIsBlocking] = useState(false);
  const [location, setLocation] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une réserve</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intitulé de la réserve" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Localisation</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ex: Cuisine, Salle de bain..." />
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
            <Label>Bloquante</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => onSubmit({
              title: title.trim() || undefined,
              description: description.trim() || undefined,
              severity,
              is_blocking: isBlocking,
              location: location.trim() || undefined,
            })}
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
