/**
 * Pièce d'identité attendue selon le type de permis :
 * - Permis B / C / F / N → permis de séjour (recto + verso)
 * - Suisse / autre        → carte d'identité (recto + verso)
 */
export function getIdentityKind(typePermis: string | undefined | null): 'permis_sejour' | 'piece_identite' {
  if (!typePermis) return 'piece_identite';
  return ['B', 'C', 'F', 'N'].includes(typePermis) ? 'permis_sejour' : 'piece_identite';
}
