/**
 * Steeve — l'assistant conversationnel de Logisorama.
 * Valeurs partagées par la bulle de messagerie et les pages Messagerie.
 */

/** Valeur de `messages.sender_type` réservée aux messages publiés par Steeve (côté serveur uniquement). */
export const STEEVE_SENDER_TYPE = 'assistant';

/** Nom affiché au-dessus des messages de Steeve. */
export const STEEVE_DISPLAY_NAME = 'Steeve · assistant Logisorama';

export const isSteeveSender = (senderType?: string | null) => senderType === STEEVE_SENDER_TYPE;

/** Identifiant d'envoi généré côté appareil : un renvoi après coupure ne crée pas de doublon. */
export function newClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Repli pour les navigateurs anciens (format UUID v4).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Erreur Postgres « valeur déjà existante » sur l'identifiant d'envoi : le message est déjà enregistré. */
export function isDuplicateClientMessage(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && error.code === '23505' && (error.message || '').includes('client_msg_id');
}
