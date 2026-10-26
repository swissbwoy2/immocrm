/**
 * Montants au format suisse, identiques sur tous les navigateurs :
 * apostrophe droite pour les milliers et point décimal (ex. « 12'400.50 »).
 * (Intl 'fr-CH' / 'de-CH' donne des espaces ou des apostrophes typographiques selon le navigateur.)
 */
export function nombreSuisse(n: number | null | undefined, decimales = 0): string {
  const v = Number(n) || 0;
  const [entier, dec] = Math.abs(v).toFixed(decimales).split('.');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${v < 0 ? '-' : ''}${groupe}${dec ? `.${dec}` : ''}`;
}

/** « CHF 12'400 » (ou « CHF 12'400.50 » avec décimales). */
export function chfSuisse(n: number | null | undefined, decimales = 0): string {
  return `CHF ${nombreSuisse(n, decimales)}`;
}
