import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  mission: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
}

export function MissionDetailDrawer({ mission, open, onOpenChange, agentId }: Props) {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['mission-runs', mission?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_execution_runs')
        .select('*')
        .eq('mission_id', mission.id)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!mission?.id,
  });

  if (!mission) return null;

  const criteria = mission.criteria_snapshot;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Détail Mission</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Status & Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Statut:</span>
                <StatusBadge type="mission" value={mission.status} />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Fréquence:</span>{' '}
                <span className="capitalize">{mission.frequency || '—'}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Sources:</span>{' '}
                {mission.allowed_sources?.join(', ') || '—'}
              </div>
              {mission.last_run_at && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Dernière exécution:</span>{' '}
                  {format(new Date(mission.last_run_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </div>
              )}
              {mission.next_run_at && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Prochaine exécution:</span>{' '}
                  {format(new Date(mission.next_run_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </div>
              )}
            </div>

            {/* Criteria Snapshot */}
            {criteria && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Critères de recherche</h4>
                <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(criteria, null, 2)}
                </pre>
              </div>
            )}

            {/* Counters */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <span className="text-muted-foreground">Total trouvés:</span>
                <span className="block font-bold">{mission.results_found ?? 0}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <span className="text-muted-foreground">Retenus:</span>
                <span className="block font-bold">{mission.results_retained ?? 0}</span>
              </div>
            </div>

            {/* Execution Runs */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Historique d'exécution</h4>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : !runs?.length ? (
                <p className="text-muted-foreground text-sm">Aucune exécution</p>
              ) : (
                <div className="space-y-2">
                  {runs.map((run: any) => (
                    <div key={run.id} className="border border-border rounded-lg p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <StatusBadge type="execution_run" value={run.status} />
                        <span className="text-muted-foreground">
                          {format(new Date(run.started_at), 'dd/MM HH:mm', { locale: fr })}
                        </span>
                      </div>
                      {run.results_found != null && (
                        <div>Résultats: {run.results_found} trouvés, {run.new_results ?? 0} nouveaux, {run.duplicates_skipped ?? 0} doublons</div>
                      )}
                      {run.error_message && (
                        <div className="text-destructive">⚠ {run.error_message}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
