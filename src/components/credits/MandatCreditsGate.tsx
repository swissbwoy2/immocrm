import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Bannière (≤25 crédits, actif) ou écran bloquant (suspendu) sur l'espace client. */
export function MandatCreditsGate() {
  const { credits, reload } = useUserCredits();
  const [busy, setBusy] = useState<null | 'renew' | 'cancel'>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!credits) return null;

  const suspended = credits.mandat_statut === 'suspendu';
  const low = credits.mandat_statut === 'actif' && credits.coins_mandat > 0 && credits.coins_mandat <= 25;

  const renew = async () => {
    setBusy('renew');
    const { error } = await supabase.rpc('renouveler_mandat_coins' as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('Mandat renouvelé : 90 jours de crédit');
    reload();
  };
  const cancel = async () => {
    setBusy('cancel');
    const { data, error } = await supabase.functions.invoke('resilier-mandat');
    setBusy(null);
    setConfirmCancel(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || "Impossible de résilier le mandat");
    toast.success('Mandat résilié. Un e-mail vous a été envoyé pour le remboursement.');
    reload();
  };

  const buttons = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button onClick={renew} disabled={!!busy} className="min-h-[44px]">
        {busy === 'renew' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Renouveler (90 crédits gratuitement)
      </Button>
      <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={!!busy} className="min-h-[44px]">Résilier le mandat</Button>
    </div>
  );

  return (
    <>
      {low && !dismissed && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
          <p>Vous avez bientôt plus de crédit sur votre mandat ({credits.coins_mandat} jours restants).</p>
          {buttons}
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDismissed(true)}>Plus tard</button>
        </div>
      )}
      <Dialog open={suspended}>
        <DialogContent className="max-w-md [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Votre mandat est en suspens</DialogTitle>
            <DialogDescription>Votre mandat est en suspens — vous n'avez plus de crédit.</DialogDescription>
          </DialogHeader>
          <Button onClick={renew} disabled={!!busy} className="min-h-[44px]">
            {busy === 'renew' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Renouveler (90 crédits gratuitement)
          </Button>
          <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setConfirmCancel(true)}>Résilier le mandat</button>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Résilier le mandat ?</DialogTitle>
            <DialogDescription>Votre mandat sera stoppé immédiatement.</DialogDescription>
          </DialogHeader>
          <Button variant="destructive" onClick={cancel} disabled={!!busy} className="min-h-[44px]">
            {busy === 'cancel' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmer la résiliation
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
