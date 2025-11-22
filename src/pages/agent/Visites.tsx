import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AgentVisites() {
  const { user } = useAuth();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisites();
  }, [user]);

  const loadVisites = async () => {
    if (!user) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*), clients!visites_client_id_fkey(id, user_id)')
        .eq('agent_id', agentData.id)
        .order('date_visite', { ascending: true });

      // Charger les profils des clients
      const clientUserIds = visitesData?.map(v => v.clients?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const visitesWithProfiles = visitesData?.map(v => ({
        ...v,
        client_profile: profilesMap.get(v.clients?.user_id)
      })) || [];

      setVisites(visitesWithProfiles);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerEffectuee = async (visiteId: string) => {
    try {
      await supabase
        .from('visites')
        .update({ statut: 'effectuee' })
        .eq('id', visiteId);

      toast.success('✅ Visite marquée comme effectuée');
      await loadVisites();
    } catch (error) {
      console.error('Error updating visite:', error);
      toast.error('❌ Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const now = new Date();
  const visitesAVenir = visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= now);
  const visitesEffectuees = visites.filter(v => v.statut === 'effectuee');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Visites clients</h1>
          <p className="text-muted-foreground">
            {visitesAVenir.length} visite{visitesAVenir.length > 1 ? 's' : ''} à venir
          </p>
        </div>

        {/* Visites à venir */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📅 Visites à venir</h2>
          {visitesAVenir.length > 0 ? (
            <div className="grid gap-4">
              {visitesAVenir.map(visite => (
                <Card key={visite.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleDateString('fr-CH')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">Planifiée</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visite.client_profile && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {visite.client_profile.prenom} {visite.client_profile.nom}
                        </span>
                      </div>
                    )}
                    {visite.offres && (
                      <div className="text-sm text-muted-foreground">
                        {visite.offres.pieces} pièces • {visite.offres.surface}m² • {visite.offres.prix} CHF/mois
                      </div>
                    )}
                    {visite.notes && (
                      <p className="text-sm bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                        💡 {visite.notes}
                      </p>
                    )}
                    <Button 
                      onClick={() => handleMarquerEffectuee(visite.id)}
                      className="w-full"
                    >
                      Marquer comme effectuée
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune visite à venir
              </CardContent>
            </Card>
          )}
        </div>

        {/* Visites effectuées */}
        <div>
          <h2 className="text-xl font-semibold mb-4">✅ Visites effectuées</h2>
          {visitesEffectuees.length > 0 ? (
            <div className="grid gap-4">
              {visitesEffectuees.slice(0, 10).map(visite => (
                <Card key={visite.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleDateString('fr-CH')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Effectuée</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visite.client_profile && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>
                          {visite.client_profile.prenom} {visite.client_profile.nom}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune visite effectuée
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
