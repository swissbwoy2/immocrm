import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Flame, Trophy, CheckCircle, AlertCircle, Clock, History, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DailyGoalsHistory } from './DailyGoalsHistory';
import { countUniqueOffres, countUniqueVisites } from '@/utils/visitesCalculator';

// Floating particles component
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
        style={{
          left: `${15 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
          animationDelay: `${i * 0.3}s`,
          animationDuration: `${2 + i * 0.5}s`,
        }}
      />
    ))}
  </div>
);

// Helper function to get UTC day boundaries
function getUTCDayBoundaries() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
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

const goalTypeColors: Record<string, { gradient: string; glow: string; icon: string }> = {
  offres: { gradient: 'from-orange-500/20 to-amber-500/10', glow: 'shadow-orange-500/20', icon: 'text-orange-500' },
  visites: { gradient: 'from-blue-500/20 to-cyan-500/10', glow: 'shadow-blue-500/20', icon: 'text-blue-500' },
  candidatures: { gradient: 'from-purple-500/20 to-pink-500/10', glow: 'shadow-purple-500/20', icon: 'text-purple-500' },
  dossiers_deposes: { gradient: 'from-green-500/20 to-emerald-500/10', glow: 'shadow-green-500/20', icon: 'text-green-500' },
  offres_par_client: { gradient: 'from-orange-500/20 to-amber-500/10', glow: 'shadow-orange-500/20', icon: 'text-orange-500' },
  visites_par_client: { gradient: 'from-blue-500/20 to-cyan-500/10', glow: 'shadow-blue-500/20', icon: 'text-blue-500' },
  dossiers_par_client: { gradient: 'from-green-500/20 to-emerald-500/10', glow: 'shadow-green-500/20', icon: 'text-green-500' },
};

export function DefaultGoalsSection({ agentId, offres, visites, candidatures, clients }: DefaultGoalsSectionProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

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

  const { todayStart, todayEnd } = getUTCDayBoundaries();

  const todayOffresFiltered = offres.filter(o => {
    if (!o.date_envoi) return false;
    const date = new Date(o.date_envoi);
    return date >= todayStart && date <= todayEnd;
  });
  const todayOffres = countUniqueOffres(todayOffresFiltered);

  const todayVisitesFiltered = visites.filter(v => {
    if (!v.date_visite) return false;
    const date = new Date(v.date_visite);
    return date >= todayStart && date <= todayEnd;
  });
  const todayVisites = countUniqueVisites(todayVisitesFiltered);

  const activeStatuts = ['en_attente', 'acceptee', 'dossier_envoye', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee'];
  const todayCandidatures = candidatures.filter(c => {
    if (!c.created_at) return false;
    const date = new Date(c.created_at);
    return date >= todayStart && date <= todayEnd;
  }).length;

  const todayDossiersDeposes = candidatures.filter(c => {
    if (!c.created_at) return false;
    const date = new Date(c.created_at);
    const isToday = date >= todayStart && date <= todayEnd;
    const isActive = !['cles_remises', 'refusee', 'annulee'].includes(c.statut);
    return isToday && isActive;
  }).length;

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

  const formatLastUpdate = () => {
    const hours = lastUpdateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = lastUpdateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} UTC`;
  };

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-xl border-white/10 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const goalsAchieved = defaultGoals.filter(g => getCurrentValue(g.goal_type) >= g.target_min).length;
  const totalGoals = defaultGoals.length;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-xl border-white/10 shadow-2xl">
        <FloatingParticles />
        
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 p-6">
          {/* Premium Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg animate-pulse" />
                <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 shadow-lg shadow-primary/20">
                  <Target className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Objectifs journaliers
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {goalsAchieved}/{totalGoals} atteints
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs flex items-center gap-1.5 bg-background/50 backdrop-blur-sm border-white/10 px-3 py-1"
              >
                <Clock className="h-3 w-3 text-primary" />
                {formatLastUpdate()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs bg-background/50 hover:bg-background/80 border border-white/10"
              >
                <History className="h-4 w-4 mr-1.5" />
                {showHistory ? 'Masquer' : 'Historique'}
              </Button>
            </div>
          </div>

          {/* Goals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {defaultGoals.map((goal, index) => {
              const current = getCurrentValue(goal.goal_type);
              const status = getStatus(current, goal.target_min, goal.target_max);
              const percentage = Math.min((current / goal.target_min) * 100, 100);
              const isPerClient = goal.goal_type.includes('par_client');
              const colors = goalTypeColors[goal.goal_type] || goalTypeColors.offres;

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "relative overflow-hidden p-4 rounded-xl border transition-all duration-500 group hover:scale-[1.02]",
                    "bg-gradient-to-br backdrop-blur-sm",
                    colors.gradient,
                    status === 'success' && "border-green-500/30 shadow-lg shadow-green-500/10",
                    status === 'warning' && "border-yellow-500/30 shadow-lg shadow-yellow-500/10",
                    status === 'danger' && "border-red-500/30 shadow-lg shadow-red-500/10"
                  )}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Background glow */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    status === 'success' && "bg-gradient-to-br from-green-500/10 to-transparent",
                    status === 'warning' && "bg-gradient-to-br from-yellow-500/10 to-transparent",
                    status === 'danger' && "bg-gradient-to-br from-red-500/10 to-transparent"
                  )} />
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          status === 'success' && "bg-green-500/20",
                          status === 'warning' && "bg-yellow-500/20",
                          status === 'danger' && "bg-red-500/20"
                        )}>
                          <span className={cn(
                            status === 'success' && "text-green-500",
                            status === 'warning' && "text-yellow-500",
                            status === 'danger' && "text-red-500"
                          )}>
                            {goalTypeIcons[goal.goal_type]}
                          </span>
                        </div>
                        <span className="text-xs font-medium truncate text-foreground/80">
                          {goal.title}
                        </span>
                      </div>
                      {status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className={cn(
                          "h-4 w-4",
                          status === 'warning' ? "text-yellow-500" : "text-red-500"
                        )} />
                      )}
                    </div>
                    
                    {/* Value */}
                    <div className="flex items-baseline justify-between mb-2">
                      <span className={cn(
                        "text-2xl font-bold",
                        status === 'success' && "text-green-500",
                        status === 'warning' && "text-yellow-500",
                        status === 'danger' && "text-red-500"
                      )}>
                        {isPerClient ? current.toFixed(1) : current}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {goal.target_min}-{goal.target_max}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="relative h-2 rounded-full bg-black/20 overflow-hidden mb-2">
                      <div 
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                          status === 'success' && "bg-gradient-to-r from-green-500 to-emerald-400",
                          status === 'warning' && "bg-gradient-to-r from-yellow-500 to-amber-400",
                          status === 'danger' && "bg-gradient-to-r from-red-500 to-rose-400"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                      {/* Shimmer effect */}
                      <div 
                        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                        style={{ 
                          transform: 'translateX(-100%)',
                          animation: 'shimmer 2s infinite',
                        }}
                      />
                    </div>
                    
                    {/* Status message */}
                    <p className={cn(
                      "text-xs font-medium",
                      status === 'success' && "text-green-500",
                      status === 'warning' && "text-yellow-500",
                      status === 'danger' && "text-muted-foreground"
                    )}>
                      {current < goal.target_min && (
                        <>Encore {(goal.target_min - current).toFixed(isPerClient ? 1 : 0)} pour l'objectif</>
                      )}
                      {current >= goal.target_min && current < goal.target_max && (
                        <>Objectif atteint ! 🎉</>
                      )}
                      {current >= goal.target_max && (
                        <>Excellent ! 🏆</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* History section */}
      {showHistory && <DailyGoalsHistory agentId={agentId} />}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
