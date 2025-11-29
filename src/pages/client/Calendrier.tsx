import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSameDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarView, CalendarEvent } from '@/components/calendar/CalendarView';
import { ClientDayEvents } from '@/components/calendar/ClientDayEvents';
import { useNotifications } from '@/hooks/useNotifications';

export default function ClientCalendrier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    loadData();
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');

    // Real-time subscription
    const channel = supabase
      .channel('client-visites-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visites' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get client data
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        setLoading(false);
        return;
      }

      setClientId(clientData.id);

      // Load data in parallel
      const [eventsRes, visitesRes] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('client_id', clientData.id)
          .order('event_date', { ascending: true }),
        supabase
          .from('visites')
          .select('*, offres(*)')
          .eq('client_id', clientData.id)
          .order('date_visite', { ascending: true }),
      ]);

      setEvents(eventsRes.data || []);
      setVisites(visitesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((event) => isSameDay(new Date(event.event_date), selectedDate));
  }, [events, selectedDate]);

  const selectedDayVisites = useMemo(() => {
    if (!selectedDate) return [];
    return visites.filter((visite) => isSameDay(new Date(visite.date_visite), selectedDate));
  }, [visites, selectedDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const marquerVisiteEffectuee = async (visite: any) => {
    try {
      await supabase
        .from('visites')
        .update({ statut: 'effectuee' })
        .eq('id', visite.id);

      await supabase
        .from('offres')
        .update({ statut: 'visite_effectuee' })
        .eq('id', visite.offre_id);

      toast({
        title: 'Succès',
        description: 'La visite a été marquée comme effectuée'
      });

      await loadData();
    } catch (error) {
      console.error('Error updating visite:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la visite',
        variant: 'destructive'
      });
    }
  };

  const accepterOffre = async (visite: any) => {
    try {
      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', visite.offre_id);

      // Notify agent
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id && visite.offres) {
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('agent_id', clientData.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `✅ **Le client est intéressé par l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n💰 Loyer: ${visite.offres.prix.toLocaleString()} CHF/mois\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`
          });
        }
      }

      toast({
        title: '✅ Offre acceptée',
        description: 'Votre agent a été notifié de votre intérêt'
      });

      await loadData();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter l\'offre',
        variant: 'destructive'
      });
    }
  };

  const refuserOffre = async (visite: any) => {
    try {
      await supabase
        .from('offres')
        .update({ statut: 'refusee' })
        .eq('id', visite.offre_id);

      // Notify agent
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id && visite.offres) {
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('agent_id', clientData.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `❌ **Le client a refusé l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`
          });
        }
      }

      toast({
        title: 'Offre refusée',
        description: 'Votre agent a été notifié'
      });

      await loadData();
    } catch (error) {
      console.error('Error refusing offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser l\'offre',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const upcomingVisites = visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= new Date());

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Mon calendrier
        </h1>
        <p className="text-muted-foreground">
          {upcomingVisites.length} visite{upcomingVisites.length > 1 ? 's' : ''} à venir
        </p>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarView
            events={events}
            visites={visites}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Day events */}
        <div className="h-[600px]">
          <ClientDayEvents
            date={selectedDate}
            events={selectedDayEvents}
            visites={selectedDayVisites}
            onMarquerEffectuee={marquerVisiteEffectuee}
            onAccepterOffre={accepterOffre}
            onRefuserOffre={refuserOffre}
            onVoirOffre={() => navigate('/client/offres-recues')}
          />
        </div>
      </div>

      {/* Empty state when no visites */}
      {visites.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucune visite planifiée</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas de visite programmée pour le moment.
          </p>
          <Button onClick={() => navigate('/client/offres-recues')}>
            Voir mes offres
          </Button>
        </div>
      )}
    </div>
  );
}
