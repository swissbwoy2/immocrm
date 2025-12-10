import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Sparkles, Wallet, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectionItem {
  clientId: string;
  clientName: string;
  budgetMax: number;
  splitAgent: number;
  partAgent: number;
}

interface PremiumProjectionFinanciereSectionProps {
  projections: ProjectionItem[];
  totalCommissionPotentielle: number;
  className?: string;
}

const AnimatedValue = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{displayValue.toLocaleString('fr-CH')}</>;
};

export function PremiumProjectionFinanciereSection({
  projections,
  totalCommissionPotentielle,
  className,
}: PremiumProjectionFinanciereSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border-emerald-500/20 hover:border-emerald-500/40",
        "transition-all duration-700 hover:shadow-2xl hover:-translate-y-1",
        "bg-gradient-to-br from-emerald-500/5 via-background to-green-500/5",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              left: `${5 + i * 8}%`,
              top: `${10 + (i % 5) * 18}%`,
              backgroundColor: i % 2 === 0 ? 'hsl(142 76% 36% / 0.25)' : 'hsl(160 84% 39% / 0.2)',
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-green-500/15 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-lg font-semibold flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-lg animate-pulse" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/30">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">
              Projection financière
            </span>
            <span className="text-xs text-muted-foreground font-normal">(3 derniers mois)</span>
          </div>
          <Sparkles className="h-4 w-4 text-emerald-400/60 animate-pulse ml-auto" />
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10">
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
          {projections.map((proj, index) => (
            <div
              key={proj.clientId}
              className={cn(
                "group/item relative flex items-center justify-between p-3 rounded-xl",
                "bg-gradient-to-r from-emerald-500/5 via-background/50 to-green-500/5",
                "border border-emerald-500/10 hover:border-emerald-500/30",
                "transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10",
                "transform hover:scale-[1.02]"
              )}
              style={{
                animationDelay: `${index * 0.1}s`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.5s ease-out ${index * 0.05}s`,
              }}
            >
              {/* Item glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover/item:bg-emerald-500/20 transition-colors duration-300">
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-foreground/90 group-hover/item:text-foreground transition-colors">
                    {proj.clientName}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    <span>Budget: {proj.budgetMax.toLocaleString('fr-CH')} CHF</span>
                  </div>
                </div>
              </div>
              
              <div className="relative text-right ml-3">
                <p className="font-bold text-emerald-400 group-hover/item:text-emerald-300 transition-colors">
                  +{proj.partAgent.toLocaleString('fr-CH')} CHF
                </p>
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-500/60" />
                  <span>{proj.splitAgent}% split</span>
                </div>
              </div>
            </div>
          ))}
          
          {projections.length === 0 && (
            <div className="relative text-center py-12">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
              </div>
              <div className="relative">
                <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <DollarSign className="h-8 w-8 text-emerald-400/50" />
                </div>
                <p className="text-muted-foreground text-sm">Aucune projection disponible</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Les projections apparaîtront avec les nouveaux clients</p>
              </div>
            </div>
          )}
        </div>

        {/* Total section */}
        {projections.length > 0 && (
          <div className="relative mt-4 pt-4 border-t border-emerald-500/20">
            {/* Shine effect on total */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent transform -skew-x-12 group-hover:animate-shimmer" />
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/30">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Total potentiel</p>
                  <p className="text-xs text-muted-foreground">{projections.length} client{projections.length > 1 ? 's' : ''} actif{projections.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-300 bg-clip-text text-transparent">
                  <AnimatedValue value={totalCommissionPotentielle} /> CHF
                </p>
                <p className="text-xs text-emerald-400/60">Commission estimée</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </Card>
  );
}
