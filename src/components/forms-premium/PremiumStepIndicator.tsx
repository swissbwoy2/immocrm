import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumStepIndicatorProps {
  steps: { title: string; icon: string }[];
  currentStep: number;
}

export function PremiumStepIndicator({ steps, currentStep }: PremiumStepIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 h-px bg-[hsl(38_45%_48%/0.15)] z-0" />
        <motion.div
          className="absolute top-5 left-0 h-px bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(28_35%_38%)] z-0"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2" style={{ width: `${100 / steps.length}%` }}>
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  boxShadow: isActive
                    ? '0 0 0 4px hsl(38 45% 48% / 0.2), 0 0 20px hsl(38 45% 48% / 0.3)'
                    : isDone
                    ? '0 0 0 2px hsl(38 45% 48% / 0.3)'
                    : 'none',
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300 ${
                  isDone
                    ? 'bg-[hsl(38_45%_48%)] border-[hsl(38_45%_48%)] text-[hsl(30_15%_8%)]'
                    : isActive
                    ? 'bg-[hsl(30_15%_12%)] border-[hsl(38_55%_65%)] text-[hsl(38_55%_65%)]'
                    : 'bg-[hsl(30_15%_10%)] border-[hsl(38_45%_48%/0.2)] text-[hsl(40_20%_40%)]'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <span>{step.icon}</span>}
              </motion.div>
              <span className={`text-[10px] font-medium text-center leading-tight max-w-[80px] transition-colors duration-300 ${
                isActive ? 'text-[hsl(38_55%_65%)]' : isDone ? 'text-[hsl(38_45%_48%)]' : 'text-[hsl(40_20%_38%)]'
              }`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
