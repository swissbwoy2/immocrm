/**
 * Critère partagé : le client peut-il prendre une décision (postuler / refuser)
 * sur une offre reçue ?
 *
 * Vrai si l'UNE de ces conditions est remplie :
 *  1. offre.statut === 'interesse'
 *  2. offre.statut ∈ ('visite_effectuee', 'candidature_deposee', 'souhaite_postuler')
 *  3. une visite liée a statut 'effectuee', une vidéo, ou un compte-rendu
 *  4. une visite liée a une date de visite déjà passée
 */

const DECIDABLE_STATUTS = new Set([
  'interesse',
  'visite_effectuee',
  'candidature_deposee',
  'souhaite_postuler',
]);

function visiteIndicatesDone(v: any): boolean {
  if (!v) return false;
  if (v.statut === 'effectuee') return true;
  if (v.video_url) return true;
  if (v.compte_rendu && (typeof v.compte_rendu !== 'object' || Object.keys(v.compte_rendu).length > 0)) return true;
  if (v.compte_rendu_at) return true;
  if (v.date_visite && new Date(v.date_visite).getTime() < Date.now()) return true;
  return false;
}

export function canDecideOnOffre(offre: any, relatedVisites: any[] = []): boolean {
  if (offre?.statut && DECIDABLE_STATUTS.has(offre.statut)) return true;
  return (relatedVisites || []).some(visiteIndicatesDone);
}

export { visiteIndicatesDone };
