import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Banknote, Calendar, FileText, FolderOpen, Home, Loader2, MessageSquare,
  SlidersHorizontal, User, UserPlus, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { parseZones, formatZones } from '@/lib/buyerProfile';
import { isVisiteReelle } from '@/lib/visitDecision';
import { ACHAT_A_REPONDRE, ACHAT_EN_COURS, ACHAT_STATUT_COURT, chargerVisitesAchat, estPrixDAchat, formatPrixAchat } from '@/lib/achatOffreActions';

import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumDashboardHeader } from '@/components/premium/PremiumDashboardHeader';
import { PremiumAgentCard } from '@/components/premium/PremiumAgentCard';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { MustChangePasswordBanner } from '@/components/MustChangePasswordBanner';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';
import { MesVisitesAVenirBand } from '@/components/client/dashboard/MesVisitesAVenirBand';
import { DASH_CARD, DashSection, DashSectionLink, LinkRow, StatTile, TodoCard } from '@/components/client/dashboard/DashPrimitives';
import { AchatOffrePhoto, etapeAchat } from '@/components/achat/offres/AchatOffreParts';

import { AchatProgressionBar } from '@/components/achat/AchatProgressionBar';
import { AchatSuiviCompteurs } from '@/components/achat/AchatSuiviCompteurs';
import { AchatStepsTimeline } from '@/components/achat/AchatStepsTimeline';
import { AchatFinancingCard } from '@/components/achat/AchatFinancingCard';
import { AchatPropertiesList } from '@/components/achat/AchatPropertiesList';
import { AchatVisitReportsList } from '@/components/achat/AchatVisitReportsList';
import { AchatNegotiationCard } from '@/components/achat/AchatNegotiationCard';
import { AchatNotarySection } from '@/components/achat/AchatNotarySection';
import { AchatDocumentsChecklist, ACHAT_REQUIRED_DOCUMENTS, compterDocumentsAchat } from '@/components/achat/AchatDocumentsChecklist';
import { FinancingEditorDialog } from '@/components/admin/purchase/PurchaseEditors';
import { EditClientProfileDialog } from '@/components/EditClientProfileDialog';

interface DashboardAchatProps {
  profile?: { prenom?: string; nom?: string } | null;
}

const DUREE_MIN_JOURS = 180;

/**
 * Tableau de bord du parcours ACHAT — même ossature que le tableau de bord location :
 * À faire → Ma recherche → Mon financement → Mon dossier → Mon mandat et mon conseiller
 * → Avancement de mon achat → Mes statistiques.
 */
export default function DashboardAchat({ profile }: DashboardAchatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { counts } = useNotifications();
  const {
    loading, project, financing, computed, settings, properties, visitReports,
    negotiations, notary, steps, documents: projectDocuments, agent, updateFinancing, reload,
  } = usePurchaseProject({ userId: user?.id || null });

  const [offres, setOffres] = useState<any[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [clientRow, setClientRow] = useState<any | null>(null);
  const [profileRow, setProfileRow] = useState<any | null>(null);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    document.title = "Mon projet d'achat | Immo-Rama";
  }, []);

  const loadClient = useCallback(async () => {
    if (!project?.client_id) return;
    const { data: c } = await supabase.from('clients').select('*').eq('id', project.client_id).maybeSingle();
    setClientRow(c);
    if (c?.user_id) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', c.user_id).maybeSingle();
      setProfileRow(p);
    }
  }, [project?.client_id]);

  const loadActivite = useCallback(async () => {
    if (!project?.client_id) return;
    const [{ data: o }, { data: v }] = await Promise.all([
      supabase.from('offres').select('*').eq('client_id', project.client_id).order('date_envoi', { ascending: false }),
      chargerVisitesAchat(project.client_id, '*, offres(*)').then((data) => ({ data })),
    ]);
    // Seulement les biens à vendre (un client peut aussi louer : ses locations ont leur propre espace).
    setOffres((o || []).filter((x: any) => estPrixDAchat(x.prix)));
    setVisites(v || []);
    if (user?.id) {
      const { data: docs } = await supabase.from('documents').select('id, type_document').eq('user_id', user.id);
      setUserDocuments(docs || []);
    }
  }, [project?.client_id, user?.id]);

  useEffect(() => {
    void loadActivite();
    void loadClient();
  }, [loadActivite, loadClient]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([reload(), loadActivite(), loadClient()]);
  }, [reload, loadActivite, loadClient]);

  // Documents du dossier : ceux rattachés au projet d'achat + ceux déposés par le client (sans doublon).
  const documents = useMemo(() => {
    const byId = new Map<string, any>();
    [...(projectDocuments || []), ...userDocuments].forEach((d: any) => { if (d?.id) byId.set(d.id, d); });
    return Array.from(byId.values());
  }, [projectDocuments, userDocuments]);

  const stats = useMemo(() => {
    const now = Date.now();
    const statutOffre = new Map<string, string>(offres.map((o) => [o.id, o.statut]));
    const visitesAVenir = visites.filter((v) =>
      ['planifiee', 'confirmee'].includes(v.statut) &&
      v.date_visite && new Date(v.date_visite).getTime() >= now &&
      isVisiteReelle(v, v.offre_id ? statutOffre.get(v.offre_id) : null),
    ).length;
    const aRepondre = offres.filter((o) => ACHAT_A_REPONDRE.includes(o.statut)).length;
    const enCours = offres.filter((o) => ACHAT_EN_COURS.includes(o.statut)).length;
    const apresVisite = offres.filter((o) =>
      etapeAchat(o, visites.filter((v) => v.offre_id === o.id)) === 'apres_visite',
    ).length;
    const docsComplets = ACHAT_REQUIRED_DOCUMENTS.filter((req) => compterDocumentsAchat(req, documents) >= req.count).length;
    return { visitesAVenir, aRepondre, enCours, apresVisite, docsComplets };
  }, [offres, visites, documents]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <PremiumPageShellV2 className="mx-auto w-full max-w-6xl">
        <TodoCard
          icon={Home}
          tone="muted"
          title="Aucun projet d'achat actif"
          description="Aucun projet d'accompagnement à l'achat n'est encore associé à votre compte."
          action={<Button className="rounded-full" onClick={() => navigate('/accompagnement-achat')}>Découvrir l'accompagnement achat</Button>}
        />
      </PremiumPageShellV2>
    );
  }

  const stepsDone = steps.filter((s: any) => s.statut === 'fait').length;
  const dureeJours = Math.max(DUREE_MIN_JOURS, project.duree_progression_jours || DUREE_MIN_JOURS);
  const debut = project.date_debut_progression || project.date_signature_mandat || project.created_at;
  const joursEcoules = debut ? Math.floor((Date.now() - new Date(debut).getTime()) / 86400000) : 0;
  const joursRestants = dureeJours - joursEcoules;
  const derniersBiens = offres.filter((o) => o.statut !== 'refusee').slice(0, 6);
  const criteres = parseZones(clientRow?.region_recherche);
  const totalDocs = ACHAT_REQUIRED_DOCUMENTS.length;
  // Projet finalisé (clés remises) ou arrêté : plus de compte à rebours ni de tâches de recherche.
  const finalise = ['reussi', 'cloture'].includes(project.statut);
  const arrete = project.statut === 'annule';
  const enPause = project.statut === 'en_pause';
  const enCoursDeRecherche = !finalise && !arrete;
  const offreAcceptee = negotiations.some((n: any) => n.statut === 'acceptee');
  const aFaire = enCoursDeRecherche && (!agent || stats.aRepondre > 0 || stats.apresVisite > 0 || stats.docsComplets < totalDocs || !computed || joursRestants <= 30 || enPause);

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="relative flex-1 overflow-y-auto">
        <PremiumPageShellV2 className="relative z-10 mx-auto w-full max-w-6xl">
          <MustChangePasswordBanner />

          {/* 1. Accueil */}
          <SectionErrorBoundary sectionName="DashboardAchatHeader">
            <PremiumDashboardHeader
              userName={profile?.prenom}
              parcoursType="achat"
              isAcheteur
              messageCount={counts.new_message}
              offerCount={stats.aRepondre}
              onMessagesClick={() => navigate('/client/messagerie')}
              onOffersClick={() => navigate('/client/biens-proposes')}
            />
          </SectionErrorBoundary>

          <DashboardAdBanner />

          {/* Fin du parcours */}
          {finalise && (
            <TodoCard
              icon={CheckCircle2}
              tone="primary"
              title="Félicitations, votre achat est finalisé !"
              description={notary?.date_remise_cles
                ? `Clés remises le ${new Date(notary.date_remise_cles).toLocaleDateString('fr-CH')}. Toute l'équipe Immo-Rama vous souhaite beaucoup de bonheur dans votre nouveau bien.`
                : "Toute l'équipe Immo-Rama vous souhaite beaucoup de bonheur dans votre nouveau bien."}
            />
          )}
          {arrete && (
            <TodoCard
              icon={AlertTriangle}
              tone="muted"
              title="Votre accompagnement achat est arrêté"
              description="Pour toute question ou pour reprendre votre projet, écrivez à votre conseiller."
              action={<Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/client/messagerie')}>Écrire à mon conseiller</Button>}
            />
          )}

          {/* 2. À faire */}
          {aFaire && (
            <div className="space-y-3">
              {enPause && (
                <TodoCard
                  icon={AlertTriangle}
                  tone="muted"
                  title="Votre accompagnement achat est en pause"
                  description="Votre conseiller reste à votre disposition pour le reprendre."
                  action={<Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/client/messagerie')}>Contacter mon conseiller</Button>}
                />
              )}
              {stats.aRepondre > 0 && (
                <TodoCard
                  icon={Home}
                  tone="primary"
                  title={`${stats.aRepondre} bien${stats.aRepondre > 1 ? 's attendent' : ' attend'} votre réponse`}
                  description="Dites à votre conseiller si le bien vous intéresse : il organise la visite avec le vendeur."
                  action={<Button size="sm" className="rounded-full" onClick={() => navigate('/client/biens-proposes?filtre=a_repondre')}>Répondre</Button>}
                />
              )}
              {stats.apresVisite > 0 && (
                <TodoCard
                  icon={Banknote}
                  tone="primary"
                  title="Après votre visite, souhaitez-vous faire une offre ?"
                  description={`${stats.apresVisite} bien${stats.apresVisite > 1 ? 's visités attendent' : ' visité attend'} votre décision.`}
                  action={<Button size="sm" className="rounded-full" onClick={() => navigate('/client/biens-proposes?filtre=en_cours')}>Donner suite</Button>}
                />
              )}
              {!agent && (
                <TodoCard
                  icon={User}
                  tone="muted"
                  title="Conseiller en cours d'attribution"
                  description="Un conseiller achat vous sera attribué très prochainement pour piloter votre recherche."
                />
              )}
              {!computed && (
                <TodoCard
                  icon={Banknote}
                  title="Faites évaluer votre capacité d'achat"
                  description="Renseignez vos revenus et fonds propres : votre conseiller cible alors les biens finançables."
                  action={<Button size="sm" className="rounded-full" onClick={() => navigate('/client/financement')}>Mon financement</Button>}
                />
              )}
              {stats.docsComplets < totalDocs && (
                <TodoCard
                  icon={FileText}
                  title={`Dossier acheteur : ${stats.docsComplets}/${totalDocs} documents`}
                  description="Complétez votre dossier pour obtenir l'accord bancaire et présenter une offre solide."
                  action={<Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/client/documents')}>Ajouter mes documents</Button>}
                />
              )}
              {joursRestants <= 30 && !enPause && !offreAcceptee && (
                <TodoCard
                  icon={AlertTriangle}
                  title={joursRestants > 0 ? `Votre mandat d'achat se termine dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}` : "Votre mandat d'achat est arrivé à échéance"}
                  description="Parlez-en avec votre conseiller pour le prolonger et poursuivre votre recherche."
                  action={<Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/client/messagerie')}>Contacter mon conseiller</Button>}
                />
              )}
            </div>
          )}

          {/* 3. Ma recherche */}
          <DashSection title="Ma recherche">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatTile
                icon={Home}
                label="Biens proposés"
                value={stats.aRepondre > 0 ? `${stats.aRepondre} à traiter` : `${offres.length} au total`}
                count={stats.aRepondre}
                onClick={() => navigate('/client/biens-proposes')}
              />
              <StatTile
                icon={CheckCircle2}
                label="En cours"
                value={stats.enCours > 0 ? `${stats.enCours} bien${stats.enCours > 1 ? 's' : ''}` : 'Aucun'}
                count={stats.apresVisite}
                onClick={() => navigate('/client/biens-proposes?filtre=en_cours')}
              />
              <StatTile
                icon={Calendar}
                label="Agenda"
                value={stats.visitesAVenir > 0 ? `${stats.visitesAVenir} à venir` : 'Aucune prévue'}
                count={stats.visitesAVenir}
                onClick={() => navigate('/client/calendrier')}
              />
            </div>

            {derniersBiens.length > 0 ? (
              <div className={`${DASH_CARD} p-4 md:p-5`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">Derniers biens proposés</h3>
                  <DashSectionLink label="Tout voir" onClick={() => navigate('/client/biens-proposes')} />
                </div>
                <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {derniersBiens.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => navigate(`/client/biens-proposes?offre=${o.id}`)}
                      className="w-[220px] shrink-0 snap-start overflow-hidden rounded-xl border border-border/70 text-left transition-transform duration-150 active:scale-[0.98]"
                    >
                      <div className="relative">
                        <AchatOffrePhoto offre={o} />
                        <span className="absolute left-2 top-2 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {ACHAT_STATUT_COURT[o.statut] ?? 'Bien'}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{o.adresse || o.titre || 'Bien proposé'}</p>
                        <p className="text-xs text-muted-foreground">{formatPrixAchat(o.prix) ?? 'Prix à confirmer'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`${DASH_CARD} p-5 text-center`}>
                <p className="font-semibold text-foreground">Aucun bien proposé pour le moment</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Votre conseiller recherche, sur le marché et hors marché, les biens adaptés à votre projet et à votre capacité d'achat.
                </p>
              </div>
            )}

            <SectionErrorBoundary sectionName="AchatVisitesAVenir">
              <MesVisitesAVenirBand visites={visites} />
            </SectionErrorBoundary>
          </DashSection>

          {/* 4. Mon financement */}
          <DashSection title="Mon financement" action={<DashSectionLink label="Détail" onClick={() => navigate('/client/financement')} />}>
            <SectionErrorBoundary sectionName="AchatFinancing">
              <AchatFinancingCard computed={computed} settings={settings} statutBancaire={financing?.statut_bancaire} />
            </SectionErrorBoundary>
            <div className="flex flex-wrap justify-end gap-2">
              <FinancingEditorDialog financing={financing} onSave={updateFinancing} mode="client" />
            </div>
          </DashSection>

          {/* 5. Mon dossier */}
          <DashSection title="Mon dossier" action={<DashSectionLink onClick={() => navigate('/client/dossier')} />}>
            <SectionErrorBoundary sectionName="AchatDossier">
              <AchatDocumentsChecklist documents={documents} onUpload={() => navigate('/client/documents')} compact />
            </SectionErrorBoundary>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <LinkRow
                icon={SlidersHorizontal}
                label="Mes critères d'achat"
                sub={criteres.length > 0 ? formatZones(criteres) : 'Villes, pièces, budget — à compléter'}
                onClick={() => setEditOpen(true)}
              />
              <LinkRow
                icon={FolderOpen}
                label="Mes documents"
                sub={`${documents.length} document${documents.length > 1 ? 's' : ''}`}
                onClick={() => navigate('/client/documents')}
              />
              <LinkRow
                icon={UserPlus}
                label="Co-acquéreur(s)"
                sub="Ajouter ou modifier"
                onClick={() => navigate('/client/financement')}
              />
              <LinkRow
                icon={FileText}
                label="Mon mandat d'achat"
                sub="Contrat, conditions et progression"
                onClick={() => navigate('/client/dossier')}
              />
            </div>
          </DashSection>

          {/* 6. Mon mandat et mon conseiller */}
          <DashSection title="Mon mandat et mon conseiller">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionErrorBoundary sectionName="AchatProgression">
                {finalise || arrete ? (
                  <div className={`${DASH_CARD} p-5`}>
                    <p className="text-sm text-muted-foreground">Mandat d'achat</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{finalise ? 'Mission accomplie' : 'Arrêté'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stepsDone}/{steps.length} étapes franchies</p>
                  </div>
                ) : (
                  <AchatProgressionBar dateDebut={debut} dureeJours={dureeJours} stepsDone={stepsDone} />
                )}
              </SectionErrorBoundary>
              {agent ? (
                <PremiumAgentCard agent={agent as any} onMessage={() => navigate('/client/messagerie')} />
              ) : (
                <div className={`${DASH_CARD} p-6 text-center`}>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <User className="h-7 w-7 text-muted-foreground" />
                  </span>
                  <p className="mt-3 font-semibold text-foreground">Aucun conseiller assigné</p>
                  <p className="mt-1 text-sm text-muted-foreground">Un conseiller achat vous sera bientôt attribué.</p>
                  <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/client/messagerie')}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Écrire à l'équipe
                  </Button>
                </div>
              )}
            </div>
          </DashSection>

          {/* 7. Avancement de mon achat */}
          <DashSection title="Avancement de mon achat">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {properties.length > 0 && <AchatPropertiesList properties={properties} />}
                <AchatVisitReportsList reports={visitReports} properties={properties} />
                <AchatNegotiationCard negotiations={negotiations} />
                {(notary || offreAcceptee) && <AchatNotarySection notary={notary} />}
              </div>
              <div>
                <AchatStepsTimeline steps={steps} />
              </div>
            </div>
          </DashSection>

          {/* 8. Statistiques */}
          <DashSection title="Mes statistiques">
            <SectionErrorBoundary sectionName="AchatStats">
              <AchatSuiviCompteurs clientId={project.client_id} projectId={project.id} dateDebut={debut} />
            </SectionErrorBoundary>
          </DashSection>

          {clientRow && profileRow && (
            <EditClientProfileDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              client={clientRow}
              profile={profileRow}
              isAcheteur
              financing={financing}
              onSaveFinancing={updateFinancing}
              onSaved={loadClient}
            />
          )}
        </PremiumPageShellV2>
      </PullToRefresh>
    </>
  );
}

