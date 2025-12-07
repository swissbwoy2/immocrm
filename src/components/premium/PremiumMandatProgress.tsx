import { Calendar, Clock, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PremiumMandatProgressProps {
  daysElapsed: number;
  daysRemaining: number;
  totalDays?: number;
  startDate: string;
  className?: string;
}

export function PremiumMandatProgress({
  daysElapsed,
  daysRemaining,
  totalDays = 90,
  startDate,
  className
}: PremiumMandatProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedDays, setAnimatedDays] = useState(0);
  
  const progressPercentage = Math.min((daysElapsed / totalDays) * 100, 100);
  const endDate = new Date(new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000);
  
  // Determine status
  const getStatus = () => {
    if (daysRemaining <= 0) return { label: 'Expiré', color: 'red', icon: AlertTriangle };
    if (daysElapsed < totalDays * 0.5) return { label: 'En bonne voie', color: 'green', icon: TrendingUp };
    if (daysElapsed < totalDays * 0.75) return { label: 'Mi-parcours', color: 'orange', icon: Clock };
    return { label: 'Fin proche', color: 'orange', icon: AlertTriangle };
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
    const increment = Math.floor(daysElapsed) / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= daysElapsed) {
        setAnimatedDays(Math.floor(daysElapsed));
        clearInterval(interval);
      } else {
        setAnimatedDays(Math.floor(current));
      }
    }, duration / steps);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [progressPercentage, daysElapsed]);
  
  // Calculate stroke dasharray for circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;
  
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-br from-card/90 via-card/80 to-card/70',
      'backdrop-blur-xl border border-border/50',
      'p-6 shadow-lg',
      'group hover:shadow-xl transition-all duration-500',
      className
    )}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 animate-gradient-x" />
        <div className="absolute inset-[1px] rounded-2xl bg-card" />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute w-1.5 h-1.5 rounded-full animate-float',
              status.color === 'green' ? 'bg-green-500/30' :
              status.color === 'orange' ? 'bg-orange-500/30' :
              'bg-red-500/30'
            )}
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Progression du mandat</h3>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Circular Progress */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-1000 ease-out',
                  status.color === 'green' ? 'stroke-green-500' :
                  status.color === 'orange' ? 'stroke-orange-500' :
                  'stroke-red-500'
                )}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(animatedProgress)}%</span>
              <span className="text-xs text-muted-foreground">{animatedDays}/{totalDays}j</span>
            </div>
            
            {/* Glow effect */}
            <div className={cn(
              'absolute inset-0 rounded-full blur-xl opacity-20',
              status.color === 'green' ? 'bg-green-500' :
              status.color === 'orange' ? 'bg-orange-500' :
              'bg-red-500'
            )} />
          </div>
          
          {/* Timeline */}
          <div className="flex-1 w-full">
            <div className="relative">
              {/* Progress bar */}
              <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all duration-1000 ease-out',
                    status.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                    status.color === 'orange' ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-rose-400'
                  )}
                  style={{ width: `${animatedProgress}%` }}
                />
              </div>
              
              {/* Phase markers */}
              <div className="absolute inset-x-0 top-0 h-3 flex items-center">
                <div className="absolute left-0 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className={cn(
                  'absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background transition-colors',
                  progressPercentage >= 50 ? 'bg-primary' : 'bg-muted'
                )} />
                <div className={cn(
                  'absolute right-0 w-3 h-3 rounded-full border-2 border-background transition-colors',
                  progressPercentage >= 100 ? 'bg-primary' : 'bg-muted'
                )} />
              </div>
              
              {/* Labels */}
              <div className="flex justify-between mt-4 text-xs text-muted-foreground">
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
          </div>
          
          {/* Status card */}
          <div className={cn(
            'flex-shrink-0 p-4 rounded-xl text-center min-w-[140px]',
            'backdrop-blur-sm border',
            status.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
            status.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30' :
            'bg-red-500/10 border-red-500/30'
          )}>
            <div className={cn(
              'w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center',
              status.color === 'green' ? 'bg-green-500/20' :
              status.color === 'orange' ? 'bg-orange-500/20' :
              'bg-red-500/20'
            )}>
              <StatusIcon className={cn(
                'w-5 h-5',
                status.color === 'green' ? 'text-green-500' :
                status.color === 'orange' ? 'text-orange-500' :
                'text-red-500'
              )} />
            </div>
            <p className="text-2xl font-bold">{Math.ceil(daysRemaining)}</p>
            <p className="text-xs text-muted-foreground">jours restants</p>
            <div className={cn(
              'mt-2 px-2 py-1 rounded-full text-xs font-medium',
              status.color === 'green' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
              status.color === 'orange' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300' :
              'bg-red-500/20 text-red-700 dark:text-red-300'
            )}>
              {status.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
