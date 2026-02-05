import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { countUniqueVisites, countUniqueOffres } from '@/utils/visitesCalculator';

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

// Helper function to get UTC-based period ranges
function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  const today = new Date(todayStr + 'T00:00:00.000Z');
  
  switch (period) {
    case 'daily': {
      const start = new Date(todayStr + 'T00:00:00.000Z');
      const end = new Date(todayStr + 'T23:59:59.999Z');
      return { start, end };
    }
    case 'weekly': {
      // Get Monday of current week in UTC
      const dayOfWeek = today.getUTCDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setUTCDate(today.getUTCDate() - diffToMonday);
      monday.setUTCHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 59, 999);
      
      return { start: monday, end: sunday };
    }
    case 'monthly': {
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'quarterly': {
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      const quarterStart = Math.floor(month / 3) * 3;
      const start = new Date(Date.UTC(year, quarterStart, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, quarterStart + 3, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'yearly': {
      const year = today.getUTCFullYear();
      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      return { start, end };
    }
    default:
      return getPeriodRange('monthly');
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
            // Fetch offres with adresse to count unique offers
            const { data: offresData } = await supabase
              .from('offres')
              .select('date_envoi, adresse')
              .eq('agent_id', agentId)
              .gte('date_envoi', start.toISOString())
              .lte('date_envoi', end.toISOString());
            // Count unique offers (same date + address = 1 offer)
            current = countUniqueOffres(offresData || []);
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
            // Filter by payment date instead of transaction date
            const { data } = await supabase
              .from('transactions')
              .select('part_agent, date_paiement_commission, date_transaction')
              .eq('agent_id', agentId)
              .eq('statut', 'conclue')
              .eq('commission_payee', true);
            
            // Filter by date_paiement_commission (with fallback to date_transaction)
            const filteredData = data?.filter(t => {
              const paymentDate = t.date_paiement_commission || t.date_transaction;
              if (!paymentDate) return false;
              const date = new Date(paymentDate);
              return date >= start && date <= end;
            }) || [];
            
            current = filteredData.reduce((sum, t) => sum + (t.part_agent || 0), 0);
            break;
          }
          case 'visites': {
            // Fetch visites with adresse to count unique visits
            const { data: visitesData } = await supabase
              .from('visites')
              .select('date_visite, adresse')
              .eq('agent_id', agentId)
              .gte('date_visite', start.toISOString())
              .lte('date_visite', end.toISOString());
            // Count unique visits (same date + address = 1 visit)
            current = countUniqueVisites(visitesData || []);
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
