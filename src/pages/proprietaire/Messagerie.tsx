import { MessageSquare } from 'lucide-react';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';

export default function Messagerie() {
  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Messagerie"
        subtitle="Échanges avec votre agent"
        icon={MessageSquare}
      />
      <PremiumEmptyState
        icon={MessageSquare}
        title="Module en construction"
        description="La messagerie sera bientôt disponible."
      />
    </div>
  );
}
