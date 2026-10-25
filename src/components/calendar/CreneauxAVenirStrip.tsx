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
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06)] md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-3 text-base font-semibold text-foreground">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><CalendarCheck className="h-[18px] w-[18px]" /></span>
          Créneaux de visite (14 jours)
        </span>
        <Link to="/admin/visites" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">Gérer les visites</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.map((c: any) => (
          <div key={c.id} className="min-w-[180px] rounded-xl border border-border/70 bg-background p-3 text-xs">
            <p className="font-semibold capitalize text-foreground">{new Date(c.date_heure).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="truncate text-muted-foreground">{c.annonce?.titre || 'Annonce'}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-muted-foreground">{capaciteLabel(c.reservations, c.capacite_max)}</span>
              {isCreneauFull(c.reservations, c.capacite_max) && <Badge variant="destructive" className="h-5 rounded-full px-2 text-[10px]">Complet</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
