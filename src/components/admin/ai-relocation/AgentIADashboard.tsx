import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Zap, FileText, Send, CalendarCheck, Shield, AlertTriangle, Activity, Mail, CalendarPlus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface Props {
  agentId: string;
}

export function AgentIADashboard({ agentId }: Props) {
  const { data: counts, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-dashboard-counts', agentId],
    queryFn: async () => {
      const countQuery = async (table: string, filters: Record<string, string> = {}): Promise<number> => {
        let q: any = supabase.from(table as any).select('id', { count: 'exact', head: true });
        for (const [key, val] of Object.entries(filters)) {
          q = q.eq(key, val);
        }
        const { count } = await q;
        return (count as number) ?? 0;
      };

      const errQ: any = supabase.from('ai_agent_activity_logs').select('id', { count: 'exact', head: true });

      // Count runs today via search_missions join (mission_execution_runs has no ai_agent_id)
      const { data: agentMissions } = await supabase
        .from('search_missions')
        .select('id')
        .eq('ai_agent_id', agentId);
      const missionIds = (agentMissions ?? []).map((m: any) => m.id);
      let runsToday = 0;
      if (missionIds.length > 0) {
        const { count } = await supabase
          .from('mission_execution_runs')
          .select('id', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .gte('started_at', new Date().toISOString().split('T')[0]);
        runsToday = count ?? 0;
      }

      // Count scheduled missions (active with next_run_at set)
      const { count: scheduledCount } = await supabase
        .from('search_missions')
        .select('id', { count: 'exact', head: true })
        .eq('ai_agent_id', agentId)
        .eq('status', 'active')
        .not('next_run_at', 'is', null);

      const [assignments, missions, newResults, offers, offersSent, visits, visitsCreated, pendingApprovals, errors] = await Promise.all([
        countQuery('ai_agent_assignments', { ai_agent_id: agentId, status: 'active' }),
        countQuery('search_missions', { ai_agent_id: agentId, status: 'active' }),
        countQuery('property_results', { ai_agent_id: agentId, result_status: 'nouveau' }),
        countQuery('client_offer_messages', { ai_agent_id: agentId }),
        countQuery('client_offer_messages', { ai_agent_id: agentId, status: 'envoye' }),
        countQuery('visit_requests', { ai_agent_id: agentId }),
        countQuery('visit_requests', { ai_agent_id: agentId, status: 'visite_a_effectuer' }),
        countQuery('approval_requests', { ai_agent_id: agentId, status: 'pending' }),
        errQ.eq('ai_agent_id', agentId).not('error_message', 'is', null).then((r: any) => r.count ?? 0),
      ]);

      const scheduledMissions = scheduledCount ?? 0;
      return { assignments, missions, runsToday, newResults, offers, offersSent, visits, visitsCreated, pendingApprovals, errors, scheduledMissions };
    },
    refetchOnWindowFocus: false,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['ai-dashboard-activity', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_activity_logs')
        .select('id, action_type, action_source, created_at, error_message, client_id')
        .eq('ai_agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <PremiumKPICard title="Clients assignés" value={counts?.assignments ?? 0} icon={Users} variant="default" delay={0} />
        <PremiumKPICard title="Missions actives" value={counts?.missions ?? 0} icon={Search} variant="default" delay={50} />
        <PremiumKPICard title="Runs aujourd'hui" value={counts?.runsToday ?? 0} icon={Zap} variant="success" delay={100} />
        <PremiumKPICard title="Nouveaux résultats" value={counts?.newResults ?? 0} icon={FileText} variant="warning" delay={150} />
        <PremiumKPICard title="En attente validation" value={counts?.pendingApprovals ?? 0} icon={Shield} variant="warning" delay={200} />
        <PremiumKPICard title="Offres total" value={counts?.offers ?? 0} icon={Send} variant="default" delay={250} />
        <PremiumKPICard title="Offres envoyées" value={counts?.offersSent ?? 0} icon={Mail} variant="success" delay={300} />
        <PremiumKPICard title="Visites total" value={counts?.visits ?? 0} icon={CalendarCheck} variant="default" delay={350} />
        <PremiumKPICard title="Visites planifiées" value={counts?.visitsCreated ?? 0} icon={CalendarPlus} variant="success" delay={400} />
        <PremiumKPICard title="Erreurs" value={counts?.errors ?? 0} icon={AlertTriangle} variant="danger" delay={450} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Activité récente
        </h3>
        {activityLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : !recentActivity?.length ? (
          <p className="text-muted-foreground text-sm py-4 text-center">Aucune activité récente</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{log.action_type}</span>
                  {log.action_source && (
                    <span className="text-muted-foreground text-xs">({log.action_source})</span>
                  )}
                  {log.error_message && (
                    <span className="text-destructive text-xs truncate max-w-[200px]">⚠ {log.error_message}</span>
                  )}
                </div>
                <span className="text-muted-foreground text-xs whitespace-nowrap ml-2">
                  {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: fr })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
