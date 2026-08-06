import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Point d'entrée d'automatisation : /bot-login?key=<BOT_LOGIN_KEY>
 * Aucune donnée sensible n'est affichée.
 */
export default function BotLogin() {
  const [state, setState] = useState<'pending' | 'error'>('pending');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const key = new URLSearchParams(window.location.search).get('key');
      if (!key) {
        if (!cancelled) setState('error');
        return;
      }

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-login?key=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) {
          if (!cancelled) setState('error');
          return;
        }
        const data = await res.json();
        if (!data?.access_token || !data?.refresh_token) {
          if (!cancelled) setState('error');
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (error) {
          if (!cancelled) setState('error');
          return;
        }

        window.location.replace('/admin');
      } catch {
        if (!cancelled) setState('error');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">
        {state === 'error' ? 'Auth robot échouée' : 'Connexion en cours…'}
      </p>
    </main>
  );
}
