import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Loader2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Écran bloquant pour les candidats basculés en client SANS mandat signé.
 * Monté uniquement si l'utilisateur possède le rôle 'candidat' (voir ProtectedRoute).
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
        const { data: client, error } = await supabase.from('clients')
          .select('mandat_signature_data, mandat_date_signature, demande_mandat_id')
          .eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        let signed = !!(client && ((client as any).mandat_signature_data || (client as any).mandat_date_signature || (client as any).demande_mandat_id));
        if (!signed && user.email) {
          const { data: dm } = await supabase.from('demandes_mandat').select('id')
            .ilike('email', user.email).not('signature_data', 'is', null).limit(1);
          signed = !!dm?.length;
        }
        if (!cancelled) setState(signed ? 'ok' : 'blocked');
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
          <p className="text-muted-foreground">Veuillez activer votre compte en complétant et signant votre mandat de recherche.</p>
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
