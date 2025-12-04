import { useState, useEffect, useMemo } from 'react';
import { isSameDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, MapPin, Phone, ExternalLink, Home, User, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CalendarView, CalendarEvent } from '@/components/calendar/CalendarView';
import { EventFilters } from '@/components/calendar/EventFilters';
import { EventForm, EventFormData } from '@/components/calendar/EventForm';
import { DayEvents } from '@/components/calendar/DayEvents';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';

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
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Visite detail dialog
  const [selectedVisiteGroup, setSelectedVisiteGroup] = useState<any[] | null>(null);
  const [visiteDetailDialogOpen, setVisiteDetailDialogOpen] = useState(false);

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
        supabase.from('visites').select('*, offres(*)').order('date_visite', { ascending: true }),
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

  const handleVisiteGroupClick = (visiteGroup: any[]) => {
    setSelectedVisiteGroup(visiteGroup);
    setVisiteDetailDialogOpen(true);
  };

  const getAgentName = (agentId?: string) => {
    if (!agentId) return null;
    const agent = agents.find((a) => a.id === agentId);
    return agent?.profiles ? `${agent.profiles.prenom} ${agent.profiles.nom}` : null;
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find((c) => c.id === clientId);
    return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto h-full">
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 min-w-0 w-full">
        {/* Filters sidebar - desktop only */}
        <div className="hidden lg:block lg:col-span-1 min-w-0">
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
        <div className="lg:col-span-2 min-w-0 overflow-hidden">
          <CalendarView
            events={filteredEvents}
            visites={filteredVisites}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Day events */}
        <div className="lg:col-span-1 min-w-0 h-[400px] md:h-[600px]">
          <DayEvents
            date={selectedDate}
            events={selectedDayEvents}
            visites={selectedDayVisites}
            agents={agents}
            clients={clients}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteEvent}
            onVisiteGroupClick={handleVisiteGroupClick}
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

      {/* Visite detail dialog */}
      <Dialog open={visiteDetailDialogOpen} onOpenChange={setVisiteDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la visite</DialogTitle>
          </DialogHeader>
          
          {selectedVisiteGroup && selectedVisiteGroup.length > 0 && (
            <div className="space-y-6">
              {/* Header with address */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {selectedVisiteGroup[0].adresse}
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  {format(new Date(selectedVisiteGroup[0].date_visite), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>

              {/* Link preview if available */}
              {selectedVisiteGroup[0].offres?.lien_annonce && (
                <div>
                  <Label className="text-sm font-medium">Lien de l'annonce</Label>
                  <div className="mt-2">
                    <LinkPreviewCard url={selectedVisiteGroup[0].offres.lien_annonce} showInline />
                  </div>
                </div>
              )}

              {/* Property characteristics */}
              {selectedVisiteGroup[0].offres && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Caractéristiques du bien</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedVisiteGroup[0].offres.prix && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Prix</p>
                        <p className="font-bold text-primary">{selectedVisiteGroup[0].offres.prix.toLocaleString()} CHF</p>
                      </div>
                    )}
                    {selectedVisiteGroup[0].offres.pieces && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Pièces</p>
                        <p className="font-bold">{selectedVisiteGroup[0].offres.pieces}</p>
                      </div>
                    )}
                    {selectedVisiteGroup[0].offres.surface && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Surface</p>
                        <p className="font-bold">{selectedVisiteGroup[0].offres.surface} m²</p>
                      </div>
                    )}
                    {selectedVisiteGroup[0].offres.etage && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Étage</p>
                        <p className="font-bold">{selectedVisiteGroup[0].offres.etage}</p>
                      </div>
                    )}
                  </div>
                  {selectedVisiteGroup[0].offres.disponibilite && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Disponibilité : {selectedVisiteGroup[0].offres.disponibilite}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              {selectedVisiteGroup[0].offres?.description && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Description</Label>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedVisiteGroup[0].offres.description}</p>
                  </div>
                </div>
              )}

              {/* Contacts */}
              {(selectedVisiteGroup[0].offres?.concierge_nom || selectedVisiteGroup[0].offres?.locataire_nom) && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Contacts</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedVisiteGroup[0].offres.concierge_nom && (
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <Building2 className="h-4 w-4" />
                          Concierge
                        </div>
                        <p className="text-sm">{selectedVisiteGroup[0].offres.concierge_nom}</p>
                        {selectedVisiteGroup[0].offres.concierge_tel && (
                          <a 
                            href={`tel:${selectedVisiteGroup[0].offres.concierge_tel}`} 
                            className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {selectedVisiteGroup[0].offres.concierge_tel}
                          </a>
                        )}
                      </div>
                    )}
                    {selectedVisiteGroup[0].offres.locataire_nom && (
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <Home className="h-4 w-4" />
                          Locataire actuel
                        </div>
                        <p className="text-sm">{selectedVisiteGroup[0].offres.locataire_nom}</p>
                        {selectedVisiteGroup[0].offres.locataire_tel && (
                          <a 
                            href={`tel:${selectedVisiteGroup[0].offres.locataire_tel}`} 
                            className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {selectedVisiteGroup[0].offres.locataire_tel}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clients concerned (dédupliqués) */}
              {(() => {
                const uniqueClients = getUniqueVisitesByClient(selectedVisiteGroup);
                return (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Clients concernés ({uniqueClients.length})
                    </Label>
                    <ul className="space-y-2">
                      {uniqueClients.map((visite: any) => (
                        <li key={visite.client_id} className="flex items-center justify-between p-2 border rounded-lg">
                          <span className="text-sm">{getClientName(visite.client_id) || 'Client inconnu'}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setVisiteDetailDialogOpen(false);
                              navigate(`/admin/clients/${visite.client_id}`);
                            }}
                          >
                            Voir client
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Agent */}
              {selectedVisiteGroup[0].agent_id && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-1 block">Agent responsable</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getAgentName(selectedVisiteGroup[0].agent_id)}</span>
                  </div>
                </div>
              )}

              {/* Visit notes */}
              {selectedVisiteGroup[0].notes && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedVisiteGroup[0].notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedVisiteGroup?.[0].offres?.lien_annonce && (
              <Button 
                variant="outline" 
                onClick={() => window.open(selectedVisiteGroup[0].offres.lien_annonce, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir l'annonce
              </Button>
            )}
            <Button variant="default" onClick={() => setVisiteDetailDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
