import { ReactNode, Suspense, lazy } from 'react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import { Shield, Lock, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const LuxuryFormBackground = lazy(() =>
  import('./backgrounds/LuxuryFormBackground').then((m) => ({ default: m.LuxuryFormBackground }))
);
const FloatingKey3D = lazy(() =>
  import('./backgrounds/FloatingKey3D').then((m) => ({ default: m.FloatingKey3D }))
);

interface PremiumFormShellProps {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
  stepLabels?: string[];
  stepIcons?: string[];
}

const TRUST_BADGES = [
  { icon: Shield, label: 'SSL sécurisé' },
  { icon: Lock, label: 'Données protégées' },
  { icon: Star, label: '+500 clients' },
];

export function PremiumFormShell({ children, currentStep, totalSteps, stepLabels, stepIcons }: PremiumFormShellProps) {
  return (
    <div className="min-h-screen bg-[hsl(30_15%_8%)] relative overflow-hidden">
      {/* Animated luxury background */}
      <Suspense fallback={null}>
        <LuxuryFormBackground />
      </Suspense>

      {/* Sticky header */}
      <div className="sticky top-0 z-40 border-b border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_15%_8%/0.9)] backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoImmoRama} alt="Immo-Rama" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          {currentStep !== undefined && totalSteps !== undefined && (
            <div className="flex items-center gap-3">
              {/* Step pills */}
              <div className="hidden sm:flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{
                      width: i === currentStep ? 28 : 8,
                      backgroundColor: i < currentStep
                        ? 'hsl(38 45% 48%)'
                        : i === currentStep
                        ? 'hsl(38 55% 65%)'
                        : 'hsl(38 45% 48% / 0.2)',
                    }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="h-2 rounded-full"
                  />
                ))}
              </div>
              <span className="text-xs text-[hsl(40_20%_55%)] font-medium">
                {currentStep + 1}/{totalSteps}
              </span>
            </div>
          )}
        </div>

        {/* Gold progress bar */}
        {currentStep !== undefined && totalSteps !== undefined && (
          <motion.div
            className="h-0.5 bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(28_35%_38%)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: (currentStep + 1) / totalSteps }}
            style={{ originX: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 pb-24">
        {children}
      </div>

      {/* Floating 3D key */}
      <Suspense fallback={null}>
        <FloatingKey3D />
      </Suspense>

      {/* Footer trust badges */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[hsl(30_15%_8%/0.95)] backdrop-blur-xl border-t border-[hsl(38_45%_48%/0.1)]">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-6">
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-[hsl(38_45%_48%)]" />
              <span className="text-[11px] text-[hsl(40_20%_50%)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
