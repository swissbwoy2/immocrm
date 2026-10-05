import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { takeGoogleNext } from '@/lib/googleAuth';
import { withAuthStorageRemoval, purgePersistedAuth } from '@/lib/authStorageGuard';

const ROLE_PRIORITY = ['admin', 'automation_operator', 'agent', 'agent_ia', 'closeur', 'coursier', 'apporteur', 'proprietaire', 'client', 'candidat'];

/** Retour de la connexion Google : compte existant → espace du rôle prioritaire ; inconnu → avertissement. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshRoles } = useAuth();
  const [unknownEmail, setUnknownEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let session = (await supabase.auth.getSession()).data.session;
      for (let i = 0; !session && i < 20; i++) {
        await new Promise((r) => setTimeout(r, 250));
        session = (await supabase.auth.getSession()).data.session;
      }
      if (!alive) return;
      if (!session) { setError('La connexion Google a échoué. Veuillez réessayer.'); return; }
      const { data: rows, error: rErr } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
      if (!alive) return;
      if (rErr) { setError(rErr.message); return; }
      const roles = (rows ?? []).map((r: any) => r.role as string);
      const role = ROLE_PRIORITY.find((r) => roles.includes(r)) || roles[0];
      if (role) {
        const next = takeGoogleNext();
        await refreshRoles();
        navigate(next ?? `/${role}`, { replace: true });
        return;
      }
      setUnknownEmail(session.user.email ?? '');
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    setBusy(true);
    const { error: e } = await (supabase.rpc as any)('google_create_candidat_account');
    if (e) { setBusy(false); toast.error(e.message || 'Création du compte impossible'); return; }
    await refreshRoles();
    takeGoogleNext();
    navigate('/candidat', { replace: true });
  };

  const renounce = async () => {
    setBusy(true);
    try {
      await withAuthStorageRemoval(async () => { await supabase.auth.signOut({ scope: 'local' }); });
    } finally {
      purgePersistedAuth('google_renonce');
      takeGoogleNext();
      window.location.assign('/login');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      {!unknownEmail && !error && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      {error && (
        <Card className="w-full max-w-md"><CardContent className="pt-6 space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="w-full" onClick={() => window.location.assign('/login')}>Retour à la connexion</Button>
        </CardContent></Card>
      )}
      {unknownEmail !== null && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-primary" /> Aucun compte avec cette adresse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">Aucun compte n'existe avec l'adresse Google <strong className="break-all">{unknownEmail}</strong>.</p>
            <p className="text-sm text-muted-foreground">
              Si vous avez déjà un compte chez nous sous une autre adresse, connectez-vous par e-mail plutôt que d'en créer un second.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button disabled={busy} onClick={confirm} className="min-h-[44px]">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer mon compte candidat
              </Button>
              <Button disabled={busy} variant="outline" onClick={renounce} className="min-h-[44px]">
                J'ai déjà un compte : me connecter par e-mail
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
