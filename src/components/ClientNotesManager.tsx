import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Trash2, Check, AlertCircle, StickyNote, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useClientNotes, type ClientNote } from '@/hooks/useClientNotes';
import { cn } from '@/lib/utils';

interface ClientNotesManagerProps {
  clientId: string;
  agentId: string;
}

export const ClientNotesManager = ({ clientId, agentId }: ClientNotesManagerProps) => {
  const { notes, loading, addNote, deleteNote, toggleComplete } = useClientNotes(clientId);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'rappel' | 'action'>('note');
  const [reminderDate, setReminderDate] = useState<Date | undefined>();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await addNote(
        agentId,
        newNote,
        noteType,
        reminderDate ? reminderDate.toISOString() : null
      );
      setNewNote('');
      setNoteType('note');
      setReminderDate(undefined);
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'rappel':
        return <AlertCircle className="h-4 w-4" />;
      case 'action':
        return <Check className="h-4 w-4" />;
      default:
        return <StickyNote className="h-4 w-4" />;
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'rappel':
        return 'Rappel';
      case 'action':
        return 'Action';
      default:
        return 'Note';
    }
  };

  const getNoteTypeVariant = (type: string) => {
    switch (type) {
      case 'rappel':
        return 'default';
      case 'action':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div>Chargement des notes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold">Notes & Rappels</h3>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {isAdding && (
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Type de note</Label>
            <RadioGroup value={noteType} onValueChange={(value: any) => setNoteType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="note" id="note" />
                <Label htmlFor="note" className="font-normal">Note simple</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rappel" id="rappel" />
                <Label htmlFor="rappel" className="font-normal">Rappel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="action" id="action" />
                <Label htmlFor="action" className="font-normal">Action à faire</Label>
              </div>
            </RadioGroup>
          </div>

          {(noteType === 'rappel' || noteType === 'action') && (
            <div className="space-y-2">
              <Label>Date du rappel</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !reminderDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reminderDate ? format(reminderDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={setReminderDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Contenu</Label>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Écrivez votre note ici..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              Enregistrer
            </Button>
            <Button variant="outline" onClick={() => {
              setIsAdding(false);
              setNewNote('');
              setNoteType('note');
              setReminderDate(undefined);
            }}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune note pour le moment</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className={cn(
              'p-4',
              note.is_completed && 'opacity-60'
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getNoteTypeVariant(note.note_type) as any}>
                      {getNoteIcon(note.note_type)}
                      <span className="ml-1">{getNoteTypeLabel(note.note_type)}</span>
                    </Badge>
                    {note.reminder_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.reminder_date), 'PPP', { locale: fr })}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), 'PPp', { locale: fr })}
                    </span>
                  </div>
                  <p className={cn(
                    'text-sm whitespace-pre-wrap',
                    note.is_completed && 'line-through'
                  )}>
                    {note.content}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(note.note_type === 'rappel' || note.note_type === 'action') && (
                    <Checkbox
                      checked={note.is_completed}
                      onCheckedChange={(checked) => toggleComplete(note.id, !!checked)}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
