import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientNote {
  id: string;
  client_id: string;
  agent_id: string;
  content: string;
  note_type: 'note' | 'rappel' | 'action';
  reminder_date: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientNotes = (clientId: string) => {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotes((data || []) as ClientNote[]);
    } catch (err: any) {
      console.error('Error loading notes:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadNotes();
    }
  }, [clientId]);

  const addNote = async (
    agentId: string,
    content: string,
    noteType: 'note' | 'rappel' | 'action' = 'note',
    reminderDate: string | null = null
  ) => {
    try {
      const { data, error: insertError } = await supabase
        .from('client_notes')
        .insert({
          client_id: clientId,
          agent_id: agentId,
          content,
          note_type: noteType,
          reminder_date: reminderDate,
          is_completed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setNotes((prev) => [data as ClientNote, ...prev]);
      toast.success('Note ajoutée');
      return data;
    } catch (err: any) {
      console.error('Error adding note:', err);
      toast.error('Erreur lors de l\'ajout de la note');
      throw err;
    }
  };

  const updateNote = async (
    noteId: string,
    updates: Partial<ClientNote>
  ) => {
    try {
      const { data, error: updateError } = await supabase
        .from('client_notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

      if (updateError) throw updateError;

      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? data as ClientNote : note))
      );
      toast.success('Note mise à jour');
      return data;
    } catch (err: any) {
      console.error('Error updating note:', err);
      toast.error('Erreur lors de la mise à jour');
      throw err;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) throw deleteError;

      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      toast.success('Note supprimée');
    } catch (err: any) {
      console.error('Error deleting note:', err);
      toast.error('Erreur lors de la suppression');
      throw err;
    }
  };

  const toggleComplete = async (noteId: string, isCompleted: boolean) => {
    return updateNote(noteId, { is_completed: isCompleted });
  };

  const getPendingReminders = () => {
    return notes.filter(
      (note) =>
        (note.note_type === 'rappel' || note.note_type === 'action') &&
        !note.is_completed
    );
  };

  return {
    notes,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote,
    toggleComplete,
    getPendingReminders,
    refresh: loadNotes,
  };
};
