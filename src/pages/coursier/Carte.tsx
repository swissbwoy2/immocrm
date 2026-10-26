import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VisitesMapView } from '@/components/maps/VisitesMapView';
import { DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  en_attente: { label: 'Dispo', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  accepte: { label: 'En cours', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  en_route: { label: 'En route', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  arrive: { label: 'Arrivé', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  termine: { label: 'Terminé', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
};

type Filtre = 'all' | 'available' | 'mine';

export default function CoursierCarte() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filtre>('all');

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

      if (coursierData) setCoursierId(coursierData.id);

      const { data } = await supabase
        .from('visites')
        .select('*, offres(pieces, surface, prix)')
        .or(`statut_coursier.eq.en_attente${coursierData ? `,coursier_id.eq.${coursierData.id}` : ''}`)
        .gte('date_visite', new Date().toISOString())
        .order('date_visite', { ascending: true });

      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const matches = (m: any, f: Filtre) => {
    if (f === 'available') return m.statut_coursier === 'en_attente';
    if (f === 'mine') return m.coursier_id === coursierId && m.statut_coursier === 'accepte';
    return true;
  };
  const filteredMissions = missions.filter(m => matches(m, filter));
  const count = (f: Filtre) => missions.filter((m) => matches(m, f)).length;

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Carte des missions"
        subtitle={loading ? 'Chargement…' : `${count('mine')} visite${count('mine') > 1 ? 's' : ''} à venir · ${count('available')} disponible${count('available') > 1 ? 's' : ''}`}
        action={
          <Button variant="outline" className="h-11" onClick={() => navigate('/coursier/missions')}>
            <ListChecks className="mr-2 h-4 w-4" /> Liste
          </Button>
        }
      />

      <DashFilterPills
        label="Filtrer les missions"
        value={filter}
        onChange={(v) => setFilter(v as Filtre)}
        options={[
          { key: 'all', label: 'Toutes les missions', count: count('all') },
          { key: 'available', label: 'Disponibles', count: count('available') },
          { key: 'mine', label: 'Mes missions', count: count('mine') },
        ]}
      />

      <VisitesMapView
        missions={filteredMissions}
        loading={loading}
        statusField="statut_coursier"
        statusConfig={STATUS_CONFIG}
      />
    </DashPage>
  );
}
