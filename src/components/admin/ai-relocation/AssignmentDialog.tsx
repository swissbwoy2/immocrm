import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  assignment?: any;
}

export function AssignmentDialog({ open, onOpenChange, agentId, assignment }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!assignment;

  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [approvalOffers, setApprovalOffers] = useState(true);
  const [approvalVisits, setApprovalVisits] = useState(true);
  const [autoSend, setAutoSend] = useState(false);
  const [autoVisit, setAutoVisit] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (assignment) {
      setClientId(assignment.client_id || '');
      setPriority(assignment.priority || 'normal');
      setUrgencyLevel(assignment.urgency_level || 'normal');
      setApprovalOffers(assignment.approval_required_for_offers ?? true);
      setApprovalVisits(assignment.approval_required_for_visits ?? true);
      setAutoSend(assignment.auto_send_enabled ?? false);
      setAutoVisit(assignment.auto_visit_booking_enabled ?? false);
      setNotes(assignment.notes || '');
    } else {
      setClientId('');
      setPriority('normal');
      setUrgencyLevel('normal');
      setApprovalOffers(true);
      setApprovalVisits(true);
      setAutoSend(false);
      setAutoVisit(false);
      setNotes('');
    }
  }, [assignment, open]);

  const { data: clients } = useQuery({
    queryKey: ['clients-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, user_id, profiles:user_id(prenom, nom, email)')
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ai_agent_id: agentId,
        client_id: clientId,
        priority,
        urgency_level: urgencyLevel,
        approval_required_for_offers: approvalOffers,
        approval_required_for_visits: approvalVisits,
        auto_send_enabled: autoSend,
        auto_visit_booking_enabled: autoVisit,
        notes: notes || null,
        status: 'active',
      };

      if (isEdit) {
        const { error } = await supabase
          .from('ai_agent_assignments')
          .update(payload)
          .eq('id', assignment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_agent_assignments')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-assignments'] });
      toast.success(isEdit ? 'Assignation mise à jour' : 'Client assigné');
      onOpenChange(false);
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const getClientLabel = (c: any) => {
    const p = c.profiles;
    if (!p) return c.id;
    return [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || c.id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'assignation' : 'Assigner un client'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && (
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{getClientLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgence</Label>
              <Select value={urgencyLevel} onValueChange={setUrgencyLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Validation requise pour offres</Label>
              <Switch checked={approvalOffers} onCheckedChange={setApprovalOffers} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Validation requise pour visites</Label>
              <Switch checked={approvalVisits} onCheckedChange={setApprovalVisits} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Envoi automatique</Label>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Réservation visite auto</Label>
              <Switch checked={autoVisit} onCheckedChange={setAutoVisit} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || (!isEdit && !clientId)}>
            {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Assigner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
