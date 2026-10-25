import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Wallet, TrendingUp, Clock, CheckCircle, Navigation, Users, Timer, ChevronRight, FileText, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddressLink } from '@/components/AddressLink';
import { useCoursierTime, formatDuration } from '@/hooks/useCoursierTime';
import { CoursierClockCard } from '@/components/coursier/CoursierClockCard';
import { CoursierMissionCard } from '@/components/coursier/CoursierMissionCard';
import { delaiVisite, etapeCoursier, finVisite, heureLabel, jourLabel, lienItineraire, type EtapeCoursier } from '@/components/coursier/coursierModel';
import { groupVisitesByPhysiqueAgent } from '@/utils/visitesCalculator';
import { DashboardBanner } from '@/components/common/DashboardBanner';
import { DASH_CARD, DashBadge, DashEmptyState, DashPage, DashPageHeader, DashSection, DashSectionLink } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';

export default function CoursierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const time = useCoursierTime();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completedThisMonth: 0,
    inProgress: 0,
    available: 0,
  });


  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: coursierData } = await supabase
        .from('coursiers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!coursierData) {
        setLoading(false);
        return;
      }
      setCoursierId(coursierData.id);

      const { data: allMissions } = await supabase
        .from('visites')
        .select('*, offres(pieces, surface, prix, adresse)')
        .or(`statut_coursier.eq.en_attente,coursier_id.eq.${coursierData.id}`)
        .order('date_visite', { ascending: true })
        .limit(15000);

      setMissions(allMissions || []);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const myMissions = (allMissions || []).filter(m => m.coursier_id === coursierData.id);
      const completedThisMonth = myMissions.filter(m =>
        m.statut_coursier === 'termine' && new Date(m.updated_at) >= startOfMonth
      );
      const inProgress = myMissions.filter(m => m.statut_coursier === 'accepte');
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0); const available = (allMissions || []).filter(m => m.statut_coursier === 'en_attente');

      // Compteurs sur les visites REGROUPÉES (adresse + date/heure + agent)
      setStats({
        completedThisMonth: groupVisitesByPhysiqueAgent(completedThisMonth as any[]).length,
        inProgress: groupVisitesByPhysiqueAgent(inProgress as any[]).filter((g: any) => new Date(g.representative.date_visite) >= new Date(new Date().setHours(0, 0, 0, 0))).length,
        available: groupVisitesByPhysiqueAgent(available as any[]).filter((g: any) => g.items.some((v: any) => v.est_deleguee === true) && new Date(g.representative.date_visite) >= startToday).length,
      });
    } catch (error) {
      console.error('Error loading coursier data:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Accepte TOUTES les lignes de la visite physique (tous les clients concernés) */
  const handleAcceptMission = async (group: any[]) => {
    if (!coursierId) return;
    try {
      const { error } = await supabase
        .from('visites')
        .update({ coursier_id: coursierId, statut_coursier: 'accepte' })
        .in('id', group.map((v) => v.id))
        .eq('statut_coursier', 'en_attente');

      if (error) throw error;
      toast.success('Mission acceptée ! 🎉');
      loadData();
    } catch (error) {
      console.error('Error accepting mission:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  /** Missions regroupées par visite physique, rangées par étape (calcul d'affichage). */
  const parEtape = useMemo(() => {
    const now = Date.now();
    const m: Record<EtapeCoursier, any[]> = { disponibles: [], mes_missions: [], a_rendre: [], terminees: [] };
    for (const g of groupVisitesByPhysiqueAgent(missions as any[])) {
      const card = {
        ...(g.representative as any),
        _group: g.items,
        _count: g.count,
        _delegues: g.items.filter((v: any) => v.est_deleguee === true).length,
      };
      const e = etapeCoursier(card, g.items as any[], coursierId, now);
      if (e) m[e].push(card);
    }
    const t = (x: any) => new Date(x.date_visite).getTime();
    m.disponibles.sort((a, b) => t(a) - t(b));
    m.mes_missions.sort((a, b) => t(a) - t(b));
    m.a_rendre.sort((a, b) => finVisite(a) - finVisite(b));
    return m;
  }, [missions, coursierId]);

  const myActiveMissions = parEtape.mes_missions;
  const availableMissions = parEtape.disponibles;
  const aRendre = parEtape.a_rendre;

  // Prochaine mission = la plus proche de mes missions acceptées non terminées
  const nextMission = myActiveMissions[0] ?? null;
  const aujourdHui = myActiveMissions.filter((m) => m !== nextMission && isToday(new Date(m.date_visite)));
  const aVenir = myActiveMissions.filter((m) => m !== nextMission && !isToday(new Date(m.date_visite)));

  const goMission = (m: any, terminer = false) =>
    navigate(`/coursier/missions?mission=${m.id}${terminer ? '&terminer=1' : ''}`);

  const subtitle = loading
    ? 'Chargement…'
    : nextMission
      ? `Prochaine visite : ${jourLabel(nextMission.date_visite).toLowerCase()} à ${format(new Date(nextMission.date_visite), 'HH:mm')}${aRendre.length > 0 ? ` · ${aRendre.length} compte${aRendre.length > 1 ? 's' : ''}-rendu${aRendre.length > 1 ? 's' : ''} à faire` : ''}`
      : aRendre.length > 0
        ? `${aRendre.length} compte${aRendre.length > 1 ? 's' : ''}-rendu${aRendre.length > 1 ? 's' : ''} à faire`
        : availableMissions.length > 0
          ? `${availableMissions.length} mission${availableMissions.length > 1 ? 's' : ''} disponible${availableMissions.length > 1 ? 's' : ''} à prendre`
          : 'Aucune mission prévue pour le moment.';

  const kpis = [
    { icon: Wallet, label: 'Gains ce mois', value: `${time.earningsThisMonth.toFixed(0)} CHF` },
    { icon: Timer, label: 'Temps ce mois', value: formatDuration(time.minutesThisMonth) },
    { icon: TrendingUp, label: 'Gains totaux', value: `${time.earningsTotal.toFixed(0)} CHF` },
    { icon: CheckCircle, label: 'Terminées ce mois', value: String(stats.completedThisMonth) },
    { icon: Clock, label: 'En cours', value: String(stats.inProgress) },
    { icon: CalendarCheck, label: 'Disponibles', value: String(stats.available) },
  ];

  if (loading) {
    return (
      <DashPage>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-lg bg-muted" />
          <div className="h-56 rounded-2xl bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
        </div>
      </DashPage>
    );
  }

  const delaiNext = nextMission ? delaiVisite(nextMission.date_visite) : null;

  return (
    <DashPage className="space-y-6">
      <DashboardBanner />
      <DashPageHeader title="Tableau de bord" subtitle={subtitle} />

      {/* 1. Prochaine mission, en grand */}
      {nextMission ? (
        <section className={cn(DASH_CARD, 'overflow-hidden')} aria-label="Prochaine mission">
          <div className="space-y-4 p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Prochaine mission</span>
              {delaiNext && (
                <DashBadge tone={delaiNext.tone === 'danger' || delaiNext.tone === 'warning' ? 'warning' : 'muted'}>{delaiNext.label}</DashBadge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{jourLabel(nextMission.date_visite)}</p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">{heureLabel(nextMission)}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <AddressLink address={nextMission.adresse} showIcon={false} className="text-base font-semibold" />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Users className="h-3 w-3" />{nextMission._count} client{nextMission._count > 1 ? 's' : ''}</span>
              {nextMission.offres?.pieces && <span className="rounded-full bg-muted px-2 py-1">{nextMission.offres.pieces}p</span>}
              {nextMission.offres?.surface && <span className="rounded-full bg-muted px-2 py-1">{nextMission.offres.surface}m²</span>}
            </div>
          </div>
          {/* Actions en bas de carte : zone du pouce */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/30 p-3 md:p-4">
            <Button asChild className="h-12 rounded-full">
              <a href={lienItineraire(nextMission.adresse)} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-2 h-4 w-4" /> Itinéraire
              </a>
            </Button>
            <Button variant="outline" className="h-12 rounded-full" onClick={() => goMission(nextMission)}>
              Contacts et détails
            </Button>
          </div>
        </section>
      ) : (
        <DashEmptyState
          icon={CalendarCheck}
          title="Aucune mission prévue"
          description={availableMissions.length > 0 ? 'Des missions sont disponibles ci-dessous : acceptez-en une pour la réserver.' : 'Les nouvelles missions apparaîtront ici dès qu’un agent les déléguera.'}
        />
      )}

      {/* 2. Comptes-rendus à faire (action en attente) */}
      {aRendre.length > 0 && (
        <DashSection title="Comptes-rendus à faire" action={<DashSectionLink label="Tout voir" onClick={() => navigate('/coursier/missions?tab=a_rendre')} />}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {aRendre.slice(0, 3).map((m) => (
              <CoursierMissionCard key={m.id} mission={m} etape="a_rendre" onTerminer={(x) => goMission(x, true)} />
            ))}
          </div>
        </DashSection>
      )}

      {/* 3. Pointage global (arrivée / départ) */}
      <CoursierClockCard time={time} />

      {/* 4. Aujourd'hui */}
      {aujourdHui.length > 0 && (
        <DashSection title="Aujourd'hui">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {aujourdHui.map((m) => (
              <CoursierMissionCard key={m.id} mission={m} etape="mes_missions" onOpen={(x) => goMission(x)} />
            ))}
          </div>
        </DashSection>
      )}

      {/* 5. À venir */}
      {aVenir.length > 0 && (
        <DashSection title="À venir" action={<DashSectionLink label="Mes missions" onClick={() => navigate('/coursier/missions?tab=mes_missions')} />}>
          <ul className={cn(DASH_CARD, 'divide-y divide-border/60 overflow-hidden')}>
            {aVenir.slice(0, 6).map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => goMission(m)} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                  <span className="w-20 shrink-0">
                    <span className="block text-xs text-muted-foreground first-letter:uppercase">{jourLabel(m.date_visite)}</span>
                    <span className="block text-sm font-semibold tabular-nums text-foreground">{format(new Date(m.date_visite), 'HH:mm', { locale: fr })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{m.adresse}</span>
                    <span className="block text-xs text-muted-foreground">{m._count} client{m._count > 1 ? 's' : ''}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </DashSection>
      )}

      {/* 6. Missions disponibles à prendre */}
      {availableMissions.length > 0 && (
        <DashSection
          title="Missions disponibles"
          action={availableMissions.length > 6 ? <DashSectionLink label="Voir tout" onClick={() => navigate('/coursier/missions?tab=disponibles')} /> : undefined}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableMissions.slice(0, 6).map((m) => (
              <CoursierMissionCard key={m.id} mission={m} etape="disponibles" acceptLabel="Accepter" onAccept={(x) => handleAcceptMission(x._group)} />
            ))}
          </div>
        </DashSection>
      )}

      {/* 7. Chiffres du mois */}
      <DashSection title="Mes chiffres">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className={cn(DASH_CARD, 'flex min-h-[96px] flex-col justify-between p-3 sm:p-4')}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <k.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-2 block">
                <span className="block truncate text-lg font-semibold text-foreground">{k.value}</span>
                <span className="block truncate text-xs text-muted-foreground">{k.label}</span>
              </span>
            </div>
          ))}
        </div>
      </DashSection>

      {aRendre.length === 0 && myActiveMissions.length === 0 && availableMissions.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" /> Tout est à jour : aucun compte-rendu en attente.
        </p>
      )}
    </DashPage>
  );
}
