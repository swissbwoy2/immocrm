import { FileText } from 'lucide-react';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';

export default function Baux() {
  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Baux"
        subtitle="Gestion des contrats de location"
        icon={FileText}
      />
      <PremiumEmptyState
        icon={FileText}
        title="Module en construction"
        description="La gestion des baux sera bientôt disponible."
      />
    </div>
  );
}
