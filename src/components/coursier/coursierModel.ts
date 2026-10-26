/**
 * Modèle des pages coursier (espace coursier + gestion admin des coursiers).
 * Fonctions pures : classement des missions par étape, prochaine action, urgence
 * selon la date de visite. Aucune lecture/écriture en base ici.
 *
 * Une « mission » = une visite physique (adresse + date/heure + agent) qui regroupe
 * une ligne `visites` par client (voir groupVisitesByPhysiqueAgent).
 */
import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatZurichDateTime, formatZurichTimeRange, zurichDayKey } from '@/lib/dateZurich';

export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

const HEURE = 3600_000;
/** Durée retenue quand la visite n'a pas d'heure de fin (identique au calcul des heures). */
const DUREE_DEFAUT_MIN = 30;

export type MissionLike = {
  id: string;
  adresse?: string | null;
  date_visite: string;
  date_visite_fin?: string | null;
  statut_coursier?: string | null;
  coursier_id?: string | null;
  paye_coursier?: boolean | null;
  remuneration_coursier?: number | null;
  est_deleguee?: boolean | null;
  client_id?: string | null;
  [k: string]: any;
};

/** Heure de fin de la visite (début + 30 min si non renseignée). */
export function finVisite(m: Pick<MissionLike, 'date_visite' | 'date_visite_fin'>): number {
  const debut = new Date(m.date_visite).getTime();
  const fin = m.date_visite_fin ? new Date(m.date_visite_fin).getTime() : debut + DUREE_DEFAUT_MIN * 60000;
  return Math.max(fin, debut);
}

export function debutDuJour(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** « Aujourd'hui », « Demain », « mar. 12 nov. » — jour suisse (Europe/Zurich). */
export function jourLabel(iso: string): string {
  const key = zurichDayKey(iso);
  if (!key) return '';
  if (key === zurichDayKey(new Date())) return "Aujourd'hui";
  if (key === zurichDayKey(new Date(Date.now() + 24 * 3600 * 1000))) return 'Demain';
  return formatZurichDateTime(iso, { short: true }).split(' à ')[0];
}

/** « 14:30 » ou « 14:30 – 15:00 » — heure suisse. */
export function heureLabel(m: Pick<MissionLike, 'date_visite' | 'date_visite_fin'>): string {
  return formatZurichTimeRange(m.date_visite, m.date_visite_fin);
}

/** Temps restant avant la visite (ou écoulé depuis), avec un ton d'urgence. */
export function delaiVisite(iso: string, now = Date.now()): { heures: number; label: string; tone: Ton; passee: boolean } {
  const t = new Date(iso).getTime();
  const heures = (t - now) / HEURE;
  if (heures < 0) {
    const ecoule = -heures;
    const label = ecoule < 1 ? 'en cours' : ecoule < 24 ? `il y a ${Math.floor(ecoule)} h` : `il y a ${Math.floor(ecoule / 24)} j`;
    return { heures, label, tone: 'muted', passee: true };
  }
  const jours = differenceInCalendarDays(new Date(t), new Date(now));
  const label = heures < 1 ? 'dans moins d’1 h' : heures < 24 && jours === 0 ? `dans ${Math.floor(heures)} h` : jours === 1 ? 'demain' : `dans ${jours} j`;
  const tone: Ton = heures < 24 ? 'danger' : heures < 72 ? 'warning' : 'muted';
  return { heures, label, tone, passee: false };
}

/** Nombre de clients distincts d'une mission regroupée. */
export function nbClients(items: MissionLike[]): number {
  return new Set(items.filter((v) => v.client_id).map((v) => v.client_id)).size || items.length;
}

export function montantImpaye(items: MissionLike[]): number {
  return items.reduce((s, m) => s + (m.paye_coursier ? 0 : (m.remuneration_coursier || 0)), 0);
}

export function lienItineraire(adresse?: string | null): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse || '')}`;
}

/* ------------------------------------------------------------------ */
/* Espace coursier                                                     */
/* ------------------------------------------------------------------ */

export type EtapeCoursier = 'disponibles' | 'mes_missions' | 'a_rendre' | 'terminees';

/** Les comptes-rendus à faire remontent sur 30 jours (au-delà, la visite est considérée comme ancienne). */
export const A_RENDRE_JOURS = 30;

/**
 * Range une mission dans une étape de l'espace coursier, ou null si elle ne doit pas s'afficher.
 * - Disponibles : dans le pool (en_attente), au moins un client délégué, visite aujourd'hui ou plus tard.
 * - Mes missions : acceptée par moi, visite pas encore terminée.
 * - À rendre : acceptée par moi, visite passée (≤ 30 j) : il reste à la terminer avec le compte-rendu.
 * - Terminées : terminée par moi.
 */
export function etapeCoursier(m: MissionLike, items: MissionLike[], coursierId: string | null, now = Date.now()): EtapeCoursier | null {
  if (m.statut_coursier === 'en_attente') {
    const delegues = items.filter((v) => v.est_deleguee === true).length;
    return delegues > 0 && new Date(m.date_visite).getTime() >= debutDuJour(now) ? 'disponibles' : null;
  }
  if (!coursierId || m.coursier_id !== coursierId) return null;
  if (m.statut_coursier === 'termine') return 'terminees';
  if (m.statut_coursier === 'accepte') {
    if (finVisite(m) >= now) return 'mes_missions';
    return now - finVisite(m) <= A_RENDRE_JOURS * 24 * HEURE ? 'a_rendre' : null;
  }
  return null;
}

export type Prochaine = { texte: string; tone: Ton };

export function prochaineActionCoursier(etape: EtapeCoursier, m: MissionLike, now = Date.now()): Prochaine {
  const d = delaiVisite(m.date_visite, now);
  switch (etape) {
    case 'disponibles':
      return d.heures < 24
        ? { texte: `Visite ${d.label} : à prendre rapidement`, tone: 'warning' }
        : { texte: 'Mission libre : acceptez-la pour la réserver', tone: 'primary' };
    case 'mes_missions':
      if (d.passee) return { texte: 'Visite en cours : terminez-la avec le compte-rendu', tone: 'primary' };
      return d.heures < 2
        ? { texte: `Partez maintenant : visite ${d.label}`, tone: 'warning' }
        : { texte: `Visite ${d.label} : préparez votre trajet`, tone: 'neutral' };
    case 'a_rendre': {
      const depuis = (now - finVisite(m)) / HEURE;
      return depuis >= 24
        ? { texte: `Compte-rendu en retard (visite ${d.label})`, tone: 'danger' }
        : { texte: 'Visite passée : envoyez le compte-rendu', tone: 'warning' };
    }
    case 'terminees':
      return m.paye_coursier
        ? { texte: 'Terminée et payée', tone: 'success' }
        : { texte: 'Terminée : paiement en attente', tone: 'muted' };
  }
}

/* ------------------------------------------------------------------ */
/* Gestion admin des coursiers                                         */
/* ------------------------------------------------------------------ */

export type EtapeAdmin = 'a_deleguer' | 'sans_coursier' | 'en_cours' | 'a_rendre' | 'a_payer' | 'terminees';

/** Étape d'une mission déjà déléguée (statut_coursier renseigné). */
export function etapeAdmin(m: MissionLike, items: MissionLike[], now = Date.now()): EtapeAdmin {
  if (m.statut_coursier === 'en_attente') return 'sans_coursier';
  if (m.statut_coursier === 'accepte') return finVisite(m) < now ? 'a_rendre' : 'en_cours';
  if (m.statut_coursier === 'termine') return items.some((i) => !i.paye_coursier) ? 'a_payer' : 'terminees';
  return 'en_cours';
}

export function prochaineActionAdmin(etape: EtapeAdmin, m: MissionLike, items: MissionLike[], coursierNom: string, now = Date.now()): Prochaine {
  const d = delaiVisite(m.date_visite, now);
  switch (etape) {
    case 'a_deleguer':
      return d.heures < 24
        ? { texte: `Visite ${d.label} : déléguer maintenant`, tone: 'danger' }
        : d.heures < 72
          ? { texte: `Visite ${d.label} : à déléguer`, tone: 'warning' }
          : { texte: 'Envoyer dans le pool coursier', tone: 'primary' };
    case 'sans_coursier':
      if (d.passee) return { texte: 'Visite passée sans coursier', tone: 'danger' };
      return d.heures < 24
        ? { texte: `Aucun coursier — visite ${d.label} : contacter les coursiers`, tone: 'danger' }
        : { texte: 'Dans le pool : en attente d’un coursier', tone: d.heures < 72 ? 'warning' : 'muted' };
    case 'en_cours':
      return { texte: `${coursierNom} s’en occupe · visite ${d.label}`, tone: 'success' };
    case 'a_rendre': {
      const depuis = (now - finVisite(m)) / HEURE;
      return { texte: `Relancer ${coursierNom} pour le compte-rendu`, tone: depuis >= 24 ? 'danger' : 'warning' };
    }
    case 'a_payer':
      return { texte: `Payer ${montantImpaye(items).toFixed(0)} CHF à ${coursierNom}`, tone: 'primary' };
    case 'terminees':
      return { texte: 'Terminée et payée', tone: 'success' };
  }
}

/** Retard d'un compte-rendu (depuis la fin de la visite). */
export function retardCompteRendu(m: MissionLike, now = Date.now()): { label: string; enRetard: boolean } {
  const h = Math.max(0, (now - finVisite(m)) / HEURE);
  return { label: h < 1 ? 'à l’instant' : h < 24 ? `depuis ${Math.floor(h)} h` : `depuis ${Math.floor(h / 24)} j`, enRetard: h >= 24 };
}

/** Clé de mois « 2026-10 » et libellé « octobre 2026 ». */
export function cleMois(iso: string): string {
  return format(new Date(iso), 'yyyy-MM');
}
export function libelleMois(cle: string): string {
  const [y, mo] = cle.split('-').map(Number);
  return format(new Date(y, mo - 1, 1), 'MMMM yyyy', { locale: fr });
}

/**
 * Montant suisse : « CHF 25 », « CHF 1'250.50 ».
 * `decimals: 'auto'` (défaut) n'affiche les centimes que s'il y en a ; `2` les affiche toujours.
 */
export function formatChf(v: number | string | null | undefined, decimals: 0 | 2 | 'auto' = 'auto'): string {
  const n = Number(v) || 0;
  const dec = decimals === 'auto' ? (Math.round(Math.abs(n) * 100) % 100 === 0 ? 0 : 2) : decimals;
  const [i, f] = Math.abs(n).toFixed(dec).split('.');
  const entier = i.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `CHF ${n < 0 ? '-' : ''}${entier}${f ? `.${f}` : ''}`;
}

/** Statut affiché d'une mission (pastille) selon son étape. */
export const STATUT_ETAPE: Record<EtapeCoursier, { label: string; tone: Ton }> = {
  disponibles: { label: 'Disponible', tone: 'primary' },
  mes_missions: { label: 'Acceptée', tone: 'success' },
  a_rendre: { label: 'Compte rendu à faire', tone: 'warning' },
  terminees: { label: 'Terminée', tone: 'success' },
};
