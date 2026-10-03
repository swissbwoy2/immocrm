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

/** Dialog « Avez-vous visité cet objet ? ». `force` = ouverture manuelle depuis une carte. */
export function VisiteConfirmGate({ list, force, onClose }: { list: UnifiedCandidature[]; force?: UnifiedCandidature | null; onClose?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const current = force ?? list.find((c) => needsVisitConfirm(c) && !skipped.includes(c.id));
  if (!current) return null;

  const answer = async (oui: boolean) => {
    if (busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_confirmer_visite', { p_candidature_id: current.id, p_a_visite: oui });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSkipped((s) => [...s, current.id]);
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
    onClose?.();
    if (oui) navigate(`/candidat/demande?candidature=${current.id}`);
  };
  const later = () => { setSkipped((s) => [...s, current.id]); onClose?.(); };

  return (
    <Dialog open onOpenChange={(o) => !o && later()}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Avez-vous visité cet objet ?</DialogTitle>
          <DialogDescription>{current.adresse}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="min-h-[44px] flex-1" disabled={busy} onClick={() => answer(true)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Oui</Button>
          <Button variant="outline" className="min-h-[44px] flex-1" disabled={busy} onClick={() => answer(false)}>Non</Button>
        </div>
        <button type="button" className="text-xs text-muted-foreground underline" onClick={later}>Répondre plus tard</button>
      </DialogContent>
    </Dialog>
  );
}
