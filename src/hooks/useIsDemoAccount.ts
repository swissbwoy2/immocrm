import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns true when the authenticated user is the demo account
 * (profiles.is_demo_account = true). Used to disable destructive actions
 * and show the demo banner.
 */
export function useIsDemoAccount(): boolean {
  const { user } = useAuth();
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsDemo(false);
      return;
    }
    supabase
      .from('profiles')
      .select('is_demo_account')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsDemo(Boolean(data?.is_demo_account));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isDemo;
}
