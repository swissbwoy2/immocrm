import { Shield } from 'lucide-react';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';

export default function Assurances() {
  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Assurances"
        subtitle="Vos polices d'assurance"
        icon={Shield}
      />
      <PremiumEmptyState
        icon={Shield}
        title="Module en construction"
        description="La gestion des assurances sera bientôt disponible."
      />
    </div>
  );
}
