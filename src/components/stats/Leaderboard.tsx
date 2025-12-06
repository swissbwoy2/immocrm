import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  previousRank?: number;
  subtitle?: string;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  valueLabel?: string;
  maxEntries?: number;
  highlightId?: string;
  showRankChange?: boolean;
}

const rankIcons = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10' },
];

export function Leaderboard({
  title,
  entries,
  valueLabel = 'points',
  maxEntries = 5,
  highlightId,
  showRankChange = true,
}: LeaderboardProps) {
  const sortedEntries = [...entries].sort((a, b) => b.value - a.value).slice(0, maxEntries);

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-primary/10 hover:border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <span className="transition-transform duration-300 group-hover:scale-[1.02] origin-left">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedEntries.map((entry, index) => {
          const rank = index + 1;
          const rankInfo = rankIcons[index] || null;
          const isHighlighted = entry.id === highlightId;
          const isTopRank = index === 0;
          
          let rankChange: 'up' | 'down' | 'same' | null = null;
          if (showRankChange && entry.previousRank !== undefined) {
            if (entry.previousRank > rank) rankChange = 'up';
            else if (entry.previousRank < rank) rankChange = 'down';
            else rankChange = 'same';
          }

          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                "hover:bg-muted/50 hover:translate-x-1",
                isHighlighted && "bg-primary/10 border border-primary/30",
                isTopRank && !isHighlighted && "bg-yellow-500/5"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Rank */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                rankInfo ? rankInfo.bg : "bg-muted"
              )}>
                {rankInfo ? (
                  <rankInfo.icon className={cn("h-4 w-4", rankInfo.color)} />
                ) : (
                  <span className="text-muted-foreground">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {entry.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name and subtitle */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm truncate",
                  isHighlighted && "text-primary"
                )}>
                  {entry.name}
                  {isHighlighted && <Badge variant="outline" className="ml-2 text-xs">Vous</Badge>}
                </p>
                {entry.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{entry.subtitle}</p>
                )}
              </div>

              {/* Value */}
              <div className="text-right">
                <p className="font-bold text-sm">{entry.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{valueLabel}</p>
              </div>

              {/* Rank change indicator */}
              {rankChange && (
                <div className="w-6">
                  {rankChange === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {rankChange === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {rankChange === 'same' && <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
              )}
            </div>
          );
        })}

        {entries.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            Aucune donnée disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
