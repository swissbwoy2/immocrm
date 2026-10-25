/**
 * Modèle de la page Postulations : une seule file de travail qui réunit
 * la demande du client (offre « souhaite_postuler »), la préparation automatique
 * (postulation_jobs) et le dossier préparé par la routine (postulations_preparees).
 * Chaque demande est rangée dans une étape et reçoit UNE prochaine action claire.
 */

export type ClientInfo = { prenom?: string | null; nom?: string | null; email?: string | null };

export type JobInfo = {
  id: string;
  status: string;
  priority: string | null;
  created_at: string;
  ai_result: { missing_items?: string[]; concise_staff_summary?: string } | null;
};

export type Dossier = {
  id: string;
  offre_id: string | null;
  client_id: string | null;
  canal: string;
  regie_nom: string | null;
  destinataire_email: string | null;
  objet: string | null;
  adresse_bien: string | null;
  reference_bien: string | null;
  client_nom: string | null;
  brouillon_ref: string | null;
  pieces: unknown;
  formulaire_location_ok: boolean | null;
  rapport: string | null;
  statut: string;
  motif_blocage: string | null;
  valide_le: string | null;
  envoye_le: string | null;
  preuve_envoi: string | null;
  created_at: string;
};

export type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  date_envoi?: string | null;
  postulation_demandee_at?: string | null;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  statut: string | null;
  lien_annonce: string | null;
  client_id: string;
  agent_id?: string | null;
  demande_at?: string | null;
  _client?: ClientInfo;
  _job?: JobInfo;
  _dossier?: Dossier;
};

export type Etape = 'a_traiter' | 'en_cours' | 'deposees' | 'historique';
export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export const JOB_STATUS: Record<string, { label: string; tone: Ton }> = {
  queued: { label: 'En file', tone: 'muted' },
  processing: { label: 'Analyse en cours', tone: 'neutral' },
  ready: { label: 'Prêt', tone: 'success' },
  blocked: { label: 'Bloqué', tone: 'warning' },
  failed: { label: 'Erreur', tone: 'danger' },
  completed: { label: 'Terminé', tone: 'success' },
};

export const PRIORITY_LABEL: Record<string, string> = { low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente' };

export const CANAL: Record<string, string> = {
  email: 'E-mail (visites@)',
  flatfox: 'Flatfox',
  immobilier: 'immobilier.ch',
  naef_ecandidat: 'e-candidat Naef',
  autre: 'Autre',
};

export const DOSSIER_STATUT: Record<string, { label: string; tone: Ton }> = {
  prepare: { label: 'En contrôle', tone: 'muted' },
  a_valider: { label: 'À valider', tone: 'warning' },
  valide: { label: 'Validé — envoi au prochain passage', tone: 'neutral' },
  envoye: { label: 'Envoyé', tone: 'success' },
  refuse: { label: 'Refusé', tone: 'danger' },
  erreur: { label: 'Erreur d’envoi', tone: 'danger' },
};

/** Dossier prioritaire pour une offre : celui qui demande une décision, sinon le plus récent. */
export function choisirDossier(list: Dossier[]): Dossier | undefined {
  if (list.length === 0) return undefined;
  const ordre = ['a_valider', 'erreur', 'prepare', 'valide', 'envoye', 'refuse'];
  return [...list].sort((a, b) => {
    const d = ordre.indexOf(a.statut) - ordre.indexOf(b.statut);
    return d !== 0 ? d : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];
}

export type Prochaine = { etape: Etape; texte: string; tone: Ton; decision?: boolean };

/** Range une demande dans une étape et formule la prochaine action. */
export function prochaineAction(r: Row): Prochaine {
  if (r.statut === 'candidature_deposee') {
    return { etape: 'deposees', texte: 'Candidature déposée auprès de la régie', tone: 'success' };
  }
  const d = r._dossier;
  if (d) {
    switch (d.statut) {
      case 'a_valider': return { etape: 'a_traiter', texte: 'Contrôler puis valider le dossier préparé', tone: 'warning', decision: true };
      case 'erreur': return { etape: 'a_traiter', texte: 'Erreur d’envoi : vérifier puis valider à nouveau', tone: 'danger', decision: true };
      case 'prepare': return { etape: 'en_cours', texte: 'Dossier en contrôle par la Surveillance', tone: 'muted' };
      case 'valide': return { etape: 'en_cours', texte: 'Validé : envoi au prochain passage de la routine', tone: 'neutral' };
      case 'envoye': return { etape: 'a_traiter', texte: 'Dossier envoyé : confirmer le dépôt', tone: 'success' };
      case 'refuse': return { etape: 'a_traiter', texte: 'Dossier refusé : déposer la candidature à la main', tone: 'warning' };
    }
  }
  const j = r._job;
  switch (j?.status) {
    case 'queued': return { etape: 'en_cours', texte: 'En file de préparation', tone: 'muted' };
    case 'processing': return { etape: 'en_cours', texte: 'Préparation automatique en cours', tone: 'neutral' };
    case 'ready':
    case 'completed': return { etape: 'a_traiter', texte: 'Dossier prêt : déposer la candidature', tone: 'success' };
    case 'blocked': return { etape: 'a_traiter', texte: 'Pièces manquantes : compléter le dossier', tone: 'warning' };
    case 'failed': return { etape: 'a_traiter', texte: 'Erreur de préparation : déposer à la main', tone: 'danger' };
    default: return { etape: 'a_traiter', texte: 'Déposer la candidature', tone: 'primary' };
  }
}

/** Délai d'attente depuis la demande du client (la Surveillance alerte après 24 h). */
export function attente(r: Row): { heures: number; label: string; enRetard: boolean } {
  const t = new Date(r.demande_at || r.created_at || Date.now()).getTime();
  const heures = Math.max(0, Math.floor((Date.now() - t) / 3600000));
  const label = heures < 1 ? 'à l’instant' : heures < 24 ? `il y a ${heures} h` : `il y a ${Math.floor(heures / 24)} j`;
  return { heures, label, enRetard: r.statut !== 'candidature_deposee' && heures >= 24 };
}

export function nomClient(c?: ClientInfo): string {
  const n = `${c?.prenom ?? ''} ${c?.nom ?? ''}`.trim();
  return n || c?.email || 'Client';
}

/** Regroupe des demandes par client en gardant l'ordre de la liste (le 1er élément de chaque client fixe sa place). */
export function grouperParClient(rows: Row[]): { clientId: string; rows: Row[] }[] {
  const groupes = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r.client_id || `sans-client-${r.id}`;
    groupes.set(k, [...(groupes.get(k) ?? []), r]);
  }
  return Array.from(groupes, ([clientId, list]) => ({ clientId, rows: list }));
}

/** Candidature déposée récemment (date de dernière mise à jour de l'offre, faute de date de dépôt dédiée). */
export function deposeeDepuis(r: Row, jours: number): boolean {
  if (r.statut !== 'candidature_deposee') return false;
  const t = new Date(r.updated_at || r.created_at || 0).getTime();
  return Date.now() - t <= jours * 24 * 3600 * 1000;
}

/** Libellé lisible d'un agent responsable. */
export function libelleAgent(agentId: string | null | undefined, noms: Map<string, string>): string {
  if (!agentId) return 'Sans agent';
  return noms.get(agentId) || `Agent #${agentId.slice(0, 6)}`;
}

/** Résumé de l'en-tête : « 3 à traiter (1 > 24 h) · 2 dossiers à valider · 5 déposées sur 7 jours ». */
export function resumeEnTete(p: { aTraiter: number; aTraiterEnRetard: number; dossiersAValider: number; deposeesSemaine: number }): string {
  const s = (n: number) => (n > 1 ? 's' : '');
  const parts: string[] = [];
  parts.push(p.aTraiter === 0
    ? 'Tout est à jour : aucune action en attente'
    : `${p.aTraiter} à traiter${p.aTraiterEnRetard > 0 ? ` (${p.aTraiterEnRetard} > 24 h)` : ''}`);
  if (p.dossiersAValider > 0) parts.push(`${p.dossiersAValider} dossier${s(p.dossiersAValider)} à valider`);
  if (p.deposeesSemaine > 0) parts.push(`${p.deposeesSemaine} déposée${s(p.deposeesSemaine)} sur 7 jours`);
  return parts.join(' · ');
}
