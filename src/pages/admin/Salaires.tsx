import { useState } from 'react';
import EmployesList from '@/components/salaires/EmployesList';
import FichesSalaireList from '@/components/salaires/FichesSalaireList';
import CoutEmployeurDashboard from '@/components/salaires/CoutEmployeurDashboard';
import { DashPage, DashPageHeader, DashFilterPills } from '@/components/client/dashboard/DashPrimitives';

type Onglet = 'fiches' | 'employes' | 'couts';

/**
 * Salaires — trois vues : les fiches du mois (ce qu'il faut préparer, valider, payer),
 * les employés, et le coût employeur de la période. Les fiches du mois sont l'onglet par défaut.
 */
export default function Salaires() {
  const [activeTab, setActiveTab] = useState<Onglet>('fiches');

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Gestion des salaires"
        subtitle="Employés, fiches de salaire et charges employeur"
      />

      <DashFilterPills
        label="Sections des salaires"
        value={activeTab}
        onChange={(v) => setActiveTab(v as Onglet)}
        options={[
          { key: 'fiches', label: 'Fiches de salaire' },
          { key: 'employes', label: 'Employés' },
          { key: 'couts', label: 'Coût employeur' },
        ]}
      />

      {activeTab === 'employes' && <EmployesList />}
      {activeTab === 'fiches' && <FichesSalaireList />}
      {activeTab === 'couts' && <CoutEmployeurDashboard />}
    </DashPage>
  );
}
