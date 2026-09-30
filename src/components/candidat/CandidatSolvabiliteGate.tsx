import { useCallback, useEffect, useState } from 'react';
import { Loader2, Phone, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CandidatSolvabiliteForm } from './CandidatSolvabiliteForm';
import { CandidatGarantForm, GARANT_CRITERE } from './CandidatGarantForm';
import { isCandidatSolvable, isSolvabiliteRenseignee } from '@/lib/candidatSolvabilite';

/**
 * Source unique des blocages solvabilité candidat (tous les comptes, y compris anciens) :
 * 1) solvabilité non renseignée → formulaire ; 2) non solvable sans garant solvable → écran « dossier non solvable ».
 * Levé si profiles.actif = true. Sans ligne candidat_criteres ou en cas d'erreur de lecture : on laisse passer.
 */
export function CandidatSolvabiliteGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'paused'>('loading');
  const [garantNon, setGarantNon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [garantPrompt, setGarantPrompt] = useState(false);

  const check = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: profile, error } = await supabase.from('profiles').select('actif').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (profile?.actif === true) { setState('ok'); return; }
      const { data: cc, error: e2 } = await (supabase.from as any)('candidat_criteres')
        .select('type_permis, revenus_mensuels, poursuites, budget_max, garant_solvable')
        .eq('user_id', user.id).maybeSingle();
      if (e2) throw e2;
      if (!cc) { setState('ok'); return; }
      setGarantNon(cc.garant_solvable === false);
      if (!isSolvabiliteRenseignee(cc)) setState('missing');
      else if (!isCandidatSolvable(cc) && cc.garant_solvable !== true) setState('paused');
      else setState('ok');
    } catch {
      setState('ok');
    }
  }, [user?.id]);

  useEffect(() => { check(); }, [check]);

  const answerGarant = async (oui: boolean) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)('candidat_criteres').update({ garant_solvable: oui }).eq('user_id', user.id);
      if (error) throw error;
      if (oui) { setGarantNon(false); setGarantPrompt(true); setState('ok'); }
      else setGarantNon(true);
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (state === 'missing') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto max-w-md space-y-6 px-4 py-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Votre solvabilité</h1>
            <p className="text-muted-foreground">Renseignez votre solvabilité pour accéder à votre espace. Ces informations nous permettent de présenter votre dossier aux bailleurs.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <CandidatSolvabiliteForm onSaved={check} />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'paused') {
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
              <Button size="lg" className="min-h-[44px]" disabled={saving} onClick={() => answerGarant(true)}>Oui</Button>
              <Button size="lg" variant={garantNon ? 'secondary' : 'outline'} className="min-h-[44px]" disabled={saving} onClick={() => answerGarant(false)}>Non</Button>
            </div>
            <p className="text-left text-xs text-muted-foreground">
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

  return (
    <>
      {children}
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
    </>
  );
}
