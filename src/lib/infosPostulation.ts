/**
 * Informations de postulation exigées par les demandes de location des gérances
 * (assurance RC ménage, parking, enfants, statut du logement actuel, mobile de suivi).
 * Sans elles la routine de postulation reste bloquée : on les demande dans /nouveau-mandat
 * et, pour les clients déjà inscrits, dans un dialogue obligatoire (voir InfosPostulationGate).
 * Colonnes : public.clients (migration 20261029150000_infos_postulation).
 */

export type InfosPostulation = {
  rc_menage: '' | 'oui' | 'non';
  rc_compagnie: string;
  parking_souhaite: string;
  nombre_enfants: number | null;
  enfants_ages: string;
  statut_logement_actuel: string;
  mobile_suivi_autorise: '' | 'oui' | 'non';
};

export const INFOS_POSTULATION_VIDES: InfosPostulation = {
  rc_menage: '',
  rc_compagnie: '',
  parking_souhaite: '',
  nombre_enfants: null,
  enfants_ages: '',
  statut_logement_actuel: '',
  mobile_suivi_autorise: '',
};

export const PARKING_OPTIONS: { value: string; label: string }[] = [
  { value: 'aucun', label: 'Pas de parking' },
  { value: 'exterieur', label: 'Place extérieure' },
  { value: 'interieur', label: 'Place intérieure / souterraine' },
  { value: 'garage', label: 'Garage box' },
  { value: 'moto', label: 'Place moto' },
];

export const STATUT_LOGEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'titulaire_bail', label: 'Locataire titulaire du bail' },
  { value: 'sous_locataire', label: 'Sous-locataire' },
  { value: 'colocataire', label: 'Colocataire' },
  { value: 'heberge', label: 'Hébergé (famille, amis)' },
  { value: 'foyer', label: 'Foyer ou structure d’accueil (ex. EVAM)' },
  { value: 'proprietaire', label: 'Propriétaire' },
];

/** Liste des informations encore manquantes (vide = complet). */
export function infosManquantes(i: InfosPostulation): string[] {
  const m: string[] = [];
  if (!i.rc_menage) m.push('assurance RC ménage');
  if (i.rc_menage === 'oui' && !i.rc_compagnie.trim()) m.push('compagnie d’assurance RC');
  if (!i.parking_souhaite) m.push('parking souhaité');
  if (i.nombre_enfants == null || Number.isNaN(i.nombre_enfants) || i.nombre_enfants < 0) m.push('nombre d’enfants');
  if (!i.statut_logement_actuel) m.push('statut du logement actuel');
  if (!i.mobile_suivi_autorise) m.push('autorisation du mobile de suivi');
  return m;
}

/** Ligne de la table clients → valeurs du formulaire. */
export function infosDepuisClient(c: Record<string, unknown> | null | undefined): InfosPostulation {
  const b = (v: unknown): '' | 'oui' | 'non' => (v === true ? 'oui' : v === false ? 'non' : '');
  const n = c?.nombre_enfants;
  return {
    rc_menage: b(c?.rc_menage),
    rc_compagnie: String(c?.rc_compagnie ?? ''),
    parking_souhaite: String(c?.parking_souhaite ?? ''),
    nombre_enfants: n == null || n === '' ? null : Number(n),
    enfants_ages: String(c?.enfants_ages ?? ''),
    statut_logement_actuel: String(c?.statut_logement_actuel ?? ''),
    mobile_suivi_autorise: b(c?.mobile_suivi_autorise),
  };
}

/** Valeurs du formulaire → colonnes (clients / demandes_mandat). */
export function infosVersColonnes(i: InfosPostulation) {
  return {
    rc_menage: i.rc_menage === '' ? null : i.rc_menage === 'oui',
    rc_compagnie: i.rc_menage === 'oui' ? i.rc_compagnie.trim() || null : null,
    parking_souhaite: i.parking_souhaite || null,
    nombre_enfants: i.nombre_enfants == null || Number.isNaN(i.nombre_enfants) ? null : Math.max(0, Math.round(i.nombre_enfants)),
    enfants_ages: (i.nombre_enfants ?? 0) > 0 ? i.enfants_ages.trim() || null : null,
    statut_logement_actuel: i.statut_logement_actuel || null,
    mobile_suivi_autorise: i.mobile_suivi_autorise === '' ? null : i.mobile_suivi_autorise === 'oui',
  };
}

/** Échéance fixée par l'agence pour les clients déjà inscrits : lundi 2 novembre 2026 à 10h00 (heure suisse). */
export const ECHEANCE_INFOS_POSTULATION = new Date('2026-11-02T10:00:00+01:00');

/** +24 heures ouvrables (lundi–vendredi) à partir d'une date. */
export function plus24hOuvrables(depuis: Date): Date {
  const d = new Date(depuis.getTime());
  let restantes = 24;
  while (restantes > 0) {
    d.setHours(d.getHours() + 1);
    const jour = d.getDay();
    if (jour !== 0 && jour !== 6) restantes -= 1;
  }
  return d;
}

/** Échéance d'un client : lundi 2.11.2026 10h00, ou 24 h ouvrables après son inscription si elle est plus tardive. */
export function echeancePour(creeLe: string | null | undefined): Date {
  const parInscription = creeLe ? plus24hOuvrables(new Date(creeLe)) : ECHEANCE_INFOS_POSTULATION;
  return parInscription > ECHEANCE_INFOS_POSTULATION ? parInscription : ECHEANCE_INFOS_POSTULATION;
}

export function libelleParking(v: string | null | undefined): string {
  return PARKING_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}

export function libelleStatutLogement(v: string | null | undefined): string {
  return STATUT_LOGEMENT_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}
