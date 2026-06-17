import { motion } from 'framer-motion';

interface LandingProgressBlockProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export function LandingProgressBlock({ currentStep, totalSteps, stepTitle }: LandingProgressBlockProps) {
  const percent = Math.round(((currentStep + 1) / totalSteps) * 100);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{percent}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-base md:text-lg font-bold text-foreground truncate">{stepTitle}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Étape {currentStep + 1} sur {totalSteps}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
