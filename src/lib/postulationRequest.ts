import { supabase } from '@/integrations/supabase/client';

/**
 * Helper partagé pour toutes les demandes de dépôt de candidature.
 * Envoie une notification in-app (+ push via trigger DB) à l'agent et aux admins,
 * sans doublon si un même user_id est à la fois agent et admin.
 */
export async function notifyPostulationRequest(params: {
  clientId?: string | null;
  agentId?: string | null;
  offreId?: string | null;
  visiteId?: string | null;
  address?: string;
  displayName?: string;
  choice?: 'souhaite_postuler' | 'refuse';
}): Promise<void> {
  const {
    clientId = null,
    agentId = null,
    offreId = null,
    visiteId = null,
    address = '',
    displayName = 'Le client',
    choice = 'souhaite_postuler',
  } = params;

  const isPostuler = choice === 'souhaite_postuler';
  const title = isPostuler
    ? `✅ ${displayName} souhaite postuler — ${address}`
    : `❌ ${displayName} ne postule pas — ${address}`;
  const message = isPostuler
    ? `Le client souhaite déposer sa candidature.`
    : `Le client ne souhaite pas postuler.`;
  const type = isPostuler ? 'client_souhaite_postuler' : 'visit_refused';
  const metadata = {
    visite_id: visiteId,
    offre_id: offreId,
    client_id: clientId,
    adresse: address,
  };

  const notified = new Set<string>();

  if (agentId) {
    const { data: agentRow } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .maybeSingle();
    if (agentRow?.user_id) {
      notified.add(agentRow.user_id);
      await supabase.rpc('create_notification', {
        p_user_id: agentRow.user_id,
        p_type: type,
        p_title: title,
        p_message: message,
        p_link: `/agent/clients/${clientId ?? ''}`,
        p_metadata: metadata,
      });
    }
  }

  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  for (const a of admins || []) {
    if (!a.user_id || notified.has(a.user_id)) continue;
    notified.add(a.user_id);
    await supabase.rpc('create_notification', {
      p_user_id: a.user_id,
      p_type: `${type}_admin`,
      p_title: title,
      p_message: message,
      p_link: `/admin/clients/${clientId ?? ''}`,
      p_metadata: metadata,
    });
  }
}

/** Récupère le nom affichable du client courant. */
export async function getClientDisplayName(userId: string): Promise<string> {
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('prenom, nom')
    .eq('id', userId)
    .maybeSingle();
  return `${profileRow?.prenom || ''} ${profileRow?.nom || ''}`.trim() || 'Le client';
}
