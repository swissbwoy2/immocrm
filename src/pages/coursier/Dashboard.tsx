import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Wallet, TrendingUp, Clock, CheckCircle, MapPin, Banknote, Home, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    inProgress: 0,
    available: 0,
  });

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      // Get coursier record
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

      // Get all missions for this coursier + available ones
      const { data: allMissions } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .or(`statut_coursier.eq.en_attente,coursier_id.eq.${coursierData.id}`)
        .order('date_visite', { ascending: true });

      setMissions(allMissions || []);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const myMissions = (allMissions || []).filter(m => m.coursier_id === coursierData.id);
      const completedThisMonth = myMissions.filter(m => 
        m.statut_coursier === 'termine' && new Date(m.updated_at) >= startOfMonth
      );
      const totalCompleted = myMissions.filter(m => m.statut_coursier === 'termine');
      const inProgress = myMissions.filter(m => m.statut_coursier === 'accepte');
      const available = (allMissions || []).filter(m => m.statut_coursier === 'en_attente');

      setStats({
        completedThisMonth: completedThisMonth.length,
        earningsThisMonth: completedThisMonth.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
        totalEarnings: totalCompleted.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
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
          title="Tableau de bord Coursier"
          subtitle="Gérez vos missions de visite et suivez vos gains"
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.earningsThisMonth.toFixed(0)} CHF</p>
                  <p className="text-xs text-muted-foreground">Gains ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
                  <p className="text-xs text-muted-foreground">Terminées ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEarnings.toFixed(0)} CHF</p>
                  <p className="text-xs text-muted-foreground">Gains totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <CalendarCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.available}</p>
                  <p className="text-xs text-muted-foreground">Disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Missions */}
        {availableMissions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Missions disponibles
              <Badge variant="secondary">{availableMissions.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {availableMissions.slice(0, 6).map((mission) => (
                <Card key={mission.id} className="border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm truncate">{mission.adresse}</span>
                      </div>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                        {(mission.remuneration_coursier || 5).toFixed(0)} CHF
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(mission.date_visite), "EEE dd MMM 'à' HH:mm", { locale: fr })}
                    </div>

                    {mission.offres && (
                      <div className="flex gap-2">
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
                      className="w-full mt-2"
                      size="sm"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accepter la mission (5.-)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {availableMissions.length > 6 && (
              <Button variant="outline" onClick={() => navigate('/coursier/missions')} className="w-full">
                Voir toutes les missions ({availableMissions.length})
              </Button>
            )}
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
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-sm truncate">{mission.adresse}</span>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">En cours</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(mission.date_visite), "EEE dd MMM 'à' HH:mm", { locale: fr })}
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/coursier/missions')}
                      className="w-full mt-2"
                      size="sm"
                    >
                      Voir les détails
                    </Button>
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
