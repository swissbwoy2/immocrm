import { cn } from '@/lib/utils';
import { Home, Wallet, CreditCard, TrendingUp, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PurchaseSolvabilityResult {
  prixAchatMax: number;
  apportManquant: number;
  chargesMensuelles: number;
  tauxEffort: number;
}

interface PremiumPurchaseCapacityCardProps {
  result: PurchaseSolvabilityResult;
  apportPersonnel: number;
  className?: string;
}

function AnimatedValue({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return (
    <span>
      {prefix}{Math.round(displayValue).toLocaleString('fr-CH')}{suffix}
    </span>
  );
}

export function PremiumPurchaseCapacityCard({ 
  result, 
  apportPersonnel,
  className 
}: PremiumPurchaseCapacityCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const metrics = [
    {
      label: 'Prix max finançable',
      value: result.prixAchatMax,
      suffix: ' CHF',
      icon: Home,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'from-blue-500/10 to-blue-600/5',
      borderColor: 'hover:border-blue-400/50',
    },
    {
      label: 'Apport disponible',
      value: apportPersonnel,
      suffix: ' CHF',
      icon: Wallet,
      color: result.apportManquant === 0 
        ? 'text-emerald-600 dark:text-emerald-400' 
        : 'text-amber-600 dark:text-amber-400',
      bgColor: result.apportManquant === 0 
        ? 'from-emerald-500/10 to-emerald-600/5' 
        : 'from-amber-500/10 to-amber-600/5',
      borderColor: result.apportManquant === 0 
        ? 'hover:border-emerald-400/50' 
        : 'hover:border-amber-400/50',
    },
    {
      label: 'Charges mensuelles',
      value: result.chargesMensuelles,
      suffix: ' CHF',
      icon: CreditCard,
      color: 'text-slate-700 dark:text-slate-300',
      bgColor: 'from-slate-500/10 to-slate-600/5',
      borderColor: 'hover:border-slate-400/50',
    },
    {
      label: "Taux d'effort",
      value: result.tauxEffort,
      suffix: '%',
      icon: TrendingUp,
      color: result.tauxEffort <= 33 
        ? 'text-emerald-600 dark:text-emerald-400' 
        : 'text-red-600 dark:text-red-400',
      bgColor: result.tauxEffort <= 33 
        ? 'from-emerald-500/10 to-emerald-600/5' 
        : 'from-red-500/10 to-red-600/5',
      borderColor: result.tauxEffort <= 33 
        ? 'hover:border-emerald-400/50' 
        : 'hover:border-red-400/50',
    },
  ];

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-card/80 backdrop-blur-xl',
        'border border-blue-200/50 dark:border-blue-800/50',
        'hover:shadow-xl hover:shadow-blue-500/10',
        'transition-all duration-500 hover:-translate-y-1',
        'group',
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-4 right-8 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl animate-float" 
          style={{ animationDelay: '0s' }} 
        />
        <div 
          className="absolute bottom-4 left-8 w-16 h-16 bg-cyan-500/10 rounded-full blur-2xl animate-float" 
          style={{ animationDelay: '1.5s' }} 
        />
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/20 transition-shadow duration-300">
            <Home className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Capacité d'achat
            </h3>
            <p className="text-xs text-muted-foreground">Calcul basé sur les normes suisses</p>
          </div>
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div 
                key={metric.label}
                className={cn(
                  'relative overflow-hidden p-4 rounded-xl',
                  'bg-gradient-to-br backdrop-blur-sm',
                  metric.bgColor,
                  'border border-blue-200/30 dark:border-blue-800/30',
                  metric.borderColor,
                  'hover:scale-[1.02] transition-all duration-300',
                  'group/metric',
                  isVisible ? 'animate-fade-in' : 'opacity-0'
                )}
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', metric.color)} />
                  <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                </div>
                <p className={cn('text-lg font-bold', metric.color)}>
                  <AnimatedValue value={metric.value} suffix={metric.suffix} />
                </p>
              </div>
            );
          })}
        </div>
        
        {/* Info note */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200/30 dark:border-blue-800/30">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>Calcul suisse:</strong> Apport min. 26% (20% achat + 5% notaire + 1% entretien). 
              Charges théoriques = 7%/an. Max 33% du revenu brut annuel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
