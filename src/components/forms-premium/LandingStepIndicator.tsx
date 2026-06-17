import { Check, User, Search, Phone, MapPin, Briefcase, FileText, Wallet, Scale, PenTool, CreditCard, Handshake, Home, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingStepIndicatorProps {
  steps: { title: string; icon?: string; label?: string }[];
  currentStep: number;
}

function resolveIcon(step: { title?: string; label?: string }): LucideIcon {
  const key = (step.title || step.label || '').toLowerCase();
  if (key.includes('ident')) return User;
  if (key.includes('recherche') || key.includes('crit')) return Search;
  if (key.includes('contact') || key.includes('télép')) return Phone;
  if (key.includes('adresse') || key.includes('local')) return MapPin;
  if (key.includes('situation') || key.includes('profess') || key.includes('emploi')) return Briefcase;
  if (key.includes('tiers') || key.includes('garant') || key.includes('candidat')) return Handshake;
  if (key.includes('document') || key.includes('pièce')) return FileText;
  if (key.includes('financ') || key.includes('budget') || key.includes('revenu')) return Wallet;
  if (key.includes('jurid') || key.includes('légal') || key.includes('legal')) return Scale;
  if (key.includes('signature')) return PenTool;
  if (key.includes('paiement') || key.includes('payment')) return CreditCard;
  if (key.includes('bien') || key.includes('logement')) return Home;
  return FileText;
}

export function LandingStepIndicator({ steps, currentStep }: LandingStepIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-start justify-between relative gap-1">
        <div className="absolute top-5 left-6 right-6 h-px bg-border z-0" />
        <motion.div
          className="absolute top-5 left-6 h-px bg-primary z-0"
          initial={{ width: '0%' }}
          animate={{
            width: `calc(${(currentStep / Math.max(steps.length - 1, 1)) * 100}% - ${(currentStep / Math.max(steps.length - 1, 1)) * 48}px)`,
          }}
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
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isDone
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                    ? 'bg-background border-primary text-primary shadow-md shadow-primary/20'
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" strokeWidth={2} />}
              </motion.div>
              <span
                className={`hidden sm:block text-[10px] font-medium text-center leading-tight max-w-[80px] truncate transition-colors duration-300 ${
                  isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
