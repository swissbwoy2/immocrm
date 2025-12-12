import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Trophy, Medal, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

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
  bronze: 'from-amber-700/30 to-amber-600/20 text-amber-600 border-amber-500/40',
  silver: 'from-slate-400/30 to-slate-300/20 text-slate-400 border-slate-400/40',
  gold: 'from-yellow-500/30 to-yellow-400/20 text-yellow-500 border-yellow-500/40',
  star: 'from-blue-500/30 to-blue-400/20 text-blue-400 border-blue-500/40',
  trophy: 'from-purple-500/30 to-purple-400/20 text-purple-400 border-purple-500/40',
  champion: 'from-red-500/30 to-red-400/20 text-red-400 border-red-500/40',
  legend: 'from-purple-500/30 via-pink-500/30 to-purple-500/30 text-purple-400 border-purple-500/40',
};

const badgeGlowColors: Record<string, string> = {
  bronze: 'hover:shadow-[0_0_20px_rgba(180,83,9,0.4)]',
  silver: 'hover:shadow-[0_0_20px_rgba(148,163,184,0.4)]',
  gold: 'hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]',
  star: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]',
  trophy: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]',
  champion: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',
  legend: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]',
};

const categoryEmojis: Record<string, string> = {
  offres: '📨',
  visites: '🏠',
  candidatures: '📋',
  transactions: '💰',
  commissions: '💵',
  streak: '🔥',
  special: '⭐',
  speed: '⚡',
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
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="mt-3 text-sm">Chargement des badges...</p>
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) {
    return compact ? null : (
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border-border/50">
        <FloatingParticles count={6} />
        
        {/* Header premium */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
              <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Mes badges</h3>
              <p className="text-sm text-muted-foreground">Récompenses et accomplissements</p>
            </div>
          </div>
        </div>
        
        <CardContent className="py-8 text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-muted/20 rounded-full blur-xl" />
            <Award className="relative h-16 w-16 text-muted-foreground/30" />
          </div>
          <p className="font-medium text-muted-foreground">Aucun badge pour l'instant</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Continuez vos efforts pour débloquer des récompenses !</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {badges.slice(0, 5).map((badge, index) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger>
                <div 
                  className={cn(
                    "relative p-2 rounded-full border bg-gradient-to-br transition-all duration-300",
                    badgeColors[badge.badge_type],
                    badgeGlowColors[badge.badge_type],
                    badge.badge_type === 'legend' && 'animate-pulse'
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {badgeIcons[badge.badge_type]}
                  {badge.badge_type === 'legend' && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 animate-spin" style={{ animationDuration: '3s' }} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-card/95 backdrop-blur-xl border-border/50">
                <p className="font-semibold">{badge.title}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {badges.length > 5 && (
            <Badge variant="secondary" className="text-xs bg-secondary/50 backdrop-blur-sm">
              +{badges.length - 5}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border-border/50">
      <FloatingParticles count={10} />
      
      {/* Glow effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
      
      {/* Header premium */}
      <div className="relative p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300" />
              <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 group-hover:border-primary/40 transition-all duration-300">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Mes badges</h3>
              <p className="text-sm text-muted-foreground">Récompenses et accomplissements</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            {badges.length} badge{badges.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
      
      <CardContent className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge, index) => (
            <div 
              key={badge.id}
              className={cn(
                "relative group p-4 rounded-xl border bg-gradient-to-br flex flex-col items-center gap-3 transition-all duration-300 hover:scale-[1.02]",
                badgeColors[badge.badge_type],
                badgeGlowColors[badge.badge_type],
                badge.badge_type === 'legend' && 'animate-pulse'
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'fade-in 0.5s ease-out forwards',
                opacity: 0
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </div>
              
              {/* Legend special ring */}
              {badge.badge_type === 'legend' && (
                <div className="absolute inset-0 rounded-xl">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              )}
              
              <div className="flex items-center gap-3 w-full">
                {/* Category emoji */}
                <div className="relative text-2xl filter drop-shadow-lg shrink-0">
                  {categoryEmojis[badge.badge_category]}
                </div>
                
                {/* Badge icon */}
                <div className="relative p-2 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10 shrink-0">
                  {badgeIcons[badge.badge_type]}
                </div>
                
                {/* Title */}
                <span className="relative text-sm font-semibold flex-1">
                  {badge.title}
                </span>
              </div>
              
              {/* Description */}
              <p className="relative text-xs text-center opacity-80 leading-relaxed">
                {badge.description}
              </p>
              
              {/* Date */}
              <p className="relative text-xs opacity-60 flex items-center gap-1 mt-auto">
                <Sparkles className="h-3 w-3" />
                {format(new Date(badge.earned_at), 'd MMM yyyy', { locale: fr })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </Card>
  );
}
