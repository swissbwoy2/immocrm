import { Calendar } from 'lucide-react';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';

export default function Calendrier() {
  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Calendrier"
        subtitle="Échéances et rendez-vous"
        icon={Calendar}
      />
      <PremiumEmptyState
        icon={Calendar}
        title="Module en construction"
        description="Le calendrier sera bientôt disponible."
      />
    </div>
  );
}
