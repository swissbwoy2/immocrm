import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Flame, Trophy, CheckCircle, AlertCircle, Clock, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DailyGoalsHistory } from './DailyGoalsHistory';
import { countUniqueOffres, countUniqueVisites } from '@/utils/visitesCalculator';

// Helper function to get UTC day boundaries
function getUTCDayBoundaries() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  const todayStart = new Date(todayStr + 'T00:00:00.000Z');
  const todayEnd = new Date(todayStr + 'T23:59:59.999Z');
  return { todayStart, todayEnd, lastUpdate: now };
}

interface DefaultGoal {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  target_min: number;
  target_max: number;
  period: string;
  is_active: boolean;
}

interface DefaultGoalsSectionProps {
  agentId: string;
  offres: any[];
  visites: any[];
  candidatures: any[];
  clients: any[];
}

const goalTypeIcons: Record<string, React.ReactNode> = {
  offres: <Flame className="h-4 w-4" />,
  visites: <Target className="h-4 w-4" />,
  candidatures: <Trophy className="h-4 w-4" />,
  offres_par_client: <Flame className="h-4 w-4" />,
  visites_par_client: <Target className="h-4 w-4" />,
  dossiers_par_client: <Trophy className="h-4 w-4" />,
};

export function DefaultGoalsSection({ agentId, offres, visites, candidatures, clients }: DefaultGoalsSectionProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Update the timestamp when data changes
  useEffect(() => {
    setLastUpdateTime(new Date());
  }, [offres, visites, candidatures, clients]);

  const { data: defaultGoals = [], isLoading } = useQuery({
    queryKey: ['default-agent-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_agent_goals')
        .select('*')
        .eq('is_active', true)
        .order('created_at');
      
      if (error) throw error;
      return data as DefaultGoal[];
    },
  });

  // Calculate current values for today using UTC boundaries
  const { todayStart, todayEnd } = getUTCDayBoundaries();

  // Filter offers sent today (UTC) - count unique (same date + address = 1 offer)
  const todayOffresFiltered = offres.filter(o => {
    if (!o.date_envoi) return false;
    const date = new Date(o.date_envoi);
    return date >= todayStart && date <= todayEnd;
  });
  const todayOffres = countUniqueOffres(todayOffresFiltered);

  // Filter visits scheduled today (UTC) - count unique (same date + address = 1 visit)
  const todayVisitesFiltered = visites.filter(v => {
    if (!v.date_visite) return false;
    const date = new Date(v.date_visite);
    return date >= todayStart && date <= todayEnd;
  });
  const todayVisites = countUniqueVisites(todayVisitesFiltered);

  // Filter candidatures created today (UTC) - only active ones (exclude completed/refused)
  const activeStatuts = ['en_attente', 'acceptee', 'dossier_envoye', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee'];
  const todayCandidatures = candidatures.filter(c => {
    if (!c.created_at) return false;
    const date = new Date(c.created_at);
    const isToday = date >= todayStart && date <= todayEnd;
    // For daily goals, count all candidatures created today regardless of status
    return isToday;
  }).length;

  // For "dossiers déposés" objective - only count active candidatures created today
  const todayDossiersDeposes = candidatures.filter(c => {
    if (!c.created_at) return false;
    const date = new Date(c.created_at);
    const isToday = date >= todayStart && date <= todayEnd;
    // Exclude completed (cles_remises) and refused candidatures
    const isActive = !['cles_remises', 'refusee', 'annulee'].includes(c.statut);
    return isToday && isActive;
  }).length;

  // Calculate per-client metrics
  const clientCount = clients.length || 1;
  const offresParClient = clientCount > 0 ? todayOffres / clientCount : 0;
  const visitesParClient = clientCount > 0 ? todayVisites / clientCount : 0;
  const dossiersParClient = clientCount > 0 ? todayDossiersDeposes / clientCount : 0;

  const getCurrentValue = (goalType: string): number => {
    switch (goalType) {
      case 'offres': return todayOffres;
      case 'visites': return todayVisites;
      case 'candidatures': return todayCandidatures;
      case 'dossiers_deposes': return todayDossiersDeposes;
      case 'offres_par_client': return offresParClient;
      case 'visites_par_client': return visitesParClient;
      case 'dossiers_par_client': return dossiersParClient;
      default: return 0;
    }
  };

  const getStatus = (current: number, min: number, max: number): 'success' | 'warning' | 'danger' => {
    if (current >= min) return 'success';
    if (current >= min * 0.5) return 'warning';
    return 'danger';
  };

  const statusColors = {
    success: 'text-green-600 bg-green-500/10 border-green-500/20',
    warning: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    danger: 'text-red-600 bg-red-500/10 border-red-500/20',
  };

  const statusIcons = {
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    warning: <AlertCircle className="h-4 w-4 text-yellow-600" />,
    danger: <AlertCircle className="h-4 w-4 text-red-600" />,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objectifs journaliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format last update time in UTC
  const formatLastUpdate = () => {
    const hours = lastUpdateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = lastUpdateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} UTC`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Objectifs journaliers
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Mis à jour: {formatLastUpdate()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs"
              >
                <History className="h-4 w-4 mr-1" />
                {showHistory ? 'Masquer' : 'Historique'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {defaultGoals.map((goal) => {
            const current = getCurrentValue(goal.goal_type);
            const status = getStatus(current, goal.target_min, goal.target_max);
            const percentage = Math.min((current / goal.target_min) * 100, 100);
            const isPerClient = goal.goal_type.includes('par_client');

            return (
              <div
                key={goal.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  statusColors[status]
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {goalTypeIcons[goal.goal_type]}
                    <span className="text-xs font-medium truncate">{goal.title}</span>
                  </div>
                  {statusIcons[status]}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold">
                      {isPerClient ? current.toFixed(1) : current}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {goal.target_min}-{goal.target_max}
                    </span>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className="h-1.5"
                    indicatorClassName={cn(
                      status === 'success' && 'bg-green-500',
                      status === 'warning' && 'bg-yellow-500',
                      status === 'danger' && 'bg-red-500'
                    )}
                  />
                  
                  {current < goal.target_min && (
                    <p className="text-xs text-muted-foreground">
                      Encore {(goal.target_min - current).toFixed(isPerClient ? 1 : 0)} pour l'objectif
                    </p>
                  )}
                  {current >= goal.target_min && current < goal.target_max && (
                    <p className="text-xs text-green-600">
                      Objectif atteint ! 🎉
                    </p>
                  )}
                  {current >= goal.target_max && (
                    <p className="text-xs text-green-600 font-medium">
                      Excellent ! 🏆
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* History section */}
    {showHistory && <DailyGoalsHistory agentId={agentId} />}
    </div>
  );
}
