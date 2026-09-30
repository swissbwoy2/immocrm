import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck } from 'lucide-react';
import { fetchCreneauxReservations, isCreneauFull, capaciteLabel } from '@/lib/creneauxCapacite';

/** Créneaux de visite des annonces (14 prochains jours) avec compteur de réservations. Lecture seule. */
export function CreneauxAVenirStrip() {
  const { data = [] } = useQuery({
    queryKey: ['admin-calendar-creneaux'],
    queryFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 14 * 86400000);
      const { data, error } = await supabase
        .from('annonce_creneaux')
        .select('id, date_heure, capacite_max, annonce:annonces_publiques(titre)')
        .eq('actif', true)
        .gte('date_heure', now.toISOString())
        .lte('date_heure', end.toISOString())
        .order('date_heure');
      if (error) throw error;
      const counts = await fetchCreneauxReservations((data ?? []).map((c) => c.id));
      return (data ?? []).map((c: any) => ({ ...c, reservations: counts[c.id] || 0 }));
    },
  });
  if (!data.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium"><CalendarCheck className="h-4 w-4 text-primary" />Créneaux de visite (14 jours)</span>
        <Link to="/admin/visites" className="text-xs text-primary hover:underline">Gérer les visites</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.map((c: any) => (
          <div key={c.id} className="min-w-[180px] rounded-lg border border-border p-2 text-xs">
            <p className="font-medium capitalize">{new Date(c.date_heure).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="truncate text-muted-foreground">{c.annonce?.titre || 'Annonce'}</p>
            <div className="mt-1 flex items-center gap-1">
              <span>{capaciteLabel(c.reservations, c.capacite_max)}</span>
              {isCreneauFull(c.reservations, c.capacite_max) && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Complet</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
