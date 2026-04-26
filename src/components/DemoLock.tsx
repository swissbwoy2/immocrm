import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useIsDemoAccount } from '@/hooks/useIsDemoAccount';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DemoLockProps {
  children: ReactNode;
  className?: string;
  /** Message du toast (défaut : message standard) */
  message?: string;
  /** Si true, ne wrappe pas en mode démo (utile pour cacher complètement). Défaut: false */
  hideWhenDemo?: boolean;
}

const DEFAULT_MSG =
  '🎬 Mode démo : action désactivée. Activez votre vrai compte pour interagir.';

/**
 * Wraps any block of UI. When the user is on the demo account:
 * - Captures all clicks at the bubbling phase (the wrapped buttons never receive them)
 * - Visually shows the area as locked (subtle overlay + lock icon on hover)
 * - Disables form submission and pointer events on inputs
 */
export function DemoLock({ children, className, message, hideWhenDemo = false }: DemoLockProps) {
  const isDemo = useIsDemoAccount();

  if (!isDemo) return <>{children}</>;
  if (hideWhenDemo) return null;

  const handleCapture = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.info(message || DEFAULT_MSG);
  };

  return (
    <div
      className={cn('relative group', className)}
      onClickCapture={handleCapture}
      onSubmitCapture={handleCapture}
      onKeyDownCapture={(e) => {
        // Block Enter on inputs/forms
        if (e.key === 'Enter') handleCapture(e);
      }}
      aria-disabled
    >
      <div
        className="pointer-events-none select-none opacity-60"
        // make all native form elements visually inactive
        style={{ filter: 'grayscale(0.3)' }}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-amber-400/30 bg-amber-50/0 group-hover:bg-amber-50/20 transition-colors flex items-start justify-end p-2">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-full bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-0.5 shadow">
          <Lock className="h-3 w-3" /> Lecture seule
        </span>
      </div>
    </div>
  );
}

export default DemoLock;
