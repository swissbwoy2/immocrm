import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Loader2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Écran bloquant pour les candidats basculés en client SANS compte activé.
 * Monté uniquement si l'utilisateur possède le rôle 'candidat' (voir ProtectedRoute).
 * Levé uniquement sur l'activation complète du compte (profiles.actif — acompte payé / validé par l'admin),
 * le même critère que AccountActivationModal. Signature du mandat seule = toujours bloqué.
 * En cas d'erreur de lecture : on laisse passer (jamais de blocage par erreur).
 */
export function CandidatActivationGate({ children }: { children: React.ReactNode }) {
  const { user, switchRole } = useAuth() as any;
  const [state, setState] = useState<'loading' | 'ok' | 'blocked'>('loading');

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        // Critère d'activation complet = même critère que l'app (AccountActivationModal) :
        // profiles.actif === true (acompte payé / validé par l'admin). Signature seule ne suffit pas.
        const { data: profile, error } = await supabase.from('profiles')
          .select('actif')
          .eq('id', user.id).maybeSingle();
        if (error) throw error;
        const activated = profile?.actif === true;
        if (!cancelled) setState(activated ? 'ok' : 'blocked');
      } catch {
        if (!cancelled) setState('ok');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (state === 'ok') return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileSignature className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Déléguez votre recherche à nos agents immobiliers.</h1>
          <p className="text-muted-foreground">Veuillez activer votre compte : remplissez et signez votre mandat de recherche, puis réglez l'acompte de 300.- — l'accès complet s'ouvrira dès que votre compte sera activé.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="min-h-[44px]">
            <Link to="/nouveau-mandat"><FileSignature className="mr-2 h-4 w-4" /> Remplir et signer mon mandat</Link>
          </Button>
          <Button variant="ghost" className="min-h-[44px]" onClick={() => { switchRole?.('candidat'); window.location.href = '/candidat'; }}>
            <UserRound className="mr-2 h-4 w-4" /> Retour à mon espace candidat
          </Button>
        </div>
      </div>
    </div>
  );
}
