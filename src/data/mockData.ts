// Données mockées pour ImmoCRM

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'agent' | 'client';
  nom: string;
  prenom: string;
  telephone?: string;
  avatar?: string;
  clientId?: string;
  dateCreation: string;
  actif: boolean;
}

export interface Agent {
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  avatar?: string;
  clientsAssignes: string[];
  actif: boolean;
}

export interface Client {
  id: string;
  dateInscription: string;
  agentId?: string;
  splitAgent: number;
  splitAgence: number;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  dateNaissance: string | null;
  nationalite: string;
  typePermis: string;
  etatCivil: string;
  geranceActuelle: string;
  contactGerance: string;
  loyerActuel: number;
  depuisLe: string | null;
  nombrePiecesActuel: number;
  chargesExtraordinaires: boolean;
  montantCharges: number;
  poursuites: boolean;
  curatelle: boolean;
  motifChangement: string;
  profession: string;
  employeur: string;
  revenuMensuel: number;
  dateEngagement: string | null;
  nombreOccupants?: number;
  utilisationLogement?: string;
  animaux: boolean;
  instrumentMusique?: boolean;
  vehicules: boolean;
  numeroPlaques: string;
  decouverteAgence?: string;
  typeRecherche: string;
  typeBien: string;
  nombrePiecesSouhaite: string;
  regions: string[];
  budgetMax: number;
  souhaitsParticuliers: string;
  notificationJ60Envoyee: boolean;
}

export interface Offre {
  id: string;
  clientId: string;
  agentId: string;
  dateEnvoi: string;
  localisation: string;
  prix: number;
  surface: number;
  nombrePieces: number;
  description: string;
  etage: string;
  disponibilite: string;
  etageVisite: string;
  codeImmeuble: string;
  locataireNom: string;
  locataireTel: string;
  conciergeNom: string;
  conciergeTel: string;
  commentaires: string;
  datesVisite: string[];
  lienAnnonce: string;
  statut: 'envoyee' | 'vue' | 'interesse' | 'visite_planifiee' | 'visite_effectuee' | 'candidature_deposee' | 'acceptee' | 'refusee';
  dateStatut: string;
  visiteConfirmee?: {
    date: string;
    heure: string;
  };
  candidature?: {
    dateDepot: string;
    documentsEnvoyes: string[];
    gerance: string;
    contactGerance: string;
    resultat: 'en_attente' | 'acceptee' | 'refusee';
    dateResultat?: string;
    commentaire?: string;
  };
}

export interface Transaction {
  id: string;
  clientId: string;
  agentId: string;
  offreId: string;
  loyerBrut: number;
  commissionBrute: number;
  splitAgent: number;
  splitAgence: number;
  partAgent: number;
  partAgence: number;
  statut: 'en_cours' | 'conclue' | 'annulee';
  dateCreation: string;
  dateConclusion?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  expediteurId: string;
  expediteurRole: 'admin' | 'agent' | 'client' | 'system';
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  type: 'texte' | 'offre' | 'notification';
  offreId?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  dernierMessage: string;
  dateDernierMessage: string;
  nonLus: number;
}

// Données initiales
export const initialUsers: User[] = [
  {
    id: 'user-admin',
    email: 'admin@immo-rama.ch',
    password: 'admin123',
    role: 'admin',
    nom: 'Admin',
    prenom: 'Administrateur',
    telephone: '+41 21 634 28 39',
    dateCreation: '2024-01-01',
    actif: true,
  },
  {
    id: 'user-marc',
    email: 'marc.dubois@immo-rama.ch',
    password: 'agent123',
    role: 'agent',
    nom: 'Dubois',
    prenom: 'Marc',
    telephone: '+41 79 123 45 67',
    dateCreation: '2024-01-01',
    actif: true,
  },
  {
    id: 'user-sophie',
    email: 'sophie.martin@immo-rama.ch',
    password: 'agent123',
    role: 'agent',
    nom: 'Martin',
    prenom: 'Sophie',
    telephone: '+41 79 234 56 78',
    dateCreation: '2024-01-01',
    actif: true,
  },
];

export const initialAgents: Agent[] = [
  {
    id: 'agent-marc',
    userId: 'user-marc',
    nom: 'Dubois',
    prenom: 'Marc',
    email: 'marc.dubois@immo-rama.ch',
    telephone: '+41 79 123 45 67',
    clientsAssignes: ['client-1', 'client-2'],
    actif: true,
  },
  {
    id: 'agent-sophie',
    userId: 'user-sophie',
    nom: 'Martin',
    prenom: 'Sophie',
    email: 'sophie.martin@immo-rama.ch',
    telephone: '+41 79 234 56 78',
    clientsAssignes: ['client-3'],
    actif: true,
  },
];

export const initialClients: Client[] = [
  {
    id: 'client-1',
    dateInscription: '2024-10-01',
    agentId: 'agent-marc',
    splitAgent: 45,
    splitAgence: 55,
    email: 'jean.dupont@email.ch',
    prenom: 'Jean',
    nom: 'Dupont',
    telephone: '+41 79 345 67 89',
    adresse: 'Rue de Lausanne 10, 1020 Renens',
    dateNaissance: '1985-03-15',
    nationalite: 'Suisse',
    typePermis: 'Suisse / Autre',
    etatCivil: 'Marié',
    geranceActuelle: 'Régie Immobilière SA',
    contactGerance: '+41 21 123 45 67',
    loyerActuel: 1800,
    depuisLe: '2020-06-01',
    nombrePiecesActuel: 3.5,
    chargesExtraordinaires: false,
    montantCharges: 200,
    poursuites: false,
    curatelle: false,
    motifChangement: 'Plus grand logement pour famille',
    profession: 'Ingénieur',
    employeur: 'Tech Solutions SA',
    revenuMensuel: 7500,
    dateEngagement: '2018-03-01',
    animaux: false,
    vehicules: true,
    numeroPlaques: 'VD 123456',
    typeRecherche: 'Location',
    typeBien: 'Appartement',
    nombrePiecesSouhaite: '4.5',
    regions: ['Lausanne', 'Renens', 'Prilly'],
    budgetMax: 2500,
    souhaitsParticuliers: 'Balcon, proche des écoles',
    notificationJ60Envoyee: false,
  },
  {
    id: 'client-2',
    dateInscription: '2024-08-15',
    agentId: 'agent-marc',
    splitAgent: 60,
    splitAgence: 40,
    email: 'marie.claire@email.ch',
    prenom: 'Marie',
    nom: 'Claire',
    telephone: '+41 79 456 78 90',
    adresse: 'Avenue de la Gare 5, 1003 Lausanne',
    dateNaissance: '1990-07-22',
    nationalite: 'Française',
    typePermis: 'B',
    etatCivil: 'Célibataire',
    geranceActuelle: 'Foncia SA',
    contactGerance: '+41 21 234 56 78',
    loyerActuel: 1500,
    depuisLe: '2021-01-01',
    nombrePiecesActuel: 2.5,
    chargesExtraordinaires: false,
    montantCharges: 150,
    poursuites: false,
    curatelle: false,
    motifChangement: 'Changement de travail',
    profession: 'Avocate',
    employeur: 'Cabinet Juridique Léman',
    revenuMensuel: 8500,
    dateEngagement: '2019-09-01',
    animaux: true,
    vehicules: false,
    numeroPlaques: '',
    typeRecherche: 'Location',
    typeBien: 'Appartement',
    nombrePiecesSouhaite: '3.5',
    regions: ['Lausanne', 'Pully', 'Lutry'],
    budgetMax: 2200,
    souhaitsParticuliers: 'Accepte animaux (chat)',
    notificationJ60Envoyee: true,
  },
  {
    id: 'client-3',
    dateInscription: '2024-11-10',
    agentId: 'agent-sophie',
    splitAgent: 45,
    splitAgence: 55,
    email: 'pierre.martin@email.ch',
    prenom: 'Pierre',
    nom: 'Martin',
    telephone: '+41 79 567 89 01',
    adresse: 'Chemin des Fleurs 20, 1004 Lausanne',
    dateNaissance: '1988-11-30',
    nationalite: 'Suisse',
    typePermis: 'Suisse / Autre',
    etatCivil: 'Divorcé',
    geranceActuelle: 'Privé',
    contactGerance: '',
    loyerActuel: 2000,
    depuisLe: '2019-03-01',
    nombrePiecesActuel: 4.5,
    chargesExtraordinaires: true,
    montantCharges: 250,
    poursuites: false,
    curatelle: false,
    motifChangement: 'Divorce',
    profession: 'Architecte',
    employeur: 'Atelier Design SA',
    revenuMensuel: 9000,
    dateEngagement: '2015-06-01',
    animaux: false,
    vehicules: true,
    numeroPlaques: 'VD 654321',
    typeRecherche: 'Location',
    typeBien: 'Appartement',
    nombrePiecesSouhaite: '2.5-3.5',
    regions: ['Lausanne', 'Epalinges', 'Le Mont'],
    budgetMax: 1800,
    souhaitsParticuliers: 'Vue sur le lac préférée',
    notificationJ60Envoyee: false,
  },
];

export const initialOffres: Offre[] = [
  {
    id: 'offre-1',
    clientId: 'client-1',
    agentId: 'agent-marc',
    dateEnvoi: '2024-10-15',
    localisation: 'Avenue de Rhodanie 50, 1007 Lausanne',
    prix: 2400,
    surface: 95,
    nombrePieces: 4.5,
    description: 'Magnifique appartement de 4.5 pièces avec balcon et vue dégagée. Cuisine équipée, salle de bains moderne.',
    etage: '3ème',
    disponibilite: '01.02.2025',
    etageVisite: '3ème',
    codeImmeuble: '4521',
    locataireNom: 'Dupont',
    locataireTel: '+41 79 111 22 33',
    conciergeNom: 'M. Bernard',
    conciergeTel: '+41 79 222 33 44',
    commentaires: 'Venir avec dossier complet',
    datesVisite: ['2024-10-20T10:00', '2024-10-22T14:00', '2024-10-25T16:00'],
    lienAnnonce: 'https://www.immoscout24.ch/fr/bien-immobilier/exemple',
    statut: 'visite_planifiee',
    dateStatut: '2024-10-16',
    visiteConfirmee: {
      date: '2024-10-22',
      heure: '14:00',
    },
  },
  {
    id: 'offre-2',
    clientId: 'client-1',
    agentId: 'agent-marc',
    dateEnvoi: '2024-10-18',
    localisation: 'Chemin de Beau-Rivage 12, 1006 Lausanne',
    prix: 2300,
    surface: 90,
    nombrePieces: 4.5,
    description: 'Appartement lumineux avec 2 salles de bains, proche des transports.',
    etage: '2ème',
    disponibilite: '15.01.2025',
    etageVisite: '2ème',
    codeImmeuble: '7894',
    locataireNom: '',
    locataireTel: '',
    conciergeNom: 'Mme Jolivet',
    conciergeTel: '+41 79 333 44 55',
    commentaires: '',
    datesVisite: ['2024-10-25T10:00'],
    lienAnnonce: 'https://www.immoscout24.ch/fr/bien-immobilier/exemple2',
    statut: 'vue',
    dateStatut: '2024-10-19',
  },
  {
    id: 'offre-3',
    clientId: 'client-2',
    agentId: 'agent-marc',
    dateEnvoi: '2024-09-01',
    localisation: 'Rue du Simplon 25, 1006 Lausanne',
    prix: 2100,
    surface: 80,
    nombrePieces: 3.5,
    description: 'Appartement rénové avec cuisine moderne.',
    etage: '1er',
    disponibilite: '01.12.2024',
    etageVisite: '1er',
    codeImmeuble: '1234',
    locataireNom: 'Martin',
    locataireTel: '+41 79 444 55 66',
    conciergeNom: 'M. Dupuis',
    conciergeTel: '+41 79 555 66 77',
    commentaires: '',
    datesVisite: ['2024-09-10T15:00'],
    lienAnnonce: 'https://www.homegate.ch/louer/exemple',
    statut: 'candidature_deposee',
    dateStatut: '2024-09-12',
    visiteConfirmee: {
      date: '2024-09-10',
      heure: '15:00',
    },
    candidature: {
      dateDepot: '2024-09-12',
      documentsEnvoyes: ['Fiche de salaire', 'Attestation employeur', 'Justificatif domicile'],
      gerance: 'Régie du Lac SA',
      contactGerance: 'info@regiedulac.ch',
      resultat: 'en_attente',
    },
  },
  {
    id: 'offre-4',
    clientId: 'client-3',
    agentId: 'agent-sophie',
    dateEnvoi: '2024-11-15',
    localisation: 'Avenue de Beaulieu 8, 1004 Lausanne',
    prix: 1750,
    surface: 70,
    nombrePieces: 3.5,
    description: 'Appartement cosy avec vue sur le lac.',
    etage: '5ème',
    disponibilite: '01.01.2025',
    etageVisite: '5ème',
    codeImmeuble: '9876',
    locataireNom: '',
    locataireTel: '',
    conciergeNom: 'Mme Petit',
    conciergeTel: '+41 79 666 77 88',
    commentaires: 'Ascenseur disponible',
    datesVisite: ['2024-12-01T10:00', '2024-12-03T14:00'],
    lienAnnonce: 'https://www.immoscout24.ch/fr/bien-immobilier/exemple3',
    statut: 'envoyee',
    dateStatut: '2024-11-15',
  },
];

export const initialTransactions: Transaction[] = [
  {
    id: 'trans-1',
    clientId: 'client-1',
    agentId: 'agent-marc',
    offreId: 'offre-1',
    loyerBrut: 2400,
    commissionBrute: 2400,
    splitAgent: 45,
    splitAgence: 55,
    partAgent: 1080,
    partAgence: 1320,
    statut: 'en_cours',
    dateCreation: '2024-10-20',
  },
];

export const initialMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-agent-marc-client-1',
    expediteurId: 'agent-marc',
    expediteurRole: 'agent',
    contenu: 'Bonjour Jean, j\'ai trouvé plusieurs biens qui pourraient vous intéresser. Je vous envoie les détails.',
    dateEnvoi: '2024-10-14T10:30:00',
    lu: true,
    type: 'texte',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-agent-marc-client-1',
    expediteurId: 'agent-marc',
    expediteurRole: 'agent',
    contenu: '',
    dateEnvoi: '2024-10-15T11:00:00',
    lu: true,
    type: 'offre',
    offreId: 'offre-1',
  },
  {
    id: 'msg-3',
    conversationId: 'conv-agent-marc-client-1',
    expediteurId: 'client-1',
    expediteurRole: 'client',
    contenu: 'Merci Marc ! Le bien Avenue de Rhodanie m\'intéresse beaucoup. Je suis disponible le 22 octobre à 14h.',
    dateEnvoi: '2024-10-15T14:20:00',
    lu: true,
    type: 'texte',
  },
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv-agent-marc-client-1',
    participants: ['agent-marc', 'client-1'],
    dernierMessage: 'Merci Marc ! Le bien Avenue de Rhodanie m\'intéresse beaucoup.',
    dateDernierMessage: '2024-10-15T14:20:00',
    nonLus: 0,
  },
  {
    id: 'conv-agent-marc-client-2',
    participants: ['agent-marc', 'client-2'],
    dernierMessage: 'Je vous tiendrai informé des résultats de votre candidature.',
    dateDernierMessage: '2024-09-12T16:00:00',
    nonLus: 1,
  },
  {
    id: 'conv-agent-sophie-client-3',
    participants: ['agent-sophie', 'client-3'],
    dernierMessage: 'Bonjour Pierre, voici une nouvelle offre qui correspond à vos critères.',
    dateDernierMessage: '2024-11-15T09:00:00',
    nonLus: 1,
  },
];
