import CompteRenduVisiteForm, { type CompteRenduRole } from "@/components/visites/CompteRenduVisiteForm";

/**
 * Page compte-rendu de visite (agent / admin / coursier).
 * Le formulaire est partagé : @/components/visites/CompteRenduVisiteForm
 */
export default function CompteRenduVisite(props: {
  role?: CompteRenduRole;
  visiteId?: string;
  embedded?: boolean;
  onSent?: () => void;
} = {}) {
  return <CompteRenduVisiteForm {...props} />;
}
