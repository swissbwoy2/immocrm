export interface StandardFieldKey {
  key: string;
  label: string;
  groupe: string;
}

/** Clés standard proposées dans l'éditeur de modèles.
 *  Pour en ajouter une nouvelle : ajouter simplement une entrée ici
 *  (et, si besoin, la résolution de la valeur dans buildValues.ts). */
export const STANDARD_FIELD_KEYS: StandardFieldKey[] = [
  { key: 'prenom', label: 'Prénom', groupe: 'Candidat' },
  { key: 'nom', label: 'Nom', groupe: 'Candidat' },
  { key: 'date_naissance', label: 'Date de naissance', groupe: 'Candidat' },
  { key: 'etat_civil', label: 'État civil', groupe: 'Candidat' },
  { key: 'nationalite', label: 'Nationalité / lieu d’origine', groupe: 'Candidat' },
  { key: 'permis', label: 'Permis de séjour', groupe: 'Candidat' },
  { key: 'adresse_actuelle', label: 'Adresse actuelle', groupe: 'Candidat' },
  { key: 'npa_ville_actuelle', label: 'NPA / Ville actuelle', groupe: 'Candidat' },
  { key: 'profession', label: 'Profession', groupe: 'Candidat' },
  { key: 'employeur', label: 'Employeur', groupe: 'Candidat' },
  { key: 'lieu_travail', label: 'Lieu de travail', groupe: 'Candidat' },
  { key: 'revenus_mensuels', label: 'Revenus mensuels', groupe: 'Candidat' },
  { key: 'revenus_annuels', label: 'Revenus annuels bruts', groupe: 'Candidat' },
  { key: 'regie_actuelle', label: 'Régie / bailleur actuel', groupe: 'Candidat' },
  { key: 'motif', label: 'Motif du déménagement', groupe: 'Candidat' },
  { key: 'nb_personnes', label: 'Nombre de personnes', groupe: 'Candidat' },
  { key: 'animaux', label: 'Animaux', groupe: 'Candidat' },
  { key: 'fumeur', label: 'Fumeur', groupe: 'Candidat' },
  { key: 'date_entree_souhaitee', label: "Date d'entrée souhaitée", groupe: 'Candidat' },

  { key: 'email_contact', label: 'E-mail de contact (AGENT)', groupe: 'Contact (agent)' },
  { key: 'tel_contact', label: 'Téléphone de contact (AGENT)', groupe: 'Contact (agent)' },

  { key: 'bien_adresse', label: 'Adresse du bien', groupe: 'Bien' },
  { key: 'bien_npa_ville', label: 'NPA / Ville du bien', groupe: 'Bien' },
  { key: 'bien_ville', label: 'Ville du bien', groupe: 'Bien' },
  { key: 'bien_etage', label: 'Étage', groupe: 'Bien' },
  { key: 'bien_pieces', label: 'Nombre de pièces', groupe: 'Bien' },
  { key: 'bien_loyer', label: 'Loyer net', groupe: 'Bien' },
  { key: 'bien_charges', label: 'Charges', groupe: 'Bien' },
  { key: 'bien_loyer_brut', label: 'Loyer brut (total)', groupe: 'Bien' },
  { key: 'date_visite', label: 'Date de la visite', groupe: 'Bien' },

  { key: 'co_prenom', label: 'Prénom co-candidat', groupe: 'Co-candidat' },
  { key: 'co_nom', label: 'Nom co-candidat', groupe: 'Co-candidat' },
  { key: 'co_date_naissance', label: 'Naissance co-candidat', groupe: 'Co-candidat' },
  { key: 'co_etat_civil', label: 'État civil co-candidat', groupe: 'Co-candidat' },
  { key: 'co_nationalite', label: 'Nationalité co-candidat', groupe: 'Co-candidat' },
  { key: 'co_permis', label: 'Permis co-candidat', groupe: 'Co-candidat' },
  { key: 'co_adresse_actuelle', label: 'Adresse co-candidat', groupe: 'Co-candidat' },
  { key: 'co_npa_ville_actuelle', label: 'NPA / Ville co-candidat', groupe: 'Co-candidat' },
  { key: 'co_profession', label: 'Profession co-candidat', groupe: 'Co-candidat' },
  { key: 'co_employeur', label: 'Employeur co-candidat', groupe: 'Co-candidat' },
  { key: 'co_lieu_travail', label: 'Lieu de travail co-candidat', groupe: 'Co-candidat' },
  { key: 'co_revenus', label: 'Revenus co-candidat', groupe: 'Co-candidat' },
  { key: 'co_email_contact', label: 'E-mail co-candidat (AGENT)', groupe: 'Co-candidat' },
  { key: 'co_tel_contact', label: 'Téléphone co-candidat (AGENT)', groupe: 'Co-candidat' },

  { key: 'lieu', label: 'Lieu', groupe: 'Signature' },
  { key: 'date_du_jour', label: 'Date du jour', groupe: 'Signature' },
  { key: 'lieu_et_date', label: 'Lieu et date', groupe: 'Signature' },
  { key: 'signature', label: 'Signature (image)', groupe: 'Signature' },
];

export const SIGNATURE_KEY = 'signature';

export const keyLabel = (key: string) =>
  STANDARD_FIELD_KEYS.find((k) => k.key === key)?.label ?? key;

export const KEY_GROUPS = Array.from(new Set(STANDARD_FIELD_KEYS.map((k) => k.groupe)));

/** Clés dont la valeur provient TOUJOURS de l'agent connecté (jamais du client). */
export const AGENT_CONTACT_KEYS = ['email_contact', 'tel_contact', 'co_email_contact', 'co_tel_contact'];
