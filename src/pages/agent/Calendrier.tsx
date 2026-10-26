import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AddressLink } from '@/components/AddressLink';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, AlertTriangle, ThumbsUp, Minus, ThumbsDown, User, Clock, Calendar, Pencil, Trash2, MapPin, Home, Phone, Upload, X, Image, Video, Loader2, Filter, Share2 } from 'lucide-react';
import { AgentCalendarShareDialog } from '@/components/agent/calendar/AgentCalendarShareDialog';
import { useAgentCalendarShares } from '@/hooks/useAgentCalendarShares';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
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
import { EventManagerCalendar } from '@/components/calendar/EventManagerCalendar';
import { PhoneAppointmentDetailDialog, type PhoneAppointmentRaw } from '@/components/calendar/PhoneAppointmentDetailDialog';
import { VISIT_DIALOG_CLASS, VisitActionBar, VisitBody, VisitHero, VisitInfoTiles, VisitNote, VisitPersonRow, VisitSection, VisitStatusBadge, formatCHF, offrePhotoUrl } from '@/components/visites/VisitDetailParts';
import { formatZurichDateTime, formatZurichDay, formatZurichTime } from '@/lib/dateZurich';
import CompteRenduVisiteForm from '@/components/visites/CompteRenduVisiteForm';
import { VisitVideoPlayer } from '@/components/calendar/VisitVideoPlayer';
import { AddClientsToVisiteDialog } from '@/components/calendar/AddClientsToVisiteDialog';
import { EditVisiteDialog } from '@/components/calendar/EditVisiteDialog';
import { EventForm, EventFormData } from '@/components/calendar/EventForm';
import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { PremiumAgentDayEvents } from '@/components/calendar/PremiumAgentDayEvents';
import { DASH_CARD, DashBadge, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { useNotifications } from '@/hooks/useNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CandidatureWorkflowTimeline } from '@/components/CandidatureWorkflowTimeline';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClientInteretBadge } from '@/components/offres/ClientInteretBadge';
import { getInteretState, isVisiteConfirmedByClient, offreStatutOf } from '@/lib/offreInteret';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { markTypeAsRead } = useNotifications();
  const { syncEvent } = useGoogleCalendarSync();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [phoneAppts, setPhoneAppts] = useState<PhoneAppointmentRaw[]>([]);
  const [selectedPhoneApptId, setSelectedPhoneApptId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit mode
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Filter
  const [filterClient, setFilterClient] = useState('all');
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  // Scope: 'mine' (default, performant) | 'co' | 'all'
  const [scope, setScope] = useState<'mine' | 'co' | 'all'>('mine');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { sharedAgentIds, incoming: incomingShares } = useAgentCalendarShares();

  // Dialogs
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [eventDetailDialogOpen, setEventDetailDialogOpen] = useState(false);
  const [addClientsDialogOpen, setAddClientsDialogOpen] = useState(false);
  const [editVisiteOpen, setEditVisiteOpen] = useState(false);
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
  }, [user?.id, showFullHistory, scope, sharedAgentIds.join(',')]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get agent ID
      const { data: agentData, error: agentErr } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (agentErr) {
        console.error('[Calendrier] agent lookup failed:', agentErr);
        toast.error('Impossible de charger votre profil agent');
        setLoading(false);
        return;
      }
      if (!agentData) {
        setLoading(false);
        return;
      }

      setAgentId(agentData.id);

      // Co-assigned client IDs
      const { data: clientAgentsData, error: caErr } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);
      if (caErr) console.warn('[Calendrier] client_agents query error:', caErr);
      const coClientIds = clientAgentsData?.map(ca => ca.client_id) || [];

      // Sliding window
      const today = new Date();
      const pastCutoff = new Date(today); pastCutoff.setDate(pastCutoff.getDate() - 14);
      const futureCutoff = new Date(today); futureCutoff.setDate(futureCutoff.getDate() + 90);
      const pastIso = pastCutoff.toISOString();
      const futureIso = futureCutoff.toISOString();

      const includeMine = scope === 'mine' || scope === 'all';
      const includeCo = (scope === 'co' || scope === 'all') && coClientIds.length > 0;

      // --- VISITES : split queries (own + co-assigned) — same pattern as Visites.tsx ---
      const visitesSelect = '*, offres(id, adresse, prix, pieces, surface, statut, envoi_auto), clients!visites_client_id_fkey(id, user_id), agents:agent_id(id, user_id, profiles!agents_user_id_fkey(prenom, nom))';
      const eventsSelect = '*, agents:agent_id(id, user_id, profiles!agents_user_id_fkey(prenom, nom))';

      const buildVisiteQuery = (filter: 'mine' | 'co') => {
        let q = supabase.from('visites').select(visitesSelect).order('date_visite', { ascending: true }).limit(15000);
        if (filter === 'mine') q = q.eq('agent_id', agentData.id);
        else q = q.in('client_id', coClientIds).neq('agent_id', agentData.id);
        if (!showFullHistory) q = q.gte('date_visite', pastIso).lte('date_visite', futureIso);
        return q;
      };
      const buildEventsQuery = (filter: 'mine' | 'co') => {
        let q = supabase.from('calendar_events').select(eventsSelect).is('visite_id', null).order('event_date', { ascending: true }).limit(15000);
        if (filter === 'mine') q = q.eq('agent_id', agentData.id);
        else q = q.in('client_id', coClientIds).neq('agent_id', agentData.id);
        if (!showFullHistory) q = q.gte('event_date', pastIso).lte('event_date', futureIso);
        return q;
      };

      const visitePromises: Promise<any>[] = [];
      const eventPromises: Promise<any>[] = [];
      if (includeMine) { visitePromises.push(Promise.resolve(buildVisiteQuery('mine'))); eventPromises.push(Promise.resolve(buildEventsQuery('mine'))); }
      if (includeCo)   { visitePromises.push(Promise.resolve(buildVisiteQuery('co')));   eventPromises.push(Promise.resolve(buildEventsQuery('co'))); }

      // Shared agents (calendar sharing feature) — always included when partages actifs
      if (sharedAgentIds.length > 0) {
        let qv = supabase.from('visites').select(visitesSelect).order('date_visite', { ascending: true }).limit(15000)
          .in('agent_id', sharedAgentIds);
        if (!showFullHistory) qv = qv.gte('date_visite', pastIso).lte('date_visite', futureIso);
        visitePromises.push(Promise.resolve(qv));

        let qe = supabase.from('calendar_events').select(eventsSelect).is('visite_id', null).order('event_date', { ascending: true }).limit(15000)
          .in('agent_id', sharedAgentIds);
        if (!showFullHistory) qe = qe.gte('event_date', pastIso).lte('event_date', futureIso);
        eventPromises.push(Promise.resolve(qe));
      }

      const [visitesResults, eventsResults, clientsRes, ownClientsRes] = await Promise.all([
        Promise.all(visitePromises),
        Promise.all(eventPromises),
        coClientIds.length > 0
          ? supabase
              .from('clients')
              .select('id, user_id, profiles!clients_user_id_fkey(prenom, nom)')
              .in('id', coClientIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from('clients')
          .select('id, user_id, profiles!clients_user_id_fkey(prenom, nom)')
          .eq('agent_id', agentData.id)
          .limit(15000),
      ]);

      // Surface query errors instead of silently showing an empty calendar
      const queryErrors: string[] = [];
      visitesResults.forEach((r, i) => { if (r.error) { console.error('[Calendrier] visites query error', i, r.error); queryErrors.push(`visites: ${r.error.message}`); } });
      eventsResults.forEach((r, i) => { if (r.error) { console.error('[Calendrier] events query error', i, r.error); queryErrors.push(`events: ${r.error.message}`); } });
      if ((clientsRes as any).error) { console.error('[Calendrier] clients error:', (clientsRes as any).error); queryErrors.push(`clients: ${(clientsRes as any).error.message}`); }

      // Merge + dedupe
      const visiteMap = new Map<string, any>();
      visitesResults.forEach(r => (r.data || []).forEach((v: any) => { if (!visiteMap.has(v.id)) visiteMap.set(v.id, v); }));
      const visitesRaw = Array.from(visiteMap.values());

      const eventMap = new Map<string, any>();
      eventsResults.forEach(r => (r.data || []).forEach((e: any) => { if (!eventMap.has(e.id)) eventMap.set(e.id, e); }));
      const eventsRaw = Array.from(eventMap.values());

      console.log('[Calendrier] loaded', {
        agentId: agentData.id,
        scope,
        showFullHistory,
        coClientIds: coClientIds.length,
        visites: visitesRaw.length,
        events: eventsRaw.length,
        errors: queryErrors,
      });

      if (queryErrors.length > 0) {
        toast.error(`Chargement partiel du calendrier (${queryErrors.length} erreur${queryErrors.length > 1 ? 's' : ''}). Voir la console.`);
      }

      // Candidatures
      const offreIds = visitesRaw.map(v => v.offre_id).filter(Boolean);
      const clientIdsFromVisites = visitesRaw.map(v => v.client_id).filter(Boolean);
      const candidaturesMap = new Map();
      if (offreIds.length > 0 && clientIdsFromVisites.length > 0) {
        const { data: candidatures, error: candErr } = await supabase
          .from('candidatures')
          .select('*')
          .in('offre_id', offreIds)
          .in('client_id', clientIdsFromVisites);
        if (candErr) console.warn('[Calendrier] candidatures error:', candErr);
        candidatures?.forEach(c => candidaturesMap.set(`${c.offre_id}-${c.client_id}`, c));
      }

      // Profiles
      const clientUserIds = visitesRaw.map(v => v.clients?.user_id).filter(Boolean);
      let profilesMap = new Map<string, any>();
      if (clientUserIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientUserIds);
        if (profErr) console.warn('[Calendrier] profiles error:', profErr);
        profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      const visitesWithProfiles = visitesRaw.map(v => {
        const sharedAgent = v.agents as any;
        const isShared = v.agent_id !== agentData.id;
        return {
          ...v,
          client_profile: profilesMap.get(v.clients?.user_id),
          candidature: candidaturesMap.get(`${v.offre_id}-${v.client_id}`) || null,
          is_shared: isShared,
          shared_by_name: isShared && sharedAgent?.profiles
            ? `${sharedAgent.profiles.prenom ?? ''} ${(sharedAgent.profiles.nom ?? '').charAt(0)}.`.trim()
            : null,
        };
      });

      const eventsWithSharedFlag = eventsRaw.map((e: any) => {
        const sharedAgent = e.agents;
        const isShared = e.agent_id !== agentData.id;
        return {
          ...e,
          is_shared: isShared,
          shared_by_name: isShared && sharedAgent?.profiles
            ? `${sharedAgent.profiles.prenom ?? ''} ${(sharedAgent.profiles.nom ?? '').charAt(0)}.`.trim()
            : null,
        };
      });

      // Phone/office appointments assigned to this agent
      const { data: phoneApptsData, error: phoneErr } = await supabase
        .from('lead_phone_appointments')
        .select('id, lead_id, slot_start, slot_end, status, appointment_type, prospect_name, prospect_email, prospect_phone, assigned_agent_id, leads(prenom, nom, email, telephone)')
        .eq('assigned_agent_id', user.id)
        .in('status', ['confirme', 'en_attente'])
        .order('slot_start', { ascending: true })
        .limit(2000);
      if (phoneErr) console.warn('[Calendrier] phone appts error:', phoneErr);

      const phoneApptEvents: CalendarEvent[] = (phoneApptsData || []).map((appt: any) => {
        const lead = appt.leads;
        const prospectName = appt.prospect_name
          || (lead ? `${lead.prenom || ''} ${lead.nom || ''}`.trim() : '')
          || 'Prospect';
        const phone = appt.prospect_phone || lead?.telephone || '';
        const email = appt.prospect_email || lead?.email || '';
        const isBureau = appt.appointment_type === 'bureau';
        return {
          id: `phone-rdv-${appt.id}`,
          title: isBureau
            ? `🏢 RDV bureau — ${prospectName}`
            : `📞 RDV téléphonique — ${prospectName}`,
          event_date: appt.slot_start,
          end_date: appt.slot_end || undefined,
          event_type: isBureau ? 'rendez_vous' : 'rdv_telephonique',
          status: appt.status === 'confirme' ? 'planifie' : 'planifie',
          description: isBureau
            ? `Au bureau Crissier\nTéléphone : ${phone}\nEmail : ${email}`
            : `Téléphone : ${phone}\nEmail : ${email}`,
          all_day: false,
        } as CalendarEvent;
      });

      setPhoneAppts((phoneApptsData as any) || []);
      setEvents([...eventsWithSharedFlag, ...phoneApptEvents]);
      setVisites(visitesWithProfiles);
      const mergedClientsMap = new Map<string, any>();
      ((clientsRes.data as any) || []).forEach((c: any) => mergedClientsMap.set(c.id, c));
      ((ownClientsRes.data as any) || []).forEach((c: any) => mergedClientsMap.set(c.id, c));
      setClients(Array.from(mergedClientsMap.values()));
    } catch (error: any) {
      console.error('[Calendrier] fatal load error:', error);
      toast.error(`Erreur lors du chargement: ${error?.message || 'inconnue'}`);
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
      if (confirmedOnly) {
        const isConfirmed = isVisiteConfirmedByClient(offreStatutOf(visite));
        const isDelegated = ['confirmee', 'deleguee', 'a_deleguer'].includes(visite.statut);
        const hasNoOffre = !visite.offre_id;
        if (!isConfirmed && !isDelegated && !hasNoOffre) return false;
      }
      return true;
    });
  }, [visites, filterClient, confirmedOnly]);

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

      // Send ICS invite if client is selected
      if (formData.client_id) {
        const client = clients.find(c => c.id === formData.client_id);
        if (client?.profiles) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', client.user_id)
            .maybeSingle();
          
          if (profile?.email) {
            supabase.functions.invoke('send-calendar-invite', {
              body: {
                title: formData.title,
                description: formData.description || '',
                start_date: eventDate.toISOString(),
                end_date: new Date(eventDate.getTime() + 3600000).toISOString(),
                all_day: formData.all_day,
                recipient_email: profile.email,
              },
            });
          }
        }
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

  const handleDelegateToCoursier = async (v: any) => { if (!v) return; try { const { error } = await supabase.from('visites').update({ statut_coursier: 'en_attente', est_deleguee: true }).eq('adresse', v.adresse).eq('date_visite', v.date_visite); if (error) throw error; toast.success('Visite deleguee au pool coursier'); setDetailDialogOpen(false); } catch (e: any) { toast.error('Erreur lors de la delegation'); } }; const handleOpenDetail = (visite: any) => {
    setSelectedVisite(visite);
    setDetailDialogOpen(true);
  };

  // Deep link: /agent/calendrier?visiteId=<id> -> ouvre la fiche de cette visite
  useEffect(() => {
    const visiteId = searchParams.get('visiteId');
    if (!visiteId || visites.length === 0) return;
    const target = visites.find((v: any) => v.id === visiteId);
    if (!target) return;
    setSelectedDate(new Date(target.date_visite));
    setSelectedVisite(target);
    setDetailDialogOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('visiteId');
    setSearchParams(next, { replace: true });
  }, [visites, searchParams, setSearchParams]);

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
    if (event.id?.startsWith('phone-rdv-')) {
      setSelectedPhoneApptId(event.id.replace('phone-rdv-', ''));
      return;
    }
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement du calendrier...</p>
      </div>
    );
  }

  return (
    <DashPage className="space-y-6">
      {/* Header */}
      <DashPageHeader
        title="Mon calendrier"
        subtitle={
          <>
            <span className="font-medium text-foreground">{visites.filter(v => v.statut === 'planifiee' && new Date(v.date_visite) >= new Date()).length}</span> visites confirmées
            <span className="mx-2">•</span>
            <span className="font-medium text-foreground">{visites.filter(v => v.statut === 'proposee').length}</span> en attente
            <span className="mx-2">•</span>
            <span className="font-medium text-foreground">{events.length}</span> événements
          </>
        }
        action={
        <>
          <Button
            variant="outline"
            onClick={() => setShowShareDialog(true)}
            className="relative rounded-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Partage d'agenda
            {incomingShares.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {incomingShares.length}
              </span>
            )}
          </Button>
          <Button
            onClick={() => {
              setFormMode('create');
              setEditingEvent(null);
              setShowEventForm(true);
            }}
            className="rounded-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel événement
          </Button>
        </>
        }
      />

      <AgentCalendarShareDialog open={showShareDialog} onOpenChange={setShowShareDialog} />

      {/* Urgent visits alert */}
      {visitesUrgentes.length > 0 && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="ml-2">
              <h2 className="font-semibold text-destructive mb-2">
                {visitesUrgentes.length} visite{visitesUrgentes.length > 1 ? 's' : ''} urgente{visitesUrgentes.length > 1 ? 's' : ''} !
              </h2>
              <div className="space-y-2">
                {visitesUrgentes.map((visite, idx) => (
                  <div 
                    key={visite.id} 
                    className="flex items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border/70"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{visite.adresse}</p>
                      <p className="text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatZurichTime(visite.date_visite)}
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
                      className="shrink-0 rounded-full"
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
      <div className={`${DASH_CARD} flex flex-wrap items-center gap-3 p-3 md:p-4`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <Filter className="h-4 w-4" />
          </span>
          <Label className="text-sm font-medium text-foreground">Filtrer par client</Label>
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-full sm:w-[220px] rounded-full bg-background">
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

        <Select value={scope} onValueChange={(v) => setScope(v as 'mine' | 'co' | 'all')}>
          <SelectTrigger className="w-full sm:w-[200px] rounded-full bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">Mes visites uniquement</SelectItem>
            <SelectItem value="co">Co-assignées uniquement</SelectItem>
            <SelectItem value="all">Toutes (mes + co-assignées)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex min-w-0 max-w-full items-center gap-2 [&>div]:mx-0 [&>div]:mb-0 [&>div]:px-0">
          <DashFilterPills
            label="Visites affichées"
            options={[
              { key: 'confirmees', label: 'Confirmées par le client' },
              { key: 'toutes', label: 'Toutes' },
            ]}
            value={confirmedOnly ? 'confirmees' : 'toutes'}
            onChange={(key) => setConfirmedOnly(key === 'confirmees')}
          />
        </div>

        <Button
          variant={showFullHistory ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setShowFullHistory((v) => !v)}
          title={showFullHistory ? 'Limiter à J-14 → J+90' : 'Afficher tout l\'historique'}
        >
          {showFullHistory ? 'Historique complet activé' : 'Afficher tout l\'historique'}
        </Button>
      </div>


      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0 w-full">
        {/* Calendar */}
        <div className="lg:col-span-2 min-w-0 overflow-hidden">
          <EventManagerCalendar
            events={filteredEvents}
            visites={filteredVisites}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventClick={handleCalendarEventClick}
          />
        </div>

        {/* Day events */}
        <div className="min-w-0 h-[600px]">
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
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détails de l'événement
              {selectedEvent?.status === 'effectue' && <Badge variant="secondary" className="rounded-full">Effectué</Badge>}
              {selectedEvent?.status === 'annule' && <Badge variant="destructive" className="rounded-full">Annulé</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="rounded-full">
                  {eventTypeLabels[selectedEvent.event_type] || selectedEvent.event_type}
                </Badge>
                {selectedEvent.priority && (
                  <Badge className="rounded-full" variant={selectedEvent.priority === 'urgente' ? 'destructive' : selectedEvent.priority === 'haute' ? 'default' : 'secondary'}>
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
                  {formatZurichDay(selectedEvent.event_date)}
                </div>
                {!selectedEvent.all_day && formatZurichTime(selectedEvent.event_date) && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatZurichTime(selectedEvent.event_date)}
                  </div>
                )}
                {selectedEvent.all_day && (
                  <Badge variant="outline" className="rounded-full">Journée entière</Badge>
                )}
              </div>

              {selectedEvent.description && (
                <div className="p-3 bg-muted/60 rounded-xl">
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
            <Button variant="outline" className="rounded-full" onClick={() => setEventDetailDialogOpen(false)}>
              Fermer
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
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
              className="rounded-full"
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

      {/* Phone / office appointment detail */}
      <PhoneAppointmentDetailDialog
        appt={phoneAppts.find((a) => a.id === selectedPhoneApptId) || null}
        open={!!selectedPhoneApptId}
        onClose={() => setSelectedPhoneApptId(null)}
        onCancelled={() => loadData()}
      />



      {/* Feedback dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Feedback de la visite déléguée</DialogTitle>
            <DialogDescription>
              Partagez votre avis sur le bien visité avec votre client
            </DialogDescription>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/60 rounded-xl">
                <AddressLink address={selectedVisite.adresse} className="font-semibold" iconClassName="h-4 w-4" />
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
                      <ThumbsUp className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-medium">Je recommande ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien correspond aux attentes du client</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="neutre" id="neutre" />
                    <Label htmlFor="neutre" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Minus className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Avis neutre</p>
                        <p className="text-xs text-muted-foreground">Le bien a des points positifs et négatifs</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="deconseille" id="deconseille" />
                    <Label htmlFor="deconseille" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsDown className="h-4 w-4 text-destructive" />
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
                <Label>Photos / vidéos de la visite (optionnel)</Label>
                <label className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border/70 bg-background/70 text-sm font-medium text-foreground backdrop-blur ${uploadingMedia ? 'pointer-events-none opacity-60' : ''}`}>
                  {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingMedia ? 'Envoi en cours…' : 'Ajouter photo / vidéo'}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                    disabled={uploadingMedia}
                    className="sr-only"
                  />
                </label>
                {feedbackMedias.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {feedbackMedias.map((media, idx) => (
                      <div key={idx} className="relative group">
                        {media.type.startsWith('image/') ? (
                          <img src={media.url} alt="" className="w-full h-24 object-cover rounded-2xl" />
                        ) : (
                          <video src={media.url} className="w-full h-24 object-cover rounded-2xl" />
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1.5 right-1.5 h-8 w-8"
                          aria-label="Retirer ce média"
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
            <Button variant="outline" className="rounded-full" onClick={() => setFeedbackDialogOpen(false)}>
              Annuler
            </Button>
            <Button className="rounded-full" onClick={handleSaveFeedback} disabled={!feedbackText.trim()}>
              Enregistrer et notifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog enrichi */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className={VISIT_DIALOG_CLASS} onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedVisite ? (() => {
            const o = selectedVisite.offres;
            return (
              <>
                <VisitHero
                  TitleAs={DialogTitle}
                  date={selectedVisite.date_visite}
                  endDate={selectedVisite.date_visite_fin}
                  kicker="Détails de la visite"
                  badges={
                    <>
                      <VisitStatusBadge statut={selectedVisite.statut} />
                      {selectedVisite.est_deleguee
                        ? <DashBadge tone="success">Visite déléguée</DashBadge>
                        : isVisiteConfirmedByClient(offreStatutOf(selectedVisite))
                          ? <DashBadge tone="success">Client s'en occupe</DashBadge>
                          : null}
                    </>
                  }
                  address={selectedVisite.adresse}
                  photoUrl={offrePhotoUrl(o)}
                  title={o?.titre}
                />

                <VisitBody>
                  {selectedVisite.id && (
                    <VisitLiveButton
                      visiteId={selectedVisite.id}
                      dateVisite={selectedVisite.date_visite}
                      size="default"
                      className="h-12 w-full"
                    />
                  )}

                  {/* Intérêt client */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Intérêt du client</span>
                      <ClientInteretBadge statutOffre={o?.statut} />
                    </div>
                    {getInteretState(o?.statut).key === 'attente' && (
                      <VisitNote tone="warning">À CONFIRMER — le client n'a pas encore répondu, la visite n'est pas ferme.</VisitNote>
                    )}
                  </div>

                  {/* Infos clés */}
                  {o && (
                    <VisitInfoTiles
                      items={[
                        { icon: Home, label: 'Type', value: o.type_bien },
                        { label: 'Pièces', value: o.pieces },
                        { label: 'Surface', value: o.surface ? `${o.surface} m²` : undefined },
                        { label: 'Étage', value: o.etage },
                        { label: 'Loyer', value: o.prix !== null && o.prix !== undefined && o.prix !== '' ? formatCHF(o.prix, ' / mois') : undefined },
                        { label: 'Disponibilité', value: o.disponibilite },
                        { label: 'Code immeuble', value: o.code_immeuble ? <span className="font-mono">{o.code_immeuble}</span> : undefined },
                        { label: 'Offre envoyée le', value: o.date_envoi ? formatZurichDateTime(o.date_envoi, { short: true, year: true }) : undefined },
                      ]}
                    />
                  )}

                  {/* Contact sur place */}
                  {o && (o.concierge_nom || o.locataire_nom) && (
                    <VisitSection icon={Phone} title="Contact sur place">
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
                  {selectedVisite.client_profile && (
                    <VisitSection
                      icon={User}
                      title="Participants"
                      action={
                        <Button size="sm" variant="outline" className="min-h-9" onClick={() => setAddClientsDialogOpen(true)}>
                          <Plus className="h-4 w-4" /> Ajouter
                        </Button>
                      }
                    >
                      <VisitPersonRow
                        role={selectedVisite.est_deleguee ? 'Visite déléguée pour' : 'Client concerné'}
                        name={`${selectedVisite.client_profile.prenom || ''} ${selectedVisite.client_profile.nom || ''}`.trim() || 'Client'}
                        sub={selectedVisite.client_profile.email || undefined}
                      />
                    </VisitSection>
                  )}

                  {/* Description, commentaires */}
                  {(o?.description || o?.commentaires) && (
                    <VisitSection icon={Home} title="Détails de l'offre envoyée">
                      {o.description && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Description</p>
                          <VisitNote>{o.description}</VisitNote>
                        </div>
                      )}
                      {o.commentaires && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Commentaires</p>
                          <VisitNote>{o.commentaires}</VisitNote>
                        </div>
                      )}
                    </VisitSection>
                  )}

                  {/* Workflow candidature */}
                  {selectedVisite.candidature && (
                    <VisitSection
                      icon={CalendarIcon}
                      title="Étape du dossier"
                      action={
                        <DashBadge tone={selectedVisite.candidature.statut === 'cles_remises' ? 'success' : selectedVisite.candidature.statut === 'refusee' ? 'danger' : 'muted'}>
                          {candidatureStatusLabels[selectedVisite.candidature.statut] || selectedVisite.candidature.statut}
                        </DashBadge>
                      }
                    >
                      <CandidatureWorkflowTimeline currentStatut={selectedVisite.candidature.statut} />
                      {nextStatusOptions[selectedVisite.candidature.statut] && (
                        <div className="flex flex-wrap gap-2">
                          {nextStatusOptions[selectedVisite.candidature.statut].map((option) => (
                            <Button
                              key={option.value}
                              variant={option.value === 'refusee' ? 'destructive' : 'outline'}
                              className="min-h-11"
                              onClick={() => handleUpdateCandidatureStatus(selectedVisite.candidature.id, option.value)}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </VisitSection>
                  )}

                  {/* Notes */}
                  {selectedVisite.notes && (
                    <VisitSection icon={Pencil} title="Notes">
                      <VisitNote tone="warning">{selectedVisite.notes}</VisitNote>
                    </VisitSection>
                  )}

                  {/* Feedback si effectuée */}
                  {selectedVisite.statut === 'effectuee' && selectedVisite.feedback_agent && (
                    <VisitSection
                      icon={ThumbsUp}
                      title="Mon feedback"
                      action={selectedVisite.recommandation_agent ? getRecommandationBadge(selectedVisite.recommandation_agent) : undefined}
                    >
                      <VisitNote>{selectedVisite.feedback_agent}</VisitNote>
                    </VisitSection>
                  )}

                  {/* Lien de l'annonce */}
                  {o?.lien_annonce && (
                    <VisitSection icon={MapPin} title="Lien de l'annonce">
                      <div className="min-w-0 overflow-hidden">
                        <LinkPreviewCard url={o.lien_annonce} showInline />
                      </div>
                    </VisitSection>
                  )}

                  {/* Vidéo(s) de la visite — lecteur inline */}
                  <VisitVideoPlayer medias={selectedVisite.medias} />

                  {/* Compte rendu (formulaire partagé) — une seule entrée « Ajouter photo / vidéo » */}
                  <CompteRenduVisiteForm
                    role="agent"
                    visiteId={selectedVisite.id}
                    embedded
                    onSent={() => loadData()}
                    videoShare={{ visite: selectedVisite }}
                  />
                </VisitBody>

                <VisitActionBar
                  primary={
                    selectedVisite.statut === 'planifiee' ? (
                      <Button onClick={() => {
                        setDetailDialogOpen(false);
                        handleMarquerEffectuee(selectedVisite);
                      }}>
                        {selectedVisite.est_deleguee ? 'Donner mon feedback' : 'Marquer effectuée'}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
                    )
                  }
                >
                  <Button variant="outline" onClick={() => setEditVisiteOpen(true)}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="outline" onClick={() => handleDelegateToCoursier(selectedVisite)}>
                    <User className="h-4 w-4" /> Déléguer au coursier
                  </Button>
                  {selectedVisite.statut === 'planifiee' && (
                    <Button variant="ghost" onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
                  )}
                </VisitActionBar>
              </>
            );
          })() : (
            <DialogTitle className="sr-only">Détails de la visite</DialogTitle>
          )}
        </DialogContent>
      </Dialog>

      {selectedVisite?.offres && (
        <AddClientsToVisiteDialog
          open={addClientsDialogOpen}
          onOpenChange={setAddClientsDialogOpen}
          sourceOffre={selectedVisite.offres}
          adresse={selectedVisite.adresse}
          dateVisite={selectedVisite.date_visite}
          dateVisiteFin={selectedVisite.date_visite_fin}
          existingClientIds={visites
            .filter((v: any) => v.adresse === selectedVisite.adresse && v.date_visite === selectedVisite.date_visite)
            .map((v: any) => v.client_id)
            .filter(Boolean)}
          availableClients={clients as any}
          sourceMedias={selectedVisite.medias}
          onSuccess={() => loadData()}
        />
      )}

      <EditVisiteDialog
        open={editVisiteOpen}
        onOpenChange={setEditVisiteOpen}
        visite={selectedVisite}
        visitesGroup={
          selectedVisite
            ? visites.filter(
                (v: any) =>
                  v.adresse === selectedVisite.adresse &&
                  v.date_visite === selectedVisite.date_visite,
              )
            : undefined
        }
        onSaved={() => {
          setDetailDialogOpen(false);
          setSelectedVisite(null);
          loadData();
        }}
      />
    </DashPage>
  );
}
