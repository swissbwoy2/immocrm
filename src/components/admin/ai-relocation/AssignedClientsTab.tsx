import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { AssignmentDialog } from './AssignmentDialog';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Pause, Play, XCircle, Users } from 'lucide-react';

interface Props {
  agentId: string;
}

export function AssignedClientsTab({ agentId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const { data: assignments, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-assignments', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_assignments')
        .select('*, clients:client_id(id, user_id, profiles:user_id(prenom, nom, email))')
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('ai_agent_assignments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-assignments'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const getClientName = (assignment: any) => {
    const profile = assignment.clients?.profiles;
    if (!profile) return 'Client inconnu';
    return [profile.prenom, profile.nom].filter(Boolean).join(' ') || profile.email || 'Client inconnu';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
        <p className="text-muted-foreground mb-4">Erreur de chargement</p>
        <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Clients assignés ({assignments?.length ?? 0})</h3>
        <Button size="sm" onClick={() => { setEditingAssignment(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Assigner
        </Button>
      </div>

      {!assignments?.length ? (
        <div className="flex flex-col items-center py-12">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun client assigné</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Urgence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Auto-envoi</TableHead>
                <TableHead>Auto-visite</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{getClientName(a)}</TableCell>
                  <TableCell className="capitalize">{a.priority || '—'}</TableCell>
                  <TableCell className="capitalize">{a.urgency_level || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge type="mission" value={a.status === 'active' ? 'active' : a.status === 'paused' ? 'en_pause' : a.status} />
                  </TableCell>
                  <TableCell>{a.auto_send_enabled ? '✓' : '—'}</TableCell>
                  <TableCell>{a.auto_visit_booking_enabled ? '✓' : '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {a.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: a.id, status: 'paused' })}>
                        <Pause className="w-3 h-3" />
                      </Button>
                    )}
                    {a.status === 'paused' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: a.id, status: 'active' })}>
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    {a.status !== 'inactive' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: a.id, status: 'inactive' })}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agentId={agentId}
        assignment={editingAssignment}
      />
    </div>
  );
}
