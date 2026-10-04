import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { UnifiedCandidature } from '@/hooks/useCandidatCandidatures';

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
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{step === 'visite' ? 'Avez-vous visité cet objet ?' : 'Souhaitez-vous déposer votre dossier ?'}</DialogTitle>
          <DialogDescription>{current.adresse}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="min-h-[44px] flex-1" disabled={busy} onClick={() => answer(true)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Oui</Button>
          <Button variant="outline" className="min-h-[44px] flex-1" disabled={busy} onClick={() => answer(false)}>Non</Button>
        </div>
        <button type="button" className="text-xs text-muted-foreground underline" onClick={close}>Répondre plus tard</button>
      </DialogContent>
    </Dialog>
  );
}
