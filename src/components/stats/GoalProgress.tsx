import { Target, Trophy, Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nombreSuisse } from './statsFormat';
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
  { threshold: 0, message: "C'est parti !", color: "text-primary" },
  { threshold: 25, message: "Bon début !", color: "text-primary" },
  { threshold: 50, message: "À mi-chemin !", color: "text-primary" },
  { threshold: 75, message: "Presque là !", color: "text-amber-700 dark:text-amber-400" },
  { threshold: 90, message: "Sprint final !", color: "text-amber-700 dark:text-amber-400" },
  { threshold: 100, message: "Objectif atteint !", color: "text-emerald-700 dark:text-emerald-400" },
  { threshold: 150, message: "Champion !", color: "text-emerald-700 dark:text-emerald-400" },
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

  const done = percentage >= 100;

  return (
    <div className={cn(
      "flex h-full min-w-0 flex-col rounded-xl border bg-background p-4",
      done ? "border-emerald-500/40" : "border-border/70"
    )}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"
        )}>
          {done ? <Trophy className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={title}>{title}</h4>
        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", motivation.color)}>
          {percentage} %
        </span>
      </div>

      <div className="mt-3 flex min-w-0 items-baseline gap-1">
        <span className={cn(
          "text-2xl font-semibold leading-none tracking-tight tabular-nums",
          done ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
        )}>
          {nombreSuisse(current)}
        </span>
        <span className="truncate text-sm text-muted-foreground">/ {nombreSuisse(goal)} {unit}</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            done ? "bg-emerald-500" : percentage >= 75 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${animatedValue}%` }}
        />
      </div>

      <div className="mt-2 min-h-[2rem] space-y-0.5">
        {showMotivation && (
          <p className={cn("text-xs font-medium", motivation.color)}>
            {motivation.message}
          </p>
        )}
        {percentage < 100 && goal > current && (
          <p className="text-xs text-muted-foreground">
            Plus que <span className="font-semibold text-foreground">{nombreSuisse(goal - current)}</span> {unit} pour atteindre l'objectif !
          </p>
        )}
      </div>
    </div>
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {goals.map((goal, index) => (
        <GoalProgress key={index} {...goal} />
      ))}
    </div>
  );
}
