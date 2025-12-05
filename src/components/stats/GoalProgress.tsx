import { Target, Trophy, Flame, Star, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface GoalProgressProps {
  title: string;
  current: number;
  goal: number;
  unit?: string;
  icon?: 'target' | 'trophy' | 'flame' | 'star';
  showMotivation?: boolean;
}

const icons = {
  target: Target,
  trophy: Trophy,
  flame: Flame,
  star: Star,
};

const motivationalMessages = [
  { threshold: 0, message: "C'est parti ! 🚀", color: "text-blue-600 dark:text-blue-400" },
  { threshold: 25, message: "Bon début ! 💪", color: "text-blue-600 dark:text-blue-400" },
  { threshold: 50, message: "À mi-chemin ! 🔥", color: "text-orange-600 dark:text-orange-400" },
  { threshold: 75, message: "Presque là ! ⚡", color: "text-yellow-600 dark:text-yellow-400" },
  { threshold: 90, message: "Sprint final ! 🏃", color: "text-green-600 dark:text-green-400" },
  { threshold: 100, message: "Objectif atteint ! 🏆", color: "text-green-600 dark:text-green-400" },
  { threshold: 150, message: "Champion ! 👑", color: "text-purple-600 dark:text-purple-400" },
];

export function GoalProgress({
  title,
  current,
  goal,
  unit = '',
  icon = 'target',
  showMotivation = true,
}: GoalProgressProps) {
  const Icon = icons[icon];
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const clampedPercentage = Math.min(percentage, 100);
  const [showCelebration, setShowCelebration] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const motivation = motivationalMessages.reduce((prev, curr) => 
    percentage >= curr.threshold ? curr : prev
  , motivationalMessages[0]);

  // Animate the progress value
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(clampedPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [clampedPercentage]);

  // Show celebration when goal is achieved
  useEffect(() => {
    if (percentage >= 100) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  const progressGradient = percentage >= 100 
    ? 'from-green-500 to-emerald-400' 
    : percentage >= 75 
    ? 'from-yellow-500 to-amber-400' 
    : percentage >= 50 
    ? 'from-orange-500 to-red-400' 
    : 'from-primary to-blue-400';

  return (
    <Card className={cn(
      "relative overflow-hidden group transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-1",
      percentage >= 100 && "border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/10",
      showCelebration && "animate-celebration"
    )}>
      {/* Celebration sparkles */}
      {percentage >= 100 && (
        <>
          <div className="absolute top-2 right-2 flex gap-1">
            <Trophy className="h-5 w-5 text-yellow-500 animate-bounce" />
            <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
          </div>
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg transition-all duration-300 group-hover:scale-110",
            percentage >= 100 
              ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400" 
              : "bg-primary/10 text-primary"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className={cn(
                "text-3xl font-bold transition-all duration-300",
                percentage >= 100 && "text-green-600 dark:text-green-400"
              )}>
                {current.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm"> / {goal.toLocaleString()} {unit}</span>
            </div>
            <span className={cn(
              "text-lg font-semibold transition-all duration-300",
              motivation.color,
              percentage >= 100 && "animate-pulse-soft"
            )}>
              {percentage}%
            </span>
          </div>
          
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                `bg-gradient-to-r ${progressGradient}`,
                percentage >= 100 && "progress-glow"
              )}
              style={{ width: `${animatedValue}%` }}
            />
            {percentage > 100 && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              />
            )}
          </div>
          
          {showMotivation && (
            <p className={cn(
              "text-sm font-medium text-center transition-all duration-300",
              motivation.color,
              percentage >= 100 && "text-lg"
            )}>
              {motivation.message}
            </p>
          )}
          
          {percentage < 100 && goal > current && (
            <p className="text-xs text-muted-foreground text-center">
              Plus que <span className="font-semibold">{(goal - current).toLocaleString()}</span> {unit} pour atteindre l'objectif !
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface GoalsGridProps {
  goals: Array<{
    title: string;
    current: number;
    goal: number;
    unit?: string;
    icon?: 'target' | 'trophy' | 'flame' | 'star';
  }>;
}

export function GoalsGrid({ goals }: GoalsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {goals.map((goal, index) => (
        <div 
          key={index} 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <GoalProgress {...goal} />
        </div>
      ))}
    </div>
  );
}
