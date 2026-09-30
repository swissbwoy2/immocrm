import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clipboard, Search, Loader2, CheckCircle2, Calendar, FolderOpen, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useCandidatCandidatures, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';
import { PremiumDashboardHeader, PremiumKPICard } from '@/components/premium';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';
import { MesOffresRecuesBand } from '@/components/client/dashboard/MesOffresRecuesBand';
import { QuickTileXL } from '@/components/client/dashboard/QuickTileXL';
import { StoriesBar } from '@/components/stories/StoriesBar';

export default function CandidatDashboard() {
  const navigate = useNavigate();
  const { user, userRoles, refreshRoles, switchRole } = useAuth();
  const { data = [], isLoading } = useCandidatCandidatures();
  const [activating, setActivating] = useState(false);
  const [prenom, setPrenom] = useState<string>();
  const isClient = userRoles.includes('client');

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
  const visites = data.filter((c) => c.statut === 'visite_planifiee').length;
  const candidaturesAvecOffre = data.filter((c) => c.source === 'candidature');

  const activate = async () => {
    if (activating) return;
    setActivating(true);
    try {
      const { error } = await supabase.rpc('activate_candidat_searches' as any);
      if (error) throw error;
      await refreshRoles();
      switchRole('client');
      toast.success('Vos recherches sont activées');
      navigate('/client');
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'activer vos recherches");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <DashboardAdBanner />
        <StoriesBar className="rounded-xl overflow-hidden" />
        <PremiumDashboardHeader
          userName={prenom}
          headingBadge="Espace candidat"
          subtitle="Suivez l'avancement de vos candidatures"
          action={isClient ? (
            <Button onClick={() => { switchRole('client'); navigate('/client'); }} className="min-h-[44px]">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aller à mon espace client
            </Button>
          ) : (
            <Button onClick={activate} disabled={activating} className="min-h-[44px]">
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Activer mes recherches
            </Button>
          )}
        />
        {candidaturesAvecOffre.length > 0 && (
          <MesOffresRecuesBand
            title="Offres / candidatures"
            offres={candidaturesAvecOffre.map((c) => ({ id: c.id, adresse: c.adresse, created_at: c.date, statut: c.statut }))}
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
          <QuickTileXL icon={Calendar} title="Mes visites" subtitle={`${visites} planifiée${visites > 1 ? 's' : ''}`} badge={visites || undefined} onClick={() => navigate('/candidat/agenda')} />
        </div>
        <div className="grid gap-3">
          <QuickTileXL icon={FileCheck} variant="wide" title="Mes candidatures" subtitle={`${data.length} candidature${data.length > 1 ? 's' : ''}`} onClick={() => navigate('/candidat/candidatures')} />
          {retenues > 0 && <QuickTileXL icon={FolderOpen} variant="wide" title="Pièces à fournir" subtitle={`${retenues} dossier${retenues > 1 ? 's' : ''} retenu${retenues > 1 ? 's' : ''}`} onClick={() => navigate('/candidat/demande')} />}
        </div>
      </PremiumPageShellV2>
    </div>
  );
}
