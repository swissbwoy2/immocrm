import { useMemo } from 'react';

interface CapacityGaugeProps {
  currentValue: number;
  maxValue: number;
  label: string;
  unit?: string;
  thresholds?: {
    danger: number;
    warning: number;
  };
}

export default function CapacityGauge({ 
  currentValue, 
  maxValue, 
  label, 
  unit = '%',
  thresholds = { danger: 33, warning: 25 }
}: CapacityGaugeProps) {
  const percentage = useMemo(() => {
    if (maxValue <= 0) return 0;
    return Math.min(100, Math.round((currentValue / maxValue) * 100));
  }, [currentValue, maxValue]);

  const displayValue = useMemo(() => {
    if (unit === '%') return currentValue;
    return currentValue;
  }, [currentValue, unit]);

  const getColor = () => {
    if (currentValue > thresholds.danger) return 'text-destructive';
    if (currentValue > thresholds.warning) return 'text-orange-500';
    return 'text-green-600';
  };

  const getGlowColor = () => {
    if (currentValue > thresholds.danger) return 'shadow-red-500/30';
    if (currentValue > thresholds.warning) return 'shadow-orange-500/30';
    return 'shadow-green-500/30';
  };

  // Calculate needle rotation (0-180 degrees for half circle)
  const needleRotation = useMemo(() => {
    const normalizedValue = Math.min(currentValue, 50); // Cap at 50 for visual
    return (normalizedValue / 50) * 180 - 90; // -90 to 90 degrees
  }, [currentValue]);

  return (
    <div className="flex flex-col items-center">
      {/* Semi-circular gauge with glow */}
      <div className={`relative w-44 h-22 overflow-hidden transition-all duration-500`}>
        {/* Glow effect behind gauge */}
        <div className={`absolute inset-0 blur-xl opacity-50 ${
          currentValue > thresholds.danger 
            ? 'bg-red-500/20' 
            : currentValue > thresholds.warning 
              ? 'bg-orange-500/20'
              : 'bg-green-500/20'
        }`} />
        
        {/* Background arc */}
        <div className="absolute inset-0 relative">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            {/* Background track */}
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted/20"
            />
            {/* Green zone (0-25%) */}
            <path
              d="M 5 50 A 45 45 0 0 1 27.5 12.5"
              fill="none"
              stroke="url(#greenGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              className="drop-shadow-lg"
            />
            {/* Orange zone (25-33%) */}
            <path
              d="M 27.5 12.5 A 45 45 0 0 1 38 7"
              fill="none"
              stroke="url(#orangeGradient)"
              strokeWidth="10"
              className="drop-shadow-lg"
            />
            {/* Red zone (33%+) */}
            <path
              d="M 38 7 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="url(#redGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              className="drop-shadow-lg"
            />
            {/* Gradients */}
            <defs>
              <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
              <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Needle with glow */}
        <div 
          className={`absolute bottom-0 left-1/2 w-1 h-16 origin-bottom transition-transform duration-700 ease-out ${getGlowColor()}`}
          style={{ 
            transform: `translateX(-50%) rotate(${needleRotation}deg)`,
            filter: 'drop-shadow(0 0 4px currentColor)'
          }}
        >
          <div className="w-full h-full bg-gradient-to-t from-foreground via-foreground to-foreground/70 rounded-t-full" />
        </div>
        
        {/* Center dot with pulse */}
        <div className="absolute bottom-0 left-1/2 w-5 h-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground border-2 border-background shadow-lg">
          <div className="absolute inset-0 rounded-full bg-foreground/50 animate-ping" />
        </div>
      </div>

      {/* Value display with glow */}
      <div className="mt-3 text-center">
        <div className={`relative inline-block ${getGlowColor()} shadow-lg rounded-lg px-4 py-1`}>
          <span className={`text-3xl font-bold ${getColor()} transition-colors duration-300`}>
            {displayValue}{unit}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{label}</p>
      </div>

      {/* Threshold markers */}
      <div className="flex justify-between w-full mt-3 text-xs text-muted-foreground px-2">
        <span className="text-green-500 font-medium">0%</span>
        <span className="text-orange-500 font-medium">25%</span>
        <span className="text-destructive font-medium">33%</span>
        <span className="text-destructive/70">50%+</span>
      </div>

      {/* Status indicator with animation */}
      <div className={`mt-3 px-4 py-2 rounded-full text-xs font-medium transition-all duration-500 ${
        currentValue > thresholds.danger 
          ? 'bg-destructive/10 text-destructive shadow-lg shadow-destructive/20' 
          : currentValue > thresholds.warning 
            ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 shadow-lg shadow-orange-500/20'
            : 'bg-green-100 dark:bg-green-950/50 text-green-600 shadow-lg shadow-green-500/20'
      }`}>
        {currentValue > thresholds.danger 
          ? '⚠️ Taux d\'effort trop élevé' 
          : currentValue > thresholds.warning 
            ? '⚡ Taux d\'effort limite'
            : '✅ Taux d\'effort acceptable'}
      </div>
    </div>
  );
}
