/**
 * Critère partagé : le client peut-il prendre une décision (postuler / refuser)
 * sur une offre reçue ?
 *
 * Vrai si l'UNE de ces conditions est remplie :
 *  1. offre.statut ∈ ('visite_effectuee', 'candidature_deposee', 'souhaite_postuler')
 *  3. une visite liée a statut 'effectuee', une vidéo, ou un compte-rendu
 *  4. une visite réellement prévue (confirmée / planifiée par le client ou l'agent) dont la date est passée
 */

// 15.10.2026 : « intéressé » ne suffit plus — on ne postule qu'après une visite réellement faite.
const DECIDABLE_STATUTS = new Set([
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
  if (v.statut === 'annulee' || v.statut === 'refusee') return false;
  // Une date passée ne suffit plus : il faut une visite que le client a réellement prévue
  // (confirmée, planifiée par lui ou par l'agent). Les créneaux d'annonce des routines ne comptent pas,
  // et une visite déléguée n'est faite qu'avec son compte-rendu.
  if (v.date_visite && new Date(v.date_visite).getTime() < Date.now()) {
    if (v.est_deleguee) return false;
    if (v.statut === 'confirmee' || v.client_confirme_visite_at) return true;
    if (v.statut !== 'proposee' && v.source && ['planifiee_client', 'portail', 'manuel', 'manuelle', 'proposee_agent'].includes(v.source)) return true;
  }
  return false;
}

export function canDecideOnOffre(offre: any, relatedVisites: any[] = []): boolean {
  if (offre?.statut && DECIDABLE_STATUTS.has(offre.statut)) return true;
  return (relatedVisites || []).some(visiteIndicatesDone);
}

export { visiteIndicatesDone };

/**
 * Visite RÉELLE (pour les compteurs uniquement — ne change pas la décision du client).
 * Les routines enregistrent la date de visite affichée par chaque annonce comme une
 * visite « planifiée », même si le client n'a jamais dit oui : ce n'est qu'un créneau.
 * Est réelle une visite non annulée qui est déléguée, confirmée, effectuée, créée par
 * un humain ou le client, suivie d'une décision, ou liée à une offre que le client a
 * acceptée de visiter.
 */
const SOURCES_HUMAINES = new Set(['deleguee', 'planifiee_client', 'portail', 'manuel', 'manuelle', 'proposee_agent']);
const OFFRE_INTERESSEE = new Set([
  'interesse', 'visite_planifiee', 'visite_confirmee', 'visite_effectuee',
  'souhaite_postuler', 'candidature_deposee', 'acceptee',
]);

export function isVisiteReelle(v: any, offreStatut?: string | null): boolean {
  if (!v || v.statut === 'annulee') return false;
  if (v.est_deleguee) return true;
  if (v.coursier_id) return true;
  if (v.statut === 'confirmee' || v.statut === 'effectuee') return true;
  if (v.source && SOURCES_HUMAINES.has(v.source)) return true;
  if (v.client_decision) return true;
  if (offreStatut && OFFRE_INTERESSEE.has(offreStatut)) return true;
  return false;
}
