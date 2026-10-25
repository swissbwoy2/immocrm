import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { useClientParcours } from '@/hooks/useClientParcours';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { AchatFinancingCard } from '@/components/achat/AchatFinancingCard';
import { AchatDocumentsChecklist } from '@/components/achat/AchatDocumentsChecklist';
import { FinancingEditorDialog } from '@/components/admin/purchase/PurchaseEditors';
import { CoAcheteursEditor } from '@/components/admin/purchase/CoAcheteursEditor';
import { DASH_CARD, DashSection } from '@/components/client/dashboard/DashPrimitives';

/** Financement du projet d'achat : capacité, fonds propres, co-acquéreurs et documents bancaires. */
export default function FinancementAchat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, project, financing, computed, settings, documents, updateFinancing, updateProject } = usePurchaseProject({ userId: user?.id || null });

  const parcours = useClientParcours();
  const [userDocuments, setUserDocuments] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Financement | Immo-Rama';
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('documents').select('id, type_document').eq('user_id', user.id)
      .then(({ data }) => setUserDocuments(data || []));
  }, [user?.id]);

  // Même règle que le tableau de bord : documents du projet + documents déposés par le client, sans doublon.
  const tousDocuments = useMemo(() => {
    const byId = new Map<string, any>();
    [...(documents || []), ...userDocuments].forEach((d: any) => { if (d?.id) byId.set(d.id, d); });
    return Array.from(byId.values());
  }, [documents, userDocuments]);

  // Page réservée au parcours achat : un compte location retourne à son accueil.
  if (parcours !== null && parcours !== 'achat') return <Navigate to="/client" replace />;

  if (loading || parcours === null) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Acheteur sans projet d'achat activé : on explique au lieu de renvoyer à l'accueil (onglet jamais « mort »).
  if (!project) {
    return (
      <div className="relative flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[28px]">Mon financement</h1>
          <div className={`${DASH_CARD} mt-5 p-6 text-center`}>
            <p className="font-semibold text-foreground">Votre projet d'achat n'est pas encore activé</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Dès l'activation de votre mandat d'achat, vous retrouverez ici votre capacité d'achat, vos fonds propres et vos co-acquéreurs.
            </p>
            <Button className="mt-4 rounded-full" onClick={() => navigate('/client')}>Retour à l'accueil</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:px-8 md:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[28px]">Mon financement</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">Capacité d'achat, fonds propres, statut bancaire et co-acquéreurs.</p>
          </div>
          <FinancingEditorDialog financing={financing} onSave={updateFinancing} />
        </header>

        <AchatFinancingCard computed={computed} settings={settings} statutBancaire={financing?.statut_bancaire} />

        {!computed && (
          <p className={`${DASH_CARD} p-4 text-sm text-muted-foreground`}>
            Votre profil de financement sera complété avec votre conseiller après vos premiers échanges.
          </p>
        )}

        <DashSection title="Co-acquéreurs et documents bancaires">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CoAcheteursEditor
              title="Co-acquéreur(s)"
              value={(project as any).co_acheteurs || []}
              onSave={async (next) => { await updateProject({ co_acheteurs: next } as any); }}
            />
            <AchatDocumentsChecklist documents={tousDocuments} onUpload={() => navigate('/client/documents')} />
          </div>
        </DashSection>
      </div>
    </div>
  );
}
