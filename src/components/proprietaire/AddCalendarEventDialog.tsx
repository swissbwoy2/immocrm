import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';

interface AddCalendarEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date | null;
}

const EVENT_TYPES = [
  { value: 'rappel', label: 'Rappel' },
  { value: 'tache', label: 'Tâche' },
  { value: 'rendez_vous', label: 'Rendez-vous' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'visite', label: 'Visite' },
  { value: 'autre', label: 'Autre' },
];

const PRIORITIES = [
  { value: 'basse', label: 'Basse', color: 'text-emerald-600' },
  { value: 'normale', label: 'Normale', color: 'text-blue-600' },
  { value: 'haute', label: 'Haute', color: 'text-amber-600' },
  { value: 'urgente', label: 'Urgente', color: 'text-destructive' },
];

export function AddCalendarEventDialog({ open, onClose, onSuccess, initialDate }: AddCalendarEventDialogProps) {
  const { user } = useAuth();
  const { syncEvent } = useGoogleCalendarSync();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [eventType, setEventType] = useState('rappel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'));
  const [eventTime, setEventTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(true);
  const [priority, setPriority] = useState('normale');

  useEffect(() => {
    if (initialDate) {
      setEventDate(format(initialDate, 'yyyy-MM-dd'));
    }
  }, [initialDate]);

  useEffect(() => {
    if (open) {
      // Reset form when opening
      setEventType('rappel');
      setTitle('');
      setDescription('');
      setEventDate(format(initialDate || new Date(), 'yyyy-MM-dd'));
      setEventTime('09:00');
      setEndTime('10:00');
      setAllDay(true);
      setPriority('normale');
    }
  }, [open, initialDate]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      // Validate end time is after start time
      if (!allDay && endTime && endTime <= eventTime) {
        toast.error("L'heure de fin doit être après l'heure de début");
        setLoading(false);
        return;
      }

      // Combine date and time if not all day
      let fullEventDate = eventDate;
      let fullEndDate = null;
      if (!allDay && eventTime) {
        fullEventDate = `${eventDate}T${eventTime}:00`;
        if (endTime) {
          fullEndDate = `${eventDate}T${endTime}:00`;
        }
      }

      const { error } = await supabase.from('calendar_events').insert({
        created_by: user.id,
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || null,
        event_date: fullEventDate,
        end_date: fullEndDate,
        all_day: allDay,
        priority,
        status: 'planifie',
      });

      if (error) throw error;

      // Sync to Google Calendar (non-blocking, silent fail)
      syncEvent(user.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        start: fullEventDate,
        end: fullEndDate || undefined,
        allDay,
      });

      toast.success('Événement créé avec succès');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Nouvel événement
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Type d'événement */}
          <div className="grid gap-2">
            <Label htmlFor="eventType">Type d'événement</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titre */}
          <div className="grid gap-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="Titre de l'événement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description de l'événement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Date et heure */}
          <div className="grid gap-2">
            <Label htmlFor="eventDate">Date *</Label>
            <Input
              type="date"
              id="eventDate"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eventTime">Début</Label>
                <Input
                  type="time"
                  id="eventTime"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Fin</Label>
                <Input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Journée entière */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label htmlFor="allDay" className="cursor-pointer">
              Journée entière
            </Label>
            <Switch
              id="allDay"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
          </div>

          {/* Priorité */}
          <div className="grid gap-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className={p.color}>{p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer l\'événement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
