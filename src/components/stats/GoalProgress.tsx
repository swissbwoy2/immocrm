import { Target, Trophy, Flame, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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
  { threshold: 0, message: "C'est parti ! 🚀", color: "text-blue-600" },
  { threshold: 25, message: "Bon début ! 💪", color: "text-blue-600" },
  { threshold: 50, message: "À mi-chemin ! 🔥", color: "text-orange-600" },
  { threshold: 75, message: "Presque là ! ⚡", color: "text-yellow-600" },
  { threshold: 90, message: "Sprint final ! 🏃", color: "text-green-600" },
  { threshold: 100, message: "Objectif atteint ! 🏆", color: "text-green-600" },
  { threshold: 150, message: "Champion ! 👑", color: "text-purple-600" },
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
  
  const motivation = motivationalMessages.reduce((prev, curr) => 
    percentage >= curr.threshold ? curr : prev
  , motivationalMessages[0]);

  const progressColor = percentage >= 100 
    ? 'bg-green-500' 
    : percentage >= 75 
    ? 'bg-yellow-500' 
    : percentage >= 50 
    ? 'bg-orange-500' 
    : 'bg-primary';

  return (
    <Card className={cn(
      "relative overflow-hidden",
      percentage >= 100 && "border-green-500/50 bg-green-500/5"
    )}>
      {percentage >= 100 && (
        <div className="absolute top-2 right-2">
          <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            percentage >= 100 ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
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
              <span className="text-3xl font-bold">{current.toLocaleString()}</span>
              <span className="text-muted-foreground text-sm"> / {goal.toLocaleString()} {unit}</span>
            </div>
            <span className={cn("text-lg font-semibold", motivation.color)}>
              {percentage}%
            </span>
          </div>
          
          <div className="relative">
            <Progress value={clampedPercentage} className="h-3" />
            {percentage > 100 && (
              <div 
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full animate-pulse"
                style={{ width: '100%' }}
              />
            )}
          </div>
          
          {showMotivation && (
            <p className={cn("text-sm font-medium text-center", motivation.color)}>
              {motivation.message}
            </p>
          )}
          
          {percentage < 100 && goal > current && (
            <p className="text-xs text-muted-foreground text-center">
              Plus que {(goal - current).toLocaleString()} {unit} pour atteindre l'objectif !
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
        <GoalProgress key={index} {...goal} />
      ))}
    </div>
  );
}
