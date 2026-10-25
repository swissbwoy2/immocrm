import { Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle2, Home, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

interface PremiumMandatProgressProps {
  daysElapsed: number;
  daysRemaining: number;
  totalDays?: number;
  startDate: string;
  className?: string;
  isRelogged?: boolean;
  reloggedStatus?: 'signature_effectuee' | 'etat_lieux_fixe' | 'cles_remises' | null;
  reloggedDate?: string | null;
}

export function PremiumMandatProgress({
  daysElapsed,
  daysRemaining,
  totalDays = 90,
  startDate,
  className,
  isRelogged = false,
  reloggedStatus = null,
  reloggedDate = null
}: PremiumMandatProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedDays, setAnimatedDays] = useState(0);
  
  const progressPercentage = isRelogged ? 100 : Math.min((daysElapsed / totalDays) * 100, 100);
  const endDate = new Date(new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000);
  
  // Determine status
  const getStatus = () => {
    if (isRelogged) {
      return { label: getReloggedLabel(), color: 'emerald', icon: Home };
    }
    if (daysRemaining <= 0) return { label: 'Expiré', color: 'red', icon: AlertTriangle };
    if (daysElapsed < totalDays * 0.5) return { label: 'En bonne voie', color: 'green', icon: TrendingUp };
    if (daysElapsed < totalDays * 0.75) return { label: 'Mi-parcours', color: 'orange', icon: Clock };
    return { label: 'Fin proche', color: 'orange', icon: AlertTriangle };
  };
  
  const getReloggedLabel = () => {
    switch (reloggedStatus) {
      case 'cles_remises': return 'Relogé !';
      case 'etat_lieux_fixe': return 'EDL fixé';
      case 'signature_effectuee': return 'Bail signé';
      default: return 'Relogé';
    }
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  // Animate progress on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progressPercentage);
    }, 100);
    
    // Animate days counter
    const duration = 1500;
    const steps = 60;
    const targetDays = isRelogged ? daysElapsed : daysElapsed;
    const increment = Math.floor(targetDays) / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetDays) {
        setAnimatedDays(Math.floor(targetDays));
        clearInterval(interval);
      } else {
        setAnimatedDays(Math.floor(current));
      }
    }, duration / steps);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [progressPercentage, daysElapsed, isRelogged]);
  
  // Couleurs sobres par statut (tokens emerald / amber / destructive)
  const tone = status.color === 'green' || status.color === 'emerald'
    ? { pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' }
    : status.color === 'orange'
      ? { pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' }
      : { pill: 'bg-destructive/10 text-destructive', bar: 'bg-destructive' };
  
  // If relogged, show success state
  if (isRelogged) {
    return (
      <div className={cn(DASH_CARD, 'p-4 md:p-5', className)}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <PartyPopper className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold text-foreground">Mandat terminé avec succès !</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold leading-none text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Succès
          </span>
        </div>

        {/* Statut */}
        <div className="mt-4 flex items-center gap-2">
          <Home className="h-4 w-4 text-emerald-600" />
          <p className="font-semibold text-foreground">{getReloggedLabel()}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Félicitations ! Le client a trouvé son logement.
        </p>

        {/* Progression */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">100%</span>
            <span className="text-xs text-muted-foreground">Terminé</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full rounded-full bg-emerald-500" />
          </div>
        </div>

        {reloggedDate && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {reloggedStatus === 'cles_remises' ? 'Clés remises le' : 
               reloggedStatus === 'signature_effectuee' ? 'Bail signé le' :
               'État des lieux le'} {new Date(reloggedDate).toLocaleDateString('fr-CH')}
            </span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn(DASH_CARD, 'p-4 md:p-5', className)}>
      {/* Header : titre + temps restant */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </span>
          <h3 className="text-base font-semibold text-foreground">Progression du mandat</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none', tone.pill)}>
            <Clock className="h-3.5 w-3.5" />
            {Math.ceil(daysRemaining)} jours restants
          </span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none', tone.pill)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </span>
        </div>
      </div>

      {/* Barre de progression fine */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{Math.round(animatedProgress)}%</span>
          <span className="text-xs text-muted-foreground">{animatedDays}/{totalDays}j</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-out', tone.bar)}
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
      </div>

      {/* Ligne de dates */}
      <div className="mt-3 flex justify-between gap-2 text-xs text-muted-foreground">
        <div className="text-left">
          <p className="font-medium text-foreground">Début</p>
          <p>{new Date(startDate).toLocaleDateString('fr-CH')}</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Mi-parcours</p>
          <p>45 jours</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground">Fin</p>
          <p>{endDate.toLocaleDateString('fr-CH')}</p>
        </div>
      </div>
    </div>
  );
}
