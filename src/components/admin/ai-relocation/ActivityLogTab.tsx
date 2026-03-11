import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Props {
  agentId: string;
}

const PAGE_SIZE = 100;

export function ActivityLogTab({ agentId }: Props) {
  const [page, setPage] = useState(0);
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-activity-log', agentId, page, actionTypeFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('ai_agent_activity_logs')
        .select('*, clients:client_id(id, user_id, profiles:user_id(prenom, nom, email))', { count: 'exact' })
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionTypeFilter !== 'all') {
        query = query.eq('action_type', actionTypeFilter);
      }
      if (searchTerm.trim()) {
        query = query.ilike('error_message', `%${searchTerm.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data, total: count ?? 0 };
    },
    refetchOnWindowFocus: false,
  });

  const getClientName = (log: any) => {
    const p = log.clients?.profiles;
    if (!p) return '—';
    return [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || '—';
  };

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  if (isLoading && page === 0) {
    return <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;
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
            placeholder="Rechercher dans les erreurs..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={actionTypeFilter} onValueChange={(v) => { setActionTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type d'action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="search">Recherche</SelectItem>
            <SelectItem value="scoring">Scoring</SelectItem>
            <SelectItem value="offer_draft">Offre</SelectItem>
            <SelectItem value="visit_request">Visite</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} entrées</span>
      </div>

      {!data?.logs?.length ? (
        <div className="flex flex-col items-center py-12">
          <Activity className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune activité</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Connecteur</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.action_type}</TableCell>
                    <TableCell className="text-xs">{log.action_source || '—'}</TableCell>
                    <TableCell className="text-xs">{getClientName(log)}</TableCell>
                    <TableCell className="text-xs capitalize">{log.validation_result || '—'}</TableCell>
                    <TableCell className="text-xs">{log.connector_used || '—'}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                      {log.error_message || '—'}
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
    </div>
  );
}
