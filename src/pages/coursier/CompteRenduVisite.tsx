import CompteRenduVisite from "@/pages/agent/CompteRenduVisite";

/**
 * Compte-rendu de visite côté coursier.
 * Réutilise exactement l'écran agent/admin ; l'accès reste cloisonné
 * aux missions assignées au coursier via les policies RLS.
 */
export default function CoursierCompteRenduVisite() {
  return <CompteRenduVisite role="coursier" />;
}
