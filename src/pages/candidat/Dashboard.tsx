import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clipboard, Search, Loader2, CheckCircle2, Calendar, FolderOpen, FileCheck, MessageSquare, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useCandidatCandidatures, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';
import { PremiumDashboardHeader, PremiumKPICard } from '@/components/premium';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PortailBannieres } from '@/components/public/PortailBannieres';
import { MesOffresRecuesBand } from '@/components/client/dashboard/MesOffresRecuesBand';
import { QuickTileXL } from '@/components/client/dashboard/QuickTileXL';
import { MesCreditsCard } from '@/components/credits/MesCreditsCard';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CandidatCriteresForm } from '@/components/candidat/CandidatCriteresForm';
import { CRITERES_DISCLAIMER } from '@/components/candidat/CandidatCriteresGate';
import { useCandidatCriteres } from '@/hooks/useCandidatCriteres';
import { CandidatGarantForm, GARANT_CRITERE } from '@/components/candidat/CandidatGarantForm';
import { CandidatSolvabiliteForm } from '@/components/candidat/CandidatSolvabiliteForm';
import { isCandidatSolvable, isSolvabiliteRenseignee } from '@/lib/candidatSolvabilite';

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

  return (
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <PortailBannieres />
        <StoriesBar className="rounded-xl overflow-hidden" showVisites={false} />
        <PremiumDashboardHeader
          userName={prenom}
          headingBadge="Espace candidat"
          subtitle="Suivez l'avancement de vos candidatures"
          action={isClient ? (
            <Button onClick={() => { switchRole('client'); navigate('/client'); }} className="min-h-[44px]">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aller à mon espace client
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} disabled={activating} className="min-h-[44px]">
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Essayer gratuitement (3 jours)
            </Button>
          )}
        />
        {!criteresLoading && !criteresComplete && (
          <button type="button" onClick={() => setCriteresOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-left text-sm text-foreground min-h-[44px]">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <span className="flex-1">{CRITERES_DISCLAIMER}</span>
            <span className="font-semibold text-primary">Compléter</span>
          </button>
        )}
        <MesCreditsCard />
        {candidaturesAvecOffre.length > 0 && (
          <MesOffresRecuesBand
            title="Offres / candidatures"
            offres={candidaturesAvecOffre.map((c) => ({ id: c.id, adresse: c.adresse, created_at: c.date, statut: c.statut, lien_annonce: c.lien_annonce, prix: c.prix, pieces: c.pieces, surface: c.surface, medias_galerie: c.medias_galerie }))}
            onItemClick={() => navigate('/candidat/candidatures')}
          />
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 items-stretch">
          <PremiumKPICard title="Candidatures" value={isLoading ? '—' : data.length} icon={FileText} onClick={() => navigate('/candidat/candidatures')} />
          <PremiumKPICard title="En cours" value={isLoading ? '—' : enCours} icon={FolderOpen} onClick={() => navigate('/candidat/candidatures')} />
          <PremiumKPICard title="Retenues" value={isLoading ? '—' : retenues} icon={FileCheck} variant="success" onClick={() => navigate('/candidat/candidatures')} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 items-stretch">
          <QuickTileXL icon={Clipboard} title="Ma demande de location" subtitle="Compléter mes informations" onClick={() => navigate('/candidat/demande')} />
          <QuickTileXL icon={Calendar} title="Agenda" subtitle="Suivi des candidatures" onClick={() => navigate('/candidat/agenda')} />
        </div>
        <div className="grid gap-3">
          <QuickTileXL icon={FileCheck} variant="wide" title="Mes candidatures" subtitle={`${data.length} candidature${data.length > 1 ? 's' : ''}`} onClick={() => navigate('/candidat/candidatures')} />
          <QuickTileXL icon={Search} variant="wide" title="Mes critères de recherche" subtitle={criteresComplete ? 'Modifier mes critères' : 'À compléter'} onClick={() => setCriteresOpen(true)} />
          <QuickTileXL icon={ShieldCheck} variant="wide" title="Mon garant" subtitle="Renseigner / modifier mon garant" onClick={() => setGarantOpen(true)} />
          <QuickTileXL icon={MessageSquare} variant="wide" title="Messages" subtitle="Mes échanges sur les annonces" onClick={() => navigate('/candidat/messages')} />
          {retenues > 0 && <QuickTileXL icon={FolderOpen} variant="wide" title="Pièces à fournir" subtitle={`${retenues} dossier${retenues > 1 ? 's' : ''} retenu${retenues > 1 ? 's' : ''}`} onClick={() => navigate('/candidat/candidatures')} />}
        </div>
      </PremiumPageShellV2>
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
            <Button variant="outline" className="min-h-[44px]" onClick={() => setConfirmOpen(false)} disabled={activating}>
              Pas maintenant
            </Button>
            <Button className="min-h-[44px]" onClick={startTrial} disabled={activating}>
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
    </div>
  );
}
