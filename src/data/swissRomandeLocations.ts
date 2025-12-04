// Données géographiques de la Suisse Romande
export interface Location {
  name: string;
  type: 'canton' | 'district' | 'commune' | 'region';
  parent?: string;
  aliases: string[];
  coords: [number, number]; // [lng, lat]
}

export const SWISS_ROMANDE_LOCATIONS: Location[] = [
  // === CANTONS ===
  { name: 'Vaud', type: 'canton', aliases: ['VD', 'Canton de Vaud'], coords: [6.63, 46.52] },
  { name: 'Genève', type: 'canton', aliases: ['GE', 'Canton de Genève', 'Geneva'], coords: [6.14, 46.20] },
  { name: 'Valais', type: 'canton', aliases: ['VS', 'Canton du Valais', 'Wallis'], coords: [7.61, 46.33] },
  { name: 'Fribourg', type: 'canton', aliases: ['FR', 'Canton de Fribourg', 'Freiburg'], coords: [7.16, 46.81] },
  { name: 'Neuchâtel', type: 'canton', aliases: ['NE', 'Canton de Neuchâtel'], coords: [6.93, 46.99] },
  { name: 'Jura', type: 'canton', aliases: ['JU', 'Canton du Jura'], coords: [7.09, 47.37] },

  // === RÉGIONS VAUDOISES ===
  { name: 'Lausanne et région', type: 'region', parent: 'Vaud', aliases: ['Lausanne', 'Grand Lausanne', 'Lausannois'], coords: [6.63, 46.52] },
  { name: 'Nyon et région', type: 'region', parent: 'Vaud', aliases: ['Nyon', 'District de Nyon', 'La Côte'], coords: [6.24, 46.38] },
  { name: 'Ouest-lausannois', type: 'region', parent: 'Vaud', aliases: ['Ouest lausannois', 'Renens', 'Crissier', 'Ecublens', 'Prilly', 'Bussigny'], coords: [6.55, 46.53] },
  { name: 'Lavaux', type: 'region', parent: 'Vaud', aliases: ['Lavaux-Oron', 'District de Lavaux-Oron', 'Puidoux', 'Lutry', 'Cully'], coords: [6.75, 46.49] },
  { name: 'Riviera', type: 'region', parent: 'Vaud', aliases: ['Riviera-Pays-dEnhaut', 'Vevey', 'Montreux', 'La Tour-de-Peilz'], coords: [6.85, 46.45] },
  { name: 'Chablais', type: 'region', parent: 'Vaud', aliases: ['Aigle', 'District dAigle', 'Bex', 'Villeneuve', 'Leysin'], coords: [6.95, 46.32] },
  { name: 'Nord-vaudois', type: 'region', parent: 'Vaud', aliases: ['Nord vaudois', 'Yverdon', 'Yverdon-les-Bains', 'Grandson'], coords: [6.50, 46.78] },
  { name: 'Gros-de-Vaud', type: 'region', parent: 'Vaud', aliases: ['Gros de Vaud', 'Echallens', 'District du Gros-de-Vaud'], coords: [6.62, 46.65] },
  { name: 'Morges', type: 'region', parent: 'Vaud', aliases: ['District de Morges', 'Morges et région'], coords: [6.50, 46.51] },

  // === COMMUNES PRINCIPALES - VAUD ===
  // Lausanne et région
  { name: 'Lausanne', type: 'commune', parent: 'Lausanne et région', aliases: [], coords: [6.63, 46.52] },
  { name: 'Pully', type: 'commune', parent: 'Lausanne et région', aliases: [], coords: [6.66, 46.51] },
  { name: 'Prilly', type: 'commune', parent: 'Ouest-lausannois', aliases: [], coords: [6.60, 46.53] },
  { name: 'Renens', type: 'commune', parent: 'Ouest-lausannois', aliases: [], coords: [6.59, 46.54] },
  { name: 'Crissier', type: 'commune', parent: 'Ouest-lausannois', aliases: [], coords: [6.57, 46.55] },
  { name: 'Ecublens', type: 'commune', parent: 'Ouest-lausannois', aliases: ['Ecublens VD'], coords: [6.56, 46.53] },
  { name: 'Chavannes-près-Renens', type: 'commune', parent: 'Ouest-lausannois', aliases: ['Chavannes'], coords: [6.57, 46.53] },
  { name: 'Bussigny', type: 'commune', parent: 'Ouest-lausannois', aliases: ['Bussigny-près-Lausanne'], coords: [6.55, 46.55] },
  { name: 'Epalinges', type: 'commune', parent: 'Lausanne et région', aliases: [], coords: [6.67, 46.55] },
  { name: 'Le Mont-sur-Lausanne', type: 'commune', parent: 'Lausanne et région', aliases: ['Le Mont'], coords: [6.63, 46.56] },
  
  // Nyon et région
  { name: 'Nyon', type: 'commune', parent: 'Nyon et région', aliases: [], coords: [6.24, 46.38] },
  { name: 'Gland', type: 'commune', parent: 'Nyon et région', aliases: [], coords: [6.27, 46.42] },
  { name: 'Rolle', type: 'commune', parent: 'Nyon et région', aliases: [], coords: [6.34, 46.46] },
  { name: 'Coppet', type: 'commune', parent: 'Nyon et région', aliases: [], coords: [6.19, 46.31] },
  { name: 'Prangins', type: 'commune', parent: 'Nyon et région', aliases: [], coords: [6.25, 46.40] },
  { name: 'Commugny', type: 'commune', parent: 'Nyon et région', aliases: [], coords: [6.18, 46.32] },
  
  // Morges
  { name: 'Morges', type: 'commune', parent: 'Morges', aliases: [], coords: [6.50, 46.51] },
  { name: 'Tolochenaz', type: 'commune', parent: 'Morges', aliases: [], coords: [6.49, 46.49] },
  { name: 'Saint-Prex', type: 'commune', parent: 'Morges', aliases: ['St-Prex'], coords: [6.46, 46.48] },
  { name: 'Aubonne', type: 'commune', parent: 'Morges', aliases: [], coords: [6.39, 46.50] },
  { name: 'Etoy', type: 'commune', parent: 'Morges', aliases: [], coords: [6.42, 46.48] },
  
  // Riviera
  { name: 'Vevey', type: 'commune', parent: 'Riviera', aliases: [], coords: [6.84, 46.46] },
  { name: 'Montreux', type: 'commune', parent: 'Riviera', aliases: [], coords: [6.91, 46.43] },
  { name: 'La Tour-de-Peilz', type: 'commune', parent: 'Riviera', aliases: ['Tour de Peilz'], coords: [6.86, 46.45] },
  { name: 'Clarens', type: 'commune', parent: 'Riviera', aliases: [], coords: [6.89, 46.44] },
  { name: 'Corseaux', type: 'commune', parent: 'Riviera', aliases: [], coords: [6.82, 46.47] },
  { name: 'Corsier-sur-Vevey', type: 'commune', parent: 'Riviera', aliases: ['Corsier'], coords: [6.85, 46.47] },
  
  // Lavaux
  { name: 'Lutry', type: 'commune', parent: 'Lavaux', aliases: [], coords: [6.69, 46.50] },
  { name: 'Cully', type: 'commune', parent: 'Lavaux', aliases: [], coords: [6.73, 46.49] },
  { name: 'Puidoux', type: 'commune', parent: 'Lavaux', aliases: [], coords: [6.77, 46.49] },
  { name: 'Chexbres', type: 'commune', parent: 'Lavaux', aliases: [], coords: [6.78, 46.48] },
  { name: 'Grandvaux', type: 'commune', parent: 'Lavaux', aliases: [], coords: [6.71, 46.50] },
  
  // Chablais
  { name: 'Aigle', type: 'commune', parent: 'Chablais', aliases: [], coords: [6.97, 46.32] },
  { name: 'Bex', type: 'commune', parent: 'Chablais', aliases: [], coords: [7.01, 46.25] },
  { name: 'Villeneuve', type: 'commune', parent: 'Chablais', aliases: ['Villeneuve VD'], coords: [6.93, 46.40] },
  { name: 'Leysin', type: 'commune', parent: 'Chablais', aliases: [], coords: [7.01, 46.34] },
  { name: 'Monthey', type: 'commune', parent: 'Chablais', aliases: [], coords: [6.95, 46.25] },
  
  // Nord-vaudois
  { name: 'Yverdon-les-Bains', type: 'commune', parent: 'Nord-vaudois', aliases: ['Yverdon'], coords: [6.64, 46.78] },
  { name: 'Grandson', type: 'commune', parent: 'Nord-vaudois', aliases: [], coords: [6.65, 46.81] },
  { name: 'Ste-Croix', type: 'commune', parent: 'Nord-vaudois', aliases: ['Sainte-Croix'], coords: [6.50, 46.82] },
  { name: 'Orbe', type: 'commune', parent: 'Nord-vaudois', aliases: [], coords: [6.53, 46.72] },
  { name: 'Vallorbe', type: 'commune', parent: 'Nord-vaudois', aliases: [], coords: [6.38, 46.71] },
  
  // Gros-de-Vaud
  { name: 'Echallens', type: 'commune', parent: 'Gros-de-Vaud', aliases: [], coords: [6.63, 46.64] },
  { name: 'Assens', type: 'commune', parent: 'Gros-de-Vaud', aliases: [], coords: [6.65, 46.60] },
  { name: 'Bottens', type: 'commune', parent: 'Gros-de-Vaud', aliases: [], coords: [6.65, 46.60] },
  
  // === COMMUNES GENÈVE ===
  { name: 'Genève', type: 'commune', parent: 'Genève', aliases: ['Geneva', 'Ville de Genève'], coords: [6.14, 46.20] },
  { name: 'Carouge', type: 'commune', parent: 'Genève', aliases: [], coords: [6.14, 46.18] },
  { name: 'Lancy', type: 'commune', parent: 'Genève', aliases: ['Grand-Lancy', 'Petit-Lancy'], coords: [6.12, 46.18] },
  { name: 'Meyrin', type: 'commune', parent: 'Genève', aliases: [], coords: [6.08, 46.23] },
  { name: 'Vernier', type: 'commune', parent: 'Genève', aliases: [], coords: [6.08, 46.22] },
  { name: 'Onex', type: 'commune', parent: 'Genève', aliases: [], coords: [6.10, 46.18] },
  { name: 'Thônex', type: 'commune', parent: 'Genève', aliases: ['Thonex'], coords: [6.20, 46.19] },
  { name: 'Versoix', type: 'commune', parent: 'Genève', aliases: [], coords: [6.16, 46.28] },
  { name: 'Chêne-Bougeries', type: 'commune', parent: 'Genève', aliases: ['Chene-Bougeries'], coords: [6.19, 46.19] },
  { name: 'Plan-les-Ouates', type: 'commune', parent: 'Genève', aliases: [], coords: [6.12, 46.17] },
  { name: 'Bernex', type: 'commune', parent: 'Genève', aliases: [], coords: [6.07, 46.17] },
  { name: 'Satigny', type: 'commune', parent: 'Genève', aliases: [], coords: [6.03, 46.21] },
  
  // === COMMUNES VALAIS ===
  { name: 'Sion', type: 'commune', parent: 'Valais', aliases: ['Sitten'], coords: [7.36, 46.23] },
  { name: 'Martigny', type: 'commune', parent: 'Valais', aliases: [], coords: [7.07, 46.10] },
  { name: 'Sierre', type: 'commune', parent: 'Valais', aliases: ['Siders'], coords: [7.54, 46.29] },
  { name: 'Monthey', type: 'commune', parent: 'Valais', aliases: [], coords: [6.95, 46.25] },
  { name: 'Brig', type: 'commune', parent: 'Valais', aliases: ['Brigue', 'Brig-Glis'], coords: [7.99, 46.32] },
  { name: 'Visp', type: 'commune', parent: 'Valais', aliases: ['Viège'], coords: [7.88, 46.29] },
  { name: 'Zermatt', type: 'commune', parent: 'Valais', aliases: [], coords: [7.75, 46.02] },
  { name: 'Verbier', type: 'commune', parent: 'Valais', aliases: [], coords: [7.23, 46.10] },
  { name: 'Crans-Montana', type: 'commune', parent: 'Valais', aliases: ['Crans', 'Montana'], coords: [7.48, 46.31] },
  
  // === COMMUNES FRIBOURG ===
  { name: 'Fribourg', type: 'commune', parent: 'Fribourg', aliases: ['Ville de Fribourg', 'Freiburg'], coords: [7.16, 46.81] },
  { name: 'Bulle', type: 'commune', parent: 'Fribourg', aliases: [], coords: [7.06, 46.62] },
  { name: 'Villars-sur-Glâne', type: 'commune', parent: 'Fribourg', aliases: ['Villars-sur-Glane'], coords: [7.12, 46.79] },
  { name: 'Marly', type: 'commune', parent: 'Fribourg', aliases: [], coords: [7.16, 46.78] },
  { name: 'Romont', type: 'commune', parent: 'Fribourg', aliases: [], coords: [6.92, 46.70] },
  { name: 'Estavayer-le-Lac', type: 'commune', parent: 'Fribourg', aliases: ['Estavayer'], coords: [6.85, 46.85] },
  { name: 'Morat', type: 'commune', parent: 'Fribourg', aliases: ['Murten'], coords: [7.12, 46.93] },
  
  // === COMMUNES NEUCHÂTEL ===
  { name: 'Neuchâtel', type: 'commune', parent: 'Neuchâtel', aliases: ['Ville de Neuchâtel'], coords: [6.93, 46.99] },
  { name: 'La Chaux-de-Fonds', type: 'commune', parent: 'Neuchâtel', aliases: ['Chaux-de-Fonds'], coords: [6.83, 47.10] },
  { name: 'Le Locle', type: 'commune', parent: 'Neuchâtel', aliases: [], coords: [6.75, 47.06] },
  { name: 'Peseux', type: 'commune', parent: 'Neuchâtel', aliases: [], coords: [6.89, 46.98] },
  { name: 'Boudry', type: 'commune', parent: 'Neuchâtel', aliases: [], coords: [6.84, 46.95] },
  
  // === COMMUNES JURA ===
  { name: 'Delémont', type: 'commune', parent: 'Jura', aliases: [], coords: [7.35, 47.37] },
  { name: 'Porrentruy', type: 'commune', parent: 'Jura', aliases: [], coords: [7.08, 47.42] },
  { name: 'Saignelégier', type: 'commune', parent: 'Jura', aliases: [], coords: [7.06, 47.26] },
];

// Fonction pour normaliser une chaîne (accents, casse, espaces)
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction pour rechercher une location avec matching flexible
export function findLocation(query: string): Location | null {
  if (!query) return null;
  
  const normalizedQuery = normalizeString(query);
  
  // 1. Recherche exacte sur le nom
  let match = SWISS_ROMANDE_LOCATIONS.find(
    loc => normalizeString(loc.name) === normalizedQuery
  );
  if (match) return match;
  
  // 2. Recherche exacte sur les alias
  match = SWISS_ROMANDE_LOCATIONS.find(
    loc => loc.aliases.some(alias => normalizeString(alias) === normalizedQuery)
  );
  if (match) return match;
  
  // 3. Recherche partielle (le nom commence par la query)
  match = SWISS_ROMANDE_LOCATIONS.find(
    loc => normalizeString(loc.name).startsWith(normalizedQuery)
  );
  if (match) return match;
  
  // 4. Recherche partielle sur les alias
  match = SWISS_ROMANDE_LOCATIONS.find(
    loc => loc.aliases.some(alias => normalizeString(alias).startsWith(normalizedQuery))
  );
  if (match) return match;
  
  // 5. La query contient le nom de la location
  match = SWISS_ROMANDE_LOCATIONS.find(
    loc => normalizedQuery.includes(normalizeString(loc.name))
  );
  if (match) return match;
  
  // 6. La query contient un alias
  match = SWISS_ROMANDE_LOCATIONS.find(
    loc => loc.aliases.some(alias => normalizedQuery.includes(normalizeString(alias)))
  );
  if (match) return match;
  
  // 7. Le nom contient la query (fuzzy)
  match = SWISS_ROMANDE_LOCATIONS.find(
    loc => normalizeString(loc.name).includes(normalizedQuery)
  );
  if (match) return match;
  
  return null;
}

// Fonction pour obtenir les coordonnées d'une région (avec fallback hiérarchique)
export function getLocationCoords(regionName: string): [number, number] | null {
  const location = findLocation(regionName);
  
  if (location) {
    return location.coords;
  }
  
  // Essayer de parser des régions multiples (ex: "Lausanne et région, Ouest-lausannois")
  const parts = regionName.split(/[,;]/);
  for (const part of parts) {
    const partLocation = findLocation(part.trim());
    if (partLocation) {
      return partLocation.coords;
    }
  }
  
  return null;
}

// Fonction pour chercher des locations avec autocomplétion
export function searchLocations(query: string, limit: number = 10): Location[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = normalizeString(query);
  
  const results: { location: Location; score: number }[] = [];
  
  for (const loc of SWISS_ROMANDE_LOCATIONS) {
    const normalizedName = normalizeString(loc.name);
    let score = 0;
    
    // Exact match
    if (normalizedName === normalizedQuery) {
      score = 100;
    }
    // Starts with query
    else if (normalizedName.startsWith(normalizedQuery)) {
      score = 80;
    }
    // Alias exact match
    else if (loc.aliases.some(a => normalizeString(a) === normalizedQuery)) {
      score = 90;
    }
    // Alias starts with
    else if (loc.aliases.some(a => normalizeString(a).startsWith(normalizedQuery))) {
      score = 70;
    }
    // Contains query
    else if (normalizedName.includes(normalizedQuery)) {
      score = 50;
    }
    // Alias contains
    else if (loc.aliases.some(a => normalizeString(a).includes(normalizedQuery))) {
      score = 40;
    }
    
    if (score > 0) {
      // Boost regions and cantons
      if (loc.type === 'region') score += 5;
      if (loc.type === 'canton') score += 3;
      
      results.push({ location: loc, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.location);
}

// Obtenir l'icône du type de location
export function getLocationTypeIcon(type: Location['type']): string {
  switch (type) {
    case 'canton': return '🏛️';
    case 'district': return '📍';
    case 'region': return '🗺️';
    case 'commune': return '🏘️';
    default: return '📍';
  }
}

// Obtenir le label du type
export function getLocationTypeLabel(type: Location['type']): string {
  switch (type) {
    case 'canton': return 'Canton';
    case 'district': return 'District';
    case 'region': return 'Région';
    case 'commune': return 'Commune';
    default: return '';
  }
}
