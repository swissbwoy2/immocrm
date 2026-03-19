import { Flame, Zap, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HeatLevel = 'hot' | 'warm' | 'cold';

interface ClientScoringBadgeProps {
  score: number;
  showScore?: boolean;
  className?: string;
}

export function getHeatLevel(score: number): HeatLevel {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function calculateClientScore(client: {
  budget_max?: number | null;
  derniere_activite?: string | null;
  nb_offres_recues?: number;
  nb_candidatures?: number;
  dossier_complet?: boolean;
  statut?: string | null;
}): number {
  let score = 0;

  // Budget (0-25 pts)
  if (client.budget_max) {
    if (client.budget_max >= 3000) score += 25;
    else if (client.budget_max >= 2000) score += 20;
    else if (client.budget_max >= 1500) score += 15;
    else score += 10;
  }

  // Activity recency (0-30 pts)
  if (client.derniere_activite) {
    const daysSince = Math.floor((Date.now() - new Date(client.derniere_activite).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) score += 30;
    else if (daysSince <= 3) score += 25;
    else if (daysSince <= 7) score += 15;
    else if (daysSince <= 14) score += 5;
  }

  // Reactions to offers (0-25 pts)
  const reactions = (client.nb_candidatures || 0);
  if (reactions >= 3) score += 25;
  else if (reactions >= 1) score += 15;
  else if ((client.nb_offres_recues || 0) > 0) score += 5;

  // Dossier completeness (0-20 pts)
  if (client.dossier_complet) score += 20;
  else score += 5;

  // Active status bonus
  if (client.statut === 'actif') score += 0; // baseline
  else if (client.statut === 'reloge') score -= 20;
  else if (client.statut === 'suspendu') score -= 30;

  return Math.max(0, Math.min(100, score));
}

const heatConfig = {
  hot: {
    icon: Flame,
    label: 'Chaud',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
  },
  warm: {
    icon: Zap,
    label: 'Tiède',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  cold: {
    icon: Snowflake,
    label: 'Froid',
    color: 'text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

export function ClientScoringBadge({ score, showScore = false, className }: ClientScoringBadgeProps) {
  const heat = getHeatLevel(score);
  const config = heatConfig[heat];
  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium',
      config.bg, config.border, config.color,
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      {showScore && <span className="opacity-70">({score})</span>}
    </div>
  );
}
