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
    title: 'Objet et portée du mandat',
    question: "Confiez-vous à Immo-Rama un mandat exclusif de recherche d'un logement ou local en location, l'exclusivité étant limitée aux objets et bailleurs effectivement présentés par écrit par Immo-Rama, sans vous interdire vos propres recherches ?",
    cta: 'Oui, je confirme',
  },
  {
    key: 'legal_commission',
    title: 'Naissance et montant de la commission',
    question: "Acceptez-vous qu'une commission d'un mois de loyer brut (charges comprises), plus la TVA au taux légal si elle est due, avec un minimum de CHF 500, ne soit due que si un contrat de bail juridiquement valable est conclu et résulte de l'indication ou de la négociation d'Immo-Rama ?",
    cta: "Oui, j'accepte la commission",
    note: "Une décision d'attribution, une réservation, la transmission d'un dossier ou un accord de principe ne suffit pas.",
  },
  {
    key: 'legal_acompte',
    title: "Montant d'activation",
    question: "Acceptez-vous de verser un montant d'activation de CHF 300, imputé sur la commission, pour l'ouverture et l'étude de votre dossier ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_duree',
    title: 'Durée et reconduction tacite',
    question: "Acceptez-vous que le mandat soit conclu pour 90 jours, reconduit tacitement par périodes de 90 jours, la dénonciation ordinaire pouvant être notifiée entre le 75e et le 90e jour de la période en cours (par écrit ou dans l'application Logisorama.ch) ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_remboursement',
    title: 'Résiliation et remboursement',
    question: "Avez-vous compris que si Immo-Rama met fin au mandat, ou au terme d'une période sans conclusion de bail, les CHF 300 vous sont remboursés sous 30 jours, mais qu'en cas de résiliation anticipée de votre part ils restent acquis à Immo-Rama en rémunération des démarches déjà engagées ?",
    cta: "Oui, j'ai compris",
  },
  {
    key: 'legal_revocation',
    title: 'Révocation en tout temps (art. 404 CO)',
    question: "Avez-vous compris que chaque partie conserve le droit impératif de révoquer ou de répudier le mandat avec effet immédiat en tout temps (art. 404 CO), aux conséquences financières décrites ci-dessus ?",
    cta: "Oui, j'ai compris",
  },
  {
    key: 'legal_litiges',
    title: 'Contrats ultérieurs',
    question: "Acceptez-vous qu'un autre objet ou un contrat ultérieur avec le même bailleur, conclu pendant le mandat ou dans les 3 mois suivant sa fin et résultant d'une indication ou négociation documentée d'Immo-Rama, reste soumis à commission (à annoncer dans les 5 jours), une simple identité de bailleur ne suffisant pas ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_confidentialite',
    title: 'Confidentialité',
    question: "Vous engagez-vous à traiter confidentiellement les informations non publiques reçues d'Immo-Rama, en ne répondant que du dommage direct, prévisible et prouvé en cas de transmission fautive à un tiers ?",
    cta: "Oui, je m'engage",
  },
  {
    key: 'legal_verifications',
    title: 'Informations et vérifications',
    question: "Acceptez-vous qu'Immo-Rama demande les justificatifs objectivement nécessaires, tout contrôle de solvabilité ou contact avec l'employeur n'ayant lieu qu'après votre information préalable et votre accord spécifique, dans le respect de la LPD ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_transmission_dossier',
    title: 'Transmission du dossier',
    question: "Autorisez-vous Immo-Rama à transmettre aux bailleurs et gérances les seules données nécessaires à une candidature déterminée ?",
    cta: "Oui, j'autorise",
  },
  {
    key: 'legal_garants_cocandidats',
    title: 'Garants et co-candidats',
    question: "Lorsque vous transmettez les données d'un garant, d'un co-candidat ou d'un tiers, confirmez-vous l'avoir informé de cette transmission ?",
    cta: 'Oui, je confirme',
  },
  {
    key: 'legal_attribution_gerance',
    title: 'Attribution par la gérance',
    question: "Avez-vous compris que l'annonce par une gérance de son intention d'attribuer un logement ne rend aucune commission exigible, celle-ci n'étant due qu'après la conclusion juridiquement valable du bail ?",
    cta: "Oui, j'ai compris",
  },
  {
    key: 'legal_obligation_moyens',
    title: "Responsabilité et position d'Immo-Rama",
    question: "Avez-vous compris qu'Immo-Rama est tenue à une obligation de moyens, reste tributaire des données des offreurs et ne répond pas des actes des bailleurs ou gérances qui ne sont pas ses auxiliaires ?",
    cta: "Oui, j'ai compris",
  },
  {
    key: 'legal_protection_donnees',
    title: 'Protection des données',
    question: "J'ai pris connaissance de la Politique de confidentialité ; les communications commerciales reposent sur un consentement séparé, facultatif et révocable, sans effet sur l'exécution du mandat.",
    cta: "Oui, j'en ai pris connaissance",
    linkHref: '/politique-confidentialite',
    linkLabel: 'Lire la Politique de confidentialité',
  },
  {
    key: 'legal_droit_applicable',
    title: 'Droit applicable et for',
    question: "Acceptez-vous que le mandat soit soumis au droit suisse (art. 394 ss et 412 ss CO) et que, agissant à des fins privées, vous puissiez saisir le tribunal de votre domicile ou celui du siège d'Immo-Rama dans le canton de Vaud (art. 32 CPC) ?",
    cta: "Oui, j'accepte",
  },
  {
    key: 'legal_acceptation_generale',
    title: 'Acceptation finale',
    question: "Confirmez-vous avoir reçu le mandat complet, en comprendre les dispositions et vouloir le conclure avec Immo-Rama ?",
    cta: 'Signer et activer mon mandat',
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
