import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { nombreSuisse } from './statsFormat';

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

/** Classement sobre : rang, nom (+ sous-texte), barre proportionnelle, valeur. */
export function Leaderboard({
  title,
  entries,
  valueLabel = 'points',
  maxEntries = 5,
  highlightId,
  showRankChange = true,
}: LeaderboardProps) {
  const sortedEntries = [...entries].sort((a, b) => b.value - a.value).slice(0, maxEntries);
  const maxValue = Math.max(...sortedEntries.map((e) => e.value), 0);

  return (
    <div className={`${DASH_CARD} flex h-full flex-col p-4 md:p-5`}>
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">sur la période</p>
        </div>
      </div>

      <ol className="divide-y divide-border/60">
        {sortedEntries.map((entry, index) => {
          const rank = index + 1;
          const isHighlighted = entry.id === highlightId;
          const width = maxValue > 0 ? Math.max((entry.value / maxValue) * 100, 2) : 0;

          let rankChange: 'up' | 'down' | 'same' | null = null;
          if (showRankChange && entry.previousRank !== undefined) {
            if (entry.previousRank > rank) rankChange = 'up';
            else if (entry.previousRank < rank) rankChange = 'down';
            else rankChange = 'same';
          }

          return (
            <li
              key={entry.id}
              className={cn(
                'flex items-center gap-3 py-2.5',
                isHighlighted && '-mx-2 rounded-xl bg-primary/[0.06] px-2'
              )}
            >
              {/* Rang */}
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                rank === 1 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {rank}
              </span>

              {/* Nom, sous-texte, barre */}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className={cn('truncate text-sm font-medium text-foreground', isHighlighted && 'text-primary')}>
                    {entry.name}
                  </p>
                  {isHighlighted && <Badge variant="outline" className="shrink-0 rounded-full text-xs">Vous</Badge>}
                </div>
                {entry.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>
                )}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', rank === 1 ? 'bg-primary' : 'bg-primary/50')}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>

              {/* Valeur */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-foreground">{nombreSuisse(entry.value)}</p>
                <p className="text-xs text-muted-foreground">{valueLabel}</p>
              </div>

              {/* Évolution du rang */}
              {rankChange && (
                <div className="w-5 shrink-0">
                  {rankChange === 'up' && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                  {rankChange === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
                  {rankChange === 'same' && <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {entries.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aucune donnée disponible
        </p>
      )}
    </div>
  );
}
