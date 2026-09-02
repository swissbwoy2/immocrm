// Helpers partagés autour de l'annulation de mandat client.

export const MANDAT_CANCELLED_OFFER_MESSAGE =
  "Ce client a annulé son mandat — il doit d'abord le renouveler avant de recevoir des offres.";

export const MANDAT_RENEWAL_ACOMPTE_WARNING =
  "Vous avez récemment annulé votre mandat ! L'acompte de 300.- sera de nouveau dû pour l'activation de vos recherches.";

export interface CancellableClientLike {
  statut?: string | null;
  cancellation_requested_at?: string | null;
}

/** Client ayant annulé son mandat et pas encore réactivé. */
export function isMandatCancelled(client: CancellableClientLike | null | undefined): boolean {
  if (!client) return false;
  if (!client.cancellation_requested_at) return false;
  return !['actif', 'en_attente'].includes(client.statut ?? '');
}

/** Détecte l'erreur remontée par le trigger DB bloquant les offres d'un mandat annulé. */
export function isMandatCancelledError(error: unknown): boolean {
  const e = error as { message?: string; details?: string; hint?: string } | null;
  const text = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.hint ?? ''}`.toLowerCase();
  return text.includes('mandat annul');
}
