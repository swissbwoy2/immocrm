import { FileStack, Target, CheckCircle, Key } from "lucide-react";

interface KPIData {
  total: number;
  actives: number;
  acceptees: number;
  clesRemises: number;
}

interface PremiumCandidatureKPIsProps {
  data: KPIData;
}

// Animated number component
const AnimatedNumber = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

import { useState, useEffect } from "react";

export function PremiumCandidatureKPIs({ data }: PremiumCandidatureKPIsProps) {
  const kpis = [
    {
      label: "Total",
      value: data.total,
      icon: FileStack,
      gradient: "from-blue-500 to-indigo-600",
      bgGlow: "bg-blue-500/20",
    },
    {
      label: "Actives",
      value: data.actives,
      icon: Target,
      gradient: "from-amber-500 to-orange-600",
      bgGlow: "bg-amber-500/20",
    },
    {
      label: "Acceptées",
      value: data.acceptees,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
      bgGlow: "bg-emerald-500/20",
    },
    {
      label: "Clés remises",
      value: data.clesRemises,
      icon: Key,
      gradient: "from-violet-500 to-purple-600",
      bgGlow: "bg-violet-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, index) => (
        <div
          key={kpi.label}
          className="group relative animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Glow effect */}
          <div className={`absolute inset-0 ${kpi.bgGlow} rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
          
          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border border-border/50 p-4 md:p-5 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg group-hover:-translate-y-1">
            {/* Gradient bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
            
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center gap-2">
              {/* Icon */}
              <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              
              {/* Value */}
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                <AnimatedNumber value={kpi.value} />
              </div>
              
              {/* Label */}
              <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
            </div>
            
            {/* Floating particles for special values */}
            {kpi.value > 0 && kpi.label === "Clés remises" && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-violet-400/40 animate-pulse"
                    style={{
                      left: `${20 + i * 30}%`,
                      top: `${30 + i * 15}%`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
