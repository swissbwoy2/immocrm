/**
 * Paie des coursiers : salaire = temps pointé (arrivée → départ) × tarif horaire du coursier.
 * Fonctions pures, utilisées par l'admin (contrôle, correction, paiement) et par l'espace coursier.
 *
 * Un pointage « exclu » (session non valable) ne compte pas. Un pointage « payé » reste visible
 * dans l'historique mais sort du montant à payer.
 */
import { zurichDayKey } from '@/lib/dateZurich';

export const TARIF_HORAIRE_DEFAUT = 20;
/** Au-delà, une session est signalée « à vérifier » (pointage de départ probablement oublié). */
export const SESSION_LONGUE_MIN = 4 * 60;
/** Marge autour des visites du jour pour proposer une heure de fin réaliste. */
export const MARGE_VISITE_MIN = 30;
const DUREE_VISITE_DEFAUT_MIN = 30;

export type Pointage = {
  id: string;
  coursier_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  note?: string | null;
  paye?: boolean | null;
  paye_at?: string | null;
  tarif_paye?: number | null;
  exclue?: boolean | null;
  original_started_at?: string | null;
  original_ended_at?: string | null;
  corrige_at?: string | null;
  motif_correction?: string | null;
  ajoute_par_admin?: boolean | null;
};

export type VisiteCoursier = {
  id: string;
  date_visite: string;
  date_visite_fin?: string | null;
  adresse?: string | null;
  statut_coursier?: string | null;
  client_id?: string | null;
};

export type Alerte = { code: 'longue' | 'nuit' | 'sans_visite' | 'zero' | 'en_cours_long'; label: string };

export const arrondi2 = (n: number) => Math.round(n * 100) / 100;

/** Minutes réellement comptées (session clôturée, ou en cours jusqu'à maintenant). */
export function minutesPointage(p: Pointage, now = Date.now()): number {
  if (p.ended_at) {
    if (typeof p.duration_minutes === 'number') return Math.max(0, p.duration_minutes);
    return Math.max(0, Math.round((new Date(p.ended_at).getTime() - new Date(p.started_at).getTime()) / 60000));
  }
  return Math.max(0, Math.round((now - new Date(p.started_at).getTime()) / 60000));
}

export function montantPointage(p: Pointage, tarif: number): number {
  if (p.exclue || !p.ended_at) return 0;
  const t = p.paye && p.tarif_paye != null ? Number(p.tarif_paye) : tarif;
  return arrondi2((minutesPointage(p) / 60) * t);
}

/** Heures (Zurich) d'une date ISO, en minutes depuis minuit. */
function minutesDuJourZurich(iso: string): number {
  const [h, m] = new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Zurich' }).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Visites du coursier le même jour (heure suisse) que le pointage. */
export function visitesDuJourPointage(p: Pointage, visites: VisiteCoursier[]): VisiteCoursier[] {
  const jour = zurichDayKey(p.started_at);
  return visites
    .filter((v) => v.date_visite && zurichDayKey(v.date_visite) === jour && v.statut_coursier !== 'en_attente')
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());
}

/** Visites physiques distinctes (une adresse + une heure = une visite, même avec plusieurs clients). */
export function visitesPhysiques(visites: VisiteCoursier[]): { cle: string; date_visite: string; date_visite_fin?: string | null; adresse: string; clients: number }[] {
  const map = new Map<string, { cle: string; date_visite: string; date_visite_fin?: string | null; adresse: string; clients: Set<string> }>();
  for (const v of visites) {
    const cle = `${(v.adresse || '').trim().toLowerCase()}|${v.date_visite}`;
    const cur = map.get(cle) ?? { cle, date_visite: v.date_visite, date_visite_fin: v.date_visite_fin, adresse: v.adresse || 'Adresse non renseignée', clients: new Set<string>() };
    if (v.client_id) cur.clients.add(v.client_id);
    if (!cur.date_visite_fin && v.date_visite_fin) cur.date_visite_fin = v.date_visite_fin;
    map.set(cle, cur);
  }
  return Array.from(map.values())
    .map((x) => ({ ...x, clients: x.clients.size || 1 }))
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());
}

/**
 * Heure de fin proposée pour corriger une session trop longue :
 * fin de la dernière visite du jour + 30 min (jamais avant le début, jamais après la fin pointée).
 */
export function finSuggeree(p: Pointage, visites: VisiteCoursier[]): string | null {
  const jour = visitesDuJourPointage(p, visites);
  if (jour.length === 0) return null;
  const debut = new Date(p.started_at).getTime();
  const finVisites = jour.map((v) => {
    const s = new Date(v.date_visite).getTime();
    return v.date_visite_fin ? new Date(v.date_visite_fin).getTime() : s + DUREE_VISITE_DEFAUT_MIN * 60000;
  });
  const fin = Math.max(...finVisites) + MARGE_VISITE_MIN * 60000;
  if (fin <= debut) return null;
  const finPointee = p.ended_at ? new Date(p.ended_at).getTime() : Date.now();
  if (fin >= finPointee) return null;
  return new Date(fin).toISOString();
}

/** Signaux d'un pointage suspect (l'admin décide). */
export function alertesPointage(p: Pointage, visites: VisiteCoursier[], now = Date.now()): Alerte[] {
  if (p.exclue) return [];
  const out: Alerte[] = [];
  const min = minutesPointage(p, now);
  if (!p.ended_at) {
    if (min >= SESSION_LONGUE_MIN) out.push({ code: 'en_cours_long', label: `En service depuis ${Math.floor(min / 60)} h : départ oublié ?` });
    return out;
  }
  if (min === 0) return out; // session vide : ne coûte rien, rien à vérifier
  if (min >= SESSION_LONGUE_MIN) out.push({ code: 'longue', label: `Session de plus de ${SESSION_LONGUE_MIN / 60} h` });
  const fin = minutesDuJourZurich(p.ended_at);
  const autreJour = zurichDayKey(p.ended_at) !== zurichDayKey(p.started_at);
  if (autreJour || fin >= 22 * 60 || fin < 6 * 60) out.push({ code: 'nuit', label: 'Fin après 22 h' });
  if (min > 0 && visitesDuJourPointage(p, visites).length === 0) out.push({ code: 'sans_visite', label: 'Aucune visite ce jour-là' });
  return out;
}

export type ResumePaie = {
  minutesAPayer: number;
  montantAPayer: number;
  minutesPayees: number;
  montantPaye: number;
  minutesMois: number;
  montantMois: number;
  aVerifier: number;
  enCours: Pointage | null;
};

/** Totaux d'un coursier. Le mois courant compte toutes les sessions valables (payées ou non). */
export function resumePaie(pointages: Pointage[], visites: VisiteCoursier[], tarif: number, now = Date.now()): ResumePaie {
  const debutMois = new Date(now);
  debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
  const r: ResumePaie = { minutesAPayer: 0, montantAPayer: 0, minutesPayees: 0, montantPaye: 0, minutesMois: 0, montantMois: 0, aVerifier: 0, enCours: null };
  for (const p of pointages) {
    if (!p.ended_at) { r.enCours = p; if (alertesPointage(p, visites, now).length) r.aVerifier += 1; continue; }
    if (p.exclue) continue;
    const min = minutesPointage(p, now);
    const montant = montantPointage(p, tarif);
    if (p.paye) { r.minutesPayees += min; r.montantPaye += montant; }
    else {
      r.minutesAPayer += min; r.montantAPayer += montant;
      if (alertesPointage(p, visites, now).length) r.aVerifier += 1;
    }
    if (new Date(p.started_at).getTime() >= debutMois.getTime()) { r.minutesMois += min; r.montantMois += montant; }
  }
  r.montantAPayer = arrondi2(r.montantAPayer);
  r.montantPaye = arrondi2(r.montantPaye);
  r.montantMois = arrondi2(r.montantMois);
  return r;
}
