import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from './statusBadges';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Shield, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ApprovalStatus = Database['public']['Enums']['approval_status'];

const PAGE_SIZE = 50;

export function ApprovalsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [decisionDialog, setDecisionDialog] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-approvals', page, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('approval_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as ApprovalStatus);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { approvals: data, total: count ?? 0 };
    },
    refetchOnWindowFocus: false,
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ApprovalStatus; notes: string }) => {
      const { error } = await supabase
        .from('approval_requests')
        .update({ status, decision_notes: notes || null, decided_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-approvals'] });
      toast.success('Décision enregistrée');
      setDecisionDialog(null);
      setDecisionNotes('');
    },
    onError: () => toast.error('Erreur'),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  if (isLoading && page === 0) {
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
      <div className="flex flex-wrap gap-3 items-center">
        <h3 className="font-semibold">Validations ({data?.total ?? 0})</h3>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!data?.approvals?.length ? (
        <div className="flex flex-col items-center py-12">
          <Shield className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune demande de validation</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.approvals.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs capitalize">{a.request_type}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{a.description || '—'}</TableCell>
                    <TableCell><StatusBadge type="approval" value={a.status} /></TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(a.created_at), 'dd/MM HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {a.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setDecisionDialog({ id: a.id, action: 'approved' })}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDecisionDialog({ id: a.id, action: 'rejected' })}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Decision dialog */}
      <Dialog open={!!decisionDialog} onOpenChange={(open) => { if (!open) { setDecisionDialog(null); setDecisionNotes(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{decisionDialog?.action === 'approved' ? 'Approuver' : 'Rejeter'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Notes de décision (optionnel)"
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecisionDialog(null); setDecisionNotes(''); }}>Annuler</Button>
            <Button
              onClick={() => decisionDialog && decideMutation.mutate({ id: decisionDialog.id, status: decisionDialog.action, notes: decisionNotes })}
              disabled={decideMutation.isPending}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
