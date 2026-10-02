import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserCredits {
  user_id: string;
  coins_visite: number;
  coins_mandat: number;
  mandat_statut: string;
}

export function useUserCredits(userId?: string | null) {
  const { user } = useAuth();
  const id = userId ?? user?.id;
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) { setCredits(null); setLoading(false); return; }
    const { data } = await (supabase as any).from('user_credits')
      .select('user_id, coins_visite, coins_mandat, mandat_statut').eq('user_id', id).maybeSingle();
    setCredits(data ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);
  return { credits, loading, reload };
}

export const NO_VISIT_CREDIT_MSG = "Vous n'avez plus de crédits visite — vous ne pouvez plus déléguer. Contactez l'agence.";

/** Consomme 1 crédit visite avant délégation. Retourne false si la délégation doit être bloquée. */
export async function consumeVisitCoin(): Promise<{ ok: boolean; message?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: c } = await (supabase as any).from('user_credits').select('mandat_statut').eq('user_id', user.id).maybeSingle();
    if (c?.mandat_statut === 'suspendu') return { ok: false, message: 'Votre mandat est en suspens — renouvelez-le depuis votre tableau de bord pour déléguer.' };
  }
  const { data, error } = await supabase.rpc('consommer_coin_visite' as any);
  if (error) return { ok: false, message: error.message };
  if (data === -1) return { ok: false, message: NO_VISIT_CREDIT_MSG };
  return { ok: true };
}
