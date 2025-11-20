import { Client } from '@/data/mockData';

export interface Match {
  clientId: string;
  client: Client;
  propertyDescription: string;
  propertyDetails: {
    localisation: string;
    prix: number;
    nombrePieces: number;
    surface: number;
    region: string;
  };
  score: number;
  date: Date;
}

interface Property {
  localisation: string;
  prix: number;
  nombrePieces: number;
  surface: number;
  region: string;
  type: string;
  animauxAutorises?: boolean;
}

export function calculateMatchScore(client: Client, property: Property): number {
  let score = 0;
  
  // Budget (30 points)
  if (property.prix <= client.budgetMax) {
    score += 30;
  } else if (property.prix <= client.budgetMax * 1.1) {
    // Tolérance de 10%
    score += 15;
  }
  
  // Région (25 points)
  if (client.regions.some(r => property.region.toLowerCase().includes(r.toLowerCase()))) {
    score += 25;
  }
  
  // Nombre de pièces (20 points)
  const piecesRange = client.nombrePiecesSouhaite.split('-');
  const piecesMin = parseFloat(piecesRange[0]);
  const piecesMax = piecesRange.length > 1 ? parseFloat(piecesRange[1]) : piecesMin + 1;
  
  if (property.nombrePieces >= piecesMin && property.nombrePieces <= piecesMax + 1) {
    score += 20;
  } else if (property.nombrePieces >= piecesMin - 0.5) {
    score += 10;
  }
  
  // Type de bien (15 points)
  if (client.typeBien.toLowerCase() === property.type.toLowerCase()) {
    score += 15;
  }
  
  // Animaux (10 points)
  if (!client.animaux || property.animauxAutorises) {
    score += 10;
  }
  
  return score;
}

export function findTopMatches(clients: Client[], properties: Property[], limit: number = 3): Match[] {
  const matches: Match[] = [];
  
  clients.forEach(client => {
    properties.forEach(property => {
      const score = calculateMatchScore(client, property);
      if (score >= 70) { // Seuil de 70%
        matches.push({
          clientId: client.id,
          client,
          propertyDescription: `${property.localisation} - ${property.prix.toLocaleString('fr-CH')} CHF`,
          propertyDetails: {
            localisation: property.localisation,
            prix: property.prix,
            nombrePieces: property.nombrePieces,
            surface: property.surface,
            region: property.region,
          },
          score,
          date: new Date(),
        });
      }
    });
  });
  
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Propriétés fictives pour le matching (en attendant une vraie base de données)
export const mockProperties: Property[] = [
  {
    localisation: 'Rue de la Paix 12, Lausanne',
    prix: 2400,
    nombrePieces: 4.5,
    surface: 95,
    region: 'Lausanne',
    type: 'Appartement',
    animauxAutorises: false,
  },
  {
    localisation: 'Avenue des Roses 8, Renens',
    prix: 2100,
    nombrePieces: 3.5,
    surface: 80,
    region: 'Renens',
    type: 'Appartement',
    animauxAutorises: true,
  },
  {
    localisation: 'Chemin du Lac 45, Pully',
    prix: 2800,
    nombrePieces: 4.5,
    surface: 110,
    region: 'Pully',
    type: 'Appartement',
    animauxAutorises: false,
  },
  {
    localisation: 'Rue du Centre 23, Prilly',
    prix: 1800,
    nombrePieces: 2.5,
    surface: 65,
    region: 'Prilly',
    type: 'Appartement',
    animauxAutorises: true,
  },
  {
    localisation: 'Avenue de la Gare 17, Lausanne',
    prix: 2200,
    nombrePieces: 3.5,
    surface: 85,
    region: 'Lausanne',
    type: 'Appartement',
    animauxAutorises: true,
  },
  {
    localisation: 'Chemin des Fleurs 9, Epalinges',
    prix: 1750,
    nombrePieces: 3.5,
    surface: 75,
    region: 'Epalinges',
    type: 'Appartement',
    animauxAutorises: false,
  },
];
