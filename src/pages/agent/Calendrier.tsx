import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, AlertTriangle, ThumbsUp, Minus, ThumbsDown, User, Clock, Calendar, Pencil, Trash2, MapPin, Home, Phone, Upload, X, Image, Video, Loader2, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { CalendarEvent } from '@/components/calendar/types';
import { PremiumCalendarView } from '@/components/calendar/PremiumCalendarView';
import { EventForm, EventFormData } from '@/components/calendar/EventForm';
import { PremiumAgentDayEvents } from '@/components/calendar/PremiumAgentDayEvents';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { useNotifications } from '@/hooks/useNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CandidatureWorkflowTimeline } from '@/components/CandidatureWorkflowTimeline';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

const candidatureStatusLabels: Record<string, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  bail_conclu: 'Client confirme',
  attente_bail: 'Validation régie',
  bail_recu: 'Bail reçu',
  signature_planifiee: 'Date choisie',
  signature_effectuee: 'Bail signé',
  etat_lieux_fixe: 'EDL fixé',
  cles_remises: 'Clés remises',
  refusee: 'Refusée',
};

const nextStatusOptions: Record<string, { value: string; label: string }[]> = {
  en_attente: [
    { value: 'acceptee', label: 'Accepter la candidature' },
    { value: 'refusee', label: 'Refuser la candidature' },
  ],
  acceptee: [
    { value: 'bail_conclu', label: 'Client confirme vouloir le bien' },
    { value: 'refusee', label: 'Refuser la candidature' },
  ],
  bail_conclu: [
    { value: 'attente_bail', label: 'En attente de validation régie' },
  ],
  attente_bail: [
    { value: 'bail_recu', label: 'Bail reçu de la régie' },
  ],
  bail_recu: [
    { value: 'signature_planifiee', label: 'Date de signature choisie' },
  ],
  signature_planifiee: [
    { value: 'signature_effectuee', label: 'Bail signé' },
  ],
  signature_effectuee: [
    { value: 'etat_lieux_fixe', label: 'État des lieux fixé' },
  ],
  etat_lieux_fixe: [
    { value: 'cles_remises', label: 'Clés remises' },
  ],
};

interface Client {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

const eventTypeLabels: Record<string, string> = {
  rappel: 'Rappel',
  rendez_vous: 'Rendez-vous',
  tache: 'Tâche',
  reunion: 'Réunion',
  autre: 'Autre',
};

const priorityLabels: Record<string, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
};

export default function AgentCalendrier() {
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
  const { syncEvent } = useGoogleCalendarSync();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit mode
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Filter
  const [filterClient, setFilterClient] = useState('all');

  // Dialogs
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [eventDetailDialogOpen, setEventDetailDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [recommandation, setRecommandation] = useState<'recommande' | 'neutre' | 'deconseille'>('neutre');
  const [feedbackMedias, setFeedbackMedias] = useState<{url: string, type: string, name: string, size: number}[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    loadData();
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');
  }, [user?.id]);

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
      // Get client IDs via client_agents
      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);

      const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

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
        clientIds.length > 0 
          ? supabase
              .from('clients')
              .select('id, user_id, profiles!clients_user_id_fkey(prenom, nom)')
              .in('id', clientIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Get candidatures for visites with offre_id
      const offreIds = visitesRes.data?.map(v => v.offre_id).filter(Boolean) || [];
      const clientIdsFromVisites = visitesRes.data?.map(v => v.client_id).filter(Boolean) || [];
      
      let candidaturesMap = new Map();
      if (offreIds.length > 0) {
        const { data: candidatures } = await supabase
          .from('candidatures')
          .select('*')
          .in('offre_id', offreIds)
          .in('client_id', clientIdsFromVisites);
        
        candidatures?.forEach(c => {
          const key = `${c.offre_id}-${c.client_id}`;
          candidaturesMap.set(key, c);
        });
      }

      // Get client profiles
      const clientUserIds = visitesRes.data?.map(v => v.clients?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const visitesWithProfiles = visitesRes.data?.map(v => ({
        ...v,
        client_profile: profilesMap.get(v.clients?.user_id),
        candidature: candidaturesMap.get(`${v.offre_id}-${v.client_id}`) || null
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

  // Update candidature status with invoice generation for bail_conclu → attente_bail
  const handleUpdateCandidatureStatus = async (candidatureId: string, newStatus: string, candidatureData?: { currentStatut: string; clientId: string; offrePrix: number; offreAdresse: string }) => {
    try {
      // Check if we need to generate an invoice (bail_conclu → attente_bail)
      if (candidatureData && candidatureData.currentStatut === 'bail_conclu' && newStatus === 'attente_bail') {
        console.log('[Calendrier] Transition bail_conclu → attente_bail, création facture...');
        
        // Get client info for invoice
        const { data: clientData } = await supabase
          .from('clients')
          .select(`
            id,
            user_id,
            abaninja_client_uuid,
            profiles:user_id (id, prenom, nom, email, telephone, adresse)
          `)
          .eq('id', candidatureData.clientId)
          .single();

        if (clientData) {
          const profile = clientData.profiles as any;
          let clientUuid = clientData.abaninja_client_uuid;
          let addressUuid: string | null = null;

          // Create client if needed
          if (!clientUuid && profile) {
            const { data: createClientResult } = await supabase.functions.invoke('create-abaninja-client', {
              body: {
                prenom: profile.prenom || 'Client',
                nom: profile.nom || 'Inconnu',
                email: profile.email,
                telephone: profile.telephone || '',
                adresse: profile.adresse || ''
              }
            });

            if (createClientResult?.success) {
              clientUuid = createClientResult.client_uuid;
              addressUuid = createClientResult.address_uuid;
              await supabase.from('clients').update({ abaninja_client_uuid: clientUuid }).eq('id', candidatureData.clientId);
            }
          }

          // Create final invoice if we have client UUID
          if (clientUuid) {
            const { data: invoiceResult } = await supabase.functions.invoke('create-final-invoice', {
              body: {
                client_uuid: clientUuid,
                address_uuid: addressUuid || clientUuid,
                candidature_id: candidatureId,
                loyer_mensuel: candidatureData.offrePrix,
                acompte_paye: 300,
                prenom: profile?.prenom || 'Client',
                nom: profile?.nom || '',
                email: profile?.email,
                adresse_bien: candidatureData.offreAdresse
              }
            });

            if (invoiceResult?.success) {
              // Update candidature with invoice data
              const { error } = await supabase
                .from('candidatures')
                .update({ 
                  statut: newStatus,
                  agent_valide_regie: true,
                  agent_valide_regie_at: new Date().toISOString(),
                  facture_finale_invoice_id: invoiceResult.invoice_id,
                  facture_finale_invoice_ref: invoiceResult.invoice_ref,
                  facture_finale_montant: invoiceResult.montant,
                  facture_finale_created_at: new Date().toISOString()
                })
                .eq('id', candidatureId);

              if (error) throw error;
              
              toast.success(`Statut mis à jour + Facture ${invoiceResult.invoice_ref} créée`);
              loadData();
              return;
            }
          }
        }
      }

      // Default update (no invoice needed or invoice creation failed)
      const updateData: any = { statut: newStatus };
      if (newStatus === 'attente_bail') {
        updateData.agent_valide_regie = true;
        updateData.agent_valide_regie_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('candidatures')
        .update(updateData)
        .eq('id', candidatureId);
      
      if (error) throw error;
      
      toast.success('Statut mis à jour');
      loadData();
    } catch (error: any) {
      console.error('Error updating candidature:', error);
      toast.error('Erreur lors de la mise à jour');
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

      // Sync to Google Calendar
      if (user) {
        syncEvent(user.id, {
          title: formData.title,
          description: formData.description || undefined,
          start: eventDate.toISOString(),
          allDay: formData.all_day,
        });
      }

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

  const handleUpdateEvent = async (formData: EventFormData) => {
    if (!editingEvent) return;

    try {
      setIsCreating(true);

      const eventDate = new Date(formData.event_date);
      if (!formData.all_day && formData.event_time) {
        const [hours, minutes] = formData.event_time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const { error } = await supabase
        .from('calendar_events')
        .update({
          event_type: formData.event_type,
          title: formData.title,
          description: formData.description || null,
          event_date: eventDate.toISOString(),
          client_id: formData.client_id || null,
          priority: formData.priority,
          all_day: formData.all_day,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast.success('Événement modifié');
      setShowEventForm(false);
      setEditingEvent(null);
      setFormMode('create');
      loadData();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormMode('edit');
    setShowEventForm(true);
  };

  const handleFormSubmit = (formData: EventFormData) => {
    if (formMode === 'edit') {
      handleUpdateEvent(formData);
    } else {
      handleCreateEvent(formData);
    }
  };

  const handleFormClose = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setFormMode('create');
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
      setEventDetailDialogOpen(false);
      setSelectedEvent(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Erreur');
    }
  };

  const handleMediaUpload = async (files: FileList) => {
    if (!selectedVisite) return;
    setUploadingMedia(true);
    const newMedias = [...feedbackMedias];
    
    for (const file of Array.from(files)) {
      try {
        const filePath = `visites/${selectedVisite.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('client-documents')
          .upload(filePath, file);
        
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
          
          newMedias.push({
            url: publicUrl,
            type: file.type,
            name: file.name,
            size: file.size
          });
        }
      } catch (err) {
        console.error('Error uploading file:', err);
      }
    }
    
    setFeedbackMedias(newMedias);
    setUploadingMedia(false);
  };

  const removeMedia = (index: number) => {
    setFeedbackMedias(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarquerEffectuee = async (visite: any) => {
    if (visite.est_deleguee) {
      setSelectedVisite(visite);
      setFeedbackText(visite.feedback_agent || '');
      setRecommandation(visite.recommandation_agent || 'neutre');
      setFeedbackMedias((visite.medias as any[]) || []);
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
          recommandation_agent: recommandation,
          medias: feedbackMedias
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
          content: `🏠 **Retour de la visite déléguée**\n\n📍 ${selectedVisite.adresse}\n\n${recommandationEmoji} **${recommandationText}**\n\n📝 Feedback:\n${feedbackText}`,
          payload: feedbackMedias.length > 0 ? { type: 'visite_feedback', visite_id: selectedVisite.id, medias: feedbackMedias } : null
        });
      }

      toast.success('✅ Feedback enregistré');
      setFeedbackDialogOpen(false);
      setFeedbackMedias([]);
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

  const handleDeleteVisite = async (visiteId: string, cascade: boolean = false) => {
    try {
      // 1. Récupérer les infos de la visite
      const { data: visite } = await supabase
        .from('visites')
        .select('offre_id, client_id, adresse')
        .eq('id', visiteId)
        .single();

      if (!visite) throw new Error('Visite non trouvée');

      if (cascade && visite.offre_id && visite.client_id) {
        // 2. Supprimer la transaction liée (via offre_id + client_id)
        await supabase
          .from('transactions')
          .delete()
          .eq('offre_id', visite.offre_id)
          .eq('client_id', visite.client_id);

        // 3. Réinitialiser la candidature liée (remettre à "en_attente")
        await supabase
          .from('candidatures')
          .update({
            statut: 'en_attente',
            bail_recu: false,
            bail_recu_at: null,
            signature_effectuee: false,
            signature_effectuee_at: null,
            date_signature_choisie: null,
            dates_signature_proposees: null,
            date_etat_lieux: null,
            heure_etat_lieux: null,
            cles_remises: false,
            cles_remises_at: null,
            alerte_cles_vue: false,
            client_accepte_conclure: false,
            client_accepte_conclure_at: null,
            agent_valide_regie: false,
            agent_valide_regie_at: null,
            recommandation_envoyee: false,
            avis_google_envoye: false
          })
          .eq('offre_id', visite.offre_id)
          .eq('client_id', visite.client_id);
      }

      // 4. Supprimer la visite
      const { error } = await supabase.from('visites').delete().eq('id', visiteId);
      if (error) throw error;

      toast.success(cascade ? 'Visite, transaction et workflow supprimés' : 'Visite supprimée');
      loadData();
    } catch (error) {
      console.error('Error deleting visite:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleOpenEventDetail = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailDialogOpen(true);
  };

  const handleCalendarEventClick = (event: any, type: 'event' | 'visite') => {
    if (type === 'visite') {
      handleOpenDetail(event);
    } else {
      handleOpenEventDetail(event);
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find((c) => c.id === clientId);
    return client ? `${client.profiles.prenom} ${client.profiles.nom}` : null;
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20"></div>
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <p className="text-muted-foreground animate-pulse">Chargement du calendrier...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 page-header">
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 animate-bounce-soft">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            Mon calendrier
          </h1>
          <p className="text-muted-foreground mt-1 ml-12">
            <span className="font-medium text-blue-600 dark:text-blue-400">{visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= new Date()).length}</span> visites confirmées
            <span className="mx-2">•</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{visites.filter(v => v.statut === 'proposee').length}</span> en attente
            <span className="mx-2">•</span>
            <span className="font-medium">{events.length}</span> événements
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormMode('create');
            setEditingEvent(null);
            setShowEventForm(true);
          }}
          className="animate-fade-in animate-delay-100 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      {/* Urgent visits alert */}
      {visitesUrgentes.length > 0 && (
        <Alert variant="destructive" className="animate-fade-in animate-delay-150 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 animate-pulse" />
          <AlertDescription>
            <div className="ml-2">
              <h2 className="font-semibold text-destructive mb-2">
                {visitesUrgentes.length} visite{visitesUrgentes.length > 1 ? 's' : ''} urgente{visitesUrgentes.length > 1 ? 's' : ''} !
              </h2>
              <div className="space-y-2">
                {visitesUrgentes.map((visite, idx) => (
                  <div 
                    key={visite.id} 
                    className="flex items-center justify-between p-3 bg-background/80 backdrop-blur rounded-lg border border-destructive/20 shadow-sm transition-all duration-200 hover:shadow-md"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div>
                      <p className="font-medium">{visite.adresse}</p>
                      <p className="text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                        {visite.client_profile && (
                          <>
                            <span className="mx-1">•</span>
                            <User className="h-3 w-3 inline mr-1" />
                            {visite.client_profile.prenom} {visite.client_profile.nom}
                          </>
                        )}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="shadow-sm hover:shadow-md transition-all"
                      onClick={() => handleMarquerEffectuee(visite)}
                    >
                      {visite.est_deleguee ? 'Feedback' : 'Effectuée'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl animate-fade-in animate-delay-200">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <Label className="text-sm font-medium">Filtrer par client</Label>
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[220px] bg-background border-muted-foreground/20 focus:ring-primary/30">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0 w-full">
        {/* Calendar */}
        <div className="lg:col-span-2 min-w-0 overflow-hidden animate-fade-in animate-delay-300">
          <PremiumCalendarView
            events={filteredEvents}
            visites={filteredVisites}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventClick={handleCalendarEventClick}
          />
        </div>

        {/* Day events */}
        <div className="min-w-0 h-[600px] animate-fade-in animate-delay-400">
          <PremiumAgentDayEvents
            date={selectedDate}
            events={selectedDayEvents}
            visites={selectedDayVisites}
            clients={clients}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteEvent}
            onEdit={handleEditEvent}
            onMarquerEffectuee={handleMarquerEffectuee}
            onOpenDetail={handleOpenDetail}
            onOpenEventDetail={handleOpenEventDetail}
            onDeleteVisite={handleDeleteVisite}
          />
        </div>
      </div>

      {/* Event form */}
      <EventForm
        open={showEventForm}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        agents={[]}
        clients={clients}
        initialDate={selectedDate || undefined}
        isLoading={isCreating}
        editingEvent={editingEvent}
        mode={formMode}
      />

      {/* Event detail dialog */}
      <Dialog open={eventDetailDialogOpen} onOpenChange={setEventDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détails de l'événement
              {selectedEvent?.status === 'effectue' && <Badge variant="secondary">Effectué</Badge>}
              {selectedEvent?.status === 'annule' && <Badge variant="destructive">Annulé</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  {eventTypeLabels[selectedEvent.event_type] || selectedEvent.event_type}
                </Badge>
                {selectedEvent.priority && (
                  <Badge variant={selectedEvent.priority === 'urgente' ? 'destructive' : selectedEvent.priority === 'haute' ? 'default' : 'secondary'}>
                    {priorityLabels[selectedEvent.priority] || selectedEvent.priority}
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedEvent.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
                </div>
                {!selectedEvent.all_day && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedEvent.event_date), 'HH:mm')}
                  </div>
                )}
                {selectedEvent.all_day && (
                  <Badge variant="outline">Journée entière</Badge>
                )}
              </div>

              {selectedEvent.description && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.client_id && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Client: {getClientName(selectedEvent.client_id)}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEventDetailDialogOpen(false)}>
              Fermer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEventDetailDialogOpen(false);
                if (selectedEvent) handleEditEvent(selectedEvent);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedEvent) handleDeleteEvent(selectedEvent.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

              <div className="space-y-2">
                <Label>Photos/Vidéos de la visite (optionnel)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                    disabled={uploadingMedia}
                    className="flex-1"
                  />
                  {uploadingMedia && (
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>
                {feedbackMedias.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {feedbackMedias.map((media, idx) => (
                      <div key={idx} className="relative group">
                        {media.type.startsWith('image/') ? (
                          <img src={media.url} alt="" className="w-full h-24 object-cover rounded" />
                        ) : (
                          <video src={media.url} className="w-full h-24 object-cover rounded" />
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMedia(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-1 left-1">
                          {media.type.startsWith('image/') ? (
                            <Image className="h-4 w-4 text-white drop-shadow" />
                          ) : (
                            <Video className="h-4 w-4 text-white drop-shadow" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Detail dialog enrichi */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Détails de la visite
              {selectedVisite?.est_deleguee && <Badge className="bg-green-600 text-white">Visite déléguée</Badge>}
              {selectedVisite?.statut === 'effectuee' && <Badge variant="secondary">Effectuée</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-6">
              {/* En-tête avec adresse et date/heure */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-lg">{selectedVisite.adresse}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(selectedVisite.date_visite), 'EEEE d MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(selectedVisite.date_visite), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client */}
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

              {/* SECTION OFFRE COMPLÈTE */}
              {selectedVisite.offres && (
                <div className="space-y-3">
                  <h5 className="font-medium flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Détails de l'offre envoyée
                  </h5>
                  <div className="p-4 border rounded-lg space-y-4">
                    {/* Lien de l'annonce */}
                    {selectedVisite.offres.lien_annonce && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Lien de l'annonce</Label>
                        <div className="mt-1">
                          <LinkPreviewCard url={selectedVisite.offres.lien_annonce} showInline />
                        </div>
                      </div>
                    )}

                    {/* Date d'envoi */}
                    {selectedVisite.offres.date_envoi && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Date d'envoi de l'offre</Label>
                        <p className="text-sm">
                          {format(new Date(selectedVisite.offres.date_envoi), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    )}

                    {/* Grille des caractéristiques */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {selectedVisite.offres.pieces && (
                        <div className="p-2 bg-muted rounded">
                          <p className="text-xs text-muted-foreground">Pièces</p>
                          <p className="font-medium">{selectedVisite.offres.pieces}</p>
                        </div>
                      )}
                      {selectedVisite.offres.surface && (
                        <div className="p-2 bg-muted rounded">
                          <p className="text-xs text-muted-foreground">Surface</p>
                          <p className="font-medium">{selectedVisite.offres.surface} m²</p>
                        </div>
                      )}
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Prix</p>
                        <p className="font-medium">{selectedVisite.offres.prix} CHF/mois</p>
                      </div>
                      {selectedVisite.offres.etage && (
                        <div className="p-2 bg-muted rounded">
                          <p className="text-xs text-muted-foreground">Étage</p>
                          <p className="font-medium">{selectedVisite.offres.etage}</p>
                        </div>
                      )}
                    </div>

                    {/* Disponibilité */}
                    {selectedVisite.offres.disponibilite && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Disponibilité</Label>
                        <p className="text-sm">{selectedVisite.offres.disponibilite}</p>
                      </div>
                    )}

                    {/* Description complète */}
                    {selectedVisite.offres.description && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Description</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted/50 rounded max-h-32 overflow-y-auto">
                          {selectedVisite.offres.description}
                        </p>
                      </div>
                    )}

                    {/* Commentaires agent */}
                    {selectedVisite.offres.commentaires && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Commentaires</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1 p-3 bg-primary/5 rounded">
                          {selectedVisite.offres.commentaires}
                        </p>
                      </div>
                    )}

                    {/* Infos contact */}
                    {(selectedVisite.offres.concierge_nom || selectedVisite.offres.locataire_nom || selectedVisite.offres.code_immeuble) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                        {selectedVisite.offres.code_immeuble && (
                          <div className="p-2 border rounded">
                            <p className="text-xs text-muted-foreground">Code immeuble</p>
                            <p className="font-mono font-medium">{selectedVisite.offres.code_immeuble}</p>
                          </div>
                        )}
                        {selectedVisite.offres.concierge_nom && (
                          <div className="p-2 border rounded">
                            <p className="text-xs text-muted-foreground">Concierge</p>
                            <p className="font-medium">{selectedVisite.offres.concierge_nom}</p>
                            {selectedVisite.offres.concierge_tel && (
                              <a href={`tel:${selectedVisite.offres.concierge_tel}`} className="text-sm text-primary flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {selectedVisite.offres.concierge_tel}
                              </a>
                            )}
                          </div>
                        )}
                        {selectedVisite.offres.locataire_nom && (
                          <div className="p-2 border rounded">
                            <p className="text-xs text-muted-foreground">Locataire actuel</p>
                            <p className="font-medium">{selectedVisite.offres.locataire_nom}</p>
                            {selectedVisite.offres.locataire_tel && (
                              <a href={`tel:${selectedVisite.offres.locataire_tel}`} className="text-sm text-primary flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {selectedVisite.offres.locataire_tel}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION WORKFLOW CANDIDATURE */}
              {selectedVisite.candidature && (
                <div className="space-y-3">
                  <h5 className="font-medium flex items-center gap-2">
                    📋 Étape du dossier
                    <Badge variant={
                      selectedVisite.candidature.statut === 'cles_remises' ? 'default' :
                      selectedVisite.candidature.statut === 'refusee' ? 'destructive' : 'secondary'
                    }>
                      {candidatureStatusLabels[selectedVisite.candidature.statut] || selectedVisite.candidature.statut}
                    </Badge>
                  </h5>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <CandidatureWorkflowTimeline currentStatut={selectedVisite.candidature.statut} />
                  </div>
                  
                  {/* Bouton pour mettre à jour le statut si pas terminé/refusé */}
                  {nextStatusOptions[selectedVisite.candidature.statut] && (
                    <div className="flex flex-wrap gap-2">
                      {nextStatusOptions[selectedVisite.candidature.statut].map((option) => (
                        <Button 
                          key={option.value}
                          variant={option.value === 'refusee' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => handleUpdateCandidatureStatus(selectedVisite.candidature.id, option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes de la visite */}
              {selectedVisite.notes && (
                <div className="space-y-2">
                  <h5 className="font-medium">💬 Notes</h5>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm">{selectedVisite.notes}</p>
                  </div>
                </div>
              )}

              {/* Feedback si effectuée */}
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

          <DialogFooter className="gap-2 pt-4 border-t">
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
