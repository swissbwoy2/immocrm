import { useEffect } from 'react';

interface ExternalRedirectProps {
  to: string;
}

/**
 * Redirige immédiatement vers une URL externe (window.location.replace).
 * Affiche un message de transition propre — pas de 404 brute.
 */
export function ExternalRedirect({ to }: ExternalRedirectProps) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
        <p className="text-foreground font-semibold mb-1">Redirection en cours…</p>
        <p className="text-sm text-muted-foreground">
          Vous êtes redirigé vers{' '}
          <a href={to} className="text-primary underline underline-offset-2">
            Immo-rama.ch
          </a>
        </p>
      </div>
    </div>
  );
}

export default ExternalRedirect;
