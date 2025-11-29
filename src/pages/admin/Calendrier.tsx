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

      // Load all data in parallel
      const [eventsRes, visitesRes, agentsRes, clientsRes] = await Promise.all([
        supabase.from('calendar_events').select('*').order('event_date', { ascending: true }),
        supabase.from('visites').select('*').order('date_visite', { ascending: true }),
        supabase.from('agents').select('id, user_id, profiles(prenom, nom)'),
        supabase.from('clients').select('id, user_id, profiles(prenom, nom)'),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (visitesRes.error) throw visitesRes.error;
      if (agentsRes.error) throw agentsRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setEvents(eventsRes.data || []);
      setVisites(visitesRes.data || []);
      setAgents((agentsRes.data as any) || []);
      setClients((clientsRes.data as any) || []);
    } catch (error: any) {
      console.error('Error loading calendar data:', error);
      toast.error('Erreur lors du chargement des données');
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Calendrier
          </h1>
          <p className="text-muted-foreground">
            Gérez les rendez-vous, rappels et visites
          </p>
        </div>
        <Button onClick={() => setShowEventForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="lg:col-span-1">
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
        <div className="lg:col-span-1 h-[600px]">
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
