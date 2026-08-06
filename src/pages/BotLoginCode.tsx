import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Consommation d'un code d'automatisation à usage unique (durée de vie 60 s).
 * URL : /bot-login-code?code=<CODE>
 * Aucune valeur sensible n'est affichée ni journalisée.
 */
export default function BotLoginCode() {
  const [state, setState] = useState<'pending' | 'error'>('pending');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) {
        if (!cancelled) setState('error');
        return;
      }

      // Le code est retiré de la barre d'adresse immédiatement.
      window.history.replaceState({}, '', '/bot-login-code');

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/automation-auth-consume`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ code }),
          },
        );

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
