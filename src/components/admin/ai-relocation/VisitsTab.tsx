import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { VisitDetailDrawer } from './VisitDetailDrawer';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CalendarCheck, CheckCircle, XCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type VisitStatus = Database['public']['Enums']['visit_request_status'];

interface Props {
  agentId: string;
}

export function VisitsTab({ agentId }: Props) {
  const queryClient = useQueryClient();
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  const { data: visits, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-visits', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*, clients:client_id(id, user_id, profiles:user_id(prenom, nom, email)), property_results:property_result_id(title, address)')
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VisitStatus }) => {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-visits'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  const getClientName = (v: any) => {
    const p = v.clients?.profiles;
    if (!p) return '—';
    return [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || '—';
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
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
      <h3 className="font-semibold">Demandes de visite ({visits?.length ?? 0})</h3>

      {!visits?.length ? (
        <div className="flex flex-col items-center py-12">
          <CalendarCheck className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune demande de visite</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Date confirmée</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((v: any) => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedVisit(v)}>
                  <TableCell className="font-medium">{getClientName(v)}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {v.property_results?.title || v.property_results?.address || '—'}
                  </TableCell>
                  <TableCell><StatusBadge type="visit" value={v.status} /></TableCell>
                  <TableCell className="text-xs">{v.approval_required ? 'Oui' : 'Non'}</TableCell>
                  <TableCell className="text-xs">
                    {v.confirmed_date ? format(new Date(v.confirmed_date), 'dd/MM HH:mm', { locale: fr }) : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {v.status === 'en_attente_validation' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: v.id, status: 'demande_prete' })}>
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: v.id, status: 'visite_refusee' })}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {v.status === 'visite_confirmee' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: v.id, status: 'visite_annulee' })}>
                        Annuler
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VisitDetailDrawer
        visit={selectedVisit}
        open={!!selectedVisit}
        onOpenChange={(open) => { if (!open) setSelectedVisit(null); }}
      />
    </div>
  );
}
