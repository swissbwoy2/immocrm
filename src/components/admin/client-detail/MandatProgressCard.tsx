import { Clock, Home, Pause, StopCircle, TrendingUp } from 'lucide-react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import { formatZurichShortDate } from '@/lib/dateZurich';

/** Barre de progression simple, couleur unie (pas de dégradé ni d'animation). */
function Bar({ pct, tone }: { pct: number; tone: 'primary' | 'warning' | 'danger' | 'success' | 'muted' }) {
  const cls = {
    primary: 'bg-primary',
    warning: 'bg-amber-500',
    danger: 'bg-destructive',
    success: 'bg-emerald-500',
    muted: 'bg-muted-foreground/30',
  }[tone];
  return (
    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', cls)} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
    </div>
  );
}

/**
 * Progression du mandat de 90 jours (mêmes états que l'ancien en-tête) :
 * en attente d'activation, stoppé / suspendu (figé), relogé (terminé), en cours.
 */
export function MandatProgressCard({
  isActivated, clientStatut, candidatures, daysElapsed, daysRemaining, progressPercentage, isReletter,
}: {
  isActivated: boolean;
  clientStatut?: string;
  candidatures: any[];
  daysElapsed: number;
  daysRemaining: number;
  progressPercentage: number;
  isReletter: boolean;
}) {
  const shell = (children: React.ReactNode) => <section className={cn(DASH_CARD, 'p-4 sm:p-5')} aria-label="Progression du mandat">{children}</section>;

  // Not activated yet — show waiting state
  if (!isActivated) {
    return shell(
      <>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Clock className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">En attente d'activation</p>
            <p className="text-sm text-muted-foreground">Le mandat démarrera lorsque le client sera activé par l'admin</p>
          </div>
        </div>
        <Bar pct={0} tone="muted" />
      </>,
    );
  }

  const isRelogged = clientStatut === 'reloge' || candidatures.some(c => ['signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut));
  const reloggedCandidature = candidatures.find(c => ['cles_remises', 'etat_lieux_fixe', 'signature_effectuee'].includes(c.statut));

  // Show frozen state for stoppe/suspendu
  if (clientStatut === 'stoppe' || clientStatut === 'suspendu') {
    const stoppe = clientStatut === 'stoppe';
    const FrozenIcon = stoppe ? StopCircle : Pause;
    return shell(
      <>
        <div className="flex items-center gap-3">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', stoppe ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600')}>
            <FrozenIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className={cn('font-semibold', stoppe ? 'text-destructive' : 'text-amber-700 dark:text-amber-400')}>{stoppe ? 'Recherche stoppée' : 'Recherche suspendue'}</p>
            <p className="text-sm text-muted-foreground">Figé à J+{Math.floor(daysElapsed)} sur 90 jours</p>
          </div>
        </div>
        <Bar pct={progressPercentage} tone={stoppe ? 'danger' : 'warning'} />
      </>,
    );
  }

  if (isRelogged && reloggedCandidature) {
    const statusLabel = reloggedCandidature.statut === 'cles_remises' ? 'Relogé' :
      reloggedCandidature.statut === 'signature_effectuee' ? 'Bail signé' :
        'EDL fixé';
    return shell(
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Home className="h-[18px] w-[18px]" /></span>
        <div className="min-w-0">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">{statusLabel}</p>
          <p className="text-sm text-muted-foreground">
            Mandat terminé avec succès — Figé à J+{Math.floor(daysElapsed)}
            {reloggedCandidature.signature_effectuee_at && (
              <> le {formatZurichShortDate(reloggedCandidature.signature_effectuee_at)}</>
            )}
          </p>
        </div>
      </div>,
    );
  }

  const tone = daysElapsed < 60 ? 'primary' : daysElapsed < 90 ? 'warning' : 'danger';
  const pill = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];
  return shell(
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {isReletter ? 'Progression de la relocation' : 'Progression du mandat'}
        </p>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums', pill)}>
          <TrendingUp className="h-4 w-4" />
          {Math.floor(daysRemaining)}j {Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)}h
        </span>
      </div>
      <Bar pct={progressPercentage} tone={tone} />
      <p className="mt-1.5 text-right text-sm tabular-nums text-muted-foreground">{Math.floor(daysElapsed)} / 90 jours</p>
    </>,
  );
}
