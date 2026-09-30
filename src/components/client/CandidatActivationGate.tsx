import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, FileSignature, Loader2, Phone, ShieldAlert, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CandidatSolvabiliteForm } from '@/components/candidat/CandidatSolvabiliteForm';
import { CandidatGarantForm, GARANT_CRITERE } from '@/components/candidat/CandidatGarantForm';
import { isCandidatSolvable, isSolvabiliteRenseignee } from '@/lib/candidatSolvabilite';

/**
 * Écran bloquant pour les candidats basculés en client SANS compte activé.
 * Monté uniquement si l'utilisateur possède le rôle 'candidat' (voir ProtectedRoute).
 * Levé uniquement sur l'activation complète du compte (profiles.actif — acompte payé / validé par l'admin),
 * le même critère que AccountActivationModal. Signature du mandat seule = toujours bloqué.
 * En cas d'erreur de lecture : on laisse passer (jamais de blocage par erreur).
 */
const TRIAL_MS = 72 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return `${d}j ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function CandidatActivationGate({ children }: { children: React.ReactNode }) {
  const { user, switchRole } = useAuth() as any;
  const [state, setState] = useState<'loading' | 'ok' | 'trial' | 'blocked'>('loading');
  const [trialEnd, setTrialEnd] = useState<number | null>(null);
  const [canTrial, setCanTrial] = useState(false);
  const [starting, setStarting] = useState(false);
  const [solvOpen, setSolvOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const location = useLocation();

  const [paused, setPaused] = useState(false);
  const [garantSaving, setGarantSaving] = useState(false);
  const [garantNon, setGarantNon] = useState(false);
  const [garantPrompt, setGarantPrompt] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: profile, error } = await supabase.from('profiles')
          .select('actif, trial_started_at')
          .eq('id', user.id).maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (profile?.actif === true) { setState('ok'); return; }
        // Blocage « dossier non solvable » (solvabilité renseignée, non solvable, pas de garant solvable)
        const { data: cc } = await (supabase.from as any)('candidat_criteres')
          .select('type_permis, revenus_mensuels, poursuites, budget_max, garant_solvable')
          .eq('user_id', user.id).maybeSingle();
        if (cancelled) return;
        const isPaused = !!cc && isSolvabiliteRenseignee(cc) && !isCandidatSolvable(cc) && cc.garant_solvable !== true;
        setPaused(isPaused);
        setGarantNon(cc?.garant_solvable === false);
        const started = (profile as any)?.trial_started_at as string | null;
        if (!started) { setCanTrial(true); setTrialEnd(null); setState('blocked'); return; }
        const end = new Date(started).getTime() + TRIAL_MS;
        setCanTrial(false);
        setTrialEnd(end);
        setState(Date.now() < end ? 'trial' : 'blocked');
      } catch {
        if (!cancelled) setState('ok');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email, location.pathname]);

  // Décompte automatique pendant l'essai
  useEffect(() => {
    if (state !== 'trial' || !trialEnd) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= trialEnd) setState('blocked');
    }, 30000);
    setNow(Date.now());
    return () => clearInterval(id);
  }, [state, trialEnd]);

  const startTrial = async () => {
    setStarting(true);
    try {
      const { data: cc } = await (supabase.from as any)('candidat_criteres')
        .select('type_permis, revenus_mensuels, poursuites, budget_max, garant_solvable')
        .eq('user_id', user.id).maybeSingle();
      if (cc && !isCandidatSolvable(cc) && cc.garant_solvable !== true) {
        setSolvOpen(false); setPaused(true); setStarting(false);
        return;
      }
      const { error } = await (supabase.rpc as any)('start_candidat_trial');
      if (error) throw error;
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || "Impossible de démarrer l'essai");
      setStarting(false);
    }
  };

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (state === 'ok') return <>{children}</>;

  const answerGarant = async (oui: boolean) => {
    if (!user?.id) return;
    setGarantSaving(true);
    try {
      const { error } = await (supabase.from as any)('candidat_criteres')
        .update({ garant_solvable: oui }).eq('user_id', user.id);
      if (error) throw error;
      if (oui) { setPaused(false); setGarantNon(false); setGarantPrompt(true); }
      else setGarantNon(true);
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'enregistrer");
    } finally {
      setGarantSaving(false);
    }
  };

  if (paused) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Votre dossier n'est pas solvable</h1>
            <p className="text-muted-foreground">
              Contactez notre service au{' '}
              <a href="tel:+41216343161" className="font-semibold text-primary underline">021 634 31 61</a>{' '}
              pour débloquer votre compte.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <p className="font-medium text-foreground">Mon garant est-il solvable ? *</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" className="min-h-[44px]" disabled={garantSaving} onClick={() => answerGarant(true)}>Oui</Button>
              <Button size="lg" variant={garantNon ? 'secondary' : 'outline'} className="min-h-[44px]" disabled={garantSaving} onClick={() => answerGarant(false)}>Non</Button>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              * Votre garant doit gagner au moins 3× le loyer que vous visez, avoir un permis B ou C ou la nationalité suisse, et ne pas avoir de poursuites ni d'actes de défaut de biens.
            </p>
          </div>
          <Button asChild variant="outline" className="min-h-[44px]">
            <a href="tel:+41216343161"><Phone className="mr-2 h-4 w-4" /> Appeler le 021 634 31 61</a>
          </Button>
        </div>
      </div>
    );
  }
  if (state === 'trial' && trialEnd) {
    return (
      <>
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-2 border-b border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground" role="status">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium">Activé (essai) — {formatRemaining(trialEnd - now)} restants</span>
          <Button asChild size="sm" className="h-8">
            <Link to="/nouveau-mandat">Activer mon compte</Link>
          </Button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileSignature className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Déléguez votre recherche à nos agents immobiliers.</h1>
          <p className="text-muted-foreground">
            {trialEnd && !canTrial ? 'Votre essai gratuit est terminé. ' : ''}
            Veuillez activer votre compte : remplissez et signez votre mandat de recherche, puis réglez l'acompte de 300.- — l'accès complet s'ouvrira dès que votre compte sera activé.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="min-h-[44px]">
            <Link to="/nouveau-mandat"><FileSignature className="mr-2 h-4 w-4" /> Activer mon compte</Link>
          </Button>
          {canTrial && (
            <Button variant="outline" size="lg" className="min-h-[44px]" disabled={starting} onClick={() => setSolvOpen(true)}>
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />} Essayer gratuitement (3 jours)
            </Button>
          )}
          <Button variant="ghost" className="min-h-[44px]" onClick={() => { switchRole?.('candidat'); window.location.href = '/candidat'; }}>
            <UserRound className="mr-2 h-4 w-4" /> Retour à mon espace candidat
          </Button>
        </div>
      </div>
      <Dialog open={garantPrompt} onOpenChange={setGarantPrompt}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complétez les infos de votre garant</DialogTitle>
            <DialogDescription>{GARANT_CRITERE} (facultatif maintenant, modifiable depuis « Mon garant ».)</DialogDescription>
          </DialogHeader>
          {garantPrompt && <CandidatGarantForm onSaved={() => setGarantPrompt(false)} />}
          <Button variant="ghost" onClick={() => setGarantPrompt(false)}>Plus tard</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={solvOpen} onOpenChange={(o) => !starting && setSolvOpen(o)}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Votre solvabilité</DialogTitle>
            <DialogDescription>Pour démarrer votre essai gratuit de 3 jours, renseignez ces 3 informations : elles nous permettent de vérifier votre solvabilité auprès des bailleurs.</DialogDescription>
          </DialogHeader>
          {solvOpen && <CandidatSolvabiliteForm submitLabel="Démarrer mon essai gratuit" onSaved={startTrial} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
