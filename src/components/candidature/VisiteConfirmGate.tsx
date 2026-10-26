import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { UnifiedCandidature } from '@/hooks/useCandidatCandidatures';
import { formatZurichDateTime } from '@/lib/dateZurich';

export const needsVisitConfirm = (c: UnifiedCandidature) =>
  c.source === 'location' && !c.annulee && !!c.date_visite && new Date(c.date_visite).getTime() < Date.now() && c.raw?.visite_confirmee == null;

/** Dialog « Avez-vous visité cet objet ? » puis « Souhaitez-vous déposer votre dossier ? ».
 *  `force` = ouverture manuelle depuis une carte ; `forceStep='deposer'` ouvre directement la 2e question. */
export function VisiteConfirmGate({ list, force, forceStep, onClose }: { list: UnifiedCandidature[]; force?: UnifiedCandidature | null; forceStep?: 'visite' | 'deposer'; onClose?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deposerFor, setDeposerFor] = useState<UnifiedCandidature | null>(null);
  const auto = list.find((c) => needsVisitConfirm(c) && !skipped.includes(c.id));
  const depCand = deposerFor ?? (force && forceStep === 'deposer' ? force : null);
  const current = depCand ?? force ?? auto;
  if (!current) return null;
  const step: 'visite' | 'deposer' = depCand ? 'deposer' : 'visite';

  const close = () => { setSkipped((s) => [...s, current.id]); setDeposerFor(null); onClose?.(); };

  const answerVisite = async (oui: boolean) => {
    if (busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_confirmer_visite', { p_candidature_id: current.id, p_a_visite: oui });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
    if (oui) { setSkipped((s) => [...s, current.id]); setDeposerFor(current); } else close();
  };

  const answerDeposer = async (oui: boolean) => {
    if (busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_souhaite_deposer', { p_candidature_id: current.id, p_souhaite: oui });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
    const id = current.id;
    close();
    if (oui) navigate(`/candidat/demande?candidature=${id}`);
  };

  const answer = step === 'visite' ? answerVisite : answerDeposer;

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md gap-0 p-0 pt-3 sm:rounded-[26px] md:pt-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-2 px-4 pb-3 pt-2 pr-14 text-left sm:px-6 sm:pt-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step === 'visite' ? 'Après la visite' : 'Votre dossier'}</span>
          <DialogTitle className="text-[22px] font-semibold leading-tight tracking-tight">{step === 'visite' ? 'Avez-vous visité cet objet ?' : 'Souhaitez-vous déposer votre dossier ?'}</DialogTitle>
          <DialogDescription asChild>
            <div className="imr-lg-glass space-y-0.5 rounded-2xl px-3.5 py-3 text-left">
              <span className="block text-[15px] font-medium text-foreground">{current.adresse}</span>
              {current.date_visite && <span className="block text-sm text-muted-foreground">Visite du {formatZurichDateTime(current.date_visite, { year: false })}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 border-t border-border/60 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6 sm:pb-5">
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button className="h-12 flex-1" disabled={busy} onClick={() => answer(true)}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Oui</Button>
            <Button variant="outline" className="h-12 flex-1" disabled={busy} onClick={() => answer(false)}>Non</Button>
          </div>
          <button type="button" className="block min-h-11 w-full text-sm text-muted-foreground underline" onClick={close}>Répondre plus tard</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
