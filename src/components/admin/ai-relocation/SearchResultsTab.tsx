import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from './statusBadges';
import { ResultDetailDrawer } from './ResultDetailDrawer';
import { toast } from 'sonner';
import { AlertTriangle, FileText, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ResultStatus = Database['public']['Enums']['property_result_status'];

interface Props {
  agentId: string;
}

const PAGE_SIZE = 50;

const RESULT_STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'retenu', label: 'Retenu' },
  { value: 'rejete', label: 'Rejeté' },
  { value: 'envoye_au_client', label: 'Envoyé' },
  { value: 'candidature_preparee', label: 'Candidature' },
  { value: 'visite_proposee', label: 'Visite proposée' },
  { value: 'visite_demandee', label: 'Visite demandée' },
  { value: 'visite_confirmee', label: 'Visite confirmée' },
  { value: 'archive', label: 'Archivé' },
];

export function SearchResultsTab({ agentId }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-results', agentId, page, statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('property_results')
        .select('*, clients:client_id(id, user_id, profiles:user_id(prenom, nom, email))', { count: 'exact' })
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('result_status', statusFilter as ResultStatus);
      }
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`title.ilike.${term},address.ilike.${term},city.ilike.${term}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { results: data, total: count ?? 0 };
    },
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ResultStatus }) => {
      const { error } = await supabase
        .from('property_results')
        .update({ result_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-results'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  const getClientName = (r: any) => {
    const p = r.clients?.profiles;
    if (!p) return '—';
    return [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || '—';
  };

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  if (isLoading && page === 0) {
    return <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
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
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher titre, adresse, ville..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESULT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} résultats</span>
      </div>

      {!data?.results?.length ? (
        <div className="flex flex-col items-center py-12">
          <FileText className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun résultat trouvé</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Loyer</TableHead>
                  <TableHead>Pièces</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedResult(r)}>
                    <TableCell className="font-medium max-w-[200px] truncate">{r.title || '—'}</TableCell>
                    <TableCell className="text-xs">{getClientName(r)}</TableCell>
                    <TableCell className="text-xs">{r.source_name || '—'}</TableCell>
                    <TableCell className="text-xs">{r.city || '—'}</TableCell>
                    <TableCell className="text-xs">{r.rent ? `${r.rent} CHF` : '—'}</TableCell>
                    <TableCell className="text-xs">{r.rooms ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.total_score != null && <span className="text-xs font-medium">{r.total_score}</span>}
                        <StatusBadge type="score" value={r.score_label} />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge type="result" value={r.result_status} /></TableCell>
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      {r.result_status === 'nouveau' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: r.id, status: 'retenu' })}>
                            Retenir
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: r.id, status: 'rejete' })}>
                            Rejeter
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
              <span className="text-sm text-muted-foreground">
                Page {page + 1} / {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <ResultDetailDrawer
        result={selectedResult}
        open={!!selectedResult}
        onOpenChange={(open) => { if (!open) setSelectedResult(null); }}
      />
    </div>
  );
}
