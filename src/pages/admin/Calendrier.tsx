import { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { isSameDay, format, isToday, isThisWeek, isThisMonth, isFuture, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, MapPin, Phone, ExternalLink, Home, User, Building2, Trash2, Download, Pencil } from 'lucide-react';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { buildVisiteICSDescription, downloadMultiEventICSFile, type ICSEventData } from '@/utils/generateICS';
import { buildStableVisiteUID, groupVisitesByPhysique } from '@/utils/visitesCalculator';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/fetchAllWithRange';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CalendarEvent } from '@/components/calendar/types';
import { PremiumEventFilters } from '@/components/calendar/PremiumEventFilters';
import type { EventFormData } from '@/components/calendar/EventForm';
import { PremiumDayEvents } from '@/components/calendar/PremiumDayEvents';
import type { PhoneAppointmentRaw } from '@/components/calendar/PhoneAppointmentDetailDialog';
import { DASH_CARD, DashBadge, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddressLink } from '@/components/AddressLink';
import { getUniqueVisitesByClient } from '@/utils/visitesCalculator';
import { VISIT_DIALOG_CLASS, VisitActionBar, VisitBody, VisitHero, VisitInfoTiles, VisitNote, VisitPersonRow, VisitSection, VisitStatusBadge, formatCHF, offrePhotoUrl } from '@/components/visites/VisitDetailParts';
import CompteRenduVisiteForm from '@/components/visites/CompteRenduVisiteForm';
import { VisitVideoPlayer } from '@/components/calendar/VisitVideoPlayer';
import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { ClientInteretBadge } from '@/components/offres/ClientInteretBadge';
import { getInteretState, isVisiteConfirmedByClient, offreStatutOf } from '@/lib/offreInteret';
import { CreneauxAVenirStrip } from '@/components/calendar/CreneauxAVenirStrip';

const EventManagerCalendar = lazy(() => import('@/components/calendar/EventManagerCalendar').then(m => ({ default: m.EventManagerCalendar })));
const EventForm = lazy(() => import('@/components/calendar/EventForm').then(m => ({ default: m.EventForm })));
const PhoneAppointmentDetailDialog = lazy(() => import('@/components/calendar/PhoneAppointmentDetailDialog').then(m => ({ default: m.PhoneAppointmentDetailDialog })));
const AddClientsToVisiteDialog = lazy(() => import('@/components/calendar/AddClientsToVisiteDialog').then(m => ({ default: m.AddClientsToVisiteDialog })));
const EditVisiteDialog = lazy(() => import('@/components/calendar/EditVisiteDialog').then(m => ({ default: m.EditVisiteDialog })));

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { syncEvent } = useGoogleCalendarSync();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  // Client choices do not depend on the displayed month; do not block the calendar on this large list.
  useEffect(() => {
    let active = true;
    supabase.from('clients').select('id, user_id, profiles!clients_user_id_fkey(prenom, nom)').limit(15000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Clients error:', error);
        else setClients((data as any) || []);
      });
    return () => { active = false; };
  }, []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Visite detail dialog
  const [selectedVisiteGroup, setSelectedVisiteGroup] = useState<any[] | null>(null);
  const [visiteDetailDialogOpen, setVisiteDetailDialogOpen] = useState(false);
  const [addClientsDialogOpen, setAddClientsDialogOpen] = useState(false);
  const [editVisiteOpen, setEditVisiteOpen] = useState(false);

  // Phone appointment detail
  const [phoneAppts, setPhoneAppts] = useState<PhoneAppointmentRaw[]>([]);
  const [selectedPhoneApptId, setSelectedPhoneApptId] = useState<string | null>(null);

  // Filters
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmedOnly, setConfirmedOnly] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fenêtre de dates affichée (mois courant ± 1 mois) — évite de charger tout l'historique
  const [visibleDate, setVisibleDate] = useState<Date>(new Date());
  const rangeStartIso = useMemo(
    () => startOfMonth(subMonths(visibleDate, 1)).toISOString(),
    [visibleDate],
  );
  const rangeEndIso = useMemo(
    () => endOfMonth(addMonths(visibleDate, 1)).toISOString(),
    [visibleDate],
  );

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const rangeStartDate = rangeStartIso.slice(0, 10);
      const rangeEndDate = rangeEndIso.slice(0, 10);

      // Requêtes filtrées CÔTÉ DB sur la fenêtre de dates affichée
      const [eventsRes, visitesRes, agentsRes, candidaturesRes, phoneApptsRes] = await Promise.all([
        fetchAllPaginated(() =>
          supabase.from('calendar_events').select('*')
            .is('visite_id', null)
            .gte('event_date', rangeStartIso)
            .lte('event_date', rangeEndIso)
            .order('event_date', { ascending: true })
        ),
        fetchAllPaginated(() =>
          supabase.from('visites').select('*, offres(*)')
            .gte('date_visite', rangeStartIso)
            .lte('date_visite', rangeEndIso)
            .order('date_visite', { ascending: true })
        ),
        supabase.from('agents').select('id, user_id, profiles!agents_user_id_fkey(prenom, nom)'),
        fetchAllPaginated(() =>
          supabase.from('candidatures')
            .select('id, client_id, offre_id, date_etat_lieux, heure_etat_lieux, date_signature_choisie, statut, clients(id, profiles!clients_user_id_fkey(prenom, nom)), offres(adresse, agent_id)')
            .or(`and(date_etat_lieux.gte.${rangeStartDate},date_etat_lieux.lte.${rangeEndDate}),and(date_signature_choisie.gte.${rangeStartDate},date_signature_choisie.lte.${rangeEndDate})`)
        ),
        supabase.from('lead_phone_appointments')
          .select('id, lead_id, slot_start, slot_end, status, appointment_type, prospect_name, prospect_email, prospect_phone, assigned_agent_id, leads(prenom, nom, email, telephone)')
          .in('status', ['confirme', 'en_attente'])
          .gte('slot_start', rangeStartIso)
          .lte('slot_start', rangeEndIso)
          .order('slot_start', { ascending: true })
          .limit(5000),
      ]);


      // Log results for debugging
      console.log('📅 Calendar data loaded (paginated):', {
        events: eventsRes.data?.length || 0,
        visites: visitesRes.data?.length || 0,
        agents: agentsRes.data?.length || 0,
        candidatures: candidaturesRes.data?.length || 0,
        lastVisite: visitesRes.data?.length ? visitesRes.data[visitesRes.data.length - 1]?.date_visite : 'none',
      });

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

      // Transform phone appointments into virtual calendar events
      const phoneApptEvents: CalendarEvent[] = [];
      const agentsByUserId = new Map<string, any>();
      (agentsRes.data || []).forEach((a: any) => agentsByUserId.set(a.user_id, a));
      (phoneApptsRes.data || []).forEach((appt: any) => {
        if (!appt?.slot_start) return;
        const lead = appt.leads;
        const prospectName = appt.prospect_name
          || (lead ? `${lead.prenom || ''} ${lead.nom || ''}`.trim() : '')
          || 'Prospect';
        const phone = appt.prospect_phone || lead?.telephone || '';
        const email = appt.prospect_email || lead?.email || '';
        const isBureau = appt.appointment_type === 'bureau';
        const assignedAgent = appt.assigned_agent_id ? agentsByUserId.get(appt.assigned_agent_id) : null;
        const agentSuffix = assignedAgent?.profiles
          ? ` · 👤 ${assignedAgent.profiles.prenom || ''} ${(assignedAgent.profiles.nom || '').charAt(0)}.`.trim()
          : '';
        phoneApptEvents.push({
          id: `phone-rdv-${appt.id}`,
          title: (isBureau
            ? `🏢 RDV bureau — ${prospectName}`
            : `📞 RDV téléphonique — ${prospectName}`) + agentSuffix,
          event_date: appt.slot_start,
          end_date: appt.slot_end || undefined,
          event_type: isBureau ? 'rendez_vous' : 'rdv_telephonique',
          status: appt.status === 'confirme' ? 'effectue' : 'planifie',
          agent_id: assignedAgent?.id,
          description: isBureau
            ? `Au bureau Crissier\nTéléphone : ${phone}\nEmail : ${email}`
            : `Téléphone : ${phone}\nEmail : ${email}`,
          all_day: false,
        });
      });


      setEvents([...(eventsRes.data || []), ...candidatureEvents, ...phoneApptEvents]);
      setVisites(visitesRes.data || []);
      setAgents((agentsRes.data as any) || []);
      setPhoneAppts((phoneApptsRes.data as any) || []);
      
      if (!eventsRes.error && !visitesRes.error) {
        console.log(`✅ Calendrier chargé: ${(eventsRes.data || []).length + candidatureEvents.length + phoneApptEvents.length} événements, ${visitesRes.data?.length || 0} visites`);
      }
    } catch (error: any) {
      console.error('Error loading calendar data:', error);
      if (!silent) toast.error('Erreur lors du chargement des données: ' + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeStartIso, rangeEndIso]);

  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  // Recharge à chaque changement de fenêtre de dates (navigation de mois).
  // Seul le 1er chargement affiche le loader plein écran : ensuite, rechargement
  // silencieux pour ne pas démonter le calendrier (qui repartirait au mois courant).
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    const isRefetch = hasLoadedOnceRef.current;
    hasLoadedOnceRef.current = true;
    loadData(isRefetch);
  }, [loadData]);

  // Debounced reload for realtime events (silent — no spinner)
  const debouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadDataRef.current(true);
    }, 2500);
  }, []);

  // Realtime subscriptions + polling fallback
  useEffect(() => {


    // Realtime subscriptions
    const channel = supabase
      .channel('admin-calendar-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visites' }, () => {
        debouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        debouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidatures' }, () => {
        debouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_phone_appointments' }, () => {
        debouncedReload();
      })
      .subscribe();

    // Polling fallback (silent) every 120s
    const pollInterval = setInterval(() => {
      loadDataRef.current(true);
    }, 120000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (confirmedOnly) {
        const isConfirmed = isVisiteConfirmedByClient(offreStatutOf(visite));
        const isDelegated = ['confirmee', 'deleguee', 'a_deleguer'].includes(visite.statut);
        const hasNoOffre = !visite.offre_id;
        if (!isConfirmed && !isDelegated && !hasNoOffre) return false;
      }
      return true;
    });
  }, [visites, filterAgent, filterClient, filterEventType, filterStatus, confirmedOnly]);

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

      // Sync to Google Calendar
      if (user) {
        syncEvent(user.id, {
          title: formData.title,
          description: formData.description || undefined,
          start: eventDate.toISOString(),
          allDay: formData.all_day,
        });
      }

      toast.success('Événement créé avec succès');
      setShowEventForm(false);
      loadData(true);
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
      loadData(true);
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Handle virtual events (signature, état des lieux, RDV téléphonique)
      if (eventId.startsWith('signature-')) {
        const candidatureId = eventId.replace('signature-', '');
        const { error } = await supabase
          .from('candidatures')
          .update({ date_signature_choisie: null })
          .eq('id', candidatureId);

        if (error) throw error;
        toast.success('Date de signature supprimée');
        loadData(true);
        return;
      }

      if (eventId.startsWith('etat-lieux-')) {
        const candidatureId = eventId.replace('etat-lieux-', '');
        const { error } = await supabase
          .from('candidatures')
          .update({ date_etat_lieux: null, heure_etat_lieux: null })
          .eq('id', candidatureId);

        if (error) throw error;
        toast.success('Date d\'état des lieux supprimée');
        loadData(true);
        return;
      }

      if (eventId.startsWith('phone-rdv-')) {
        const apptId = eventId.replace('phone-rdv-', '');
        const { error } = await supabase
          .from('lead_phone_appointments')
          .update({ status: 'annule' })
          .eq('id', apptId);

        if (error) throw error;
        toast.success('RDV téléphonique annulé');
        loadData(true);
        return;
      }

      // Regular calendar events
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Événement supprimé');
      loadData(true);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteVisite = async (visiteId: string) => {
    try {
      const { error } = await supabase
        .from('visites')
        .delete()
        .eq('id', visiteId);

      if (error) throw error;

      toast.success('Visite supprimée');
      loadData(true);
    } catch (error: any) {
      console.error('Error deleting visite:', error);
      toast.error('Erreur lors de la suppression de la visite');
    }
  };

  const handleDeleteVisiteGroup = async (visiteGroup: any[]) => {
    try {
      for (const visite of visiteGroup) {
        const { error } = await supabase
          .from('visites')
          .delete()
          .eq('id', visite.id);

        if (error) throw error;
      }

      toast.success('Visite(s) supprimée(s)');
      setVisiteDetailDialogOpen(false);
      loadData(true);
    } catch (error: any) {
      console.error('Error deleting visite group:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDelegateToCoursier = async (group: any[]) => { if (!group || group.length === 0) return; try { const ids = group.map((v: any) => v.id); const { error } = await supabase.from('visites').update({ statut_coursier: 'en_attente', est_deleguee: true }).in('id', ids); if (error) throw error; toast.success('Visite deleguee au pool coursier (' + ids.length + ' client' + (ids.length > 1 ? 's' : '') + ')'); setVisiteDetailDialogOpen(false); loadData(true); } catch (e: any) { toast.error('Erreur lors de la delegation'); } }; const handleVisiteGroupClick = (visiteGroup: any[]) => {
    setSelectedVisiteGroup(visiteGroup);
    setVisiteDetailDialogOpen(true);
  };

  // Deep link: /admin/calendrier?visiteId=<id> -> ouvre la fiche de cette visite
  useEffect(() => {
    const visiteId = searchParams.get('visiteId');
    if (!visiteId || visites.length === 0) return;
    const target = visites.find((v: any) => v.id === visiteId);
    if (!target) return;
    const group = visites.filter(
      (v: any) => v.adresse === target.adresse && v.date_visite === target.date_visite,
    );
    setSelectedDate(new Date(target.date_visite));
    setVisibleDate(new Date(target.date_visite));
    setSelectedVisiteGroup(group.length > 0 ? group : [target]);
    setVisiteDetailDialogOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('visiteId');
    setSearchParams(next, { replace: true });
  }, [visites, searchParams, setSearchParams]);

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

  return (
    <DashPage className="space-y-4 md:space-y-6">
      {/* Header */}
      <DashPageHeader
        title="Calendrier"
        subtitle="Gérez les rendez-vous, rappels et visites"
        action={
          <Button onClick={() => setShowEventForm(true)} size="sm" className="gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Nouvel événement
          </Button>
        }
      />
      {loading && <p className="text-xs text-muted-foreground" role="status">Chargement des événements…</p>}

      {/* Mobile: Filters collapsible */}
      <details className="lg:hidden">
        <summary className={`${DASH_CARD} cursor-pointer p-3 text-sm font-medium text-foreground`}>
          Filtres avancés
        </summary>
        <div className="mt-3">
          <PremiumEventFilters
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

      {/* Confirmed-only toggle */}
      <DashFilterPills
        label="Visites affichées"
        options={[
          { key: 'confirmees', label: 'Confirmées par le client' },
          { key: 'toutes', label: 'Toutes' },
        ]}
        value={confirmedOnly ? 'confirmees' : 'toutes'}
        onChange={(key) => setConfirmedOnly(key === 'confirmees')}
      />

      <CreneauxAVenirStrip />


      {/* Batch Calendar Export */}
      {filteredVisites.length > 0 && (
        <div className={`${DASH_CARD} flex flex-wrap items-center gap-2 p-3 md:p-4`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <Download className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-foreground mr-1">Exporter au calendrier :</span>
          {[
            { label: "Aujourd'hui", filter: (v: any) => isToday(new Date(v.date_visite)) },
            { label: 'Cette semaine', filter: (v: any) => isThisWeek(new Date(v.date_visite), { weekStartsOn: 1 }) },
            { label: 'Ce mois', filter: (v: any) => isThisMonth(new Date(v.date_visite)) },
            { label: 'Tout à venir', filter: (v: any) => isFuture(new Date(v.date_visite)) || isToday(new Date(v.date_visite)) },
          ].map(({ label, filter }) => {
            const filtered = filteredVisites.filter(filter);
            return (
              <Button
                key={label}
                variant="outline"
                size="sm"
                disabled={filtered.length === 0}
                onClick={() => {
                  // Regrouper les visites en double (même adresse + même date) → 1 seul .ics par visite physique
                  const groups = groupVisitesByPhysique(filtered as any[]);
                  const icsEvents: ICSEventData[] = groups.map(g => {
                    const v: any = g.representative;
                    const offre = v.offres;
                    const clientNames = g.items
                      .map((it: any) => getClientName(it.client_id))
                      .filter(Boolean)
                      .join(', ');
                    const agentName = getAgentName(v.agent_id);
                    const suffix = g.count > 1 ? ` (${g.count} clients)` : '';
                    return {
                      uid: buildStableVisiteUID(v.adresse || offre?.adresse || '', v.date_visite),
                      title: `Visite - ${v.adresse || offre?.adresse || 'Adresse inconnue'}${suffix}`,
                      description: buildVisiteICSDescription({
                        clients: clientNames || undefined,
                        agent: agentName || undefined,
                        adresse: v.adresse || offre?.adresse,
                        prix: offre?.prix ? `${Number(offre.prix).toLocaleString('fr-CH')} CHF` : undefined,
                        pieces: offre?.pieces,
                        surface: offre?.surface,
                        etage: offre?.etage,
                        notes: v.notes || undefined,
                        lien_annonce: offre?.lien_annonce || undefined,
                        description: offre?.description || undefined,
                      }),
                      location: v.adresse || offre?.adresse || '',
                      startDate: new Date(v.date_visite),
                    };
                  });
                  downloadMultiEventICSFile(icsEvents, `visites_${label.replace(/[^a-zA-Z]/g, '_').toLowerCase()}.ics`);
                  toast.success(`${groups.length} visite(s) exportée(s)${filtered.length > groups.length ? ` (${filtered.length - groups.length} doublon(s) regroupé(s))` : ''}`);
                }}
                className="gap-1.5 rounded-full"
              >
                {label} ({filtered.length})
              </Button>
            );
          })}
        </div>
      )}

      {/* Main content - responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 min-w-0 w-full">
        {/* Filters sidebar - desktop only */}
        <div className="hidden lg:block lg:col-span-1 min-w-0">
          <PremiumEventFilters
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
          <Suspense fallback={<div className="h-72 rounded-2xl bg-muted/40" role="status" aria-label="Chargement du calendrier" />}>
          <EventManagerCalendar
            events={filteredEvents}
            visites={filteredVisites}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onVisibleDateChange={setVisibleDate}
            onEventClick={(item, type) => {
              if (type === 'visite') {
                handleVisiteGroupClick(item.groupedClients || [item]);
              }
            }}
          />
          </Suspense>
        </div>

        {/* Day events */}
        <div className="lg:col-span-1 min-w-0 h-[400px] md:h-[600px]">
          <PremiumDayEvents
            date={selectedDate}
            events={selectedDayEvents}
            visites={selectedDayVisites}
            agents={agents}
            clients={clients}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteEvent}
            onDeleteVisite={handleDeleteVisite}
            onVisiteGroupClick={handleVisiteGroupClick}
            onPhoneApptClick={(id) => setSelectedPhoneApptId(id)}
          />
        </div>
      </div>

      {/* Phone appointment detail dialog */}
      {selectedPhoneApptId && <Suspense fallback={null}><PhoneAppointmentDetailDialog
        appt={phoneAppts.find((a) => a.id === selectedPhoneApptId) || null}
        open={!!selectedPhoneApptId}
        onClose={() => setSelectedPhoneApptId(null)}
        onCancelled={() => loadData(true)}
        assignableAgents={agents}
      /></Suspense>}

      {/* Event form modal */}
      {showEventForm && <Suspense fallback={null}><EventForm
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSubmit={handleCreateEvent}
        agents={agents}
        clients={clients}
        initialDate={selectedDate || undefined}
        isLoading={isCreating}
      /></Suspense>}

      {/* Visite detail dialog */}
      <Dialog open={visiteDetailDialogOpen} onOpenChange={setVisiteDetailDialogOpen}>
        <DialogContent className={VISIT_DIALOG_CLASS}>
          {selectedVisiteGroup && selectedVisiteGroup.length > 0 ? (() => {
            const v0 = selectedVisiteGroup[0];
            const o = v0.offres;
            const uniqueClients = getUniqueVisitesByClient(selectedVisiteGroup);
            return (
              <>
                <VisitHero
                  TitleAs={DialogTitle}
                  date={v0.date_visite}
                  endDate={v0.date_visite_fin}
                  kicker="Détails de la visite"
                  badges={
                    <>
                      <VisitStatusBadge statut={v0.statut} />
                      {v0.est_deleguee
                        ? <DashBadge tone="primary">Visite déléguée</DashBadge>
                        : isVisiteConfirmedByClient(o?.statut)
                          ? <DashBadge tone="success">Client s'en occupe</DashBadge>
                          : <DashBadge tone="muted">Décision en attente</DashBadge>}
                      {o?.envoi_auto && <DashBadge tone="neutral">Offre automatique</DashBadge>}
                    </>
                  }
                  address={v0.adresse}
                  photoUrl={offrePhotoUrl(o)}
                  title={o?.titre}
                />

                <VisitBody>
                  {v0.id && (
                    <VisitLiveButton
                      visiteId={v0.id}
                      dateVisite={v0.date_visite}
                      size="default"
                      className="h-12 w-full"
                    />
                  )}

                  {/* Intérêt du client */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Intérêt du client</span>
                      <ClientInteretBadge statutOffre={o?.statut} />
                    </div>
                    {getInteretState(o?.statut).key === 'attente' && (
                      <VisitNote tone="warning">À CONFIRMER — le client n'a pas encore répondu, la visite n'est pas ferme.</VisitNote>
                    )}
                    {o?.envoi_auto && (
                      <p className="text-sm text-muted-foreground">Visite programmée par la recherche automatique</p>
                    )}
                  </div>

                  {/* Infos clés */}
                  <VisitInfoTiles
                    items={[
                      { icon: Home, label: 'Type', value: o?.type_bien },
                      { label: 'Pièces', value: o?.pieces },
                      { label: 'Surface', value: o?.surface ? `${o.surface} m²` : undefined },
                      { label: 'Étage', value: o?.etage },
                      { label: 'Loyer / prix', value: o?.prix ? formatCHF(o.prix) : undefined },
                      { label: 'Disponibilité', value: o?.disponibilite },
                    ]}
                  />

                  {/* Contacts sur place */}
                  {(o?.concierge_nom || o?.locataire_nom || o?.code_immeuble) && (
                    <VisitSection icon={Phone} title="Contact sur place">
                      {o.code_immeuble && (
                        <VisitPersonRow role="Code immeuble" name={<span className="font-mono">{o.code_immeuble}</span>} />
                      )}
                      {o.concierge_nom && (
                        <VisitPersonRow
                          role="Concierge"
                          name={o.concierge_nom}
                          sub={o.concierge_tel || undefined}
                          action={o.concierge_tel ? (
                            <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label={`Appeler ${o.concierge_nom}`}>
                              <a href={`tel:${o.concierge_tel}`}><Phone className="h-4 w-4" /></a>
                            </Button>
                          ) : undefined}
                        />
                      )}
                      {o.locataire_nom && (
                        <VisitPersonRow
                          role="Locataire actuel"
                          name={o.locataire_nom}
                          sub={o.locataire_tel || undefined}
                          action={o.locataire_tel ? (
                            <Button asChild variant="outline" size="icon" className="h-11 w-11" aria-label={`Appeler ${o.locataire_nom}`}>
                              <a href={`tel:${o.locataire_tel}`}><Phone className="h-4 w-4" /></a>
                            </Button>
                          ) : undefined}
                        />
                      )}
                    </VisitSection>
                  )}

                  {/* Participants */}
                  <VisitSection
                    icon={User}
                    title={`Participants (${uniqueClients.length} client${uniqueClients.length > 1 ? 's' : ''})`}
                    action={
                      <Button size="sm" variant="outline" className="min-h-9" onClick={() => setAddClientsDialogOpen(true)}>
                        <Plus className="h-4 w-4" /> Ajouter
                      </Button>
                    }
                  >
                    {uniqueClients.map((visite: any) => (
                      <VisitPersonRow
                        key={visite.client_id}
                        role="Client"
                        name={getClientName(visite.client_id) || 'Client inconnu'}
                        action={
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-10"
                            onClick={() => {
                              setVisiteDetailDialogOpen(false);
                              navigate(`/admin/clients/${visite.client_id}`);
                            }}
                          >
                            Voir client
                          </Button>
                        }
                      />
                    ))}
                    {v0.agent_id && (
                      <VisitPersonRow role="Agent responsable" name={getAgentName(v0.agent_id) || 'Agent'} />
                    )}
                  </VisitSection>

                  {/* Description */}
                  {o?.description && (
                    <VisitSection icon={Building2} title="Description du bien">
                      <VisitNote>{o.description}</VisitNote>
                    </VisitSection>
                  )}

                  {/* Notes */}
                  {v0.notes && (
                    <VisitSection icon={Pencil} title="Notes">
                      <VisitNote tone="warning">{v0.notes}</VisitNote>
                    </VisitSection>
                  )}

                  {/* Lien de l'annonce */}
                  {o?.lien_annonce && (
                    <VisitSection icon={ExternalLink} title="Lien de l'annonce">
                      <div className="min-w-0 overflow-hidden">
                        <LinkPreviewCard url={o.lien_annonce} showInline />
                      </div>
                    </VisitSection>
                  )}

                  {/* Vidéo(s) de la visite — lecteur inline */}
                  <VisitVideoPlayer medias={v0.medias} />

                  {/* Compte rendu (formulaire partagé admin/agent/coursier) — une seule entrée « Ajouter photo / vidéo » */}
                  <CompteRenduVisiteForm
                    role="admin"
                    visiteId={v0.id}
                    embedded
                    videoShare={{ visite: v0, visitesGroup: selectedVisiteGroup, onUploaded: () => loadData(true) }}
                  />
                </VisitBody>

                <VisitActionBar
                  primary={
                    <Button variant="default" onClick={() => handleDelegateToCoursier(selectedVisiteGroup || [])}>
                      <User className="h-4 w-4" /> Déléguer au coursier
                    </Button>
                  }
                >
                  <Button variant="outline" onClick={() => setEditVisiteOpen(true)}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  <AddToCalendarButton
                    event={{
                      uid: buildStableVisiteUID(v0.adresse || '', v0.date_visite),
                      title: `Visite - ${o?.titre || v0.adresse || 'Visite'}`,
                      description: buildVisiteICSDescription({
                        clients: uniqueClients
                          .map((v: any) => getClientName(v.client_id) || 'Inconnu')
                          .join(', '),
                        agent: getAgentName(v0.agent_id) || undefined,
                        adresse: v0.adresse,
                        prix: o?.prix ? `${o.prix} CHF/mois` : undefined,
                        pieces: o?.pieces,
                        surface: o?.surface,
                        etage: o?.etage,
                        notes: v0.notes,
                        lien_annonce: o?.lien_annonce,
                        description: o?.description,
                      }),
                      location: v0.adresse || '',
                      startDate: new Date(v0.date_visite),
                    }}
                    variant="outline"
                    size="sm"
                  />
                  {o?.lien_annonce && (
                    <Button variant="outline" onClick={() => window.open(o.lien_annonce, '_blank')}>
                      <ExternalLink className="h-4 w-4" /> Annonce
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette visite sera supprimée pour tous les clients concernés.
                          Ils ne la verront plus dans leur calendrier.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDeleteVisiteGroup(selectedVisiteGroup)}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </VisitActionBar>
              </>
            );
          })() : (
            <DialogTitle className="sr-only">Détails de la visite</DialogTitle>
          )}
        </DialogContent>
      </Dialog>

      {addClientsDialogOpen && selectedVisiteGroup && selectedVisiteGroup[0] && (
        <Suspense fallback={null}><AddClientsToVisiteDialog
          open={addClientsDialogOpen}
          onOpenChange={setAddClientsDialogOpen}
          sourceOffre={selectedVisiteGroup[0].offres || { adresse: selectedVisiteGroup[0].adresse, agent_id: selectedVisiteGroup[0].agent_id }}
          adresse={selectedVisiteGroup[0].adresse}
          dateVisite={selectedVisiteGroup[0].date_visite}
          dateVisiteFin={selectedVisiteGroup[0].date_visite_fin}
          existingClientIds={getUniqueVisitesByClient(selectedVisiteGroup).map((v: any) => v.client_id).filter(Boolean)}
          availableClients={clients as any}
          sourceMedias={selectedVisiteGroup[0].medias}
          onSuccess={() => loadData(true)}
        /></Suspense>
      )}

      {editVisiteOpen && <Suspense fallback={null}><EditVisiteDialog
        open={editVisiteOpen}
        onOpenChange={setEditVisiteOpen}
        visite={selectedVisiteGroup?.[0] || null}
        visitesGroup={selectedVisiteGroup || undefined}
        onSaved={() => {
          setVisiteDetailDialogOpen(false);
          setSelectedVisiteGroup(null);
          loadData(true);
        }}
      /></Suspense>}
    </DashPage>
  );
}
