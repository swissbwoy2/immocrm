import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { Card } from '@/components/ui/card';
import { Loader2, Banknote } from 'lucide-react';
import { AchatFinancingCard } from '@/components/achat/AchatFinancingCard';
import { AchatDocumentsChecklist } from '@/components/achat/AchatDocumentsChecklist';
import { FinancingEditorDialog } from '@/components/admin/purchase/PurchaseEditors';
import { CoAcheteursEditor } from '@/components/admin/purchase/CoAcheteursEditor';

export default function FinancementAchat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, project, financing, computed, settings, documents, updateFinancing, updateProject } = usePurchaseProject({ userId: user?.id || null });

  useEffect(() => {
    document.title = 'Financement | Immo-Rama';
  }, []);

  if (loading) {
    return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!project) {
    // Pas acheteur → renvoyer vers le dashboard client
    navigate('/client', { replace: true });
    return null;
  }

  return (
    <PremiumPageShellV2>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" /> Financement de votre projet d'achat
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capacité d'achat, fonds propres, statut bancaire et prochaines étapes.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <FinancingEditorDialog financing={financing} onSave={updateFinancing} />
      </div>

      <AchatFinancingCard computed={computed} settings={settings} statutBancaire={financing?.statut_bancaire} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CoAcheteursEditor
          title="Co-acquéreur(s)"
          value={(project as any).co_acheteurs || []}
          onSave={async (next) => { await updateProject({ co_acheteurs: next } as any); }}
        />
        <AchatDocumentsChecklist
          documents={documents}
          onUpload={() => navigate('/client/documents')}
        />
      </div>

      {!computed && (
        <Card className="p-6 mt-4 border-primary/20">
          <p className="text-sm text-muted-foreground">
            Votre profil de financement sera complété par votre conseiller après vos premiers échanges.
          </p>
        </Card>
      )}
    </PremiumPageShellV2>
  );
}
