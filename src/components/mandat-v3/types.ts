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

  // Legal consents (12)
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
  // Legacy (conservés pour compatibilité base de données)
  legal_resiliation?: boolean;
  legal_obligations_client?: boolean;
  legal_obligations_agence?: boolean;
  legal_droit_applicable?: boolean;

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

export interface LegalConsent {
  key: string;
  title: string;
  question: string;
  cta: string;
  note?: string;
  linkHref?: string;
  linkLabel?: string;
}

export const LEGAL_CHECKBOXES: LegalConsent[] = [
  {
    key: 'legal_objet',
    title: 'Objet du mandat',
    question: 'Confirmez-vous vouloir confier à Immo-rama.ch votre recherche immobilière selon les critères communiqués ?',
    cta: 'Oui, je confirme',
  },
  {
    key: 'legal_obligation_moyens',
    title: 'Obligation de moyens',
    question: "Avez-vous compris qu'Immo-rama.ch met en œuvre ses moyens pour vous accompagner mais ne peut garantir l'obtention d'un logement ou la conclusion d'une transaction ?",
    cta: "Oui, j'ai compris",
  },
  {
    key: 'legal_exclusivite',
    title: 'Exclusivité',
    question: 'Acceptez-vous de confier cette recherche à Immo-rama.ch à titre exclusif pendant la durée du mandat, sous réserve de votre droit légal de résilier le mandat en tout temps ?',
    cta: "Oui, j'accepte l'exclusivité",
  },
  {
    key: 'legal_duree',
    title: 'Durée et renouvellement',
    question: "Acceptez-vous une durée initiale de 3 mois, renouvelable par périodes de 3 mois, tout en conservant votre droit de résilier le mandat en tout temps conformément à l'art. 404 CO ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_commission',
    title: 'Commission',
    question: "Si vous obtenez un logement grâce à l'intervention d'Immo-rama.ch, acceptez-vous qu'une commission correspondant à un mois de loyer brut, charges comprises, soit due, plus TVA au taux légal si applicable ?",
    cta: "Oui, j'accepte la commission",
    note: 'TVA actuelle : 8,1 % si Immo-rama.ch est assujettie.',
  },
  {
    key: 'legal_acompte',
    title: 'Acompte',
    question: "Acceptez-vous de verser un acompte de CHF 300.–, déductible de la commission en cas de succès, conformément à l'article 7 du contrat ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_remboursement', title: 'Remboursement', question: "Acceptez-vous que l'acompte ne soit remboursable qu'après 90 jours de recherche active (remboursement sous 30 jours si aucun logement n'a été obtenu grâce à Immo-rama.ch), et qu'il ne soit pas remboursable si vous mettez fin au mandat avant 90 jours, sous réserve de votre droit légal de résilier en tout temps ?", cta: "Oui, j'accepte" }, { key: 'legal_transmission_dossier',
    title: 'Transmission du dossier',
    question: 'Autorisez-vous Immo-rama.ch à transmettre aux régies, propriétaires, vendeurs ou partenaires concernés les informations et documents nécessaires aux candidatures que vous demandez ?',
    cta: "Oui, j'autorise",
  },
  {
    key: 'legal_garants_cocandidats',
    title: 'Garants et co-candidats',
    question: "Lorsque vous nous transmettez les données d'un garant, d'un co-candidat ou d'une autre personne, confirmez-vous l'avoir informé de cette transmission ?",
    cta: 'Oui, je confirme',
  },
  {
    key: 'legal_litiges',
    title: 'Non-contournement',
    question: 'Acceptez-vous que la commission puisse rester due si vous concluez directement un contrat portant sur un bien présenté par Immo-rama.ch et que son intervention a contribué à la conclusion de ce contrat ?',
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_protection_donnees',
    title: 'Données personnelles',
    question: "J'ai pris connaissance de la Politique de confidentialité et des traitements nécessaires à l'exécution de mon mandat.",
    cta: "Oui, j'en ai pris connaissance",
    linkHref: '/politique-confidentialite',
    linkLabel: 'Lire la Politique de confidentialité',
  },
  {
    key: 'legal_cgu',
    title: 'CGU',
    question: "Acceptez-vous les Conditions Générales d'Utilisation de Logisorama.ch applicables à votre utilisation de la plateforme et de l'application ?",
    cta: "Oui, j'accepte les CGU",
    linkHref: '/conditions-generales',
    linkLabel: 'Lire les Conditions Générales d\'Utilisation',
  },
  {
    key: 'legal_acceptation_generale',
    title: 'Acceptation finale',
    question: 'Confirmez-vous avoir lu et compris le contrat et vouloir conclure le mandat avec Immo-rama.ch ?',
    cta: 'SIGNER ET ACTIVER MON MANDAT',
  },
];

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
  signature_data: '',
};
