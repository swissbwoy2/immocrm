import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { VisitesMapView } from '@/components/maps/VisitesMapView';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planifiee: { label: 'Planifiée', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  confirmee: { label: 'Confirmée', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  effectuee: { label: 'Effectuée', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  annulee: { label: 'Annulée', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

export default function ClientCarte() {
  const { user } = useAuth();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) loadVisites();
  }, [user?.id]);

  const loadVisites = async () => {
    if (!user) return;
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) { setLoading(false); return; }

      const { data } = await supabase
        .from('visites')
        .select('*')
        .eq('client_id', clientData.id)
        .gte('date_visite', new Date().toISOString())
        .order('date_visite', { ascending: true });

      setVisites(data || []);
    } catch (error) {
      console.error('Error loading client visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const filteredVisites = visites.filter(v => {
    if (filter === 'today') {
      const d = new Date(v.date_visite);
      return d >= startOfDay(now) && d <= endOfDay(now);
    }
    if (filter === 'week') {
      const d = new Date(v.date_visite);
      return d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= endOfWeek(now, { weekStartsOn: 1 });
    }
    return true;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={MapPin}
          title="Carte des visites"
          subtitle="Visualisez vos prochaines visites sur la carte et planifiez votre trajet"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les visites</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <VisitesMapView
          missions={filteredVisites}
          loading={loading}
          statusField="statut"
          statusConfig={STATUS_CONFIG}
        />
      </div>
    </main>
  );
}
