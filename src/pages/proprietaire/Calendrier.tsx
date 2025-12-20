import { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumPageHeader } from '@/components/premium';
import { PremiumCalendarView } from '@/components/calendar/PremiumCalendarView';
import { PremiumProprietaireDayEvents } from '@/components/calendar/PremiumProprietaireDayEvents';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSwissDateString } from '@/lib/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProprietaireEvent {
  id: string;
  type: 'bail' | 'hypotheque' | 'assurance' | 'ticket' | 'event';
  title: string;
  description?: string;
  date: string;
  status?: string;
  priority?: string;
  immeuble?: string;
  lot?: string;
}

export default function Calendrier() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [immeubleIds, setImmeubleIds] = useState<string[]>([]);
  
  // Data states
  const [baux, setBaux] = useState<any[]>([]);
  const [hypotheques, setHypotheques] = useState<any[]>([]);
  const [assurances, setAssurances] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  // Load proprietaire and immeubles
  useEffect(() => {
    const loadProprietaireData = async () => {
      if (!user) return;
      
      try {
        // Get proprietaire
        const { data: propData } = await supabase
          .from('proprietaires')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!propData) return;
        setProprietaireId(propData.id);

        // Get immeubles
        const { data: immeublesData } = await supabase
          .from('immeubles')
          .select('id, nom')
          .eq('proprietaire_id', propData.id);
        
        const ids = immeublesData?.map(i => i.id) || [];
        setImmeubleIds(ids);

        // Load all data in parallel
        await Promise.all([
          loadBaux(ids),
          loadHypotheques(ids),
          loadAssurances(ids),
          loadTickets(ids),
          loadCalendarEvents(user.id),
        ]);
      } catch (error) {
        console.error('Error loading proprietaire data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProprietaireData();
  }, [user]);

  const loadBaux = async (immeubleIds: string[]) => {
    if (immeubleIds.length === 0) return;
    
    // Get lots for these immeubles
    const { data: lotsData } = await supabase
      .from('lots')
      .select('id, immeuble_id, immeubles(nom)')
      .in('immeuble_id', immeubleIds);
    
    if (!lotsData || lotsData.length === 0) return;
    
    const lotIds = lotsData.map(l => l.id);
    const { data } = await supabase
      .from('baux')
      .select('*, lots(immeuble_id, immeubles(nom))')
      .in('lot_id', lotIds);
    
    setBaux(data || []);
  };

  const loadHypotheques = async (immeubleIds: string[]) => {
    if (immeubleIds.length === 0) return;
    
    const { data } = await supabase
      .from('hypotheques')
      .select('*, immeubles(nom)')
      .in('immeuble_id', immeubleIds);
    
    setHypotheques(data || []);
  };

  const loadAssurances = async (immeubleIds: string[]) => {
    if (immeubleIds.length === 0) return;
    
    const { data } = await supabase
      .from('assurances_immeuble')
      .select('*, immeubles(nom)')
      .in('immeuble_id', immeubleIds);
    
    setAssurances(data || []);
  };

  const loadTickets = async (immeubleIds: string[]) => {
    if (immeubleIds.length === 0) return;
    
    const { data } = await supabase
      .from('tickets_techniques')
      .select('*, immeubles(nom), lots(reference)')
      .in('immeuble_id', immeubleIds)
      .not('date_intervention', 'is', null);
    
    setTickets(data || []);
  };

  const loadCalendarEvents = async (userId: string) => {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('created_by', userId);
    
    setCalendarEvents(data || []);
  };

  // Transform data to calendar events
  const allEvents = useMemo(() => {
    const events: any[] = [];

    // Baux - date_fin
    baux.forEach(bail => {
      if (bail.date_fin) {
        events.push({
          id: `bail-${bail.id}`,
          event_date: bail.date_fin,
          event_type: 'rappel',
          title: `Fin de bail - Lot ${bail.lots?.reference || '?'}`,
          description: bail.lots?.immeubles?.nom,
          all_day: true,
        });
      }
    });

    // Hypotheques - date_prochaine_echeance
    hypotheques.forEach(hyp => {
      if (hyp.date_prochaine_echeance) {
        events.push({
          id: `hyp-${hyp.id}`,
          event_date: hyp.date_prochaine_echeance,
          event_type: 'tache',
          title: `Échéance hypothèque - ${hyp.banque || 'Banque'}`,
          description: `${hyp.immeubles?.nom} - CHF ${hyp.montant_initial?.toLocaleString() || '?'}`,
          all_day: true,
        });
      }
    });

    // Assurances - date_prochaine_echeance
    assurances.forEach(ass => {
      if (ass.date_prochaine_echeance) {
        events.push({
          id: `ass-${ass.id}`,
          event_date: ass.date_prochaine_echeance,
          event_type: 'reunion',
          title: `Renouvellement assurance - ${ass.assureur}`,
          description: `${ass.immeubles?.nom} - ${ass.type_assurance || 'Assurance'}`,
          all_day: true,
        });
      }
    });

    // Tickets - date_intervention
    tickets.forEach(ticket => {
      if (ticket.date_intervention) {
        events.push({
          id: `ticket-${ticket.id}`,
          event_date: ticket.date_intervention,
          event_type: 'rendez_vous',
          title: ticket.titre || 'Intervention technique',
          description: `${ticket.immeubles?.nom}${ticket.lots?.reference ? ` - Lot ${ticket.lots.reference}` : ''}`,
          all_day: false,
        });
      }
    });

    // Calendar events
    calendarEvents.forEach(evt => {
      events.push({
        id: evt.id,
        event_date: evt.event_date,
        event_type: evt.event_type,
        title: evt.title,
        description: evt.description,
        all_day: evt.all_day,
        status: evt.status,
        priority: evt.priority,
      });
    });

    return events;
  }, [baux, hypotheques, assurances, tickets, calendarEvents]);

  // Get events for selected date in the side panel format
  const dayEvents = useMemo((): ProprietaireEvent[] => {
    if (!selectedDate) return [];
    
    const dateKey = getSwissDateString(selectedDate);
    const events: ProprietaireEvent[] = [];

    // Baux
    baux.forEach(bail => {
      if (bail.date_fin && getSwissDateString(bail.date_fin) === dateKey) {
        events.push({
          id: `bail-${bail.id}`,
          type: 'bail',
          title: `Fin de bail - Lot ${bail.lots?.reference || '?'}`,
          description: `Locataire: ${bail.locataires_immeuble?.prenom || ''} ${bail.locataires_immeuble?.nom || 'N/A'}`,
          date: bail.date_fin,
          immeuble: bail.lots?.immeubles?.nom,
          lot: bail.lots?.reference,
        });
      }
    });

    // Hypothèques
    hypotheques.forEach(hyp => {
      if (hyp.date_prochaine_echeance && getSwissDateString(hyp.date_prochaine_echeance) === dateKey) {
        events.push({
          id: `hyp-${hyp.id}`,
          type: 'hypotheque',
          title: `Échéance hypothèque`,
          description: `${hyp.banque || 'Banque'} - CHF ${hyp.montant_initial?.toLocaleString() || '?'}`,
          date: hyp.date_prochaine_echeance,
          immeuble: hyp.immeubles?.nom,
          priority: 'haute',
        });
      }
    });

    // Assurances
    assurances.forEach(ass => {
      if (ass.date_prochaine_echeance && getSwissDateString(ass.date_prochaine_echeance) === dateKey) {
        events.push({
          id: `ass-${ass.id}`,
          type: 'assurance',
          title: `Renouvellement ${ass.type_assurance || 'assurance'}`,
          description: `${ass.assureur} - Prime: CHF ${ass.prime_annuelle?.toLocaleString() || '?'}/an`,
          date: ass.date_prochaine_echeance,
          immeuble: ass.immeubles?.nom,
        });
      }
    });

    // Tickets
    tickets.forEach(ticket => {
      if (ticket.date_intervention && getSwissDateString(ticket.date_intervention) === dateKey) {
        events.push({
          id: `ticket-${ticket.id}`,
          type: 'ticket',
          title: ticket.titre || 'Intervention technique',
          description: ticket.description,
          date: ticket.date_intervention,
          status: ticket.statut,
          priority: ticket.priorite,
          immeuble: ticket.immeubles?.nom,
          lot: ticket.lots?.reference,
        });
      }
    });

    // Calendar events
    calendarEvents.forEach(evt => {
      if (getSwissDateString(evt.event_date) === dateKey) {
        events.push({
          id: evt.id,
          type: 'event',
          title: evt.title,
          description: evt.description,
          date: evt.event_date,
          status: evt.status,
          priority: evt.priority,
        });
      }
    });

    return events;
  }, [selectedDate, baux, hypotheques, assurances, tickets, calendarEvents]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          title="Calendrier"
          subtitle="Échéances et rendez-vous"
          icon={Calendar}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[500px] rounded-2xl" />
          </div>
          <div>
            <Skeleton className="h-[500px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PremiumPageHeader
        title="Calendrier"
        subtitle="Échéances et rendez-vous"
        icon={Calendar}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <PremiumCalendarView
            events={allEvents}
            visites={[]}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Side panel - Day events */}
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl overflow-hidden min-h-[500px]">
          <PremiumProprietaireDayEvents
            date={selectedDate}
            events={dayEvents}
          />
        </div>
      </div>
    </div>
  );
}
