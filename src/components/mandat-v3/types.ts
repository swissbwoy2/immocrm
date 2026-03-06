export interface MandatV3FormData {
  // Identity
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  date_naissance: string;
  nationalite: string;
  adresse: string;
  npa: string;
  ville: string;
  type_permis: string;
  etat_civil: string;

  // Employment
  profession: string;
  employeur: string;
  revenus_mensuels: number;

  // Personal
  nombre_enfants: number;
  animaux: boolean;
  notes_personnelles: string;

  // Search criteria
  type_recherche: string;
  type_bien: string;
  zone_recherche: string;
  pieces_min: string;
  budget_max: number;
  date_entree_souhaitee: string;
  criteres_obligatoires: string;
  criteres_souhaites: string;

  // Related parties
  related_parties: RelatedPartyData[];

  // Documents
  documents: MandateDocumentData[];

  // Legal checkboxes
  legal_exclusivite: boolean;
  legal_duree: boolean;
  legal_commission: boolean;
  legal_acompte: boolean;
  legal_resiliation: boolean;
  legal_obligations_client: boolean;
  legal_obligations_agence: boolean;
  legal_protection_donnees: boolean;
  legal_litiges: boolean;
  legal_droit_applicable: boolean;
  legal_acceptation_generale: boolean;

  // Signature
  signature_data: string;
}

export interface RelatedPartyData {
  id: string;
  role: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  date_naissance: string;
  nationalite: string;
  type_permis: string;
  profession: string;
  employeur: string;
  revenus_mensuels: number;
  lien_avec_mandant: string;
}

export interface MandateDocumentData {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  document_category: string;
}

export const LEGAL_CHECKBOXES = [
  { key: 'legal_exclusivite', label: 'J\'accepte le caractère exclusif du mandat (Art. 2)' },
  { key: 'legal_duree', label: 'J\'accepte la durée de 3 mois avec reconduction tacite (Art. 3)' },
  { key: 'legal_commission', label: 'J\'accepte la commission d\'un mois de loyer brut (Art. 4)' },
  { key: 'legal_acompte', label: 'J\'accepte le versement d\'un acompte de CHF 300.– (Art. 5)' },
  { key: 'legal_resiliation', label: 'J\'ai pris connaissance des conditions de résiliation (Art. 6)' },
  { key: 'legal_obligations_client', label: 'J\'accepte mes obligations en tant que client (Art. 7)' },
  { key: 'legal_obligations_agence', label: 'J\'ai pris connaissance des obligations de l\'agence (Art. 8)' },
  { key: 'legal_protection_donnees', label: 'J\'accepte le traitement de mes données personnelles (Art. 9)' },
  { key: 'legal_litiges', label: 'J\'accepte la clause de non-contournement et de règlement des litiges (Art. 11-12)' },
  { key: 'legal_droit_applicable', label: 'J\'accepte que le droit suisse s\'applique (Art. 13)' },
  { key: 'legal_acceptation_generale', label: 'Je déclare avoir lu, compris et accepté l\'intégralité du contrat (Art. 16)' },
] as const;

export const initialMandatV3Data: MandatV3FormData = {
  email: '',
  prenom: '',
  nom: '',
  telephone: '',
  date_naissance: '',
  nationalite: '',
  adresse: '',
  npa: '',
  ville: '',
  type_permis: '',
  etat_civil: '',
  profession: '',
  employeur: '',
  revenus_mensuels: 0,
  nombre_enfants: 0,
  animaux: false,
  notes_personnelles: '',
  type_recherche: 'Louer',
  type_bien: '',
  zone_recherche: '',
  pieces_min: '',
  budget_max: 0,
  date_entree_souhaitee: '',
  criteres_obligatoires: '',
  criteres_souhaites: '',
  related_parties: [],
  documents: [],
  legal_exclusivite: false,
  legal_duree: false,
  legal_commission: false,
  legal_acompte: false,
  legal_resiliation: false,
  legal_obligations_client: false,
  legal_obligations_agence: false,
  legal_protection_donnees: false,
  legal_litiges: false,
  legal_droit_applicable: false,
  legal_acceptation_generale: false,
  signature_data: '',
};
