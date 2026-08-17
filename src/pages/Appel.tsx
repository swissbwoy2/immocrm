import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PhoneOff, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/contexts/CallContext';
import { CallMode } from '@/lib/livekitCall';
import { Button } from '@/components/ui/button';

/**
 * Route universelle d'appel : /appel?call={conversationId}&mode=audio|video
 * (également /appel/{conversationId}).
 *
 * Elle existe pour TOUS les rôles : aucun lien de notification d'appel ne peut
 * donc plus tomber sur une 404. La page se contente de rejoindre l'appel via
 * le CallProvider global (l'overlay d'appel se monte par-dessus) et affiche un
 * message convivial quand l'appel n'est plus disponible.
 */
export default function Appel() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const { session, connecting, joinCall, joinLive } = useCall();
  const [failed, setFailed] = useState<string | null>(null);
  const triedRef = useRef(false);

  const conversationId =
    params.conversationId ||
    searchParams.get('call') ||
    searchParams.get('conversationId') ||
    '';
  const visiteId = searchParams.get('visit') || searchParams.get('visiteId') || '';
  const mode = (searchParams.get('mode') as CallMode) || 'video';

  const messagerieHref = useMemo(() => {
    const base =
      userRole === 'admin'
        ? '/admin/messagerie'
        : userRole === 'agent'
          ? '/agent/messagerie'
          : userRole === 'proprietaire'
            ? '/proprietaire/messagerie'
            : userRole === 'client'
              ? '/client/messagerie'
              : `/${userRole || 'login'}`;
    return conversationId ? `${base}?conversationId=${conversationId}` : base;
  }, [userRole, conversationId]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, {
        replace: true,
      });
      return;
    }
    if (!conversationId && !visiteId) {
      setFailed("Cet appel n'est plus disponible.");
      return;
    }
    if (triedRef.current) return;
    triedRef.current = true;
    void (async () => {
      try {
        const ok = visiteId ? await joinLive(visiteId) : await joinCall(conversationId, mode);
        if (!ok) setFailed("Cet appel n'est plus disponible.");
      } catch (e: any) {
        setFailed(e?.message || "Cet appel n'est plus disponible.");
      }
    })();
  }, [loading, user, conversationId, visiteId, mode, joinCall, joinLive, navigate]);

  // Quand l'appel se termine (overlay fermé), on retourne à la messagerie.
  const wasInCall = useRef(false);
  useEffect(() => {
    if (session) wasInCall.current = true;
    else if (wasInCall.current) navigate(messagerieHref, { replace: true });
  }, [session, navigate, messagerieHref]);

  if (session) return null; // l'overlay d'appel global est affiché par CallProvider

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
        {connecting && !failed ? (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
            <h1 className="text-lg font-semibold">Connexion à l'appel…</h1>
            <p className="mt-1 text-sm text-muted-foreground">Un instant, on vous met en relation.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <PhoneOff className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Cet appel n'est plus disponible</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {failed && failed !== "Cet appel n'est plus disponible."
                ? failed
                : "L'appel a été terminé ou a expiré. Vous pouvez répondre par message."}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to={messagerieHref}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Ouvrir la messagerie
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
