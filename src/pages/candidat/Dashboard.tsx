import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clipboard, Search, Loader2, CheckCircle2, Calendar, FolderOpen, FileCheck, MessageSquare, ShieldCheck, Clock, ChevronRight, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useCandidatCandidatures, RETENU_BAILLEUR, statutLabel } from '@/hooks/useCandidatCandidatures';
import { PremiumDashboardHeader } from '@/components/premium';
import { PortailBannieres } from '@/components/public/PortailBannieres';
import { MesOffresRecuesBand } from '@/components/client/dashboard/MesOffresRecuesBand';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';
import { DASH_CARD, DashBadge, DashPage, DashSection, DashSectionLink, LinkRow, StatTile, TodoCard } from '@/components/client/dashboard/DashPrimitives';
import { CANDIDATURE_CLOSED, CandidatureRow, candidatureTone } from '@/components/candidat/candidatParts';
import { formatZurichDateTime } from '@/lib/dateZurich';
import { MesCreditsCard } from '@/components/credits/MesCreditsCard';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CandidatCriteresForm } from '@/components/candidat/CandidatCriteresForm';
import { CRITERES_DISCLAIMER } from '@/components/candidat/CandidatCriteresGate';
import { useCandidatCriteres } from '@/hooks/useCandidatCriteres';
import { CandidatGarantForm, GARANT_CRITERE } from '@/components/candidat/CandidatGarantForm';
import { CandidatSolvabiliteForm } from '@/components/candidat/CandidatSolvabiliteForm';
import { isCandidatSolvable, isSolvabiliteRenseignee } from '@/lib/candidatSolvabilite';
import { MaJourneeBanner } from '@/components/dashboard/MaJourneeBanner';

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

function formatTrialEnd(ms: number) {
  try {
    return new Date(ms).toLocaleString('fr-CH', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    });
  } catch {
    return '';
  }
}

export default function CandidatDashboard() {
  const navigate = useNavigate();
  const { user, userRoles, refreshRoles, switchRole } = useAuth();
  const { data = [], isLoading } = useCandidatCandidatures();
  const [activating, setActivating] = useState(false);
  const [prenom, setPrenom] = useState<string>();
  const isClient = userRoles.includes('client');
  const { complete: criteresComplete, isLoading: criteresLoading } = useCandidatCriteres();
  const [criteresOpen, setCriteresOpen] = useState(false);
  const [garantOpen, setGarantOpen] = useState(() => new URLSearchParams(window.location.search).get('garant') === '1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [solvOpen, setSolvOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
      if (alive) setPrenom(profile?.prenom ?? undefined);
    });
    return () => { alive = false; };
  }, [user?.id]);

  const enCours = data.filter((c) => !['refuse', 'refusee', 'desiste'].includes(c.statut)).length;
  const retenues = data.filter((c) => c.statut === RETENU_BAILLEUR).length;
  const candidaturesAvecOffre = data.filter((c) => c.source === 'candidature');
  const nowMs = Date.now();
  const visitesAVenir = data
    .filter((c) => !c.annulee && c.date_visite && new Date(c.date_visite).getTime() >= nowMs)
    .sort((a, b) => a.date_visite!.localeCompare(b.date_visite!));
  const candidaturesEnCours = data.filter((c) => !CANDIDATURE_CLOSED.includes(c.statut));

  // Point d'entrée unique de l'essai : start_candidat_trial() (mêmes contrôles et messages que CandidatActivationGate).
  const runTrialRpc = async () => {
    if (activating) return;
    setActivating(true);
    try {
      const { error } = await (supabase.rpc as any)('start_candidat_trial');
      if (error) throw error;
      toast.success(`Votre essai gratuit de 3 jours a démarré. Il se termine le ${formatTrialEnd(Date.now() + TRIAL_MS)}.`);
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || "Impossible de démarrer l'essai");
    } finally {
      setActivating(false);
    }
  };

  // Avant de lancer le compte à rebours : si les informations de solvabilité manquent,
  // on ouvre le formulaire au lieu de renvoyer une erreur brute (même parcours que CandidatActivationGate).
  const startTrial = async () => {
    setConfirmOpen(false);
    if (!user?.id) return;
    try {
      const { data: cc } = await (supabase.from as any)('candidat_criteres')
        .select('type_permis, revenus_mensuels, poursuites, budget_max, garant_solvable')
        .eq('user_id', user.id).maybeSingle();
      if (!isSolvabiliteRenseignee(cc)) { setSolvOpen(true); return; }
      if (!isCandidatSolvable(cc) && cc.garant_solvable !== true) { setSolvOpen(true); return; }
    } catch {
      // Lecture impossible : on laisse la fonction serveur trancher.
    }
    await runTrialRpc();
  };

  const aFaire = (!criteresLoading && !criteresComplete) || retenues > 0;

  return (
    <>
      <DashPage className="space-y-6">
        {/* 1. Bannière et accueil */}
        <DashboardAdBanner />
        <PortailBannieres />
        <StoriesBar className="rounded-2xl overflow-hidden" showVisites={false} />
        <PremiumDashboardHeader
          userName={prenom}
          headingBadge="Espace candidat"
          subtitle="Suivez l'avancement de vos candidatures"
          action={isClient ? (
            <Button onClick={() => { switchRole('client'); navigate('/client'); }} className="min-h-[44px] rounded-full">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aller à mon espace client
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} disabled={activating} className="min-h-[44px] rounded-full">
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Essayer gratuitement (3 jours)
            </Button>
          )}
        />
        <MaJourneeBanner role="candidat" />

        {/* 2. À faire */}
        {aFaire && (
          <div className="space-y-3">
            {!criteresLoading && !criteresComplete && (
              <TodoCard
                icon={Search}
                tone="amber"
                title="Mes critères de recherche"
                description={CRITERES_DISCLAIMER}
                action={<Button size="sm" className="min-h-[44px] rounded-full" onClick={() => setCriteresOpen(true)}>Compléter</Button>}
              />
            )}
            {retenues > 0 && (
              <TodoCard
                icon={FolderOpen}
                tone="primary"
                title="Pièces à fournir"
                description={`${retenues} dossier${retenues > 1 ? 's' : ''} retenu${retenues > 1 ? 's' : ''}`}
                action={<Button size="sm" className="min-h-[44px] rounded-full" onClick={() => navigate('/candidat/candidatures')}>Mes candidatures</Button>}
              />
            )}
          </div>
        )}

        {/* 3. Ma recherche : candidatures, visites (même ordre que le tableau client) */}
        <DashSection title="Ma recherche" action={<DashSectionLink label="Tout voir" onClick={() => navigate('/candidat/candidatures')} />}>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <StatTile
              icon={FileCheck}
              label="Candidatures"
              value={isLoading ? '—' : `${data.length} au total`}
              count={retenues}
              onClick={() => navigate('/candidat/candidatures')}
            />
            <StatTile
              icon={FolderOpen}
              label="En cours"
              value={isLoading ? '—' : enCours > 0 ? `${enCours} en cours` : 'Aucune'}
              count={0}
              onClick={() => navigate('/candidat/candidatures')}
            />
            <StatTile
              icon={Calendar}
              label="Agenda"
              value={isLoading ? '—' : visitesAVenir.length > 0 ? `${visitesAVenir.length} à venir` : 'Aucune visite'}
              count={visitesAVenir.length}
              onClick={() => navigate('/candidat/agenda')}
            />
          </div>

          {candidaturesAvecOffre.length > 0 && (
            <MesOffresRecuesBand
              title="Offres / candidatures"
              offres={candidaturesAvecOffre.map((c) => ({ id: c.id, adresse: c.adresse, created_at: c.date, statut: c.statut, lien_annonce: c.lien_annonce, prix: c.prix, pieces: c.pieces, surface: c.surface, medias_galerie: c.medias_galerie }))}
              onItemClick={() => navigate('/candidat/candidatures')}
            />
          )}

          {visitesAVenir.length > 0 && (
            <div className={`${DASH_CARD} p-4 md:p-5`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">Mes visites à venir</h3>
                <DashSectionLink label="Agenda" onClick={() => navigate('/candidat/agenda')} />
              </div>
              <div className="-mx-2 space-y-0.5">
                {visitesAVenir.slice(0, 3).map((c) => (
                  <CandidatureRow
                    key={`v-${c.source}-${c.id}`}
                    c={c}
                    sub={<span className="font-medium text-primary">{formatZurichDateTime(c.date_visite, { weekday: true, year: false })}</span>}
                    onClick={() => navigate('/candidat/agenda')}
                  />
                ))}
              </div>
            </div>
          )}

          {!isLoading && data.length === 0 && (
            <div className={`${DASH_CARD} p-5 text-center`}>
              <p className="font-semibold text-foreground">Aucune candidature pour le moment</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Réservez une visite depuis une annonce : vos visites et vos candidatures apparaîtront ici.
              </p>
            </div>
          )}

          {candidaturesEnCours.length > 0 && (
            <div className={`${DASH_CARD} p-4 md:p-5`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">Vos candidatures en cours</h3>
                  <p className="text-sm text-muted-foreground">Suivez la progression de vos dossiers</p>
                </div>
                <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                  {candidaturesEnCours.length}
                </span>
              </div>
              <div className="-mx-2 space-y-0.5">
                {candidaturesEnCours.slice(0, 3).map((c) => (
                  <CandidatureRow
                    key={`c-${c.source}-${c.id}`}
                    c={c}
                    badge={<DashBadge tone={candidatureTone(c)}>{c.annulee ? 'Visite annulée' : statutLabel(c.statut)}</DashBadge>}
                    onClick={() => navigate('/candidat/candidatures')}
                  />
                ))}
              </div>
              <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => navigate('/candidat/candidatures')}>
                Voir toutes mes candidatures
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </DashSection>

        {/* 4. Mon dossier */}
        <DashSection title="Mon dossier">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <LinkRow icon={Clipboard} label="Ma demande de location" sub="Compléter mes informations" onClick={() => navigate('/candidat/demande')} />
            <LinkRow icon={Search} label="Mes critères de recherche" sub={criteresComplete ? 'Modifier mes critères' : 'À compléter'} onClick={() => setCriteresOpen(true)} />
            <LinkRow icon={ShieldCheck} label="Mon garant" sub="Renseigner / modifier mon garant" onClick={() => setGarantOpen(true)} />
          </div>
        </DashSection>

        {/* 5. Messages et crédits */}
        <DashSection title="Messages et crédits">
          <MesCreditsCard />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <LinkRow icon={MessageSquare} label="Messages" sub="Mes échanges sur les annonces" onClick={() => navigate('/candidat/messages')} />
            <LinkRow icon={LifeBuoy} label="Support" sub="Une question ? Écrivez-nous" onClick={() => navigate('/candidat/support')} />
          </div>
        </DashSection>
      </DashPage>
      <Dialog open={confirmOpen} onOpenChange={(o) => !activating && setConfirmOpen(o)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Démarrer votre essai gratuit
            </DialogTitle>
            <DialogDescription>
              Pendant 3 jours, nos agents recherchent pour vous et vous envoient les offres qui correspondent à vos critères.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Le compte à rebours démarre <b>maintenant</b> et se termine le{' '}
              <b>{formatTrialEnd(Date.now() + TRIAL_MS)}</b>.
            </p>
            <p className="text-muted-foreground">
              Vous ne disposez que d'un seul essai : une fois lancé, il ne peut pas être mis en pause ni redémarré.
              À la fin des 3 jours, les recherches automatiques s'arrêtent, et vous pourrez les reprendre en activant votre compte client.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="min-h-[44px] rounded-full" onClick={() => setConfirmOpen(false)} disabled={activating}>
              Pas maintenant
            </Button>
            <Button className="min-h-[44px] rounded-full" onClick={startTrial} disabled={activating}>
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
              Démarrer mes 3 jours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={solvOpen} onOpenChange={(o) => !activating && setSolvOpen(o)}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Votre solvabilité</DialogTitle>
            <DialogDescription>
              Pour démarrer votre essai gratuit de 3 jours, renseignez ces 3 informations : elles nous permettent de vérifier votre solvabilité auprès des bailleurs.
            </DialogDescription>
          </DialogHeader>
          {solvOpen && <CandidatSolvabiliteForm submitLabel="Démarrer mon essai gratuit" onSaved={() => { setSolvOpen(false); runTrialRpc(); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={criteresOpen} onOpenChange={setCriteresOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mes critères de recherche</DialogTitle>
            <DialogDescription>{CRITERES_DISCLAIMER}</DialogDescription>
          </DialogHeader>
          {criteresOpen && <CandidatCriteresForm onSaved={() => setCriteresOpen(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={garantOpen} onOpenChange={setGarantOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mon garant</DialogTitle>
            <DialogDescription>{GARANT_CRITERE}</DialogDescription>
          </DialogHeader>
          {garantOpen && <CandidatGarantForm onSaved={() => setGarantOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
