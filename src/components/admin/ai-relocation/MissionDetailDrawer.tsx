import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DETAIL_SHEET, DetailHeader, DetailBody, KeyFacts, DetailSection, DetailRow, dateTimeCH } from '@/components/details/DetailPrimitives';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, XCircle, MinusCircle, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  if (status === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  return <MinusCircle className="w-3.5 h-3.5 text-amber-500" />;
}

const COURT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

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
      <SheetContent className={cn(DETAIL_SHEET, 'sm:max-w-lg')}>
        <DetailHeader
          titleAs={SheetTitle}
          descriptionAs={SheetDescription}
          className="pt-5 sm:pt-6"
          eyebrow="Mission de recherche"
          title="Détail mission"
          subtitle={mission.allowed_sources?.length ? `Sources : ${mission.allowed_sources.join(', ')}` : undefined}
          badge={<StatusBadge type="mission" value={mission.status} />}
        />

        <DetailBody>
          <KeyFacts
            items={[
              { label: 'Total trouvés', value: mission.results_found ?? 0 },
              { label: 'Retenus', value: mission.results_retained ?? 0, emphasis: true },
              { label: 'Fréquence', value: <span className="capitalize">{mission.frequency || '—'}</span> },
            ]}
          />

          <DetailSection title="Planification">
            <DetailRow label="Dernière exécution" value={mission.last_run_at ? dateTimeCH(mission.last_run_at, COURT) : null} />
            <DetailRow label="Prochaine exécution" value={mission.next_run_at ? dateTimeCH(mission.next_run_at, COURT) : null} />
            {!mission.last_run_at && !mission.next_run_at && (
              <p className="text-sm text-muted-foreground">Aucune exécution planifiée.</p>
            )}
          </DetailSection>

          {criteria && (
            <DetailSection title="Critères de recherche">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted/50 p-3 font-mono text-xs">
                {JSON.stringify(criteria, null, 2)}
              </pre>
            </DetailSection>
          )}

          <DetailSection title="Historique d'exécution">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : !runs?.length ? (
              <p className="text-sm text-muted-foreground">Aucune exécution</p>
            ) : (
              <div className="divide-y divide-border/50">
                {runs.map((run: any) => {
                  const execMeta: ExecMetadata | null = run.execution_metadata as ExecMetadata | null;
                  const hasSources = execMeta?.sources && execMeta.sources.length > 0;

                  return (
                    <div key={run.id} className="space-y-1.5 py-3 text-sm first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge type="execution_run" value={run.status} />
                        <span className="text-[13px] text-muted-foreground">
                          {dateTimeCH(run.started_at, { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>

                      {execMeta?.totals ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                          <span>Sources : <span className="font-medium text-foreground">{execMeta.totals.sources_succeeded}/{execMeta.totals.sources_attempted}</span></span>
                          <span>Annonces : <span className="font-medium text-foreground">{execMeta.totals.raw_listings_found}</span></span>
                          <span>Insérés : <span className="font-medium text-foreground">{execMeta.totals.inserted_results}</span></span>
                          <span>Doublons : <span className="font-medium text-foreground">{execMeta.totals.duplicates}</span></span>
                        </div>
                      ) : run.results_found != null ? (
                        <div className="text-[13px] text-muted-foreground">Résultats : {run.results_found} trouvés, {run.results_new ?? 0} nouveaux, {run.duplicates_detected ?? 0} doublons</div>
                      ) : null}

                      {hasSources && (
                        <Collapsible>
                          <CollapsibleTrigger className="group flex min-h-[36px] items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                            Détail par source
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-1 space-y-1.5">
                            {execMeta!.sources!.map((src, idx) => (
                              <div key={idx} className="space-y-0.5 rounded-xl bg-muted/50 p-2.5 text-[13px]">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <SourceStatusIcon status={src.status} />
                                    <span className="truncate font-medium">{src.name}</span>
                                    {src.retried && (
                                      <Badge variant="outline" className="h-5 rounded-full px-1.5 py-0 text-[11px]">
                                        <RotateCw className="mr-0.5 h-2.5 w-2.5" />retry
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="shrink-0 text-muted-foreground">{(src.duration_ms / 1000).toFixed(1)} s</span>
                                </div>
                                {src.status === 'success' && (
                                  <div className="pl-5 text-muted-foreground">{src.listings_count} annonces extraites</div>
                                )}
                                {src.error_message && (
                                  <div className="pl-5 text-destructive">
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
                        <div className="text-[13px] text-destructive">{run.error_message}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </DetailSection>
        </DetailBody>
      </SheetContent>
    </Sheet>
  );
}
