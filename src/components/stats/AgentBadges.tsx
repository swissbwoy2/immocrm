import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Trophy, Medal, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AgentBadge {
  id: string;
  agent_id: string;
  badge_type: string;
  badge_category: string;
  title: string;
  description: string;
  earned_at: string;
  metadata: Record<string, any>;
}

interface AgentBadgesProps {
  agentId: string;
  compact?: boolean;
}

const badgeIcons: Record<string, React.ReactNode> = {
  bronze: <Medal className="h-5 w-5" />,
  silver: <Medal className="h-5 w-5" />,
  gold: <Medal className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  trophy: <Trophy className="h-5 w-5" />,
  champion: <Crown className="h-5 w-5" />,
  legend: <Sparkles className="h-5 w-5" />,
};

const badgeColors: Record<string, string> = {
  bronze: 'bg-amber-700/20 text-amber-700 border-amber-700/30',
  silver: 'bg-slate-400/20 text-slate-500 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  star: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  trophy: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  champion: 'bg-red-500/20 text-red-600 border-red-500/30',
  legend: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 border-purple-500/30',
};

const categoryEmojis: Record<string, string> = {
  offres: '📨',
  visites: '🏠',
  candidatures: '📋',
  transactions: '💰',
  commissions: '💵',
  streak: '🔥',
  special: '⭐',
};

export function AgentBadges({ agentId, compact = false }: AgentBadgesProps) {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['agent-badges', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_badges')
        .select('*')
        .eq('agent_id', agentId)
        .order('earned_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentBadge[];
    },
    enabled: !!agentId,
  });

  if (isLoading) {
    return compact ? null : (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Chargement des badges...
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) {
    return compact ? null : (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Mes badges
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Aucun badge pour l'instant</p>
          <p className="text-sm">Continuez vos efforts pour débloquer des récompenses !</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {badges.slice(0, 5).map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger>
                <div className={cn(
                  "p-1.5 rounded-full border",
                  badgeColors[badge.badge_type]
                )}>
                  {badgeIcons[badge.badge_type]}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{badge.title}</p>
                <p className="text-xs">{badge.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {badges.length > 5 && (
            <Badge variant="secondary" className="text-xs">
              +{badges.length - 5}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Mes badges ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {badges.map((badge) => (
            <TooltipProvider key={badge.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "p-3 rounded-lg border flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105",
                    badgeColors[badge.badge_type]
                  )}>
                    <div className="text-2xl">
                      {categoryEmojis[badge.badge_category]}
                    </div>
                    {badgeIcons[badge.badge_type]}
                    <span className="text-xs font-medium text-center line-clamp-2">
                      {badge.title}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">{badge.title}</p>
                  <p className="text-sm">{badge.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Obtenu le {format(new Date(badge.earned_at), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
