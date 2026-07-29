import { supabase } from '@/integrations/supabase/client';
import { getOrCreateClientConversation } from '@/lib/clientConversation';

const STATUS_LABELS: Record<string, string> = {
  envoyee: 'Offre envoyée',
  interesse: 'Client intéressé',
  visite_planifiee: 'Visite planifiée',
  visite_confirmee: 'Visite confirmée',
  visite_effectuee: 'Visite effectuée',
  souhaite_postuler: 'Client souhaite postuler',
  candidature_deposee: 'Candidature déposée',
  acceptee: 'Offre acceptée',
  refusee: 'Offre refusée',
};

/**
 * Central helper to change offres.statut.
 * - Updates offres.statut
 * - Inserts a system message in the client's canonical conversation
 * - Client notification is handled by DB trigger trg_notify_offre_status_change
 *   (safety net for any code path).
 */
export async function updateOffreStatut(
  offreId: string,
  newStatut: string,
  opts?: { senderId?: string | null; extraMessage?: string }
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { data: offre, error: fetchErr } = await supabase
      .from('offres')
      .select('id, client_id, adresse, statut')
      .eq('id', offreId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!offre) throw new Error('Offre introuvable');

    const { error: updErr } = await supabase
      .from('offres')
      .update({ statut: newStatut })
      .eq('id', offreId);
    if (updErr) throw updErr;

    // Post a system message to the client's canonical conversation
    if (offre.client_id) {
      try {
        const convId = await getOrCreateClientConversation(offre.client_id);
        if (convId) {
          const label = STATUS_LABELS[newStatut] || `Statut mis à jour: ${newStatut}`;
          const content = `📌 **${label}**\n\n🏠 ${offre.adresse || ''}${opts?.extraMessage ? `\n\n${opts.extraMessage}` : ''}`;
          await supabase.from('messages').insert({
            conversation_id: convId,
            sender_id: opts?.senderId ?? null,
            sender_type: 'system',
            content,
            offre_id: offreId,
          });
        }
      } catch (e) {
        console.warn('[updateOffreStatut] message insert failed', e);
      }
    }

    return { ok: true };
  } catch (error) {
    console.error('[updateOffreStatut] error', error);
    return { ok: false, error };
  }
}
