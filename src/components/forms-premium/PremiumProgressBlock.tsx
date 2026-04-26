import { motion } from 'framer-motion';

interface PremiumProgressBlockProps {
  currentStep: number; // 0-indexed
  totalSteps: number;
  stepTitle: string;
}

export function PremiumProgressBlock({ currentStep, totalSteps, stepTitle }: PremiumProgressBlockProps) {
  const percent = Math.round(((currentStep + 1) / totalSteps) * 100);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6">
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-[hsl(30_15%_11%/0.7)] backdrop-blur-xl border border-[hsl(38_45%_48%/0.18)]">
        {/* Circular progress */}
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(38 45% 48% / 0.15)" strokeWidth="4" />
            <motion.circle
              cx="32" cy="32" r="28" fill="none"
              stroke="url(#goldGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(38 55% 65%)" />
                <stop offset="100%" stopColor="hsl(28 35% 38%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-[hsl(38_55%_65%)]">{percent}%</span>
          </div>
        </div>

        {/* Title + step counter */}
        <div className="flex-1 min-w-0">
          <div className="text-base md:text-lg font-bold text-white truncate">{stepTitle}</div>
          <div className="text-xs text-[hsl(40_20%_55%)] mt-0.5">
            Étape {currentStep + 1} sur {totalSteps}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[hsl(38_45%_48%/0.15)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(28_35%_38%)] rounded-full"
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
