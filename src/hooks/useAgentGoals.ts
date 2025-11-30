import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';

interface AgentGoal {
  id: string;
  agent_id: string;
  title: string;
  goal_type: string;
  target_value: number;
  period: string;
  is_active: boolean;
}

interface GoalWithProgress extends AgentGoal {
  current: number;
  percentage: number;
}

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case 'daily':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'weekly':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarterly':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'yearly':
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function useAgentGoals(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-goals-with-progress', agentId],
    queryFn: async (): Promise<GoalWithProgress[]> => {
      if (!agentId) return [];

      // Fetch goals
      const { data: goals, error: goalsError } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (goalsError) throw goalsError;
      if (!goals || goals.length === 0) return [];

      // Fetch data for calculating progress
      const goalsWithProgress: GoalWithProgress[] = [];

      for (const goal of goals) {
        const { start, end } = getPeriodRange(goal.period);
        let current = 0;

        switch (goal.goal_type) {
          case 'offres': {
            const { count } = await supabase
              .from('offres')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agentId)
              .gte('date_envoi', start.toISOString())
              .lte('date_envoi', end.toISOString());
            current = count || 0;
            break;
          }
          case 'transactions': {
            const { count } = await supabase
              .from('transactions')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agentId)
              .eq('statut', 'conclue')
              .gte('date_transaction', start.toISOString())
              .lte('date_transaction', end.toISOString());
            current = count || 0;
            break;
          }
          case 'commissions': {
            const { data } = await supabase
              .from('transactions')
              .select('part_agent')
              .eq('agent_id', agentId)
              .eq('statut', 'conclue')
              .gte('date_transaction', start.toISOString())
              .lte('date_transaction', end.toISOString());
            current = data?.reduce((sum, t) => sum + (t.part_agent || 0), 0) || 0;
            break;
          }
          case 'visites': {
            const { count } = await supabase
              .from('visites')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agentId)
              .gte('date_visite', start.toISOString())
              .lte('date_visite', end.toISOString());
            current = count || 0;
            break;
          }
          case 'candidatures': {
            const { data: clientIds } = await supabase
              .from('clients')
              .select('id')
              .eq('agent_id', agentId);
            
            if (clientIds && clientIds.length > 0) {
              const { count } = await supabase
                .from('candidatures')
                .select('*', { count: 'exact', head: true })
                .in('client_id', clientIds.map(c => c.id))
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());
              current = count || 0;
            }
            break;
          }
          case 'clients': {
            const { count } = await supabase
              .from('clients')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agentId)
              .gte('date_ajout', start.toISOString())
              .lte('date_ajout', end.toISOString());
            current = count || 0;
            break;
          }
        }

        const percentage = goal.target_value > 0 
          ? Math.round((current / goal.target_value) * 100) 
          : 0;

        goalsWithProgress.push({
          ...goal,
          current,
          percentage,
        });
      }

      return goalsWithProgress;
    },
    enabled: !!agentId,
    staleTime: 30000, // 30 seconds
  });
}
