import { useCallback } from 'react';
import { toast } from 'sonner';
import { useIsDemoAccount } from './useIsDemoAccount';

const DEMO_MESSAGE =
  '🎬 Mode démo : action désactivée. Activez votre vrai compte pour utiliser cette fonctionnalité.';

/**
 * Universal guard for demo account.
 * - `isDemo`: true if logged in as the demo account
 * - `block(e?)`: when used as an onClick/onSubmit handler, stops the event and shows a toast
 * - `guard(fn)`: wraps an async/sync action; if demo, shows toast and returns; otherwise runs fn
 */
export function useDemoGuard() {
  const isDemo = useIsDemoAccount();

  const block = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      toast.info(DEMO_MESSAGE);
    },
    []
  );

  const guard = useCallback(
    <T extends (...args: any[]) => any>(fn: T): T => {
      return ((...args: any[]) => {
        if (isDemo) {
          toast.info(DEMO_MESSAGE);
          return undefined;
        }
        return fn(...args);
      }) as T;
    },
    [isDemo]
  );

  return { isDemo, block, guard };
}
