import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Wallet, CheckCircle, MapPin, Clock, TrendingUp, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CoursierHistorique() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalEarnings: 0, paid: 0, unpaid: 0 });

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

      if (!coursierData) { setLoading(false); return; }

      const { data } = await supabase
        .from('visites')
        .select('*, offres(*), agents:agent_id(id, user_id, profiles:user_id(prenom, nom))')
        .eq('coursier_id', coursierData.id)
        .eq('statut_coursier', 'termine')
        .order('updated_at', { ascending: false });

      const completed = data || [];
      setMissions(completed);

      const totalEarnings = completed.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0);
      const paid = completed.filter(m => m.paye_coursier);
      const unpaid = completed.filter(m => !m.paye_coursier);

      setStats({
        total: completed.length,
        totalEarnings,
        paid: paid.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
        unpaid: unpaid.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0),
      });
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={History}
          title="Historique & Gains"
          subtitle="Consultez l'historique de vos missions et vos gains"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Missions terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEarnings.toFixed(0)} CHF</p>
                  <p className="text-xs text-muted-foreground">Gains totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.paid.toFixed(0)} CHF</p>
                  <p className="text-xs text-muted-foreground">Payé</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unpaid.toFixed(0)} CHF</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Solde par agent */}
        {(() => {
          const unpaidByAgent = missions.filter(m => !m.paye_coursier).reduce((acc: Record<string, { name: string; total: number; count: number }>, m) => {
            const agentId = m.agent_id || 'unknown';
            const agentName = m.agents?.profiles?.prenom 
              ? `${m.agents.profiles.prenom} ${m.agents.profiles.nom || ''}`.trim()
              : 'Agent inconnu';
            if (!acc[agentId]) acc[agentId] = { name: agentName, total: 0, count: 0 };
            acc[agentId].total += (m.remuneration_coursier || 5);
            acc[agentId].count += 1;
            return acc;
          }, {});
          const entries = Object.entries(unpaidByAgent);
          if (entries.length === 0) return null;
          return (
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Solde dû par agent</h3>
                </div>
                <div className="space-y-2">
                  {entries.map(([agentId, data]: [string, { name: string; total: number; count: number }]) => (
                    <div key={agentId} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div>
                        <p className="text-sm font-medium">{data.name}</p>
                        <p className="text-xs text-muted-foreground">{data.count} visite{data.count > 1 ? 's' : ''}</p>
                      </div>
                      <span className="font-bold text-amber-600">{data.total.toFixed(0)} CHF</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Mission list */}
        {missions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune mission terminée pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {missions.map((mission) => (
              <Card key={mission.id} className="border-border/50 hover:shadow-md transition-all">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">{mission.adresse}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(mission.date_visite), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={mission.paye_coursier 
                        ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      }>
                        {mission.paye_coursier ? '✅ Payé' : '⏳ En attente'}
                      </Badge>
                      <span className="font-bold text-green-600">
                        {(mission.remuneration_coursier || 5).toFixed(2)} CHF
                      </span>
                    </div>
                  </div>
                  {mission.feedback_coursier && (
                    <p className="text-xs text-muted-foreground mt-2 ml-12 line-clamp-2">
                      {mission.feedback_coursier}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
