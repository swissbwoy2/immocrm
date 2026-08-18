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
  { key: 'nationalite', label: 'Nationalité', groupe: 'Candidat' },
  { key: 'permis', label: 'Permis de séjour', groupe: 'Candidat' },
  { key: 'adresse_actuelle', label: 'Adresse actuelle', groupe: 'Candidat' },
  { key: 'npa_ville_actuelle', label: 'NPA / Ville actuelle', groupe: 'Candidat' },
  { key: 'profession', label: 'Profession', groupe: 'Candidat' },
  { key: 'employeur', label: 'Employeur', groupe: 'Candidat' },
  { key: 'revenus_mensuels', label: 'Revenus mensuels', groupe: 'Candidat' },
  { key: 'nb_personnes', label: 'Nombre de personnes', groupe: 'Candidat' },
  { key: 'animaux', label: 'Animaux', groupe: 'Candidat' },
  { key: 'fumeur', label: 'Fumeur', groupe: 'Candidat' },
  { key: 'date_entree_souhaitee', label: "Date d'entrée souhaitée", groupe: 'Candidat' },

  { key: 'email_contact', label: 'E-mail de contact (AGENT)', groupe: 'Contact (agent)' },
  { key: 'tel_contact', label: 'Téléphone de contact (AGENT)', groupe: 'Contact (agent)' },

  { key: 'bien_adresse', label: 'Adresse du bien', groupe: 'Bien' },
  { key: 'bien_npa_ville', label: 'NPA / Ville du bien', groupe: 'Bien' },
  { key: 'bien_etage', label: 'Étage', groupe: 'Bien' },
  { key: 'bien_pieces', label: 'Nombre de pièces', groupe: 'Bien' },
  { key: 'bien_loyer', label: 'Loyer', groupe: 'Bien' },

  { key: 'co_prenom', label: 'Prénom co-candidat', groupe: 'Co-candidat' },
  { key: 'co_nom', label: 'Nom co-candidat', groupe: 'Co-candidat' },
  { key: 'co_date_naissance', label: 'Naissance co-candidat', groupe: 'Co-candidat' },
  { key: 'co_profession', label: 'Profession co-candidat', groupe: 'Co-candidat' },
  { key: 'co_revenus', label: 'Revenus co-candidat', groupe: 'Co-candidat' },

  { key: 'lieu', label: 'Lieu', groupe: 'Signature' },
  { key: 'date_du_jour', label: 'Date du jour', groupe: 'Signature' },
  { key: 'signature', label: 'Signature (image)', groupe: 'Signature' },
];

export const SIGNATURE_KEY = 'signature';

export const keyLabel = (key: string) =>
  STANDARD_FIELD_KEYS.find((k) => k.key === key)?.label ?? key;

export const KEY_GROUPS = Array.from(new Set(STANDARD_FIELD_KEYS.map((k) => k.groupe)));
