import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployesList from '@/components/salaires/EmployesList';
import FichesSalaireList from '@/components/salaires/FichesSalaireList';
import CoutEmployeurDashboard from '@/components/salaires/CoutEmployeurDashboard';
import { Users, FileText, Calculator } from 'lucide-react';

export default function Salaires() {
  const [activeTab, setActiveTab] = useState('employes');

  return (
    <div className="relative p-4 md:p-8 space-y-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Gestion des salaires</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Employés, fiches de salaire et charges employeur
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employes" className="gap-2">
            <Users className="h-4 w-4" /> Employés
          </TabsTrigger>
          <TabsTrigger value="fiches" className="gap-2">
            <FileText className="h-4 w-4" /> Fiches de salaire
          </TabsTrigger>
          <TabsTrigger value="couts" className="gap-2">
            <Calculator className="h-4 w-4" /> Coût employeur
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employes">
          <EmployesList />
        </TabsContent>
        <TabsContent value="fiches">
          <FichesSalaireList />
        </TabsContent>
        <TabsContent value="couts">
          <CoutEmployeurDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
