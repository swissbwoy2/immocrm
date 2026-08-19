import { PremiumCandidatureCard } from '@/components/premium/PremiumCandidatureCard';

export default function RespoTest() {
  return (
    <div className="w-full max-w-full px-3 pt-4 sm:px-6 md:px-8">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <PremiumCandidatureCard
          offre={{ id: '1', adresse: "Chemin de l'Esparcette 5, 1023 Crissier", prix: 2450, pieces: 3.5, surface: 82, date_envoi: new Date().toISOString() }}
          statut="candidature_deposee"
          statutLabel="Inscription déposée"
          statutVariant="secondary"
          isExpanded={false}
          onToggle={() => {}}
          index={0}
        />
      </div>
    </div>
  );
}
