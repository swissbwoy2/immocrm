import { supabase } from '@/integrations/supabase/client';
import { getOrCreateClientConversation } from '@/lib/clientConversation';

/**
 * Actions du client ACHETEUR sur un bien proposé.
 *
 * Même mécanique que le parcours location (offres reçues) :
 *  1. on met à jour l'offre (et la visite quand il y en a une) ;
 *  2. on dépose un message automatique dans la conversation client ↔ agent.
 *
 * Les messages commencent par un emoji suivi d'un titre en gras (ou par les formules
 * « ✅ Le client est intéressé » / « ❌ Le client a refusé »). La base les classe donc
 * comme actions client : ils n'encombrent pas la messagerie et déclenchent une
 * notification « action client » à l'agent assigné et aux admins, avec un lien direct
 * vers l'offre (/agent/offres-envoyees?offreId=… et /admin/offres-envoyees?offreId=…).
 *
 * Aucune action ne déclenche de postulation locative (régie) : réservé à la location.
 */

/** Statuts d'offre utilisés pour un bien à l'achat. */
export const ACHAT_A_REPONDRE = ['envoyee', 'vue'];
export const ACHAT_EN_COURS = ['interesse', 'visite_planifiee', 'visite_confirmee', 'visite_effectuee', 'offre_envisagee', 'acceptee'];

/** Libellés courts des statuts, côté acheteur. */
export const ACHAT_STATUT_COURT: Record<string, string> = {
  envoyee: 'Nouveau',
  vue: 'À répondre',
  interesse: 'Intéressé',
  visite_planifiee: 'Visite planifiée',
  visite_confirmee: 'Visite confirmée',
  visite_effectuee: 'Visité',
  offre_envisagee: "Offre d'achat",
  acceptee: 'Offre acceptée',
  refusee: 'Écarté',
};

export function formatPrixAchat(prix: unknown): string | null {
  const n = Number(prix);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `CHF ${n.toLocaleString('fr-CH')}`;
}

function formatDateHeure(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('fr-CH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich',
  });
}

function ligneBien(offre: any): string {
  const prix = formatPrixAchat(offre?.prix);
  return [
    `🏠 Adresse : ${offre?.adresse || 'non renseignée'}`,
    prix ? `💰 Prix de vente : ${prix}` : null,
  ].filter(Boolean).join('\n');
}

export interface AchatClientRef {
  id: string;
  agent_id: string | null;
}

/**
 * Créneaux de visite proposés par l'agent pour ce bien (à venir, non délégués).
 * L'agent les crée avec l'offre (statut « proposee ») ou les planifie (« planifiee »).
 */
export function creneauxProposes(visites: any[], offreId: string) {
  const now = Date.now();
  return visites
    .filter((v) =>
      v.offre_id === offreId &&
      v.est_deleguee !== true &&
      ['proposee', 'planifiee'].includes(v.statut) &&
      !v.client_confirme_visite_at &&
      v.date_visite && new Date(v.date_visite).getTime() > now,
    )
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());
}

/** Fiche client du compte connecté (id + agent). */
export async function getAchatClient(userId: string): Promise<AchatClientRef | null> {
  const { data } = await supabase
    .from('clients')
    .select('id, agent_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data ? { id: data.id, agent_id: data.agent_id ?? null } : null;
}

/** Dépose l'action dans le fil client ↔ agent (notifie agent + admins via la base). */
export async function notifierAgent(userId: string, clientId: string, offreId: string, content: string) {
  const convId = await getOrCreateClientConversation(clientId);
  if (!convId) return;
  const { error } = await supabase.from('messages').insert({
    conversation_id: convId,
    sender_id: userId,
    sender_type: 'client',
    content,
    offre_id: offreId,
  });
  if (error) console.warn('[achatOffreActions] message non envoyé', error);
}

async function majStatutOffre(offreId: string, statut: string) {
  const { error } = await supabase
    .from('offres')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', offreId);
  if (error) throw error;
}

/** « Ce bien m'intéresse » (ou « Finalement, ce bien m'intéresse »). */
export async function marquerInteretAchat(userId: string, offre: any) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');
  await majStatutOffre(offre.id, 'interesse');
  await notifierAgent(
    userId,
    client.id,
    offre.id,
    `✅ Le client est intéressé par ce bien à l'achat\n\n${ligneBien(offre)}\n\nMerci de lui proposer une visite.`,
  );
}

/** « Pas intéressé » / « Je ne suis plus intéressé ». */
export async function refuserBienAchat(userId: string, offre: any) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');
  await majStatutOffre(offre.id, 'refusee');
  // Les visites à venir de ce bien n'ont plus lieu d'être : on les retire de l'agenda (conseiller compris).
  await supabase
    .from('visites')
    .update({ statut: 'annulee' })
    .eq('offre_id', offre.id)
    .eq('client_id', client.id)
    .in('statut', ['proposee', 'planifiee', 'confirmee'])
    .gt('date_visite', new Date().toISOString());
  await notifierAgent(userId, client.id, offre.id, `❌ Le client a refusé ce bien à l'achat\n\n${ligneBien(offre)}`);
}

/**
 * Visite accompagnée par le conseiller.
 *  - créneau proposé par l'agent choisi → la visite est confirmée par le client ;
 *  - sinon → demande de visite avec les disponibilités du client, l'agent fixe la date.
 */
export async function demanderVisiteAchat(
  userId: string,
  offre: any,
  opts: { creneau?: { id: string; date_visite: string } | null; disponibilites?: string },
) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');

  if (opts.creneau) {
    const { error } = await supabase
      .from('visites')
      .update({ statut: 'confirmee', client_confirme_visite_at: new Date().toISOString() })
      .eq('id', opts.creneau.id);
    if (error) throw error;
    await majStatutOffre(offre.id, 'visite_planifiee');
    await notifierAgent(
      userId,
      client.id,
      offre.id,
      `📅 **Visite confirmée par le client (achat)**\n\n${ligneBien(offre)}\n📆 ${formatDateHeure(opts.creneau.date_visite)}\n\n✅ Le client confirme sa présence. Visite accompagnée par son conseiller.`,
    );
    return;
  }

  if (['envoyee', 'vue', 'refusee'].includes(offre.statut)) {
    await majStatutOffre(offre.id, 'interesse');
  }
  const dispo = (opts.disponibilites || '').trim();
  await notifierAgent(
    userId,
    client.id,
    offre.id,
    `📅 **Demande de visite (achat)**\n\n${ligneBien(offre)}\n\n${dispo ? `🗓️ Disponibilités du client :\n${dispo}\n\n` : ''}Merci de fixer la visite avec le vendeur et de proposer un créneau au client.`,
  );
}

/** « Mon conseiller visite pour moi » : visite déléguée (compte-rendu et vidéo ensuite). */
export async function deleguerVisiteAchat(
  userId: string,
  offre: any,
  opts: { creneau?: { id: string; date_visite: string } | null },
) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');

  if (opts.creneau) {
    // Le créneau proposé par le conseiller devient la visite déléguée (pas de doublon dans son agenda).
    const { error } = await supabase
      .from('visites')
      .update({ est_deleguee: true, source: 'deleguee', statut: 'planifiee', notes: 'Visite déléguée au conseiller par le client (achat)' })
      .eq('id', opts.creneau.id);
    if (error) throw error;
  }

  if (['envoyee', 'vue', 'refusee'].includes(offre.statut)) {
    await majStatutOffre(offre.id, 'interesse');
  }
  await notifierAgent(
    userId,
    client.id,
    offre.id,
    `🏠 **Visite déléguée au conseiller (achat)**\n\n${ligneBien(offre)}\n${opts.creneau ? `📆 Créneau retenu : ${formatDateHeure(opts.creneau.date_visite)}\n` : ''}\nLe client souhaite que vous visitiez ce bien pour lui, avec compte-rendu et vidéo.${opts.creneau ? '' : ' Merci de fixer la date avec le vendeur.'}`,
  );
}

/** « J'ai fait la visite ». */
export async function confirmerVisiteFaiteAchat(userId: string, offre: any, visites: any[] = []) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');
  const visite = derniereVisite(visites, offre.id);
  if (visite?.id) {
    // Le client a fait la visite : elle est effectuée et ne sera pas redemandée par la question après visite.
    await supabase
      .from('visites')
      .update({
        statut: 'effectuee',
        client_confirme_visite_at: visite.client_confirme_visite_at || new Date().toISOString(),
        client_decision: 'interesse',
        client_decision_at: new Date().toISOString(),
      })
      .eq('id', visite.id);
  }
  await majStatutOffre(offre.id, 'visite_effectuee');
  await notifierAgent(userId, client.id, offre.id, `✅ **Visite effectuée (achat)**\n\n${ligneBien(offre)}\n\nLe client indique avoir visité le bien.`);
}

/** Dernière visite réellement passée (ou effectuée / avec compte-rendu) — jamais un créneau futur. */
function derniereVisite(visites: any[], offreId: string) {
  const now = Date.now();
  return visites
    .filter((v) =>
      v.offre_id === offreId &&
      !['annulee', 'proposee'].includes(v.statut) &&
      (v.statut === 'effectuee' || !!v.compte_rendu_at || (v.date_visite && new Date(v.date_visite).getTime() <= now)),
    )
    .sort((a, b) => new Date(b.date_visite || 0).getTime() - new Date(a.date_visite || 0).getTime())[0];
}

/** Après la visite : « Je souhaite faire une offre d'achat ». */
export async function souhaiteFaireOffreAchat(
  userId: string,
  offre: any,
  opts: { montant?: number | null; commentaire?: string; visites?: any[] },
) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');
  const visite = derniereVisite(opts.visites || [], offre.id);
  if (visite?.id) {
    await supabase
      .from('visites')
      .update({ client_decision: 'interesse', client_decision_at: new Date().toISOString() })
      .eq('id', visite.id);
  }
  await majStatutOffre(offre.id, 'offre_envisagee');
  const montant = opts.montant && opts.montant > 0 ? `CHF ${Math.round(opts.montant).toLocaleString('fr-CH')}` : null;
  const commentaire = (opts.commentaire || '').trim();
  await notifierAgent(
    userId,
    client.id,
    offre.id,
    `💰 **Le client souhaite faire une offre d'achat**\n\n${ligneBien(offre)}\n${montant ? `💵 Montant envisagé : ${montant}\n` : ''}${commentaire ? `📝 ${commentaire}\n` : ''}\nMerci de le rappeler pour préparer l'offre (financement, conditions, négociation).`,
  );
}

/** Après la visite : « Ce bien ne me convient pas ». */
export async function renoncerApresVisiteAchat(userId: string, offre: any, visites: any[] = []) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');
  const visite = derniereVisite(visites, offre.id);
  if (visite?.id) {
    await supabase
      .from('visites')
      .update({ client_decision: 'refuse', client_decision_at: new Date().toISOString() })
      .eq('id', visite.id);
  }
  await majStatutOffre(offre.id, 'refusee');
  await notifierAgent(userId, client.id, offre.id, `❌ **Après la visite, ce bien ne convient pas au client (achat)**\n\n${ligneBien(offre)}`);
}

/** La visite prévue n'a pas pu avoir lieu : annulée, le bien reste en cours et le conseiller propose une autre date. */
export async function visiteNonFaiteAchat(userId: string, offre: any, visiteId: string) {
  const client = await getAchatClient(userId);
  if (!client) throw new Error('Fiche client introuvable');
  const { error } = await supabase
    .from('visites')
    .update({ client_decision: 'refuse', client_decision_at: new Date().toISOString(), statut: 'annulee' })
    .eq('id', visiteId);
  if (error) throw error;
  if (offre?.id) {
    if (['visite_planifiee', 'visite_confirmee'].includes(offre.statut)) await majStatutOffre(offre.id, 'interesse');
    await notifierAgent(
      userId,
      client.id,
      offre.id,
      `📅 **Visite non effectuée (achat)**\n\n${ligneBien(offre)}\n\nLe client n'a pas pu visiter. Merci de lui proposer une nouvelle date.`,
    );
  }
}
