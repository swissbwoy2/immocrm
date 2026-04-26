import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Public route /demo
 * 1. Calls the demo-login edge function to obtain a session for the demo account.
 * 2. Plugs the tokens into supabase.auth.setSession().
 * 3. Redirects to /client (or other client home).
 */
export default function DemoPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        // Capture UTMs from current URL for analytics
        const params = new URLSearchParams(window.location.search);
        const payload = {
          utm_source: params.get('utm_source') ?? undefined,
          utm_medium: params.get('utm_medium') ?? undefined,
          utm_campaign: params.get('utm_campaign') ?? undefined,
        };

        const { data, error: invokeErr } = await supabase.functions.invoke('demo-login', {
          body: payload,
        });

        if (invokeErr) {
          // Try to surface server message if present
          const detail =
            (invokeErr as any)?.context?.body ??
            (invokeErr as any)?.message ??
            'Erreur réseau.';
          throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        }
        if (!data?.access_token || !data?.refresh_token) {
          throw new Error('Réponse invalide du serveur de démo.');
        }

        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionErr) throw sessionErr;

        // Redirect to client home — adjust path if your client dashboard lives elsewhere
        navigate('/client', { replace: true });
      } catch (e) {
        console.error('demo login failed', e);
        setError(
          e instanceof Error ? e.message : 'Impossible de démarrer la démo. Réessayez plus tard.',
        );
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(30_15%_6%)] px-4">
      <div className="max-w-md w-full text-center text-[hsl(40_35%_98%)]">
        {error ? (
          <>
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-[hsl(38_55%_65%)]" />
            <h1 className="text-xl font-semibold mb-2">Démo indisponible</h1>
            <p className="text-sm text-[hsl(40_25%_70%)] mb-6">{error}</p>
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-full bg-[hsl(38_55%_52%)] text-[hsl(30_15%_6%)] text-sm font-semibold hover:bg-[hsl(38_65%_60%)] transition"
              >
                Réessayer
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-sm underline text-[hsl(38_55%_65%)]"
              >
                Retour à l'accueil
              </button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-[hsl(38_55%_65%)]" />
            <h1 className="text-xl font-semibold mb-2">Préparation de votre démo…</h1>
            <p className="text-sm text-[hsl(40_25%_70%)]">
              Connexion automatique au compte de démonstration.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
