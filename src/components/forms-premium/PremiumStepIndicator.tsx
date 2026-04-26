import { Check, User, Search, Phone, MapPin, Briefcase, FileText, Wallet, Scale, PenTool, CreditCard, Handshake, Home, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumStepIndicatorProps {
  steps: { title: string; icon: string; label?: string }[];
  currentStep: number;
}

// Map old emoji icons to Lucide components by step title keyword
function resolveIcon(step: { title?: string; label?: string; icon?: string }): LucideIcon {
  const key = (step.title || step.label || '').toLowerCase();
  if (key.includes('ident')) return User;
  if (key.includes('recherche') || key.includes('crit')) return Search;
  if (key.includes('contact') || key.includes('télép')) return Phone;
  if (key.includes('adresse') || key.includes('local')) return MapPin;
  if (key.includes('situation') || key.includes('profess') || key.includes('emploi')) return Briefcase;
  if (key.includes('tiers') || key.includes('garant')) return Handshake;
  if (key.includes('document') || key.includes('pièce')) return FileText;
  if (key.includes('financ') || key.includes('budget') || key.includes('revenu')) return Wallet;
  if (key.includes('jurid') || key.includes('légal') || key.includes('legal')) return Scale;
  if (key.includes('signature')) return PenTool;
  if (key.includes('paiement') || key.includes('payment')) return CreditCard;
  if (key.includes('bien') || key.includes('logement')) return Home;
  return FileText;
}

export function PremiumStepIndicator({ steps, currentStep }: PremiumStepIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-start justify-between relative gap-1">
        {/* Connecting line */}
        <div className="absolute top-5 left-6 right-6 h-px bg-[hsl(38_45%_48%/0.15)] z-0" />
        <motion.div
          className="absolute top-5 left-6 h-px bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(28_35%_38%)] z-0"
          initial={{ width: '0%' }}
          animate={{ width: `calc(${(currentStep / Math.max(steps.length - 1, 1)) * 100}% - ${(currentStep / Math.max(steps.length - 1, 1)) * 48}px)` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ maxWidth: 'calc(100% - 48px)' }}
        />

        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          const Icon = resolveIcon(step);
          return (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2 flex-1 min-w-0">
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
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isDone
                    ? 'bg-[hsl(38_45%_48%)] border-[hsl(38_45%_48%)] text-[hsl(30_15%_8%)]'
                    : isActive
                    ? 'bg-[hsl(30_15%_12%)] border-[hsl(38_55%_65%)] text-[hsl(38_55%_65%)]'
                    : 'bg-[hsl(30_15%_10%)] border-[hsl(38_45%_48%/0.2)] text-[hsl(40_20%_40%)]'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" strokeWidth={2} />}
              </motion.div>
              <span className={`hidden sm:block text-[10px] font-medium text-center leading-tight max-w-[80px] truncate transition-colors duration-300 ${
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
