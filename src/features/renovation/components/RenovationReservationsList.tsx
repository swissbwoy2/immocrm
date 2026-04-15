import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RenovationReservationForm } from './RenovationReservationForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Plus, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  canManage: boolean;
}

export function RenovationReservationsList({ projectId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const queryKey = ['renovation-reservations', projectId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renovation_reservations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (payload: {
      title?: string;
      description?: string;
      severity?: string;
      is_blocking?: boolean;
      location?: string;
    }) => {
      const { error } = await supabase
        .from('renovation_reservations')
        .insert([{ ...payload, project_id: projectId, status: 'open', description: payload.description || '' } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Réserve créée');
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const items = data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5" /> Réserves ({items.length})
        </CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aucune réserve</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Les réserves de réception apparaîtront ici.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Gravité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Bloquante</TableHead>
                <TableHead>Échéance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title || r.description?.substring(0, 60) || 'Sans titre'}</TableCell>
                  <TableCell>
                    <Badge variant={r.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {r.severity || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.is_blocking ? '🔴 Oui' : 'Non'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.deadline ? new Date(r.deadline).toLocaleDateString('fr-CH') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {showForm && (
        <RenovationReservationForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(v) => create.mutate(v)}
          isLoading={create.isPending}
        />
      )}
    </Card>
  );
}
