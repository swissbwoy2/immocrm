/**
 * Modèle du « Suivi des offres automatiques » (admin et agent).
 * Une annonce peut avoir été envoyée à plusieurs clients : on regroupe par annonce,
 * on range chaque offre dans une étape de sa vie et on formule UNE prochaine action.
 * Fonctions pures, calculées uniquement à partir des données déjà chargées.
 */

export type ClientInfo = { prenom?: string | null; nom?: string | null; email?: string | null };

export type VisiteInfo = {
  id: string;
  date_visite: string | null;
  date_visite_fin?: string | null;
  statut: string | null;
  est_deleguee?: boolean | null;
  client_decision?: string | null;
  client_confirme_visite_at?: string | null;
};

export type Row = {
  id: string;
  created_at: string;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  statut: string | null;
  commentaires: string | null;
  lien_annonce: string | null;
  client_id: string;
  agent_id?: string | null;
  needs_agent_action?: boolean | null;
  missing_info?: string | null;
  visites?: VisiteInfo[];
  _client?: ClientInfo;
};

export type Groupe = { cle: string; derniere: string; besoinAction: boolean; offres: Row[] };

export type Etape = 'a_gerer' | 'attente_annonceur' | 'visite' | 'sans_reponse' | 'cloturees';
export type TabKey = Etape | 'toutes';
export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

/** Ordre d'urgence : la première étape est celle qui attend une action du staff. */
export const ETAPES_ORDRE: Etape[] = ['a_gerer', 'attente_annonceur', 'visite', 'sans_reponse', 'cloturees'];

export const ONGLETS: { key: TabKey; label: string }[] = [
  { key: 'a_gerer', label: 'À gérer' },
  { key: 'attente_annonceur', label: 'En attente de l’annonceur' },
  { key: 'visite', label: 'Visite fixée' },
  { key: 'sans_reponse', label: 'Sans réponse du client' },
  { key: 'cloturees', label: 'Clôturées' },
  { key: 'toutes', label: 'Toutes' },
];

/** Statuts pour lesquels l'offre auto n'attend plus rien (mêmes valeurs que GererOffreDialog). */
const STATUTS_CLOS = ['refusee', 'refuse', 'candidature', 'candidature_deposee', 'acceptee', 'signature_effectuee', 'bail_conclu'];

/** Même clé que la fonction SQL offre_groupe_cle : lien sans paramètres, sinon adresse normalisée. */
export function groupeCle(r: Row): string {
  const lien = (r.lien_annonce ?? '').trim().toLowerCase().replace(/[?#].*$/, '');
  if (lien) return lien;
  return 'adr:' + (r.adresse ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function grouper(rows: Row[]): Groupe[] {
  const map = new Map<string, Groupe>();
  for (const r of rows) {
    const cle = groupeCle(r);
    const g = map.get(cle);
    if (g) {
      g.offres.push(r);
      if (r.created_at > g.derniere) g.derniere = r.created_at;
      if (r.needs_agent_action) g.besoinAction = true;
    } else {
      map.set(cle, { cle, derniere: r.created_at, besoinAction: !!r.needs_agent_action, offres: [r] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.derniere.localeCompare(a.derniere));
}

export function visiteLabel(r: Row): string {
  const vs = Array.isArray(r.visites) ? r.visites : [];
  const withDate = vs.filter((v) => v && v.date_visite);
  if (withDate.length === 0) return r.needs_agent_action ? 'À fixer — action requise (ex. appel)' : 'Pas encore de visite';
  withDate.sort((a, b) => new Date(b.date_visite as string).getTime() - new Date(a.date_visite as string).getTime());
  const v = withDate[0];
  const dateStr = new Date(v.date_visite as string).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const mode = v.est_deleguee === true ? ' — déléguée (agent/coursier)' : (v.client_confirme_visite_at ? ' — le client visite (confirmé)' : ' — en attente décision client');
  const dec = v.client_decision === 'souhaite_postuler' ? ' — postuler' : ((v.client_decision === 'refuse' || v.client_decision === 'refusee') ? ' — refusée' : '');
  return 'Visite ' + dateStr + mode + dec;
}

export const STATUT_BADGE: Record<string, { label: string; tone: Ton }> = {
  envoyee: { label: 'Envoyée', tone: 'neutral' },
  interesse: { label: 'Intéressé', tone: 'success' },
  souhaite_postuler: { label: 'Souhaite postuler', tone: 'primary' },
  refuse: { label: 'Refusé', tone: 'danger' },
  refusee: { label: 'Refusée', tone: 'danger' },
};

export type Source = 'immobilier' | 'flatfox' | 'homegate' | 'facebook' | 'autre';

export const SOURCES: { key: Source | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes les sources' },
  { key: 'immobilier', label: 'immobilier.ch' },
  { key: 'flatfox', label: 'Flatfox' },
  { key: 'homegate', label: 'Homegate' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'autre', label: 'Autre' },
];

/** Portail d'origine, déduit du lien de l'annonce. */
export function sourceDe(lien: string | null | undefined): Source {
  const l = (lien ?? '').toLowerCase();
  if (l.includes('immobilier.ch')) return 'immobilier';
  if (l.includes('flatfox')) return 'flatfox';
  if (l.includes('homegate')) return 'homegate';
  if (l.includes('facebook.com') || l.includes('fb.com') || l.includes('fb.me')) return 'facebook';
  return 'autre';
}

export function sourceLabel(s: Source): string {
  return SOURCES.find((x) => x.key === s)?.label ?? 'Autre';
}

function heuresDepuis(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3600000));
}

export function depuisLabel(iso: string | null | undefined): string {
  const h = heuresDepuis(iso);
  return h < 1 ? 'à l’instant' : h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
}

function derniereVisiteDatee(r: Row): VisiteInfo | undefined {
  const vs = (Array.isArray(r.visites) ? r.visites : []).filter((v) => v && v.date_visite);
  vs.sort((a, b) => new Date(b.date_visite as string).getTime() - new Date(a.date_visite as string).getTime());
  return vs[0];
}

export type Prochaine = {
  etape: Etape;
  /** Phrase affichée en couleur : ce qu'il faut faire maintenant. */
  texte: string;
  /** Libellé du bouton principal (ouvre le dialogue de gestion). */
  bouton: string;
  tone: Ton;
  /** Retard au-delà du seuil logique de l'étape. */
  enRetard: boolean;
};

/** Range une offre dans une étape et formule la prochaine action. */
export function prochaineAction(r: Row): Prochaine {
  const v = derniereVisiteDatee(r);
  const hEnvoi = heuresDepuis(r.created_at);

  if (r.needs_agent_action) {
    if (r.missing_info) return { etape: 'a_gerer', texte: `À compléter : ${r.missing_info}`, bouton: 'Compléter l’offre', tone: 'warning', enRetard: hEnvoi >= 24 };
    if (!v) return { etape: 'a_gerer', texte: 'Appeler l’annonceur pour fixer la visite', bouton: 'Fixer la visite', tone: 'warning', enRetard: hEnvoi >= 24 };
    return { etape: 'a_gerer', texte: 'Action requise sur la visite', bouton: 'Gérer l’offre', tone: 'warning', enRetard: hEnvoi >= 24 };
  }

  const refusVisite = v?.client_decision === 'refuse' || v?.client_decision === 'refusee';
  if (STATUTS_CLOS.includes(r.statut ?? '') || refusVisite) {
    const refus = refusVisite || r.statut === 'refuse' || r.statut === 'refusee';
    return {
      etape: 'cloturees',
      texte: refus ? 'Refusée par le client' : 'Candidature en cours ou terminée',
      bouton: 'Voir l’offre', tone: refus ? 'muted' : 'success', enRetard: false,
    };
  }
  if (r.statut === 'souhaite_postuler' || v?.client_decision === 'souhaite_postuler') {
    return { etape: 'cloturees', texte: 'Le client souhaite postuler : suivi dans Postulations', bouton: 'Voir l’offre', tone: 'success', enRetard: false };
  }

  if (v) {
    const t = new Date(v.date_visite as string).getTime();
    if (t > Date.now()) {
      if (v.est_deleguee || v.client_confirme_visite_at) return { etape: 'visite', texte: 'Visite fixée et confirmée', bouton: 'Voir la visite', tone: 'success', enRetard: false };
      return { etape: 'visite', texte: 'Visite fixée : en attente de la confirmation du client', bouton: 'Voir la visite', tone: 'neutral', enRetard: false };
    }
    const hApres = heuresDepuis(v.date_visite);
    return hApres >= 48
      ? { etape: 'visite', texte: 'Visite passée : relancer le client pour sa décision', bouton: 'Relancer le client', tone: 'warning', enRetard: true }
      : { etape: 'visite', texte: 'Visite passée : en attente de la décision du client', bouton: 'Voir la visite', tone: 'neutral', enRetard: false };
  }

  if (r.statut === 'interesse') {
    return hEnvoi >= 72
      ? { etape: 'attente_annonceur', texte: 'Pas de réponse de l’annonceur : l’appeler', bouton: 'Appeler l’annonceur', tone: 'warning', enRetard: true }
      : { etape: 'attente_annonceur', texte: 'Client intéressé : demande de visite en attente de l’annonceur', bouton: 'Gérer l’offre', tone: 'primary', enRetard: false };
  }

  return hEnvoi >= 48
    ? { etape: 'sans_reponse', texte: 'Pas de réponse du client : le relancer', bouton: 'Relancer le client', tone: 'warning', enRetard: true }
    : { etape: 'sans_reponse', texte: 'Offre envoyée : en attente de la réponse du client', bouton: 'Gérer l’offre', tone: 'muted', enRetard: false };
}

/** Pour une annonce : l'offre la plus urgente (celle que le bouton principal ouvre). */
export function offrePrioritaire(g: Groupe): { offre: Row; next: Prochaine } | null {
  let best: { offre: Row; next: Prochaine } | null = null;
  for (const o of g.offres) {
    const next = prochaineAction(o);
    if (!best) { best = { offre: o, next }; continue; }
    const d = ETAPES_ORDRE.indexOf(next.etape) - ETAPES_ORDRE.indexOf(best.next.etape);
    if (d < 0 || (d === 0 && next.enRetard && !best.next.enRetard)) best = { offre: o, next };
  }
  return best;
}

export function nomClient(c?: ClientInfo): string {
  const n = `${c?.prenom ?? ''} ${c?.nom ?? ''}`.trim();
  return n || c?.email || 'Client';
}
