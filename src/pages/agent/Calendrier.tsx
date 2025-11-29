import { useState, useEffect, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Plus, Calendar as CalendarIcon, AlertTriangle, ThumbsUp, Minus, ThumbsDown, User, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { CalendarView, CalendarEvent } from '@/components/calendar/CalendarView';
import { EventForm, EventFormData } from '@/components/calendar/EventForm';
import { AgentDayEvents } from '@/components/calendar/AgentDayEvents';
import { useNotifications } from '@/hooks/useNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Client {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

export default function AgentCalendrier() {
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Filter
  const [filterClient, setFilterClient] = useState('all');

  // Dialogs
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [recommandation, setRecommandation] = useState<'recommande' | 'neutre' | 'deconseille'>('neutre');

  useEffect(() => {
    loadData();
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) {
        setLoading(false);
        return;
      }

      setAgentId(agentData.id);

      // Load data in parallel
      const [eventsRes, visitesRes, clientsRes] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('event_date', { ascending: true }),
        supabase
          .from('visites')
          .select('*, offres(*), clients!visites_client_id_fkey(id, user_id)')
          .eq('agent_id', agentData.id)
          .order('date_visite', { ascending: true }),
        supabase
          .from('clients')
          .select('id, user_id, profiles(prenom, nom)')
          .eq('agent_id', agentData.id),
      ]);

      // Get client profiles
      const clientUserIds = visitesRes.data?.map(v => v.clients?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const visitesWithProfiles = visitesRes.data?.map(v => ({
        ...v,
        client_profile: profilesMap.get(v.clients?.user_id)
      })) || [];

      setEvents(eventsRes.data || []);
      setVisites(visitesWithProfiles);
      setClients((clientsRes.data as any) || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Filter visites
  const filteredVisites = useMemo(() => {
    return visites.filter((visite) => {
      if (filterClient !== 'all' && visite.client_id !== filterClient) return false;
      return true;
    });
  }, [visites, filterClient]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterClient !== 'all' && event.client_id !== filterClient) return false;
      return true;
    });
  }, [events, filterClient]);

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter((event) => isSameDay(new Date(event.event_date), selectedDate));
  }, [filteredEvents, selectedDate]);

  const selectedDayVisites = useMemo(() => {
    if (!selectedDate) return [];
    return filteredVisites.filter((visite) => isSameDay(new Date(visite.date_visite), selectedDate));
  }, [filteredVisites, selectedDate]);

  // Urgent visits
  const visitesUrgentes = useMemo(() => {
    const now = new Date();
    return visites.filter(v => {
      if (v.statut !== 'planifiee') return false;
      const visiteDate = new Date(v.date_visite);
      const timeDiff = visiteDate.getTime() - now.getTime();
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      return hoursDiff <= 3 && hoursDiff >= 0;
    });
  }, [visites]);

  const handleCreateEvent = async (formData: EventFormData) => {
    if (!user || !agentId) return;

    try {
      setIsCreating(true);

      const eventDate = new Date(formData.event_date);
      if (!formData.all_day && formData.event_time) {
        const [hours, minutes] = formData.event_time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const { error } = await supabase.from('calendar_events').insert({
        created_by: user.id,
        agent_id: agentId,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description || null,
        event_date: eventDate.toISOString(),
        client_id: formData.client_id || null,
        priority: formData.priority,
        all_day: formData.all_day,
      });

      if (error) throw error;

      toast.success('Événement créé');
      setShowEventForm(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('Erreur lors de la création');
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
      toast.error('Erreur');
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
      toast.error('Erreur');
    }
  };

  const handleMarquerEffectuee = async (visite: any) => {
    if (visite.est_deleguee) {
      setSelectedVisite(visite);
      setFeedbackText(visite.feedback_agent || '');
      setRecommandation(visite.recommandation_agent || 'neutre');
      setFeedbackDialogOpen(true);
    } else {
      try {
        await supabase
          .from('visites')
          .update({ statut: 'effectuee' })
          .eq('id', visite.id);

        toast.success('✅ Visite marquée comme effectuée');
        loadData();
      } catch (error) {
        console.error('Error updating visite:', error);
        toast.error('Erreur');
      }
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedVisite || !feedbackText.trim()) {
      toast.error('Veuillez remplir le feedback');
      return;
    }

    try {
      await supabase
        .from('visites')
        .update({
          statut: 'effectuee',
          feedback_agent: feedbackText,
          recommandation_agent: recommandation
        })
        .eq('id', selectedVisite.id);

      // Notify client
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', selectedVisite.client_id)
        .eq('agent_id', selectedVisite.agent_id)
        .maybeSingle();

      if (conv) {
        const recommandationEmoji = {
          recommande: '👍',
          neutre: '🤷',
          deconseille: '👎'
        }[recommandation];

        const recommandationText = {
          recommande: 'Je recommande ce bien',
          neutre: 'Avis neutre',
          deconseille: 'Je ne recommande pas ce bien'
        }[recommandation];

        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          sender_type: 'agent',
          content: `🏠 **Retour de la visite déléguée**\n\n📍 ${selectedVisite.adresse}\n\n${recommandationEmoji} **${recommandationText}**\n\n📝 Feedback:\n${feedbackText}`
        });
      }

      toast.success('✅ Feedback enregistré');
      setFeedbackDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Erreur');
    }
  };

  const handleOpenDetail = (visite: any) => {
    setSelectedVisite(visite);
    setDetailDialogOpen(true);
  };

  const getRecommandationBadge = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    const config = {
      recommande: { icon: ThumbsUp, label: 'Recommandé', variant: 'default' as const },
      neutre: { icon: Minus, label: 'Neutre', variant: 'secondary' as const },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', variant: 'destructive' as const }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Mon calendrier
          </h1>
          <p className="text-muted-foreground">
            {visites.filter(v => v.statut === 'planifiee').length} visites à venir • {events.length} événements
          </p>
        </div>
        <Button onClick={() => setShowEventForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      {/* Urgent visits alert */}
      {visitesUrgentes.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold text-destructive">
              {visitesUrgentes.length} visite{visitesUrgentes.length > 1 ? 's' : ''} urgente{visitesUrgentes.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {visitesUrgentes.map(visite => (
              <div key={visite.id} className="flex items-center justify-between p-2 bg-background rounded">
                <div>
                  <p className="font-medium">{visite.adresse}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                    {visite.client_profile && ` • ${visite.client_profile.prenom} ${visite.client_profile.nom}`}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleMarquerEffectuee(visite)}
                >
                  {visite.est_deleguee ? 'Feedback' : 'Effectuée'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label className="text-sm">Filtrer par client:</Label>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.profiles?.prenom} {client.profiles?.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        <div className="h-[600px]">
          <AgentDayEvents
            date={selectedDate}
            events={selectedDayEvents}
            visites={selectedDayVisites}
            clients={clients}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteEvent}
            onMarquerEffectuee={handleMarquerEffectuee}
            onOpenDetail={handleOpenDetail}
          />
        </div>
      </div>

      {/* Event form */}
      <EventForm
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSubmit={handleCreateEvent}
        agents={[]}
        clients={clients}
        initialDate={selectedDate || undefined}
        isLoading={isCreating}
      />

      {/* Feedback dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback de la visite déléguée</DialogTitle>
            <DialogDescription>
              Partagez votre avis sur le bien visité avec votre client
            </DialogDescription>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedVisite.adresse}</h4>
                {selectedVisite.offres && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVisite.offres.pieces} pièces • {selectedVisite.offres.surface}m² • {selectedVisite.offres.prix} CHF/mois
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Votre recommandation *</Label>
                <RadioGroup value={recommandation} onValueChange={(v: any) => setRecommandation(v)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="recommande" id="recommande" />
                    <Label htmlFor="recommande" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Je recommande ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien correspond aux attentes du client</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="neutre" id="neutre" />
                    <Label htmlFor="neutre" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Minus className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium">Avis neutre</p>
                        <p className="text-xs text-muted-foreground">Le bien a des points positifs et négatifs</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="deconseille" id="deconseille" />
                    <Label htmlFor="deconseille" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium">Je ne recommande pas ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien ne convient pas au client</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Votre feedback détaillé *</Label>
                <Textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Décrivez l'état du bien, l'ambiance, les points positifs/négatifs..."
                  rows={6}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveFeedback} disabled={!feedbackText.trim()}>
              Enregistrer et notifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détails de la visite
              {selectedVisite?.est_deleguee && <Badge variant="outline">Déléguée</Badge>}
              {selectedVisite?.statut === 'effectuee' && <Badge variant="secondary">Effectuée</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-lg">{selectedVisite.adresse}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedVisite.date_visite).toLocaleDateString('fr-CH')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(selectedVisite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {selectedVisite.client_profile && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedVisite.est_deleguee ? 'Visite déléguée pour' : 'Client'}
                  </h5>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">
                      {selectedVisite.client_profile.prenom} {selectedVisite.client_profile.nom}
                    </p>
                    {selectedVisite.client_profile.email && (
                      <p className="text-sm text-muted-foreground">{selectedVisite.client_profile.email}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedVisite.offres && (
                <div className="space-y-2">
                  <h5 className="font-medium">📋 Détails du bien</h5>
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pièces:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.pieces}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Surface:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.surface}m²</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prix:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.prix} CHF/mois</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedVisite.notes && (
                <div className="space-y-2">
                  <h5 className="font-medium">💬 Notes</h5>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm">{selectedVisite.notes}</p>
                  </div>
                </div>
              )}

              {selectedVisite.statut === 'effectuee' && selectedVisite.feedback_agent && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    📝 Mon feedback
                    {selectedVisite.recommandation_agent && getRecommandationBadge(selectedVisite.recommandation_agent)}
                  </h5>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedVisite.feedback_agent}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Fermer
            </Button>
            {selectedVisite?.statut === 'planifiee' && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleMarquerEffectuee(selectedVisite);
              }}>
                {selectedVisite.est_deleguee ? 'Donner mon feedback' : 'Marquer effectuée'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
