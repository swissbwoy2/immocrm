import { ReactNode, Suspense, lazy } from 'react';
import { FloatingNav } from '@/components/landing/FloatingNav';

const LandingFooter = lazy(() =>
  import('@/components/landing/LandingFooter').then((m) => ({ default: m.LandingFooter }))
);

interface LandingFormShellProps {
  children: ReactNode;
}

export function LandingFormShell({ children }: LandingFormShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />

      {/* Top banner — same as landing */}
      <div
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container mx-auto px-4 py-2 text-center">
          <p className="text-xs sm:text-sm text-slate-300">
            Un logiciel propulsé par{' '}
            <a
              href="https://www.immo-rama.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Immo-rama.ch
            </a>
          </p>
        </div>
      </div>

      <main className="relative">{children}</main>

      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </div>
  );
}
