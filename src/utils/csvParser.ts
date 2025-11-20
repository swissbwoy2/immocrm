import { Client, User } from '@/data/mockData';

interface CSVRow {
  [key: string]: string;
}

export interface ParsedCSVData {
  clients: Client[];
  users: User[];
  errors: string[];
}

export function parseCSV(fileContent: string): ParsedCSVData {
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { clients: [], users: [], errors: ['Fichier CSV vide ou invalide'] };
  }

  const headers = parseCSVLine(lines[0]);
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
  // Validation des champs requis
  const email = row['E-mail'] || row['Email'];
  const prenom = row['Prénom'] || row['Prenom'];
  const nom = row['Nom de famille'] || row['Nom'];
  const telephone = row['Téléphone'] || row['Telephone'];

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
  const revenuMensuel = parseFloat(row['Revenu mensuel net'] || row['Revenu'] || '0');
  const loyerActuel = parseFloat(row['Loyer brut actuel'] || row['Loyer'] || '0');
  const budgetMax = parseFloat(row['Budget maximum'] || row['Budget'] || '0');
  const montantCharges = parseFloat(row['Montant charges'] || '0');

  // Parser les régions
  const regionsString = row['Région'] || row['Regions'] || '';
  const regions = regionsString.split(/[;,]/).map(r => r.trim()).filter(r => r);

  // Créer le client
  const client: Client = {
    id: clientId,
    dateInscription: row['Date et heure de l\'envoi'] || new Date().toISOString(),
    agentId: undefined, // À assigner manuellement
    splitAgent: 45, // Par défaut 45/55
    splitAgence: 55,
    email: email,
    prenom: prenom,
    nom: nom,
    telephone: telephone,
    adresse: row['Adresse'] || '',
    dateNaissance: row['Date de naissance'] || '',
    nationalite: row['Nationalité'] || row['Nationalite'] || '',
    typePermis: row['Type de permis de séjour'] || row['Permis'] || '',
    etatCivil: row['État civil'] || row['Etat civil'] || '',
    geranceActuelle: row['Gérance actuelle'] || row['Gerance'] || '',
    contactGerance: row['Contact gérance'] || row['Contact gerance'] || '',
    loyerActuel: loyerActuel,
    depuisLe: row['Depuis le'] || '',
    nombrePiecesActuel: parseFloat(row['Nombre de pièces actuel'] || row['Pieces actuelles'] || '0'),
    chargesExtraordinaires: row['Charges extraordinaires'] || 'Non',
    montantCharges: montantCharges,
    poursuites: row['Poursuites']?.toLowerCase() === 'oui',
    curatelle: row['Curatelle']?.toLowerCase() === 'oui',
    motifChangement: row['Motif changement'] || '',
    profession: row['Profession'] || '',
    employeur: row['Employeur'] || '',
    revenuMensuel: revenuMensuel,
    dateEngagement: row['Date d\'engagement'] || row['Date engagement'] || '',
    animaux: row['Animaux']?.toLowerCase() === 'oui',
    vehicules: row['Véhicules']?.toLowerCase() === 'oui' || row['Vehicules']?.toLowerCase() === 'oui',
    numeroPlaques: row['Numéro plaques'] || row['Numero plaques'] || '',
    typeRecherche: row['Type recherche'] || 'Location',
    typeBien: row['Type d\'objet'] || row['Type objet'] || 'Appartement',
    nombrePiecesSouhaite: row['Nb de pcs'] || row['Nombre de pieces'] || '2.5',
    regions: regions,
    budgetMax: budgetMax,
    souhaitsParticuliers: row['Souhaits particuliers'] || '',
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
