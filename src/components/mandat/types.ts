export type JourneyChoice = 'rental' | 'purchase' | null;

export interface MandatFormData {
  // NOUVEAU : type de projet immobilier (Step 0)
  journey: JourneyChoice;

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

  // Situation actuelle (LOCATION uniquement)
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
  apport_personnel: number; // For purchase: available down payment
  souhaits_particuliers: string;

  // ACHAT : champs financiers complémentaires (mappés sur purchase_financing_profiles)
  achat_fonds_propres_3a: number;
  achat_fonds_propres_lpp: number;
  achat_montant_epl: number;
  achat_revenu_annuel_retenu: number;
  achat_bonus_3ans: number;
  achat_autres_revenus: number;
  achat_credit_mensuel: number;
  achat_leasing_mensuel: number;
  achat_cartes_credit_mensuel: number;
  achat_pensions_versees: number;
  achat_horizon_mois: number; // 3, 6, 12
  achat_usage: 'residence_principale' | 'residence_secondaire' | 'investissement' | '';
  achat_nombre_enfants: number;

  // Candidats
  candidats: CandidatData[];

  // Documents
  documents_uploades: DocumentData[];

  // Signature et CGV
  signature_data: string;
  cgv_acceptees: boolean;

  // Consentements juridiques (12 dispositions du contrat de mandat)
  legal_objet: boolean;
  legal_obligation_moyens: boolean;
  legal_exclusivite: boolean;
  legal_duree: boolean;
  legal_commission: boolean;
  legal_acompte: boolean;
  legal_transmission_dossier: boolean;
  legal_garants_cocandidats: boolean;
  legal_litiges: boolean;
  legal_protection_donnees: boolean;
  legal_cgu: boolean;
  legal_acceptation_generale: boolean;
  legal_consents_at: Record<string, string>;

  // Code promo
  code_promo: string;

  // Mode de paiement de l'acompte
  payment_method: 'twint' | 'qr_invoice';

  // Commercial - Location type
  location_type: 'personnel' | 'societe' | null;

  // Commercial - Company fields
  raison_sociale: string;
  numero_ide: string;
  chiffre_affaires: number;
  type_exploitation: string;
  nombre_employes: number;

  // Commercial - Search criteria
  surface_souhaitee: number;
  etage_souhaite: string;
  affectation_commerciale: string;
  besoins_commerciaux: string[];
}

export interface CandidatData {
  id: string;
  prenom: string;
  nom: string;
  date_naissance: string;
  nationalite: string;
  type_permis: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  profession: string;
  employeur: string;
  type_contrat?: string;
  date_entree_fonction?: string;
  revenus_mensuels: number;
  revenus_annuels?: number;
  autres_revenus?: number;
  charges_mensuelles?: number;
  credit_leasing_pension?: number;
  fonds_propres_personnels?: number;
  lpp_disponible?: number;
  troisieme_pilier?: number;
  lien_avec_client: string;
  remarques?: string;
}

export interface DocumentData {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export const NATIONALITES = [
  'Suisse',
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola', 'Antigua-et-Barbuda', 'Arabie saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan',
  'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin', 'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi',
  'Cambodge', 'Cameroun', 'Canada', 'Cap-Vert', 'Centrafrique', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie', 'Cuba',
  'Danemark', 'Djibouti', 'Dominique', 'République dominicaine',
  'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie',
  'Fidji', 'Finlande', 'France',
  'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée', 'Guinée équatoriale', 'Guinée-Bissau', 'Guyana',
  'Haïti', 'Honduras', 'Hongrie',
  'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande', 'Islande', 'Israël', 'Italie',
  'Jamaïque', 'Japon', 'Jordanie',
  'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Kosovo',
  'Laos', 'Lesotho', 'Lettonie', 'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg',
  'Macédoine du Nord', 'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte', 'Maroc', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco', 'Mongolie', 'Monténégro', 'Mozambique',
  'Namibie', 'Nauru', 'Népal', 'Nicaragua', 'Niger', 'Nigeria', 'Norvège', 'Nouvelle-Zélande',
  'Oman', 'Ouganda', 'Ouzbékistan',
  'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal',
  'Qatar',
  'République démocratique du Congo', 'République du Congo', 'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda',
  'Saint-Kitts-et-Nevis', 'Saint-Vincent-et-les-Grenadines', 'Sainte-Lucie', 'Salomon', 'Salvador', 'Samoa', 'São Tomé-et-Príncipe', 'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie', 'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suriname', 'Syrie',
  'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande', 'Timor oriental', 'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu',
  'Ukraine', 'Uruguay',
  'Vanuatu', 'Vatican', 'Venezuela', 'Viêt Nam',
  'Yémen',
  'Zambie', 'Zimbabwe',
  'Autre',
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

// Commercial property constants
export const TYPES_EXPLOITATION = [
  'Bureau', 'Commerce de détail', 'Restaurant / Bar', 
  'Salon (coiffure, beauté, etc.)', 'Atelier artisanal', 
  'Stockage / Entrepôt', 'Cabinet médical', 'Autre'
];

export const AFFECTATIONS_COMMERCIALES = [
  'Bureaux', 'Commerce', 'Artisanat', 'Restauration', 
  'Industriel léger', 'Stockage'
];

export const ETAGES_COMMERCIAUX = [
  'Rez-de-chaussée uniquement', 'Étages acceptés', 
  'Sous-sol accepté', 'Peu importe'
];

export const BESOINS_COMMERCIAUX = [
  { value: 'vitrine', label: 'Vitrine / Visibilité rue' },
  { value: 'livraison', label: 'Accès livraison / Quai de déchargement' },
  { value: 'parking', label: 'Parking / Places de parc' },
  { value: 'terrasse', label: 'Terrasse (restauration)' },
  { value: 'extraction', label: 'Extraction / Ventilation' },
  { value: 'entree_privee', label: 'Entrée indépendante' },
];

export const initialFormData: MandatFormData = {
  journey: null,
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
  apport_personnel: 0,
  souhaits_particuliers: '',

  // Achat - financement complémentaire
  achat_fonds_propres_3a: 0,
  achat_fonds_propres_lpp: 0,
  achat_montant_epl: 0,
  achat_revenu_annuel_retenu: 0,
  achat_bonus_3ans: 0,
  achat_autres_revenus: 0,
  achat_credit_mensuel: 0,
  achat_leasing_mensuel: 0,
  achat_cartes_credit_mensuel: 0,
  achat_pensions_versees: 0,
  achat_horizon_mois: 6,
  achat_usage: '',
  achat_nombre_enfants: 0,

  candidats: [],
  documents_uploades: [],
  signature_data: '',
  cgv_acceptees: false,
  legal_objet: false,
  legal_obligation_moyens: false,
  legal_exclusivite: false,
  legal_duree: false,
  legal_commission: false,
  legal_acompte: false,
  legal_transmission_dossier: false,
  legal_garants_cocandidats: false,
  legal_litiges: false,
  legal_protection_donnees: false,
  legal_cgu: false,
  legal_acceptation_generale: false,
  legal_consents_at: {},
  code_promo: '',
  payment_method: 'qr_invoice',

  // Commercial fields
  location_type: null,
  raison_sociale: '',
  numero_ide: '',
  chiffre_affaires: 0,
  type_exploitation: '',
  nombre_employes: 0,
  surface_souhaitee: 0,
  etage_souhaite: '',
  affectation_commerciale: '',
  besoins_commerciaux: [],
};
