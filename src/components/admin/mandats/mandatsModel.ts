/**
 * Modèle de la page « Gestion des mandats » (admin) : fonctions pures, sans requête.
 * Chaque mandat est rangé dans UNE étape et reçoit UNE prochaine action claire,
 * calculées à partir des données déjà chargées (statut, dates, remboursement, résiliation).
 */
import { mandatElapsedFor, mandatRemainingFor } from '@/utils/mandatDates';

export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

/** Étapes exclusives d'un mandat. */
export type EtapeMandat = 'demandes' | 'echus' | 'bientot' | 'actifs' | 'suspendus' | 'reloges' | 'stoppes';
/** Onglets : les étapes + deux vues regroupées. */
export type OngletMandat = 'a_traiter' | EtapeMandat | 'tous';

/** Seuil « bientôt échu » (jours restants). */
export const SEUIL_BIENTOT = 15;

export const ETAPES_A_TRAITER: EtapeMandat[] = ['demandes', 'echus', 'bientot'];

export const ONGLETS: { key: OngletMandat; label: string }[] = [
  { key: 'a_traiter', label: 'À traiter' },
  { key: 'bientot', label: `Bientôt échus (≤ ${SEUIL_BIENTOT} j)` },
  { key: 'echus', label: 'Expirés' },
  { key: 'demandes', label: 'Remboursements / résiliations' },
  { key: 'actifs', label: 'Actifs' },
  { key: 'suspendus', label: 'Suspendus' },
  { key: 'reloges', label: 'Relogés' },
  { key: 'stoppes', label: 'Stoppés' },
  { key: 'tous', label: 'Tous' },
];

/** Phase du mandat d'après les jours écoulés (mêmes seuils et libellés que l'écran d'origine). */
export function getMandateStatus(daysElapsed: number) {
  if (daysElapsed <= 30) return { label: 'Nouveau', variant: 'default' as const, color: 'text-primary', key: 'nouveau' };
  if (daysElapsed <= 60) return { label: 'En cours', variant: 'secondary' as const, color: 'text-muted-foreground', key: 'en_cours' };
  if (daysElapsed < 90) return { label: 'Critique', variant: 'outline' as const, color: 'text-warning', key: 'critique' };
  return { label: 'Expiré', variant: 'destructive' as const, color: 'text-destructive', key: 'expire' };
}

export const isFrozenStatut = (statut?: string | null) => statut === 'reloge' || statut === 'suspendu' || statut === 'stoppe';

export const hasRefundPending = (c: any) => c?.refund_status === 'pending';
export const hasCancellationPending = (c: any) =>
  !!c?.cancellation_requested_at && c?.statut === 'actif' && c?.refund_status !== 'processed';

/** Range un mandat dans une étape. */
export function etapeMandat(c: any): EtapeMandat {
  if (c.statut === 'suspendu') return 'suspendus';
  if (c.statut === 'reloge') return 'reloges';
  if (c.statut === 'stoppe') return 'stoppes';
  if (hasRefundPending(c) || hasCancellationPending(c)) return 'demandes';
  const elapsed = mandatElapsedFor(c);
  const remaining = mandatRemainingFor(c);
  if (remaining <= 0 || elapsed >= 90) return 'echus';
  if (remaining <= SEUIL_BIENTOT) return 'bientot';
  return 'actifs';
}

export type ActionKind = 'fiche' | 'renouveler' | 'relancer';
export type ProchaineMandat = { texte: string; tone: Ton; kind: ActionKind; bouton: string };

const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`;

/**
 * Prochaine action pour un mandat. `kind` désigne le bouton principal :
 * fiche client, renouvellement (dialogue existant) ou relance d'une nouvelle recherche (confirmation existante).
 * `peutRelancer` reprend la condition d'origine du bouton « Relancer une nouvelle recherche ».
 */
export function prochaineActionMandat(c: any): ProchaineMandat {
  const remaining = Math.max(0, Math.ceil(mandatRemainingFor(c)));
  const relancable = peutRelancer(c);
  if (c.statut === 'reloge') {
    return relancable
      ? { texte: 'Client relogé : relancer une recherche seulement s’il le demande', tone: 'success', kind: 'relancer', bouton: 'Relancer une nouvelle recherche (90 jours)' }
      : { texte: 'Client relogé : mandat terminé', tone: 'success', kind: 'fiche', bouton: 'Ouvrir la fiche client' };
  }
  if (c.statut === 'suspendu') {
    return relancable
      ? { texte: 'Mandat suspendu : relancer la recherche quand le client est prêt', tone: 'warning', kind: 'relancer', bouton: 'Relancer une nouvelle recherche (90 jours)' }
      : { texte: 'Mandat suspendu : faire le point avec le client', tone: 'warning', kind: 'fiche', bouton: 'Ouvrir la fiche client' };
  }
  if (c.statut === 'stoppe') {
    return relancable
      ? { texte: 'Mandat stoppé : relancer seulement à la demande du client', tone: 'muted', kind: 'relancer', bouton: 'Relancer une nouvelle recherche (90 jours)' }
      : { texte: 'Mandat stoppé', tone: 'muted', kind: 'fiche', bouton: 'Ouvrir la fiche client' };
  }
  if (hasRefundPending(c)) {
    return { texte: 'Traiter la demande de remboursement', tone: 'danger', kind: 'fiche', bouton: 'Traiter la demande' };
  }
  if (hasCancellationPending(c)) {
    return { texte: 'Demande de résiliation reçue : traiter la demande', tone: 'danger', kind: 'fiche', bouton: 'Traiter la demande' };
  }
  const etape = etapeMandat(c);
  if (etape === 'echus') {
    return { texte: 'Mandat échu : proposer le renouvellement', tone: 'danger', kind: 'renouveler', bouton: 'Renouveler le mandat' };
  }
  if (etape === 'bientot') {
    return { texte: `Échéance dans ${jours(remaining)} : proposer le renouvellement`, tone: 'warning', kind: 'renouveler', bouton: 'Renouveler le mandat' };
  }
  if (remaining <= 30) {
    return { texte: `Renouvellement possible (échéance dans ${jours(remaining)})`, tone: 'neutral', kind: 'renouveler', bouton: 'Renouveler le mandat' };
  }
  return { texte: 'Recherche en cours : suivre l’avancement', tone: 'muted', kind: 'fiche', bouton: 'Ouvrir la fiche client' };
}

/** Condition d'origine du bouton « Relancer une nouvelle recherche (90 jours) ». */
export function peutRelancer(c: any): boolean {
  return ['reloge', 'inactif', 'stoppe', 'suspendu'].includes(c.statut) && c.journey_type !== 'purchase_search';
}

/** Condition d'origine du bouton « Renouveler le mandat ». */
export function peutRenouveler(c: any): boolean {
  return !isFrozenStatut(c.statut) && mandatRemainingFor(c) <= 30;
}

/** Rang d'urgence (plus petit = plus urgent) pour le tri « Urgent d'abord ». */
export function rangUrgence(c: any): number {
  const ordre: EtapeMandat[] = ['demandes', 'echus', 'bientot', 'actifs', 'suspendus', 'stoppes', 'reloges'];
  return ordre.indexOf(etapeMandat(c)) * 1000 + Math.max(0, Math.min(999, mandatRemainingFor(c)));
}

export function nomClient(c: any): string {
  return c?.profiles ? `${c.profiles.prenom ?? ''} ${c.profiles.nom ?? ''}`.trim() || 'Client (sans profil)' : 'Client (sans profil)';
}
