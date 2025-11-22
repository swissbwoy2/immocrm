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
        const value = values[index]?.trim() || '';
        // Garder la première valeur non-vide pour chaque header
        if (!row[header] || row[header] === '') {
          row[header] = value;
        }
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

  // Parse helper for dates (Swiss format)
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || !dateStr.trim()) return null;
    try {
      // Support DD/MM/YYYY, DD.MM.YYYY
      const cleaned = dateStr.replace(/(\d{2})[./](\d{2})[./](\d{4})/, '$3-$2-$1');
      const date = new Date(cleaned);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Parse boolean values
  const parseBoolean = (value: string): boolean => {
    const normalized = value.toLowerCase().trim();
    return normalized === 'oui' || normalized === 'yes' || normalized === '1' || normalized === 'true';
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
    'Si oui, montant / échéance',
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

  // Parser la date du mandat avec plus de variantes
  const dateRaw = findColumnValue(row, [
    'Date et heure de l\'envoi',
    'Date et heure de l envoi', 
    'Date inscription', 
    'Date d inscription',
    'Date',
    'Date envoi',
    'Timestamp',
    'Date de creation',
    'Date du mandat',
    'Horodateur',
    'Created at',
    'Date d ajout'
  ]);

  console.log(`📅 Ligne ${lineNumber} - Date brute trouvée:`, dateRaw);

  // Parser la date (support des formats suisses)
  let dateInscription: string;
  if (dateRaw && dateRaw.trim()) {
    // Essayer de parser la date
    try {
      // Format: "21/11/2024 14:30" ou "21.11.2024 14:30" ou "2024-11-21"
      const dateParsed = new Date(dateRaw.replace(/(\d{2})[./](\d{2})[./](\d{4})/, '$3-$2-$1'));
      if (!isNaN(dateParsed.getTime())) {
        dateInscription = dateParsed.toISOString();
        console.log(`✅ Ligne ${lineNumber} - Date parsée avec succès:`, dateInscription);
      } else {
        console.warn(`⚠️ Ligne ${lineNumber} - Date invalide, utilisation de la date actuelle`);
        dateInscription = new Date().toISOString();
      }
    } catch (error) {
      console.warn(`⚠️ Ligne ${lineNumber} - Erreur parsing date:`, error);
      dateInscription = new Date().toISOString();
    }
  } else {
    console.warn(`⚠️ Ligne ${lineNumber} - Aucune date trouvée dans le CSV, utilisation de la date actuelle`);
    dateInscription = new Date().toISOString();
  }

  // Créer le client avec TOUS les champs du CSV
  const client: Client = {
    id: clientId,
    dateInscription: dateInscription,
    agentId: undefined, // À assigner manuellement
    splitAgent: 45, // Par défaut 45/55
    splitAgence: 55,
    email: email,
    prenom: prenom,
    nom: nom,
    telephone: telephone,
    adresse: findColumnValue(row, ['Adresse', 'Address', 'Rue']),
    dateNaissance: parseDate(findColumnValue(row, ['Date de naissance', 'Date naissance', 'Naissance', 'Birth date'])),
    nationalite: findColumnValue(row, ['Nationalité', 'Nationalite', 'Nationality']),
    typePermis: findColumnValue(row, ['Type de permis de séjour', 'Permis', 'Type permis', 'Permit']),
    etatCivil: findColumnValue(row, ['État civil', 'Etat civil', 'Etat civile', 'Statut civil']),
    geranceActuelle: findColumnValue(row, ['Gérance ou propriétaire actuel(le)', 'Gérance actuelle', 'Gerance', 'Gérance', 'Propriétaire/Gérance actuelle']),
    contactGerance: findColumnValue(row, ['Contact gérance', 'Contact gerance', 'Contact']),
    loyerActuel: loyerActuel,
    depuisLe: parseDate(findColumnValue(row, ['Depuis le', 'Depuis', 'Date debut'])),
    nombrePiecesActuel: parseNumber(findColumnValue(row, [
      'Nombre de pièces actuel', 'Pieces actuelles', 'Pieces', 'Nb pieces actuel', 'Nb de pcs actuel'
    ])),
    chargesExtraordinaires: parseBoolean(findColumnValue(row, [
      'Avez-vous des charges extraordinaires ? (Leasing, crédit, pension alimentaire, etc.',
      'Charges extraordinaires', 
      'Charges extra'
    ])),
    montantCharges: montantCharges,
    poursuites: parseBoolean(findColumnValue(row, [
      'Avez-vous des poursuites ou actes de défaut de biens ?',
      'Poursuites', 
      'Poursuite'
    ])),
    curatelle: parseBoolean(findColumnValue(row, [
      'Êtes-vous sous curatelle ?',
      'Curatelle'
    ])),
    motifChangement: findColumnValue(row, ['Motif du changement de domicile ?', 'Motif du changement de domicile', 'Motif changement', 'Motif', 'Raison changement']),
    profession: findColumnValue(row, ['Profession', 'Métier', 'Job', 'Emploi']),
    employeur: findColumnValue(row, ['Employeur', 'Employer', 'Entreprise']),
    revenuMensuel: revenuMensuel,
    dateEngagement: parseDate(findColumnValue(row, ['Date d\'engagement au poste', 'Date d\'engagement', 'Date engagement', 'Date embauche'])),
    nombreOccupants: parseNumber(findColumnValue(row, ['Combien de personnes occuperaient l\'appartement ?', 'Nombre d\'occupants', 'Nombre occupants', 'Occupants'])),
    utilisationLogement: findColumnValue(row, [
      'Utilisation du logement à titre',
      'Utilisation du logement', 
      'Utilisation', 
      'Usage'
    ]),
    animaux: parseBoolean(findColumnValue(row, ['Avez-vous des animaux ?', 'Animaux', 'Animal', 'Pets'])),
    instrumentMusique: parseBoolean(findColumnValue(row, ['Jouez-vous d\'un instrument de musique ? ', 'Instrument de musique', 'Instrument', 'Music'])),
    vehicules: parseBoolean(findColumnValue(row, ['Avez-vous un ou plusieurs véhicules ? ', 'Véhicules', 'Vehicules', 'Voiture', 'Vehicle'])),
    numeroPlaques: findColumnValue(row, ['Si oui, veuillez indiquer le numero de plaques ', 'Numéro plaques', 'Numero plaques', 'Plaque', 'Plate number']),
    decouverteAgence: findColumnValue(row, [
      'Comment avez-vous découvert notre agence ?',
      'Comment avez-vous découvert notre agence',
      'Decouverte', 
      'Comment nous avez vous connu'
    ]),
    typeRecherche: findColumnValue(row, [
      'Sélectionnez ce qui correspond',
      'Type recherche', 
      'Type', 
      'Recherche'
    ]) || 'Location',
    typeBien: findColumnValue(row, ['Type d\'objet', 'Type objet', 'Type bien', 'Property type']) || 'Appartement',
    nombrePiecesSouhaite: findColumnValue(row, ['Nb de pcs', 'Nombre de pieces', 'Pieces souhaitees', 'Rooms']) || '2.5',
    regions: regions,
    budgetMax: budgetMax,
    souhaitsParticuliers: findColumnValue(row, [
      'Souhait particulier concernant l\'étage, le quartier, la vue :',
      'Souhaits particuliers', 
      'Souhaits', 
      'Remarques', 
      'Notes'
    ]),
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
