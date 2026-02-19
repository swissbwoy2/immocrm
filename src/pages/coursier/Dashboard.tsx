import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Wallet, TrendingUp, Clock, CheckCircle, MapPin, Banknote, Home, Maximize2, AlertTriangle, ArrowRight, Sparkles, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { format, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddressLink } from '@/components/AddressLink';

export default function CoursierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completedThisMonth: 0,
    earningsThisMonth: 0,
    totalEarnings: 0,
    unpaidEarnings: 0,
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
        .order('date_visite', { ascending: true });

      setMissions(allMissions || []);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const myMissions = (allMissions || []).filter(m => m.coursier_id === coursierData.id);
      const completedThisMonth = myMissions.filter(m => 
        m.statut_coursier === 'termine' && new Date(m.updated_at) >= startOfMonth
      );
      const totalCompleted = myMissions.filter(m => m.statut_coursier === 'termine');
      const unpaid = totalCompleted.filter(m => !m.paye_coursier);
      const inProgress = myMissions.filter(m => m.statut_coursier === 'accepte');
      const available = (allMissions || []).filter(m => m.statut_coursier === 'en_attente');

      setStats({
        completedThisMonth: completedThisMonth.length,
        earningsThisMonth: completedThisMonth.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
        totalEarnings: totalCompleted.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
        unpaidEarnings: unpaid.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
        inProgress: inProgress.length,
        available: available.length,
      });
    } catch (error) {
      console.error('Error loading coursier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMission = async (visiteId: string) => {
    if (!coursierId) return;
    try {
      const { error } = await supabase
        .from('visites')
        .update({ coursier_id: coursierId, statut_coursier: 'accepte' })
        .eq('id', visiteId)
        .eq('statut_coursier', 'en_attente');

      if (error) throw error;
      toast.success('Mission acceptée ! 🎉');
      loadData();
    } catch (error) {
      console.error('Error accepting mission:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const availableMissions = missions.filter(m => m.statut_coursier === 'en_attente');
  const myActiveMissions = missions.filter(m => m.coursier_id === coursierId && m.statut_coursier === 'accepte');

  // Next upcoming mission (active, sorted by date)
  const nextMission = myActiveMissions.length > 0
    ? myActiveMissions.reduce((closest, m) => {
        const mDate = new Date(m.date_visite);
        const cDate = new Date(closest.date_visite);
        return mDate < cDate ? m : closest;
      })
    : null;

  const getTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return 'Demain';
    const hours = differenceInHours(d, new Date());
    if (hours < 48) return `Dans ${hours}h`;
    return format(d, "EEE dd MMM", { locale: fr });
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={CalendarCheck}
          title="Tableau de bord"
          subtitle="Gérez vos missions de visite et suivez vos gains"
        />

        {/* Prochaine mission highlight */}
        {nextMission && (
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Prochaine mission</span>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                  {getTimeLabel(nextMission.date_visite)}
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <AddressLink address={nextMission.adresse} className="font-semibold text-base" truncate />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(nextMission.date_visite), "HH:mm")}
                      {nextMission.date_visite_fin && ` → ${format(new Date(nextMission.date_visite_fin), "HH:mm")}`}
                    </div>
                    {nextMission.offres?.pieces && (
                      <span className="text-xs bg-muted/60 px-2 py-0.5 rounded">{nextMission.offres.pieces}p</span>
                    )}
                    {nextMission.offres?.surface && (
                      <span className="text-xs bg-muted/60 px-2 py-0.5 rounded">{nextMission.offres.surface}m²</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextMission.adresse)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Itinéraire
                  </a>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/coursier/missions')}
                    className="text-xs text-primary"
                  >
                    Voir détails <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerte gains impayés */}
        {stats.unpaidEarnings > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/15">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gains en attente de paiement</p>
                    <p className="text-xs text-muted-foreground">Contactez l'agence pour le règlement</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-amber-600">{stats.unpaidEarnings.toFixed(0)} CHF</span>
                  <Button variant="outline" size="sm" onClick={() => navigate('/coursier/historique')} className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                    Détails
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: Wallet, label: 'Gains ce mois', value: `${stats.earningsThisMonth.toFixed(0)} CHF`, color: 'text-green-600', bg: 'bg-green-500/10' },
            { icon: CheckCircle, label: 'Terminées ce mois', value: stats.completedThisMonth, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: TrendingUp, label: 'Gains totaux', value: `${stats.totalEarnings.toFixed(0)} CHF`, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { icon: Clock, label: 'En cours', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            { icon: CalendarCheck, label: 'Disponibles', value: stats.available, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          ].map((kpi, i) => (
            <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Available Missions */}
        {availableMissions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Missions disponibles
                <Badge variant="secondary" className="animate-pulse">{availableMissions.length}</Badge>
              </h2>
              {availableMissions.length > 6 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/coursier/missions')}>
                  Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {availableMissions.slice(0, 6).map((mission) => (
                <Card key={mission.id} className="group border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <AddressLink address={mission.adresse} className="font-medium text-sm" truncate />
                      </div>
                      <Badge className="shrink-0 bg-green-500/10 text-green-600 border-green-500/30 font-bold">
                        {(mission.remuneration_coursier || 5).toFixed(0)}.-
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">{getTimeLabel(mission.date_visite)}</span>
                      <span>à {format(new Date(mission.date_visite), "HH:mm")}</span>
                    </div>

                    {mission.offres && (
                      <div className="flex gap-2 flex-wrap">
                        {mission.offres.pieces && (
                          <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                            <Home className="h-3 w-3" />{mission.offres.pieces}p
                          </div>
                        )}
                        {mission.offres.surface && (
                          <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                            <Maximize2 className="h-3 w-3" />{mission.offres.surface}m²
                          </div>
                        )}
                        {mission.offres.prix && (
                          <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                            <Banknote className="h-3 w-3" />{mission.offres.prix.toLocaleString('fr-CH')} CHF
                          </div>
                        )}
                      </div>
                    )}

                    <Button 
                      onClick={() => handleAcceptMission(mission.id)}
                      className="w-full mt-1 group-hover:shadow-md transition-all"
                      size="sm"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accepter
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* My Active Missions */}
        {myActiveMissions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Mes missions en cours
              <Badge variant="secondary">{myActiveMissions.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myActiveMissions.map((mission) => (
                <Card key={mission.id} className="border-amber-500/30 bg-amber-500/5 hover:shadow-lg transition-all">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                        <AddressLink address={mission.adresse} className="font-medium text-sm" truncate />
                      </div>
                      <Badge className="shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                        {getTimeLabel(mission.date_visite)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(mission.date_visite), "HH:mm")}
                      {mission.date_visite_fin && ` → ${format(new Date(mission.date_visite_fin), "HH:mm")}`}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.adresse)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Itinéraire
                      </a>
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/coursier/missions')}
                        className="flex-1"
                        size="sm"
                      >
                        Détails <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {availableMissions.length === 0 && myActiveMissions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Aucune mission pour le moment</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">Les nouvelles missions apparaîtront ici dès qu'un agent les déléguera.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
