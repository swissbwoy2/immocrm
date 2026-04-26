import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { AddressLink } from '@/components/AddressLink';
import { format, isSameDay } from 'date-fns';
import { EventManagerCalendar } from '@/components/calendar/EventManagerCalendar';
import { CalendarEvent } from '@/components/calendar/types';

export default function CoursierCalendrier() {
  const { user } = useAuth();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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
      setCoursierId(coursierData.id);

      const { data } = await supabase
        .from('visites')
        .select('*, offres(pieces, surface, prix)')
        .eq('coursier_id', coursierData.id)
        .in('statut_coursier', ['accepte', 'termine'])
        .order('date_visite', { ascending: true });

      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert missions to "visites" with deleguee flag for the calendar
  const visitesForCalendar = useMemo(
    () => missions.map((m) => ({ ...m, est_deleguee: true, source: 'deleguee' })),
    [missions],
  );

  const missionsForDate = useMemo(
    () => (selectedDate ? missions.filter(m => isSameDay(new Date(m.date_visite), selectedDate)) : []),
    [missions, selectedDate],
  );

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={CalendarCheck}
          title="Calendrier des missions"
          subtitle="Visualisez vos missions acceptées par date"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New EventManager calendar */}
          <div className="lg:col-span-2 min-w-0">
            <EventManagerCalendar
              events={[] as CalendarEvent[]}
              visites={visitesForCalendar}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              availableTypes={['visite_deleguee']}
            />
          </div>

          {/* Missions du jour sélectionné */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {selectedDate ? format(selectedDate, "dd/MM/yyyy") : 'Aucun jour'}
              {missionsForDate.length > 0 && (
                <Badge variant="secondary" className="ml-2">{missionsForDate.length}</Badge>
              )}
            </h3>

            {missionsForDate.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CalendarCheck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune mission ce jour</p>
                </CardContent>
              </Card>
            ) : (
              missionsForDate.map(m => (
                <Card key={m.id} className={`border-border/50 ${m.statut_coursier === 'termine' ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <AddressLink address={m.adresse} className="font-medium text-sm" />
                      <Badge className={
                        m.statut_coursier === 'accepte'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-green-500/10 text-green-600 border-green-500/30'
                      }>
                        {m.statut_coursier === 'accepte' ? 'En cours' : 'Terminée'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(m.date_visite), "HH:mm")}
                      </div>
                      {m.offres?.pieces && (
                        <span>{m.offres.pieces}p</span>
                      )}
                      {m.offres?.prix && (
                        <span>{Number(m.offres.prix).toLocaleString('fr-CH')} CHF</span>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(m.adresse)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" />
                      Itinéraire Google Maps
                    </a>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
