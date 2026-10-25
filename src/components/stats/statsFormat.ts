/**
 * Format suisse des montants pour les statistiques (apostrophe droite pour les milliers, point décimal).
 * Copie conforme de nombreSuisse / chfSuisse de src/lib/montantSuisse.ts (branche fix/format-chf) :
 * à remplacer par un import de '@/lib/montantSuisse' une fois ce fichier présent sur la branche.
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

/** Graduation compacte d'un axe de montants : 950, 12k, 1.2M. */
export function axeSuisse(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${nombreSuisse(v / 1_000_000, a % 1_000_000 === 0 ? 0 : 1)}M`;
  if (a >= 1000) return `${nombreSuisse(v / 1000)}k`;
  return nombreSuisse(v);
}
