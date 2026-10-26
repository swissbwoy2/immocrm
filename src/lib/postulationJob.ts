import { supabase } from '@/integrations/supabase/client';

export const POSTULATION_CONFIRMATION = 'Demande enregistrée et transmise à l\'équipe';

export interface PostulationRequestResult {
  job_id: string;
  candidature_id: string;
  already_requested: boolean;
}

/**
 * Point d'entrée unique du clic « Déposer ma candidature » côté client.
 * 1. RPC atomique et idempotente (candidature + offre + job).
 * 2. Déclenche immédiatement le traitement, en attendant au plus quelques secondes ;
 *    en cas d'échec ou de délai, la reprise automatique serveur prend le relais.
 * Aucune soumission n'est faite auprès d'une régie.
 */
export async function requestPostulation(offreId: string): Promise<PostulationRequestResult> {
  const { data, error } = await supabase.rpc('request_postulation', { p_offre_id: offreId });
  if (error) throw error;
  const result = data as unknown as PostulationRequestResult;

  try {
    await Promise.race([
      supabase.functions.invoke('process-postulation-job', { body: { job_id: result.job_id } }),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
  } catch {
    // Non bloquant : la file est reprise côté serveur.
  }
  return result;
}
