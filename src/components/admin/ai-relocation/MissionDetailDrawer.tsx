import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, XCircle, MinusCircle, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  mission: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
}

interface SourceMeta {
  name: string;
  url: string;
  status: 'success' | 'failed' | 'empty';
  error_type?: string;
  error_message?: string;
  listings_count: number;
  duration_ms: number;
  retried: boolean;
}

interface ExecMetadata {
  sources?: SourceMeta[];
  totals?: {
    sources_attempted: number;
    sources_succeeded: number;
    sources_failed: number;
    sources_empty?: number;
    raw_listings_found: number;
    inserted_results: number;
    duplicates: number;
    failed_results: number;
  };
}

function SourceStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  return <MinusCircle className="w-3.5 h-3.5 text-yellow-500" />;
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
                  {runs.map((run: any) => {
                    const execMeta: ExecMetadata | null = run.execution_metadata as ExecMetadata | null;
                    const hasSources = execMeta?.sources && execMeta.sources.length > 0;

                    return (
                      <div key={run.id} className="border border-border rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <StatusBadge type="execution_run" value={run.status} />
                          <span className="text-muted-foreground">
                            {format(new Date(run.started_at), 'dd/MM HH:mm', { locale: fr })}
                          </span>
                        </div>

                        {/* Totals summary */}
                        {execMeta?.totals ? (
                          <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                            <span>Sources: {execMeta.totals.sources_succeeded}/{execMeta.totals.sources_attempted} ✓</span>
                            <span>Annonces: {execMeta.totals.raw_listings_found}</span>
                            <span>Insérés: {execMeta.totals.inserted_results}</span>
                            <span>Doublons: {execMeta.totals.duplicates}</span>
                          </div>
                        ) : run.results_found != null ? (
                          <div>Résultats: {run.results_found} trouvés, {run.results_new ?? 0} nouveaux, {run.duplicates_detected ?? 0} doublons</div>
                        ) : null}

                        {/* Source-level breakdown (collapsible) */}
                        {hasSources && (
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1">
                              <ChevronDown className="w-3 h-3" />
                              Détail par source
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-1.5">
                              {execMeta!.sources!.map((src, idx) => (
                                <div key={idx} className="bg-muted/50 rounded p-2 space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <SourceStatusIcon status={src.status} />
                                      <span className="font-medium">{src.name}</span>
                                      {src.retried && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                          <RotateCw className="w-2.5 h-2.5 mr-0.5" />retry
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-muted-foreground">{(src.duration_ms / 1000).toFixed(1)}s</span>
                                  </div>
                                  {src.status === 'success' && (
                                    <div className="text-muted-foreground pl-5">{src.listings_count} annonces extraites</div>
                                  )}
                                  {src.error_message && (
                                    <div className="text-destructive pl-5 text-[11px]">
                                      {src.error_type && <span className="font-medium">[{src.error_type}]</span>}{' '}
                                      {src.error_message}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {run.error_message && (
                          <div className="text-destructive">⚠ {run.error_message}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
