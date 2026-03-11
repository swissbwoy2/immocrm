import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { MissionDetailDrawer } from './MissionDetailDrawer';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Search, Pause, Play, Zap, XCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type MissionStatus = Database['public']['Enums']['mission_status'];

interface Props {
  agentId: string;
}

export function MissionsTab({ agentId }: Props) {
  const queryClient = useQueryClient();
  const [selectedMission, setSelectedMission] = useState<any>(null);

  const { data: missions, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-missions', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_missions')
        .select('*, clients:client_id(id, user_id, profiles:user_id(prenom, nom, email))')
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MissionStatus }) => {
      const { error } = await supabase
        .from('search_missions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-missions'] });
      toast.success('Mission mise à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  const runMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase.functions.invoke('ai-relocation-api', {
        body: { action: 'run_mission', mission_id: missionId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-missions'] });
      toast.success('Exécution lancée');
    },
    onError: () => toast.error('Erreur lors du lancement'),
  });

  const getClientName = (m: any) => {
    const p = m.clients?.profiles;
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
      <h3 className="font-semibold">Missions de recherche ({missions?.length ?? 0})</h3>

      {!missions?.length ? (
        <div className="flex flex-col items-center py-12">
          <Search className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune mission</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière exécution</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missions.map((m: any) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedMission(m)}>
                  <TableCell className="font-medium">{getClientName(m)}</TableCell>
                  <TableCell className="capitalize">{m.frequency || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{m.sources?.join(', ') || '—'}</TableCell>
                  <TableCell><StatusBadge type="mission" value={m.status} /></TableCell>
                  <TableCell className="text-xs">
                    {m.last_run_at ? format(new Date(m.last_run_at), 'dd/MM HH:mm', { locale: fr }) : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {m.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => runMutation.mutate(m.id)} disabled={runMutation.isPending}>
                          <Zap className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: m.id, status: 'en_pause' })}>
                          <Pause className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {m.status === 'en_pause' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: m.id, status: 'active' })}>
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    {!['terminee', 'suspendue'].includes(m.status) && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: m.id, status: 'terminee' })}>
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

      <MissionDetailDrawer
        mission={selectedMission}
        open={!!selectedMission}
        onOpenChange={(open) => { if (!open) setSelectedMission(null); }}
        agentId={agentId}
      />
    </div>
  );
}
