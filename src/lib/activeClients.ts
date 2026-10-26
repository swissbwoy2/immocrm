import { useEffect, useState } from 'react';
import { supabase as defaultClient } from '@/integrations/supabase/client';

/**
 * Définition unique : client/mandat actif = clients.statut === 'actif'
 * ET user_credits.coins_mandat > 0 (user_credits.user_id = clients.user_id).
 */
export async function fetchUsersAvecCreditsMandat(supabase: any = defaultClient): Promise<Set<string> | null> {
  const { data, error } = await supabase.from('user_credits').select('user_id, coins_mandat').limit(15000);
  if (error) return null;
  return new Set(
    (data || [])
      .filter((r: any) => r.user_id && Number(r.coins_mandat ?? 0) > 0)
      .map((r: any) => r.user_id as string)
  );
}

export function isClientActif(
  client: { statut?: string | null; user_id?: string | null },
  usersAvecCredits: Set<string> | null,
): boolean {
  if (client.statut !== 'actif') return false;
  if (usersAvecCredits === null) return true;
  return !!client.user_id && usersAvecCredits.has(client.user_id);
}

/** Charge l'ensemble des user_id crédités (null tant que non chargé ou en cas d'erreur). */
export function useUsersAvecCreditsMandat(): Set<string> | null {
  const [set, setSet] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    fetchUsersAvecCreditsMandat().then((s) => { if (alive) setSet(s); });
    return () => { alive = false; };
  }, []);
  return set;
}
