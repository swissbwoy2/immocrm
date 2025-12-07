import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarEvent } from './types';

interface Agent {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface Client {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => void;
  agents: Agent[];
  clients: Client[];
  initialDate?: Date;
  isLoading?: boolean;
  editingEvent?: CalendarEvent | null;
  mode?: 'create' | 'edit';
}

export interface EventFormData {
  event_type: string;
  title: string;
  description: string;
  event_date: Date;
  event_time: string;
  end_date?: Date;
  end_time?: string;
  agent_id?: string;
  client_id?: string;
  priority: string;
  all_day: boolean;
  reminder_date?: Date;
}

const getDefaultFormData = (initialDate?: Date): EventFormData => ({
  event_type: 'rappel',
  title: '',
  description: '',
  event_date: initialDate || new Date(),
  event_time: '09:00',
  priority: 'normale',
  all_day: false,
});

export function EventForm({
  open,
  onClose,
  onSubmit,
  agents,
  clients,
  initialDate,
  isLoading,
  editingEvent,
  mode = 'create',
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>(getDefaultFormData(initialDate));

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && editingEvent) {
      const eventDate = new Date(editingEvent.event_date);
      setFormData({
        event_type: editingEvent.event_type || 'rappel',
        title: editingEvent.title || '',
        description: editingEvent.description || '',
        event_date: eventDate,
        event_time: format(eventDate, 'HH:mm'),
        priority: editingEvent.priority || 'normale',
        all_day: editingEvent.all_day || false,
        client_id: editingEvent.client_id || undefined,
        agent_id: editingEvent.agent_id || undefined,
      });
    } else if (mode === 'create') {
      setFormData(getDefaultFormData(initialDate));
    }
  }, [mode, editingEvent, initialDate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const resetForm = () => {
    setFormData(getDefaultFormData(initialDate));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isEditing = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type d'événement *</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rappel">Rappel</SelectItem>
                <SelectItem value="rendez_vous">Rendez-vous</SelectItem>
                <SelectItem value="tache">Tâche</SelectItem>
                <SelectItem value="reunion">Réunion</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Titre *</Label>
            <Input
              className="mt-1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titre de l'événement"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optionnel)"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full mt-1 justify-start text-left font-normal',
                      !formData.event_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.event_date ? format(formData.event_date, 'dd/MM/yyyy') : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.event_date}
                    onSelect={(date) => date && setFormData({ ...formData, event_date: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {!formData.all_day && (
              <div className="w-28">
                <Label>Heure</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
            />
            <Label>Journée entière</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Agent concerné</Label>
              <Select
                value={formData.agent_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, agent_id: value === 'none' ? undefined : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.profiles?.prenom} {agent.profiles?.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Client concerné</Label>
              <Select
                value={formData.client_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === 'none' ? undefined : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.profiles?.prenom} {client.profiles?.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Priorité</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basse">Basse</SelectItem>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title}>
              {isLoading ? (isEditing ? 'Enregistrement...' : 'Création...') : (isEditing ? 'Enregistrer' : 'Créer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
