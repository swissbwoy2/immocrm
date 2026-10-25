/**
 * Modèle de la liste des clients (admin) : fonctions pures, sans aucun appel réseau.
 * À partir des données déjà chargées par la page, chaque client est :
 *  - rangé dans une situation (actifs, en attente, relogés, arrêtés),
 *  - signalé « à traiter » pour un ou plusieurs motifs (sans agent, dossier incomplet,
 *    échéance du mandat proche, inactif depuis longtemps),
 *  - doté d'UNE prochaine action claire et d'un score d'urgence pour le tri.
 */
import { hasStableStatus } from '@/hooks/useSolvabilityCheck';
import { CUMULATIVE_TYPES } from '@/hooks/useClientCandidates';
import { mandatElapsedFor, mandatRemainingFor } from '@/utils/mandatDates';
import type { ReletterCounts, ReletterRequest } from '@/components/admin/ClientCardReletter';

export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export type Situation = 'a_traiter' | 'actifs' | 'en_attente' | 'reloges' | 'arretes' | 'tous';
export type Motif = 'sans_agent' | 'incomplet' | 'mandat' | 'inactif';

export const SITUATIONS: { key: Situation; label: string }[] = [
  { key: 'a_traiter', label: 'À traiter' },
  { key: 'actifs', label: 'Actifs' },
  { key: 'en_attente', label: 'En attente' },
  { key: 'reloges', label: 'Relogés' },
  { key: 'arretes', label: 'Suspendus / stoppés' },
  { key: 'tous', label: 'Tous' },
];

export const MOTIFS: { key: Motif; label: string }[] = [
  { key: 'sans_agent', label: 'Sans agent' },
  { key: 'incomplet', label: 'Dossier incomplet' },
  { key: 'mandat', label: 'Mandat bientôt échu' },
  { key: 'inactif', label: 'Inactifs depuis longtemps' },
];

/** Seuils d'alerte (purement visuels). */
export const SEUIL_MANDAT_JOURS = 10;
export const SEUIL_INACTIF_JOURS = 30;

export const RELOUER_STATUS: Record<string, { label: string; tone: Ton }> = {
  new_request: { label: 'Nouvelle', tone: 'primary' },
  to_qualify: { label: 'À qualifier', tone: 'warning' },
  missing_information: { label: 'Dossier incomplet', tone: 'warning' },
  waiting_documents: { label: 'Documents manquants', tone: 'warning' },
  waiting_photos: { label: 'Photos manquantes', tone: 'warning' },
  ready_to_publish: { label: 'Prêt à publier', tone: 'success' },
  published: { label: 'Publié', tone: 'success' },
  visits_scheduled: { label: 'Visites en cours', tone: 'neutral' },
  applications_received: { label: 'Candidatures reçues', tone: 'neutral' },
  sent_to_agency: { label: 'Transmis régie', tone: 'neutral' },
  rented: { label: 'Reloué', tone: 'success' },
  cancelled: { label: 'Annulé', tone: 'muted' },
  archived: { label: 'Archivé', tone: 'muted' },
};

export type ClientLike = {
  id: string;
  user_id: string;
  agent_id?: string;
  type_permis?: string;
  nationalite?: string;
  revenus_mensuels?: number;
  budget_max?: number;
  poursuites?: boolean;
  date_ajout?: string;
  created_at?: string;
  [k: string]: any;
};

export type ProfileLike = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  actif?: boolean;
  last_seen_at?: string | null;
  is_online?: boolean | null;
};

export type CandidateLike = {
  type: string;
  revenus_mensuels?: number;
  type_permis?: string;
  nationalite?: string;
  poursuites?: boolean;
};

export type Solvabilite = {
  clientHasStableStatus: boolean;
  totalRevenus: number;
  budgetDemande: number;
  garantsRevenusTotal: number;
  garantCoverageValid: boolean;
  budgetOk: boolean;
  isSolvable: boolean;
  excludedCandidates: number;
};

/** Calcul de solvabilité identique à celui de l'ancienne carte (location seulement). */
export function solvabilite(client: ClientLike, candidates: CandidateLike[], isAcheteur: boolean): Solvabilite {
  const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);
  const clientRevenus = client.revenus_mensuels || 0;
  const budgetDemande = client.budget_max || 0;
  const stableCumulativeCandidates = candidates.filter((c) => {
    if (!CUMULATIVE_TYPES.includes(c.type as any)) return false;
    if (c.poursuites) return false;
    return hasStableStatus(c.type_permis, c.nationalite);
  });
  const candidatesRevenus = stableCumulativeCandidates.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);
  const totalRevenus = clientHasStableStatus ? clientRevenus + candidatesRevenus : candidatesRevenus;
  const budgetPossible = Math.round(totalRevenus / 3);
  const garants = candidates.filter((c) => c.type === 'garant');
  const stableGarants = garants.filter((g) => !g.poursuites && hasStableStatus(g.type_permis, g.nationalite));
  const garantsRevenusTotal = stableGarants.reduce((sum, g) => sum + (g.revenus_mensuels || 0), 0);
  const garantCoverageValid = stableGarants.length > 0 && (budgetDemande === 0 || garantsRevenusTotal >= budgetDemande * 3);
  const hasCriticalProblems = !!client.poursuites || (!clientHasStableStatus && !garantCoverageValid);
  const budgetOk = budgetDemande === 0 || (clientHasStableStatus && budgetPossible >= budgetDemande) || garantCoverageValid;
  const isSolvable = isAcheteur ? true : (!hasCriticalProblems && budgetOk && (clientHasStableStatus || garantCoverageValid));
  const excludedCandidates = candidates.filter((c) =>
    CUMULATIVE_TYPES.includes(c.type as any) && !c.poursuites && !hasStableStatus(c.type_permis, c.nationalite),
  ).length;
  return { clientHasStableStatus, totalRevenus, budgetDemande, garantsRevenusTotal, garantCoverageValid, budgetOk, isSolvable, excludedCandidates };
}

export type Prochaine = { texte: string; tone: Ton; cta: 'fiche' | 'inviter' | 'appeler' };

export type ClientVue = {
  client: ClientLike;
  profile: ProfileLike;
  /** Carte reloueur (reloueur pur, ou mixte avec un dossier reloueur). */
  reloueur: boolean;
  isMixed: boolean;
  isAcheteur: boolean;
  parcours: string;
  statut: string | undefined;
  isActivated: boolean;
  isFrozen: boolean;
  daysElapsed: number;
  daysRemaining: number | null;
  progressPercent: number;
  solv: Solvabilite;
  agentId?: string | null;
  manquants: string[];
  joursSansActivite: number | null;
  offresToday: number;
  docConfirmed: boolean;
  request?: ReletterRequest;
  counts: ReletterCounts;
  situation: Exclude<Situation, 'a_traiter' | 'tous'>;
  motifs: Motif[];
  prochaine: Prochaine;
  urgence: number;
};

const joursDepuis = (iso?: string | null) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null;

const TON_RANG: Record<Ton, number> = { danger: 0, warning: 1, primary: 2, neutral: 3, success: 4, muted: 5 };

export function construireVue(args: {
  client: ClientLike;
  profile: ProfileLike;
  candidates: CandidateLike[];
  isAcheteur: boolean;
  isMixed: boolean;
  reloueur: boolean;
  request?: ReletterRequest;
  counts?: ReletterCounts;
  offresToday: number;
  docConfirmed: boolean;
}): ClientVue {
  const { client, profile, candidates, isAcheteur, isMixed, reloueur, request, offresToday, docConfirmed } = args;
  const counts = args.counts ?? { photos: 0, docs: 0, slots: 0, candidates: 0 };
  const statut: string | undefined = client.statut;
  const isActivated = ['actif', 'reloge', 'stoppe', 'suspendu'].includes(statut ?? '');
  const isFrozenClient = ['reloge', 'stoppe', 'suspendu'].includes(statut ?? '');
  const frozenEndDate = isFrozenClient ? (client.date_changement_statut || client.updated_at) : undefined;
  const daysElapsed = isActivated ? mandatElapsedFor(client as any, frozenEndDate) : 0;
  const daysRemaining = statut === 'actif' ? Math.floor(mandatRemainingFor(client as any)) : null;
  const progressPercent = isActivated ? (daysElapsed / 90) * 100 : 0;
  const solv = solvabilite(client, candidates, isAcheteur);

  const parcours = reloueur ? (isMixed ? 'Relocation + recherche' : 'Relocation') : isAcheteur ? 'Achat' : isMixed ? 'Location + relocation' : 'Location';

  // --- Reloueur ------------------------------------------------------------
  if (reloueur) {
    const st = request?.status;
    const isFrozen = st === 'rented' || st === 'cancelled' || st === 'archived';
    const agentId = request?.assigned_agent_id ?? null;
    const joursSansActivite = joursDepuis(request?.updated_at || request?.created_at);
    const manquants: string[] = [];
    if (!request) manquants.push('dossier reloueur');
    if (st === 'missing_information') manquants.push('informations');
    if (st === 'waiting_documents') manquants.push('documents');
    if (st === 'waiting_photos') manquants.push('photos');

    const motifs: Motif[] = [];
    if (!isFrozen) {
      if (!agentId) motifs.push('sans_agent');
      if (!request || ['new_request', 'to_qualify', 'missing_information', 'waiting_documents', 'waiting_photos'].includes(st ?? '')) motifs.push('incomplet');
      if (profile.actif && joursSansActivite != null && joursSansActivite > SEUIL_INACTIF_JOURS) motifs.push('inactif');
    }

    const situation: ClientVue['situation'] =
      st === 'rented' ? 'reloges' : st === 'cancelled' || st === 'archived' ? 'arretes' : !request || st === 'new_request' ? 'en_attente' : 'actifs';

    let prochaine: Prochaine;
    if (!request) prochaine = { texte: 'Aucun dossier reloueur : compléter la demande', tone: 'warning', cta: 'fiche' };
    else if (st === 'rented') prochaine = { texte: 'Logement reloué', tone: 'success', cta: 'fiche' };
    else if (st === 'cancelled') prochaine = { texte: 'Demande annulée', tone: 'muted', cta: 'fiche' };
    else if (st === 'archived') prochaine = { texte: 'Dossier archivé', tone: 'muted', cta: 'fiche' };
    else if (!agentId) prochaine = { texte: 'Assigner un agent au dossier', tone: 'warning', cta: 'fiche' };
    else if (!profile.actif) prochaine = { texte: 'Compte non activé : envoyer l’invitation', tone: 'primary', cta: 'inviter' };
    else {
      const parStatut: Record<string, Prochaine> = {
        new_request: { texte: 'Nouvelle demande : qualifier le dossier', tone: 'primary', cta: 'fiche' },
        to_qualify: { texte: 'Qualifier le dossier', tone: 'warning', cta: 'fiche' },
        missing_information: { texte: 'Compléter les informations du logement', tone: 'warning', cta: 'fiche' },
        waiting_documents: { texte: 'Relancer le client pour les documents', tone: 'warning', cta: 'appeler' },
        waiting_photos: { texte: 'Relancer le client pour les photos', tone: 'warning', cta: 'appeler' },
        ready_to_publish: { texte: 'Prêt : publier l’annonce', tone: 'primary', cta: 'fiche' },
        published: { texte: 'Annonce publiée : organiser les visites', tone: 'neutral', cta: 'fiche' },
        visits_scheduled: { texte: 'Visites en cours', tone: 'neutral', cta: 'fiche' },
        applications_received: { texte: 'Candidatures reçues : les examiner', tone: 'primary', cta: 'fiche' },
        sent_to_agency: { texte: 'Dossier transmis à la régie', tone: 'muted', cta: 'fiche' },
      };
      prochaine = parStatut[st ?? ''] ?? { texte: 'Suivre le dossier', tone: 'neutral', cta: 'fiche' };
      if (motifs.includes('inactif') && TON_RANG[prochaine.tone] >= TON_RANG.neutral) {
        prochaine = { texte: `Sans activité depuis ${joursSansActivite} j : relancer`, tone: 'warning', cta: 'appeler' };
      }
    }

    return {
      client, profile, reloueur, isMixed, isAcheteur, parcours, statut, isActivated, isFrozen,
      daysElapsed, daysRemaining: null, progressPercent, solv, agentId, manquants, joursSansActivite,
      offresToday, docConfirmed, request, counts, situation, motifs, prochaine,
      urgence: TON_RANG[prochaine.tone] * 10 - motifs.length,
    };
  }

  // --- Chercheur location / acheteur ---------------------------------------
  const isFrozen = ['reloge', 'stoppe', 'suspendu', 'inactif'].includes(statut ?? '');
  const agentId = client.agent_id ?? null;
  const joursSansActivite = joursDepuis(profile.last_seen_at);
  const manquants: string[] = [];
  if (!client.type_permis) manquants.push('permis');
  if (!profile.telephone) manquants.push('téléphone');
  if (!client.budget_max) manquants.push('budget');

  const motifs: Motif[] = [];
  if (!isFrozen) {
    if (!agentId) motifs.push('sans_agent');
    if (manquants.length > 0) motifs.push('incomplet');
    if (!isAcheteur && daysRemaining != null && daysRemaining <= SEUIL_MANDAT_JOURS) motifs.push('mandat');
    if (statut === 'actif' && profile.actif && joursSansActivite != null && joursSansActivite > SEUIL_INACTIF_JOURS) motifs.push('inactif');
  }

  const situation: ClientVue['situation'] =
    statut === 'actif' ? 'actifs' : statut === 'reloge' ? 'reloges' : isFrozen ? 'arretes' : 'en_attente';

  let prochaine: Prochaine;
  if (statut === 'reloge') prochaine = { texte: 'Client relogé : dossier clos', tone: 'success', cta: 'fiche' };
  else if (statut === 'stoppe') prochaine = { texte: 'Mandat stoppé', tone: 'muted', cta: 'fiche' };
  else if (statut === 'suspendu') prochaine = { texte: 'Mandat suspendu', tone: 'muted', cta: 'fiche' };
  else if (statut === 'inactif') prochaine = { texte: 'Client inactif', tone: 'muted', cta: 'fiche' };
  else if (!agentId) prochaine = { texte: 'Assigner un agent', tone: 'warning', cta: 'fiche' };
  else if (motifs.includes('mandat')) {
    prochaine = daysRemaining! <= 0
      ? { texte: 'Échéance du mandat atteinte', tone: 'danger', cta: 'fiche' }
      : { texte: `Échéance du mandat dans ${daysRemaining} j`, tone: 'warning', cta: 'fiche' };
  } else if (!profile.actif) prochaine = { texte: 'Compte non activé : envoyer l’invitation', tone: 'primary', cta: 'inviter' };
  else if (manquants.length > 0) prochaine = { texte: `Compléter le dossier : ${manquants.join(', ')}`, tone: 'warning', cta: 'fiche' };
  else if (!isAcheteur && !solv.isSolvable) prochaine = { texte: 'Solvabilité à vérifier', tone: 'warning', cta: 'fiche' };
  else if (motifs.includes('inactif')) prochaine = { texte: `Aucune connexion depuis ${joursSansActivite} j : relancer`, tone: 'warning', cta: profile.telephone ? 'appeler' : 'fiche' };
  else if (statut !== 'actif') prochaine = { texte: 'En attente d’activation du mandat', tone: 'neutral', cta: 'fiche' };
  else if (!isAcheteur && !docConfirmed) prochaine = { texte: 'Dossier du mois pas encore confirmé', tone: 'muted', cta: 'fiche' };
  else prochaine = offresToday > 0
    ? { texte: `Recherche active · ${offresToday} offre${offresToday > 1 ? 's' : ''} aujourd’hui`, tone: 'success', cta: 'fiche' }
    : { texte: 'Recherche en cours', tone: 'success', cta: 'fiche' };

  return {
    client, profile, reloueur, isMixed, isAcheteur, parcours, statut, isActivated, isFrozen,
    daysElapsed, daysRemaining, progressPercent, solv, agentId, manquants, joursSansActivite,
    offresToday, docConfirmed, counts, situation, motifs, prochaine,
    urgence: TON_RANG[prochaine.tone] * 10 - motifs.length,
  };
}

/** La vue appartient-elle à l'onglet (et au motif, pour « À traiter ») ? */
export function dansOnglet(v: ClientVue, tab: Situation, motif: Motif | 'tous'): boolean {
  if (tab === 'tous') return true;
  if (tab === 'a_traiter') return v.motifs.length > 0 && (motif === 'tous' || v.motifs.includes(motif));
  return v.situation === tab;
}

export function nomComplet(p?: ProfileLike | null): string {
  const n = `${p?.prenom ?? ''} ${p?.nom ?? ''}`.trim();
  return n || p?.email || 'Client';
}

export function initiales(p?: ProfileLike | null): string {
  return `${p?.prenom?.charAt(0) ?? ''}${p?.nom?.charAt(0) ?? ''}`.toUpperCase() || '?';
}

export function derniereConnexion(v: ClientVue): string {
  if (v.profile.is_online) return 'En ligne';
  if (v.joursSansActivite == null) return v.reloueur ? '—' : 'Jamais connecté';
  if (v.joursSansActivite === 0) return 'aujourd’hui';
  return `il y a ${v.joursSansActivite} j`;
}

export const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};
