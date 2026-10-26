/**
 * Filtre par adresse partagé (Offres envoyées, Postulations, Suivi des offres).
 * Comparaison sans accents ni ponctuation, mots dans n'importe quel ordre :
 * « france 71 » trouve « Avenue de France 71 », « geneve » trouve « Genève ».
 */

/** Adresse sans accents ni ponctuation, en minuscules. */
export const normalizeAddress = (v: string | null | undefined): string =>
  (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Mots utiles de la recherche (2 lettres au moins, ou un numéro). */
export const addressWords = (v: string): string[] =>
  normalizeAddress(v).split(' ').filter((w) => w.length >= 2 || /^\d+$/.test(w));

/** Vrai si tous les mots de la recherche figurent dans l'adresse (aucun mot = tout passe). */
export const matchesAddress = (adresse: string | null | undefined, words: string[]): boolean => {
  if (!words.length) return true;
  const a = normalizeAddress(adresse);
  return words.every((w) => a.includes(w));
};

/**
 * Motifs ILIKE pour la base, un par mot : les voyelles et le « c » deviennent « _ » (un caractère quelconque)
 * pour trouver aussi les lettres accentuées ; le tri exact se fait ensuite avec matchesAddress.
 */
export const addressIlikePatterns = (words: string[]): string[] =>
  words.map((w) => `%${w.replace(/[\\%_]/g, '').replace(/[aeiouyc]/g, '_')}%`);
