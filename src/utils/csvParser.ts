import { Client, User } from '@/data/mockData';

interface CSVRow {
  [key: string]: string;
}

export interface ParsedCSVData {
  clients: Client[];
  users: User[];
  errors: string[];
}

// Normalise un nom de colonne pour faciliter la comparaison
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .replace(/[\u2010-\u2015\u2212]/g, '-') // Remplace tous les types de tirets par un tiret normal
    .replace(/[^a-z0-9-]/g, '') // Garde lettres, chiffres et tirets
    .replace(/-+/g, '') // Retire tous les tirets
    .trim();
}

// Cherche la valeur d'une colonne avec plusieurs variantes possibles
function findColumnValue(row: CSVRow, variants: string[]): string {
  const normalizedRow: { [key: string]: string } = {};
  
  // Normaliser toutes les clés du row
  Object.keys(row).forEach(key => {
    normalizedRow[normalizeColumnName(key)] = row[key];
  });

  // Essayer chaque variante et retourner la première valeur non-vide
  for (const variant of variants) {
    const normalized = normalizeColumnName(variant);
    if (normalizedRow[normalized] && normalizedRow[normalized].trim()) {
      return normalizedRow[normalized];
    }
  }
  
  return '';
}

// Nettoie et parse un nombre (gère les formats suisses avec apostrophes, espaces, etc.)
function parseNumber(value: string): number {
  if (!value) return 0;
  // Retire les espaces, apostrophes, et autres séparateurs de milliers
  const cleaned = value.toString().replace(/[\s''']/g, '').replace(/[,]/g, '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseCSV(fileContent: string): ParsedCSVData {
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { clients: [], users: [], errors: ['Fichier CSV vide ou invalide'] };
  }

  const headers = parseCSVLine(lines[0]);
  console.log('📋 Headers détectés:', headers);
  console.log('📋 Headers normalisés:', headers.map(h => normalizeColumnName(h)));
  
  const clients: Client[] = [];
  const users: User[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect`);
        continue;
      }

      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });

      const { client, user, error } = parseClientFromRow(row, i + 1);
      
      if (error) {
        errors.push(error);
        continue;
      }

      if (client && user) {
        clients.push(client);
        users.push(user);
      }
    } catch (error) {
      errors.push(`Ligne ${i + 1}: Erreur de parsing - ${error}`);
    }
  }

  return { clients, users, errors };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      // Handle escaped quotes (double quotes)
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  
  // Remove surrounding quotes from values if present
  return values.map(val => {
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return val;
  });
}

function parseClientFromRow(row: CSVRow, lineNumber: number): { 
  client: Client | null; 
  user: User | null; 
  error: string | null;
} {
  // Validation des champs requis avec recherche flexible
  const email = findColumnValue(row, [
    'E-mail', 'Email', 'e-mail', 'email', 'E mail', 'Courriel', 'Adresse email', 'Mail'
  ]);
  const prenom = findColumnValue(row, [
    'Prénom', 'Prenom', 'First name', 'First Name', 'prenom', 'firstName'
  ]);
  const nom = findColumnValue(row, [
    'Nom de famille', 'Nom', 'Last name', 'Last Name', 'Famille', 'nom', 'nom de famille', 'lastName'
  ]);
  const telephone = findColumnValue(row, [
    'Téléphone', 'Telephone', 'Tel', 'Phone', 'Mobile', 'Numéro', 'Numero', 'telephone', 'phone'
  ]);

  console.log(`Ligne ${lineNumber}:`, { email, prenom, nom, telephone });

  if (!email || !prenom || !nom || !telephone) {
    return {
      client: null,
      user: null,
      error: `Ligne ${lineNumber}: Champs requis manquants (Email, Prénom, Nom, Téléphone)`
    };
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      client: null,
      user: null,
      error: `Ligne ${lineNumber}: Email invalide`
    };
  }

  // Génération du mot de passe: 'immo' + 4 derniers chiffres du téléphone
  const phoneDigits = telephone.replace(/\D/g, '');
  const last4Digits = phoneDigits.slice(-4);
  const tempPassword = `immo${last4Digits}`;

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Créer l'utilisateur
  const user: User = {
    id: userId,
    email: email,
    password: tempPassword,
    role: 'client',
    nom: nom,
    prenom: prenom,
    telephone: telephone,
    clientId: clientId,
    dateCreation: new Date().toISOString(),
    actif: false, // Nécessite activation lors de la première connexion
  };

  // Parser les champs numériques avec valeurs par défaut
  const revenuRaw = findColumnValue(row, [
    'Revenu mensuel net', 'Revenu', 'Revenue', 'Salaire', 'Revenu net'
  ]);
  const loyerRaw = findColumnValue(row, [
    'Loyer brut actuel', 'Loyer', 'Loyer actuel', 'Rent', 'Loyer mensuel'
  ]);
  const budgetRaw = findColumnValue(row, [
    'Budget maximum (le loyer brut ne devant pas dépasser le tiers du salaire):', 
    'Budget maximum (le loyer brut ne devant pas dépasser le tiers du salaire)',
    'Budget maximum', 'Budget', 'Budget max', 'Maximum budget'
  ]);
  const chargesRaw = findColumnValue(row, [
    'Montant charges', 'Charges', 'Montant des charges'
  ]);

  console.log(`📋 Ligne ${lineNumber} - Valeurs brutes:`, { 
    revenuRaw, loyerRaw, budgetRaw, chargesRaw 
  });

  const revenuMensuel = parseNumber(revenuRaw);
  const loyerActuel = parseNumber(loyerRaw);
  const budgetMax = parseNumber(budgetRaw);
  const montantCharges = parseNumber(chargesRaw);

  console.log(`💰 Ligne ${lineNumber} - Montants parsés:`, { 
    revenuMensuel, loyerActuel, budgetMax, montantCharges 
  });

  // Parser les régions
  const regionsString = findColumnValue(row, [
    'Région', 'Regions', 'Region', 'Régions', 'Localisation'
  ]);
  const regions = regionsString.split(/[;,]/).map(r => r.trim()).filter(r => r);

  // Créer le client
  const client: Client = {
    id: clientId,
    dateInscription: findColumnValue(row, [
      'Date et heure de l\'envoi', 'Date inscription', 'Date', 'Date envoi'
    ]) || new Date().toISOString(),
    agentId: undefined, // À assigner manuellement
    splitAgent: 45, // Par défaut 45/55
    splitAgence: 55,
    email: email,
    prenom: prenom,
    nom: nom,
    telephone: telephone,
    adresse: findColumnValue(row, ['Adresse', 'Address', 'Rue']),
    dateNaissance: findColumnValue(row, ['Date de naissance', 'Date naissance', 'Naissance', 'Birth date']),
    nationalite: findColumnValue(row, ['Nationalité', 'Nationalite', 'Nationality']),
    typePermis: findColumnValue(row, ['Type de permis de séjour', 'Permis', 'Type permis', 'Permit']),
    etatCivil: findColumnValue(row, ['État civil', 'Etat civil', 'Statut civil']),
    geranceActuelle: findColumnValue(row, ['Gérance actuelle', 'Gerance', 'Gérance']),
    contactGerance: findColumnValue(row, ['Contact gérance', 'Contact gerance', 'Contact']),
    loyerActuel: loyerActuel,
    depuisLe: findColumnValue(row, ['Depuis le', 'Depuis', 'Date debut']),
    nombrePiecesActuel: parseNumber(findColumnValue(row, [
      'Nombre de pièces actuel', 'Pieces actuelles', 'Pieces', 'Nb pieces actuel'
    ])),
    chargesExtraordinaires: findColumnValue(row, ['Charges extraordinaires', 'Charges extra']) || 'Non',
    montantCharges: montantCharges,
    poursuites: findColumnValue(row, ['Poursuites', 'Poursuite']).toLowerCase() === 'oui',
    curatelle: findColumnValue(row, ['Curatelle']).toLowerCase() === 'oui',
    motifChangement: findColumnValue(row, ['Motif changement', 'Motif', 'Raison changement']),
    profession: findColumnValue(row, ['Profession', 'Métier', 'Job', 'Emploi']),
    employeur: findColumnValue(row, ['Employeur', 'Employer', 'Entreprise']),
    revenuMensuel: revenuMensuel,
    dateEngagement: findColumnValue(row, ['Date d\'engagement', 'Date engagement', 'Date embauche']),
    animaux: findColumnValue(row, ['Animaux', 'Animal', 'Pets']).toLowerCase() === 'oui',
    vehicules: findColumnValue(row, ['Véhicules', 'Vehicules', 'Voiture', 'Vehicle']).toLowerCase() === 'oui',
    numeroPlaques: findColumnValue(row, ['Numéro plaques', 'Numero plaques', 'Plaque', 'Plate number']),
    typeRecherche: findColumnValue(row, ['Type recherche', 'Type', 'Recherche']) || 'Location',
    typeBien: findColumnValue(row, ['Type d\'objet', 'Type objet', 'Type bien', 'Property type']) || 'Appartement',
    nombrePiecesSouhaite: findColumnValue(row, ['Nb de pcs', 'Nombre de pieces', 'Pieces souhaitees', 'Rooms']) || '2.5',
    regions: regions,
    budgetMax: budgetMax,
    souhaitsParticuliers: findColumnValue(row, ['Souhaits particuliers', 'Souhaits', 'Remarques', 'Notes']),
    notificationJ60Envoyee: false,
  };

  return { client, user, error: null };
}

export function validateCSVHeaders(headers: string[]): { valid: boolean; missingHeaders: string[] } {
  const requiredHeaders = ['E-mail', 'Prénom', 'Nom de famille', 'Téléphone'];
  const missingHeaders: string[] = [];

  for (const required of requiredHeaders) {
    const found = headers.some(h => 
      h.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(h.toLowerCase())
    );
    
    if (!found) {
      missingHeaders.push(required);
    }
  }

  return {
    valid: missingHeaders.length === 0,
    missingHeaders
  };
}
