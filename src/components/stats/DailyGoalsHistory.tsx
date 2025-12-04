import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ChevronLeft, ChevronRight, Target, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { countUniqueVisites, countUniqueOffres } from '@/utils/visitesCalculator';

interface DailyGoalsHistoryProps {
  agentId: string;
}

interface DefaultGoal {
  id: string;
  title: string;
  goal_type: string;
  target_min: number;
  target_max: number;
}

// Helper to get UTC boundaries for a specific date
function getUTCBoundaries(date: Date) {
  const dateStr = date.toISOString().split('T')[0];
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end = new Date(dateStr + 'T23:59:59.999Z');
  return { start, end };
}

export function DailyGoalsHistory({ agentId }: DailyGoalsHistoryProps) {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  
  const selectedDate = subDays(new Date(), selectedDayOffset);
  const { start: dayStart, end: dayEnd } = getUTCBoundaries(selectedDate);

  // Fetch default goals
  const { data: defaultGoals = [] } = useQuery({
    queryKey: ['default-agent-goals-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_agent_goals')
        .select('*')
        .eq('is_active', true)
        .eq('period', 'daily')
        .order('created_at');
      
      if (error) throw error;
      return data as DefaultGoal[];
    },
  });

  // Fetch historical data for selected day
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['goals-history', agentId, selectedDayOffset],
    queryFn: async () => {
      // Fetch offres for this agent on selected day
      const { data: offres, error: offresError } = await supabase
        .from('offres')
        .select('id, date_envoi, adresse')
        .eq('agent_id', agentId)
        .gte('date_envoi', dayStart.toISOString())
        .lte('date_envoi', dayEnd.toISOString());
      
      if (offresError) throw offresError;
      
      // Count unique offers (same date + address = 1 offer, regardless of clients)
      const uniqueOffresCount = countUniqueOffres(offres || []);

      // Fetch visites for this agent on selected day
      const { data: visites, error: visitesError } = await supabase
        .from('visites')
        .select('id, date_visite, adresse')
        .eq('agent_id', agentId)
        .gte('date_visite', dayStart.toISOString())
        .lte('date_visite', dayEnd.toISOString());
      
      if (visitesError) throw visitesError;
      
      // Count unique visits (same date + address = 1 visit, regardless of clients)
      const uniqueVisitesCount = countUniqueVisites(visites || []);

      // Fetch client IDs for this agent
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', agentId);
      
      if (clientsError) throw clientsError;
      
      const clientIds = clients?.map(c => c.id) || [];

      // Fetch candidatures for agent's clients on selected day
      let candidatures: any[] = [];
      if (clientIds.length > 0) {
        const { data: candData, error: candError } = await supabase
          .from('candidatures')
          .select('id, created_at, statut')
          .in('client_id', clientIds)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
        
        if (candError) throw candError;
        candidatures = candData || [];
      }

      return {
        offres: uniqueOffresCount,
        visites: uniqueVisitesCount,
        candidatures: candidatures.length,
        dossiers: candidatures.filter(c => !['cles_remises', 'refusee', 'annulee'].includes(c.statut)).length,
        clientCount: clients?.length || 1,
      };
    },
    enabled: !!agentId,
  });

  const getCurrentValue = (goalType: string): number => {
    if (!historyData) return 0;
    const clientCount = historyData.clientCount || 1;
    
    switch (goalType) {
      case 'offres': return historyData.offres;
      case 'visites': return historyData.visites;
      case 'candidatures': return historyData.candidatures;
      case 'dossiers_deposes': return historyData.dossiers;
      case 'offres_par_client': return historyData.offres / clientCount;
      case 'visites_par_client': return historyData.visites / clientCount;
      case 'dossiers_par_client': return historyData.dossiers / clientCount;
      default: return 0;
    }
  };

  const getStatus = (current: number, min: number): 'success' | 'danger' => {
    return current >= min ? 'success' : 'danger';
  };

  const canGoBack = selectedDayOffset < 6;
  const canGoForward = selectedDayOffset > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique des 7 derniers jours
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDayOffset(prev => Math.min(prev + 1, 6))}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="min-w-[120px] justify-center">
              {selectedDayOffset === 0 
                ? "Aujourd'hui" 
                : selectedDayOffset === 1 
                ? "Hier"
                : format(selectedDate, 'EEEE d', { locale: fr })}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDayOffset(prev => Math.max(prev - 1, 0))}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : defaultGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun objectif journalier configuré
          </p>
        ) : (
          <div className="space-y-3">
            {defaultGoals.map((goal) => {
              const current = getCurrentValue(goal.goal_type);
              const status = getStatus(current, goal.target_min);
              const isPerClient = goal.goal_type.includes('par_client');

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    status === 'success' 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : 'bg-red-500/10 border-red-500/20'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-lg font-bold",
                      status === 'success' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {isPerClient ? current.toFixed(1) : current}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {goal.target_min}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Summary */}
            <div className="pt-3 border-t mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Objectifs atteints</span>
                <span className="font-medium">
                  {defaultGoals.filter(g => getCurrentValue(g.goal_type) >= g.target_min).length}
                  {' / '}
                  {defaultGoals.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
