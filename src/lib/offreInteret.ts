/**
 * Intérêt client dérivé de `offres.statut`.
 * Source unique de vérité pour les badges "Intéressé / En attente / Refusé"
 * affichés côté client, admin, agent et coursier.
 */

export type InteretKey = 'interesse' | 'attente' | 'refuse' | 'inconnu';

const INTERESSE_STATUTS = new Set([
  'interesse',
  'souhaite_postuler',
  'candidature_deposee',
  'demande_postulation',
  'visite_planifiee',
  'visite_confirmee',
  'visite_effectuee',
  'acceptee',
]);

const ATTENTE_STATUTS = new Set(['envoyee', 'vue']);

export interface InteretState {
  key: InteretKey;
  label: string;
  short: string;
  className: string;
}

export function getInteretState(statutOffre?: string | null): InteretState {
  const s = (statutOffre || '').trim();

  if (INTERESSE_STATUTS.has(s)) {
    return {
      key: 'interesse',
      label: 'Intéressé ✅',
      short: 'Confirmée',
      className: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30',
    };
  }
  if (s === 'refusee') {
    return {
      key: 'refuse',
      label: 'Refusé ❌',
      short: 'Refusée',
      className: 'bg-red-500/15 text-red-700 border border-red-500/30',
    };
  }
  if (ATTENTE_STATUTS.has(s)) {
    return {
      key: 'attente',
      label: 'En attente ⏳',
      short: 'À confirmer',
      className: 'bg-amber-500/15 text-amber-700 border border-amber-500/30',
    };
  }
  return {
    key: 'inconnu',
    label: 'Intérêt inconnu',
    short: 'Inconnu',
    className: 'bg-muted text-muted-foreground border border-border',
  };
}

/** Une visite est-elle "ferme" (le client a confirmé son intérêt) ? */
export function isVisiteConfirmedByClient(statutOffre?: string | null): boolean {
  return getInteretState(statutOffre).key === 'interesse';
}

/** Récupère le statut de l'offre liée quel que soit le nom de la relation. */
export function offreStatutOf(visite: any): string | null {
  return visite?.offres?.statut ?? visite?.offre?.statut ?? visite?.offre_statut ?? null;
}
