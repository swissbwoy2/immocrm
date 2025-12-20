import { Landmark } from 'lucide-react';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';

export default function Hypotheques() {
  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Hypothèques"
        subtitle="Suivi de vos financements"
        icon={Landmark}
      />
      <PremiumEmptyState
        icon={Landmark}
        title="Module en construction"
        description="La gestion des hypothèques sera bientôt disponible."
      />
    </div>
  );
}
