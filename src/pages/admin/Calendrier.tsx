import { useState, useEffect, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CalendarView, CalendarEvent } from '@/components/calendar/CalendarView';
import { EventFilters } from '@/components/calendar/EventFilters';
import { EventForm, EventFormData } from '@/components/calendar/EventForm';
import { DayEvents } from '@/components/calendar/DayEvents';

interface Agent {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface Client {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

export default function AdminCalendrier() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Filters
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel including candidatures with important dates
      const [eventsRes, visitesRes, agentsRes, clientsRes, candidaturesRes] = await Promise.all([
        supabase.from('calendar_events').select('*').order('event_date', { ascending: true }),
        supabase.from('visites').select('*').order('date_visite', { ascending: true }),
        supabase.from('agents').select('id, user_id, profiles!agents_user_id_fkey(prenom, nom)'),
        supabase.from('clients').select('id, user_id, profiles!clients_user_id_fkey(prenom, nom)'),
        supabase.from('candidatures')
          .select('id, client_id, offre_id, date_etat_lieux, heure_etat_lieux, date_signature_choisie, statut, clients(id, profiles!clients_user_id_fkey(prenom, nom)), offres(adresse, agent_id)')
          .or('date_etat_lieux.not.is.null,date_signature_choisie.not.is.null'),
      ]);

      // Log results for debugging
      console.log('Calendar data loaded:', {
        events: eventsRes.data?.length || 0,
        eventsError: eventsRes.error,
        visites: visitesRes.data?.length || 0,
        visitesError: visitesRes.error,
        agents: agentsRes.data?.length || 0,
        agentsError: agentsRes.error,
        clients: clientsRes.data?.length || 0,
        clientsError: clientsRes.error,
        candidatures: candidaturesRes.data?.length || 0,
        candidaturesError: candidaturesRes.error,
      });

      // Handle errors but continue with available data
      if (eventsRes.error) {
        console.error('Events error:', eventsRes.error);
        toast.error('Erreur chargement événements: ' + eventsRes.error.message);
      }
      if (visitesRes.error) {
        console.error('Visites error:', visitesRes.error);
        toast.error('Erreur chargement visites: ' + visitesRes.error.message);
      }
      if (agentsRes.error) {
        console.error('Agents error:', agentsRes.error);
        toast.error('Erreur chargement agents: ' + agentsRes.error.message);
      }
      if (clientsRes.error) {
        console.error('Clients error:', clientsRes.error);
        toast.error('Erreur chargement clients: ' + clientsRes.error.message);
      }
      if (candidaturesRes.error) {
        console.error('Candidatures error:', candidaturesRes.error);
      }

      // Transform candidatures into virtual calendar events
      const candidatureEvents: CalendarEvent[] = [];
      (candidaturesRes.data || []).forEach((candidature: any) => {
        if (!candidature) return;
        const clientName = candidature.clients?.profiles 
          ? `${candidature.clients.profiles.prenom || ''} ${candidature.clients.profiles.nom || ''}`.trim() 
          : 'Client';
        const adresse = candidature.offres?.adresse || 'Adresse inconnue';
        
        // Add état des lieux event
        if (candidature.date_etat_lieux) {
          candidatureEvents.push({
            id: `etat-lieux-${candidature.id}`,
            title: `État des lieux - ${clientName}`,
            event_date: candidature.date_etat_lieux,
            event_type: 'etat_lieux',
            status: candidature.statut === 'cles_remises' ? 'effectue' : 'planifie',
            client_id: candidature.client_id,
            agent_id: candidature.offres?.agent_id,
            description: `Adresse: ${adresse}`,
          });
        }
        
        // Add signature event
        if (candidature.date_signature_choisie) {
          candidatureEvents.push({
            id: `signature-${candidature.id}`,
            title: `Signature bail - ${clientName}`,
            event_date: candidature.date_signature_choisie,
            event_type: 'signature',
            status: candidature.statut === 'signature_effectuee' || candidature.statut === 'etat_lieux_fixe' || candidature.statut === 'cles_remises' ? 'effectue' : 'planifie',
            client_id: candidature.client_id,
            agent_id: candidature.offres?.agent_id,
            description: `Adresse: ${adresse}`,
          });
        }
      });

      // Set data even if some queries failed
      setEvents([...(eventsRes.data || []), ...candidatureEvents]);
      setVisites(visitesRes.data || []);
      setAgents((agentsRes.data as any) || []);
      setClients((clientsRes.data as any) || []);
      
      // Show success with counts
      if (!eventsRes.error && !visitesRes.error) {
        console.log(`Calendrier chargé: ${(eventsRes.data || []).length + candidatureEvents.length} événements, ${visitesRes.data?.length || 0} visites`);
      }
    } catch (error: any) {
      console.error('Error loading calendar data:', error);
      toast.error('Erreur lors du chargement des données: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterAgent !== 'all' && event.agent_id !== filterAgent) return false;
      if (filterClient !== 'all' && event.client_id !== filterClient) return false;
      if (filterEventType !== 'all' && filterEventType !== 'visite' && event.event_type !== filterEventType) return false;
      if (filterStatus !== 'all' && event.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterAgent, filterClient, filterEventType, filterStatus]);

  // Filter visites
  const filteredVisites = useMemo(() => {
    if (filterEventType !== 'all' && filterEventType !== 'visite') return [];
    return visites.filter((visite) => {
      if (filterAgent !== 'all' && visite.agent_id !== filterAgent) return false;
      if (filterClient !== 'all' && visite.client_id !== filterClient) return false;
      if (filterStatus !== 'all' && visite.statut !== filterStatus) return false;
      return true;
    });
  }, [visites, filterAgent, filterClient, filterEventType, filterStatus]);

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter((event) => isSameDay(new Date(event.event_date), selectedDate));
  }, [filteredEvents, selectedDate]);

  const selectedDayVisites = useMemo(() => {
    if (!selectedDate) return [];
    return filteredVisites.filter((visite) => isSameDay(new Date(visite.date_visite), selectedDate));
  }, [filteredVisites, selectedDate]);

  const handleCreateEvent = async (formData: EventFormData) => {
    if (!user) return;

    try {
      setIsCreating(true);

      // Combine date and time
      const eventDate = new Date(formData.event_date);
      if (!formData.all_day && formData.event_time) {
        const [hours, minutes] = formData.event_time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const { error } = await supabase.from('calendar_events').insert({
        created_by: user.id,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description || null,
        event_date: eventDate.toISOString(),
        agent_id: formData.agent_id || null,
        client_id: formData.client_id || null,
        priority: formData.priority,
        all_day: formData.all_day,
      });

      if (error) throw error;

      toast.success('Événement créé avec succès');
      setShowEventForm(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('Erreur lors de la création de l\'événement');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (eventId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      loadData();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Événement supprimé');
      loadData();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 md:h-6 md:w-6" />
            Calendrier
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les rendez-vous, rappels et visites
          </p>
        </div>
        <Button onClick={() => setShowEventForm(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      {/* Mobile: Filters collapsible */}
      <details className="lg:hidden">
        <summary className="text-sm font-medium cursor-pointer p-3 bg-muted/50 rounded-lg">
          Filtres avancés
        </summary>
        <div className="mt-3">
          <EventFilters
            agents={agents}
            clients={clients}
            selectedAgent={filterAgent}
            selectedClient={filterClient}
            selectedEventType={filterEventType}
            selectedStatus={filterStatus}
            onAgentChange={setFilterAgent}
            onClientChange={setFilterClient}
            onEventTypeChange={setFilterEventType}
            onStatusChange={setFilterStatus}
          />
        </div>
      </details>

      {/* Main content - responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Filters sidebar - desktop only */}
        <div className="hidden lg:block lg:col-span-1">
          <EventFilters
            agents={agents}
            clients={clients}
            selectedAgent={filterAgent}
            selectedClient={filterClient}
            selectedEventType={filterEventType}
            selectedStatus={filterStatus}
            onAgentChange={setFilterAgent}
            onClientChange={setFilterClient}
            onEventTypeChange={setFilterEventType}
            onStatusChange={setFilterStatus}
          />
        </div>

        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarView
            events={filteredEvents}
            visites={filteredVisites}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Day events */}
        <div className="lg:col-span-1 h-[400px] md:h-[600px]">
          <DayEvents
            date={selectedDate}
            events={selectedDayEvents}
            visites={selectedDayVisites}
            agents={agents}
            clients={clients}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteEvent}
          />
        </div>
      </div>

      {/* Event form modal */}
      <EventForm
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSubmit={handleCreateEvent}
        agents={agents}
        clients={clients}
        initialDate={selectedDate || undefined}
        isLoading={isCreating}
      />
    </div>
  );
}
