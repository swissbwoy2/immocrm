import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { formatCHF } from '@/lib/purchaseFinancing';

import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumDashboardHeader } from '@/components/premium/PremiumDashboardHeader';
import { PremiumAgentCard } from '@/components/premium/PremiumAgentCard';
import { PremiumStatusCard } from '@/components/premium/PremiumStatusCard';
import { PremiumEmptyState } from '@/components/premium/PremiumEmptyState';
import { QuickTileXL } from '@/components/client/dashboard/QuickTileXL';
import { DernieresOffresKPI } from '@/components/client/dashboard/DernieresOffresKPI';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { MustChangePasswordBanner } from '@/components/MustChangePasswordBanner';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, Home, Building2, Banknote, FolderOpen, Calendar, MessageSquare, MapPin, Edit,
} from 'lucide-react';

import { AchatProgressionBar } from '@/components/achat/AchatProgressionBar';
import { AchatStepsTimeline } from '@/components/achat/AchatStepsTimeline';
import { AchatFinancingCard } from '@/components/achat/AchatFinancingCard';
import { AchatPropertiesList } from '@/components/achat/AchatPropertiesList';
import { AchatVisitReportsList } from '@/components/achat/AchatVisitReportsList';
import { AchatNegotiationCard } from '@/components/achat/AchatNegotiationCard';
import { AchatNotarySection } from '@/components/achat/AchatNotarySection';
import { AchatDocumentsSection } from '@/components/achat/AchatDocumentsSection';
import { AchatDocumentsChecklist } from '@/components/achat/AchatDocumentsChecklist';
import { FinancingEditorDialog } from '@/components/admin/purchase/PurchaseEditors';
import { CoAcheteursEditor } from '@/components/admin/purchase/CoAcheteursEditor';
import { EditClientProfileDialog } from '@/components/EditClientProfileDialog';
import { SwissRomandeMapGoogle } from '@/components/SwissRomandeMapGoogle';

interface DashboardAchatProps {
  profile?: { prenom?: string; nom?: string } | null;
}

const SELECTED_STATUTS = ['interesse', 'visite_planifiee', 'visite_effectuee', 'offre_envisagee'];

export default function DashboardAchat({ profile }: DashboardAchatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hook = usePurchaseProject({ userId: user?.id || null });
  const {
    loading, project, financing, computed, settings, properties, visitReports,
    negotiations, notary, steps, documents, agent, updateFinancing, updateProject, reload,
  } = hook;

  const [offres, setOffres] = useState<any[]>([]);
  const [clientRow, setClientRow] = useState<any | null>(null);
  const [profileRow, setProfileRow] = useState<any | null>(null);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    document.title = "Mon projet d'achat | Immo-Rama";
  }, []);

  const reloadClient = useCallback(async () => {
    if (!project?.client_id) return;
    const { data: c } = await supabase.from('clients').select('*').eq('id', project.client_id).maybeSingle();
    setClientRow(c);
    if (c?.user_id) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', c.user_id).maybeSingle();
      setProfileRow(p);
    }
  }, [project?.client_id]);

  const loadOffres = useCallback(async () => {
    if (!project?.client_id) return;
    const { data } = await supabase
      .from('offres')
      .select('*')
      .eq('client_id', project.client_id)
      .order('created_at', { ascending: false });
    setOffres(data || []);
    if (user?.id) {
      const { data: docs } = await supabase.from('documents').select('id, type_document').eq('user_id', user.id);
      setClientDocuments(docs || []);
    }
  }, [project?.client_id, user?.id]);

  useEffect(() => {
    void loadOffres();
    void reloadClient();
  }, [loadOffres, reloadClient]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([reload(), loadOffres(), reloadClient()]);
  }, [reload, loadOffres, reloadClient]);

  const stats = useMemo(() => {
    const selectionnes = offres.filter((o) => SELECTED_STATUTS.includes(o.statut));
    const nouveaux = offres.filter((o) => o.statut === 'envoyee');
    return {
      proposes: offres.length,
      selectionnes: selectionnes.length,
      nouveaux: nouveaux.length,
    };
  }, [offres]);

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <PremiumPageShellV2>
        <PremiumEmptyState
          icon={Home}
          title="Aucun projet d'achat actif"
          description="Aucun projet d'accompagnement à l'achat n'est encore associé à votre compte."
          action={
            <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => navigate('/accompagnement-achat')}>
              Découvrir l'accompagnement achat
            </Button>
          }
        />
      </PremiumPageShellV2>
    );
  }

  const stepsDone = steps.filter((s: any) => s.statut === 'fait').length;
  const dureeJours = Math.max(180, project.duree_progression_jours || 180);

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto relative">
        <FloatingParticles count={8} className="fixed inset-0 pointer-events-none z-0 opacity-20" />
        <PremiumPageShellV2 className="relative z-10">
          <MustChangePasswordBanner />

          <PremiumDashboardHeader
            userName={profile?.prenom}
            parcoursType="achat"
            isAcheteur
            messageCount={0}
            offerCount={stats.nouveaux}
            onMessagesClick={() => navigate('/client/messagerie')}
            onOffersClick={() => navigate('/client/biens-proposes')}
          />

          {/* Alerte : conseiller non assigné */}
          {!agent && (
            <div className="mb-6 animate-fade-in">
              <PremiumStatusCard
                variant="waiting"
                title="Conseiller en cours d'attribution"
                description="Un conseiller achat vous sera attribué très prochainement pour piloter votre recherche."
              />
            </div>
          )}

          {/* Progression du mandat achat (180 jours minimum) */}
          <div className="mb-6">
            <AchatProgressionBar
              dateDebut={project.date_debut_progression || project.created_at}
              dureeJours={dureeJours}
              stepsDone={stepsDone}
            />
          </div>

          {/* Derniers biens proposés */}
          <div className="mb-6">
            {offres.length > 0 ? (
              <DernieresOffresKPI
                offres={offres}
                onSeeAll={() => navigate('/client/biens-proposes')}
                onOffreClick={(id) => navigate(`/client/biens-proposes?offreId=${id}`)}
              />
            ) : (
              <Card className="p-2">
                <PremiumEmptyState
                  icon={Home}
                  title="Aucun bien proposé pour le moment"
                  description="Votre conseiller analyse le marché et vous proposera prochainement des biens correspondant à votre capacité d'achat."
                />
              </Card>
            )}
          </div>

          {/* Tuiles d'action */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
            <QuickTileXL
              icon={Home}
              title="Biens proposés"
              subtitle={stats.nouveaux > 0 ? `${stats.nouveaux} nouveau${stats.nouveaux > 1 ? 'x' : ''}` : `${stats.proposes} au total`}
              badge={stats.nouveaux || undefined}
              badgeVariant={stats.nouveaux > 0 ? 'destructive' : 'default'}
              onClick={() => navigate('/client/biens-proposes')}
              index={0}
            />
            <QuickTileXL
              icon={Building2}
              title="Biens sélectionnés"
              subtitle={`${stats.selectionnes} bien${stats.selectionnes > 1 ? 's' : ''}`}
              badge={stats.selectionnes || undefined}
              onClick={() => navigate('/client/biens-selectionnes')}
              index={1}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 mb-8">
            <QuickTileXL
              icon={Banknote}
              variant="wide"
              title="Ma capacité d'achat"
              subtitle={computed ? `Jusqu'à ${formatCHF(computed.capaciteAchatMax)}` : 'À évaluer avec votre conseiller'}
              onClick={() => navigate('/client/financement')}
              index={2}
            />
            <QuickTileXL
              icon={Calendar}
              variant="wide"
              title="Calendrier"
              subtitle="Vos visites et rendez-vous"
              onClick={() => navigate('/client/calendrier')}
              index={3}
            />
            <QuickTileXL
              icon={FolderOpen}
              variant="wide"
              title="Mon dossier"
              subtitle={`${clientDocuments.length} document${clientDocuments.length > 1 ? 's' : ''}`}
              onClick={() => navigate('/client/dossier')}
              index={4}
            />
            <QuickTileXL
              icon={MessageSquare}
              variant="wide"
              title="Messagerie"
              subtitle={agent ? `Votre conseiller : ${agent.prenom} ${agent.nom}` : 'Aucun conseiller assigné'}
              onClick={() => navigate('/client/messagerie')}
              index={5}
            />
            <QuickTileXL
              icon={MapPin}
              variant="wide"
              title="Carte des biens"
              subtitle="Visualiser les biens proposés"
              onClick={() => navigate('/client/carte')}
              index={6}
            />
          </div>

          {/* Financement + Conseiller */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" /> Modifier mon dossier
                </Button>
                <FinancingEditorDialog financing={financing} onSave={updateFinancing} />
              </div>
              <AchatFinancingCard computed={computed} settings={settings} statutBancaire={financing?.statut_bancaire} />
            </div>
            <div className="space-y-6">
              {agent ? (
                <PremiumAgentCard agent={agent as any} onMessage={() => navigate('/client/messagerie')} />
              ) : (
                <Card className="p-6">
                  <PremiumEmptyState
                    title="Aucun conseiller assigné"
                    description="Un conseiller achat vous sera bientôt attribué."
                  />
                </Card>
              )}
              <AchatDocumentsChecklist
                documents={clientDocuments}
                onUpload={() => navigate('/client/documents')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-6">
              {clientRow && <SwissRomandeMapGoogle client={clientRow} />}
              <CoAcheteursEditor
                title="Co-acquéreur(s)"
                value={(project as any).co_acheteurs || []}
                onSave={async (next) => { await updateProject({ co_acheteurs: next } as any); }}
              />
              <AchatPropertiesList properties={properties} />
              <AchatVisitReportsList reports={visitReports} properties={properties} />
              <AchatNegotiationCard negotiations={negotiations} />
              <AchatNotarySection notary={notary} />
            </div>
            <div className="space-y-6">
              <AchatStepsTimeline steps={steps} />
              <AchatDocumentsSection documents={documents} />
            </div>
          </div>

          {clientRow && profileRow && (
            <EditClientProfileDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              client={clientRow}
              profile={profileRow}
              onSaved={reloadClient}
            />
          )}
        </PremiumPageShellV2>
      </PullToRefresh>
    </>
  );
}
