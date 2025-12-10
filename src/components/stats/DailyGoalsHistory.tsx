import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ChevronLeft, ChevronRight, CheckCircle, XCircle, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { countUniqueVisites, countUniqueOffres } from '@/utils/visitesCalculator';

// Floating particles component
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
        style={{
          left: `${20 + i * 20}%`,
          top: `${25 + (i % 2) * 30}%`,
          animationDelay: `${i * 0.4}s`,
          animationDuration: `${2.5 + i * 0.3}s`,
        }}
      />
    ))}
  </div>
);

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

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['goals-history', agentId, selectedDayOffset],
    queryFn: async () => {
      const { data: offres, error: offresError } = await supabase
        .from('offres')
        .select('id, date_envoi, adresse')
        .eq('agent_id', agentId)
        .gte('date_envoi', dayStart.toISOString())
        .lte('date_envoi', dayEnd.toISOString());
      
      if (offresError) throw offresError;
      
      const uniqueOffresCount = countUniqueOffres(offres || []);

      const { data: visites, error: visitesError } = await supabase
        .from('visites')
        .select('id, date_visite, adresse')
        .eq('agent_id', agentId)
        .gte('date_visite', dayStart.toISOString())
        .lte('date_visite', dayEnd.toISOString());
      
      if (visitesError) throw visitesError;
      
      const uniqueVisitesCount = countUniqueVisites(visites || []);

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', agentId);
      
      if (clientsError) throw clientsError;
      
      const clientIds = clients?.map(c => c.id) || [];

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

  const goalsAchieved = defaultGoals.filter(g => getCurrentValue(g.goal_type) >= g.target_min).length;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-xl border-white/10 shadow-2xl">
      <FloatingParticles />
      
      {/* Glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 p-6">
        {/* Premium Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg animate-pulse" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 shadow-lg shadow-primary/20">
                <History className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Historique 7 jours
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Analysez vos performances
              </p>
            </div>
          </div>
          
          {/* Day Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDayOffset(prev => Math.min(prev + 1, 6))}
              disabled={!canGoBack}
              className="h-8 w-8 bg-background/50 hover:bg-background/80 border border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge 
              variant="outline" 
              className="min-w-[130px] justify-center bg-background/50 backdrop-blur-sm border-white/10 px-4 py-1.5"
            >
              <Calendar className="h-3 w-3 mr-1.5 text-primary" />
              {selectedDayOffset === 0 
                ? "Aujourd'hui" 
                : selectedDayOffset === 1 
                ? "Hier"
                : format(selectedDate, 'EEEE d', { locale: fr })}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDayOffset(prev => Math.max(prev - 1, 0))}
              disabled={!canGoForward}
              className="h-8 w-8 bg-background/50 hover:bg-background/80 border border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative animate-spin rounded-full h-10 w-10 border-2 border-primary/30 border-t-primary"></div>
            </div>
          </div>
        ) : defaultGoals.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aucun objectif journalier configuré
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {defaultGoals.map((goal, index) => {
              const current = getCurrentValue(goal.goal_type);
              const status = getStatus(current, goal.target_min);
              const isPerClient = goal.goal_type.includes('par_client');
              const percentage = Math.min((current / goal.target_min) * 100, 100);

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group hover:scale-[1.01]",
                    status === 'success' 
                      ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/20 shadow-lg shadow-green-500/5' 
                      : 'bg-gradient-to-r from-red-500/10 to-rose-500/5 border-red-500/20 shadow-lg shadow-red-500/5'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Progress background */}
                  <div 
                    className={cn(
                      "absolute inset-y-0 left-0 opacity-20 transition-all duration-500",
                      status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                  
                  <div className="relative z-10 flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      status === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                      {status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{goal.title}</span>
                  </div>
                  
                  <div className="relative z-10 flex items-center gap-3">
                    <span className={cn(
                      "text-xl font-bold",
                      status === 'success' ? 'text-green-500' : 'text-red-500'
                    )}>
                      {isPerClient ? current.toFixed(1) : current}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-background/50">
                      / {goal.target_min}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Objectifs atteints
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-2xl font-bold",
                    goalsAchieved === defaultGoals.length ? "text-green-500" : "text-foreground"
                  )}>
                    {goalsAchieved}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {defaultGoals.length}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3 h-2 rounded-full bg-black/20 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    goalsAchieved === defaultGoals.length 
                      ? "bg-gradient-to-r from-green-500 to-emerald-400" 
                      : "bg-gradient-to-r from-primary to-primary/60"
                  )}
                  style={{ width: `${(goalsAchieved / defaultGoals.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
