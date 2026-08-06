import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck } from 'lucide-react';

// Le namespace auth.oauth est en beta : wrapper typé minimal.
type OAuthResult = { data: any; error: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Requête d'autorisation invalide (authorization_id manquant).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/login?next=' + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Erreur lors de la lecture de la demande d'autorisation.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("Le serveur d'autorisation n'a pas renvoyé d'URL de redirection.");
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? 'Erreur lors de la décision.');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Autoriser l'accès à Logisorama
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && !details && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la demande…
            </p>
          )}
          {details && (
            <>
              <p className="text-sm">
                <strong>{details.client?.name ?? 'Une application'}</strong> demande à utiliser Logisorama
                en votre nom.
              </p>
              {details.client?.redirect_uri && (
                <p className="text-xs text-muted-foreground break-all">
                  Redirection : {details.client.redirect_uri}
                </p>
              )}
              {details.scope && (
                <p className="text-xs text-muted-foreground">Permissions demandées : {details.scope}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Cette autorisation ne contourne ni vos permissions ni les règles de sécurité de la base de
                données.
              </p>
              <div className="flex gap-2 pt-2">
                <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approuver
                </Button>
                <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">
                  Annuler la connexion
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
