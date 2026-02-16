import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { VisitesMapView } from '@/components/maps/VisitesMapView';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  en_attente: { label: 'Dispo', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  accepte: { label: 'En cours', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  en_route: { label: 'En route', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  arrive: { label: 'Arrivé', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  termine: { label: 'Terminé', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
};

export default function CoursierCarte() {
  const { user } = useAuth();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

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

  const filteredMissions = missions.filter(m => {
    if (filter === 'available') return m.statut_coursier === 'en_attente';
    if (filter === 'mine') return m.coursier_id === coursierId && m.statut_coursier === 'accepte';
    return true;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={MapPin}
          title="Carte des missions"
          subtitle="Visualisez les missions sur la carte et planifiez vos trajets"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les missions</SelectItem>
              <SelectItem value="available">Disponibles</SelectItem>
              <SelectItem value="mine">Mes missions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <VisitesMapView
          missions={filteredMissions}
          loading={loading}
          statusField="statut_coursier"
          statusConfig={STATUS_CONFIG}
        />
      </div>
    </main>
  );
}
