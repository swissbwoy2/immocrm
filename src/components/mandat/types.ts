export interface MandatFormData {
  // Informations personnelles
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  date_naissance: string;
  nationalite: string;
  type_permis: string;
  etat_civil: string;
  
  // Situation actuelle
  gerance_actuelle: string;
  contact_gerance: string;
  loyer_actuel: number;
  depuis_le: string;
  pieces_actuel: number;
  
  // Finances
  charges_extraordinaires: boolean;
  montant_charges_extra: number;
  poursuites: boolean;
  curatelle: boolean;
  motif_changement: string;
  profession: string;
  employeur: string;
  revenus_mensuels: number;
  date_engagement: string;
  utilisation_logement: string;
  
  // Autres infos
  animaux: boolean;
  instrument_musique: boolean;
  vehicules: boolean;
  numero_plaques: string;
  decouverte_agence: string;
  
  // Critères de recherche
  type_recherche: string;
  nombre_occupants: number;
  type_bien: string;
  pieces_recherche: string;
  region_recherche: string;
  budget_max: number;
  souhaits_particuliers: string;
  
  // Candidats
  candidats: CandidatData[];
  
  // Documents
  documents_uploades: DocumentData[];
  
  // Signature et CGV
  signature_data: string;
  cgv_acceptees: boolean;
  
  // Code promo
  code_promo: string;
}

export interface CandidatData {
  id: string;
  prenom: string;
  nom: string;
  date_naissance: string;
  nationalite: string;
  type_permis: string;
  profession: string;
  employeur: string;
  revenus_mensuels: number;
  lien_avec_client: string;
}

export interface DocumentData {
  name: string;
  url: string;
  type: string;
}

export const NATIONALITES = [
  'Suisse', 'France', 'Italie', 'Allemagne', 'Portugal', 'Espagne', 
  'Royaume-Uni', 'Belgique', 'Pays-Bas', 'Autre'
];

export const TYPES_PERMIS = [
  { value: 'B', label: 'Permis B - Autorisation de séjour' },
  { value: 'C', label: 'Permis C - Autorisation d\'établissement' },
  { value: 'F', label: 'Permis F - Admission provisoire' },
  { value: 'N', label: 'Permis N - Requérant d\'asile' },
  { value: 'Suisse', label: 'Suisse / Autre' },
];

export const ETATS_CIVILS = [
  'Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve', 'Pacsé(e)', 'Séparé(e)'
];

export const UTILISATIONS_LOGEMENT = [
  'Professionnel', 'Principal', 'Secondaire'
];

export const DECOUVERTES_AGENCE = [
  'Recommandation', 'Internet', 'Publicité', 'Réseaux de relation', 'Journaux'
];

export const TYPES_BIEN = [
  'Villa & maison', 'Appartement', 'Colocation', 'Sous-location', 'Local commercial', 'Autre'
];

export const PIECES_OPTIONS = ['1+', '2+', '3+', '4+', '5+', 'Autre'];

export const REGIONS = [
  'Chablais', 'Fribourg', 'Gros-de-Vaud', 'Lausanne et région', 'Ouest-lausannois',
  'Lavaux', 'Nord-vaudois', 'Nyon et région', 'Riviera', 'Valais', 'Genève', 'Autre'
];

export const LIENS_CANDIDAT = [
  'Conjoint(e)', 'Enfant', 'Parent', 'Colocataire', 'Garant', 'Autre'
];

export const initialFormData: MandatFormData = {
  email: '',
  prenom: '',
  nom: '',
  telephone: '',
  adresse: '',
  date_naissance: '',
  nationalite: '',
  type_permis: '',
  etat_civil: '',
  gerance_actuelle: '',
  contact_gerance: '',
  loyer_actuel: 0,
  depuis_le: '',
  pieces_actuel: 1,
  charges_extraordinaires: false,
  montant_charges_extra: 0,
  poursuites: false,
  curatelle: false,
  motif_changement: '',
  profession: '',
  employeur: '',
  revenus_mensuels: 0,
  date_engagement: '',
  utilisation_logement: 'Principal',
  animaux: false,
  instrument_musique: false,
  vehicules: false,
  numero_plaques: '',
  decouverte_agence: '',
  type_recherche: 'Louer',
  nombre_occupants: 1,
  type_bien: '',
  pieces_recherche: '',
  region_recherche: '',
  budget_max: 0,
  souhaits_particuliers: '',
  candidats: [],
  documents_uploades: [],
  signature_data: '',
  cgv_acceptees: false,
  code_promo: '',
};
