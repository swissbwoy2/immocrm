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

  const getGradient = () => {
    if (currentValue > thresholds.danger) {
      return 'from-red-500 to-red-600';
    }
    if (currentValue > thresholds.warning) {
      return 'from-orange-400 to-orange-500';
    }
    return 'from-green-400 to-green-500';
  };

  const getTrackColor = () => {
    if (currentValue > thresholds.danger) return 'bg-red-100 dark:bg-red-950/50';
    if (currentValue > thresholds.warning) return 'bg-orange-100 dark:bg-orange-950/50';
    return 'bg-green-100 dark:bg-green-950/50';
  };

  // Calculate needle rotation (0-180 degrees for half circle)
  const needleRotation = useMemo(() => {
    const normalizedValue = Math.min(currentValue, 50); // Cap at 50 for visual
    return (normalizedValue / 50) * 180 - 90; // -90 to 90 degrees
  }, [currentValue]);

  return (
    <div className="flex flex-col items-center">
      {/* Semi-circular gauge */}
      <div className="relative w-40 h-20 overflow-hidden">
        {/* Background arc */}
        <div className="absolute inset-0">
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
              stroke="currentColor"
              strokeWidth="10"
              className="text-green-400"
              strokeLinecap="round"
            />
            {/* Orange zone (25-33%) */}
            <path
              d="M 27.5 12.5 A 45 45 0 0 1 38 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-orange-400"
            />
            {/* Red zone (33%+) */}
            <path
              d="M 38 7 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-red-400"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-16 origin-bottom transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-50%) rotate(${needleRotation}deg)` }}
        >
          <div className="w-full h-full bg-gradient-to-t from-foreground to-foreground/70 rounded-t-full" />
        </div>
        
        {/* Center dot */}
        <div className="absolute bottom-0 left-1/2 w-4 h-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground border-2 border-background" />
      </div>

      {/* Value display */}
      <div className="mt-2 text-center">
        <span className={`text-2xl font-bold ${getColor()}`}>
          {displayValue}{unit}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>

      {/* Threshold markers */}
      <div className="flex justify-between w-full mt-2 text-xs text-muted-foreground">
        <span>0%</span>
        <span className="text-orange-500">25%</span>
        <span className="text-destructive">33%</span>
        <span>50%+</span>
      </div>

      {/* Status indicator */}
      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
        currentValue > thresholds.danger 
          ? 'bg-destructive/10 text-destructive' 
          : currentValue > thresholds.warning 
            ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600'
            : 'bg-green-100 dark:bg-green-950/50 text-green-600'
      }`}>
        {currentValue > thresholds.danger 
          ? 'Taux d\'effort trop élevé' 
          : currentValue > thresholds.warning 
            ? 'Taux d\'effort limite'
            : 'Taux d\'effort acceptable'}
      </div>
    </div>
  );
}
