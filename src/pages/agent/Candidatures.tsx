import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileCheck, User, MapPin, Calendar, Search, Eye, CheckCircle, XCircle, Clock,
  Filter, Building2, FileSignature, CalendarCheck, Key, Send, AlertTriangle,
  ChevronDown, ChevronUp, FastForward, Phone, Trash2, Home, Sparkles
} from 'lucide-react';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CandidatureWorkflowTimeline } from '@/components/CandidatureWorkflowTimeline';
import { SendDossierDialog } from '@/components/SendDossierDialog';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';
import { PremiumCandidatureDetails } from '@/components/premium/PremiumCandidatureDetails';
import { cn } from '@/lib/utils';

const WORKFLOW_STATUTS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'candidature_deposee': { label: 'Candidature reçue', color: 'outline', icon: <FileCheck className="h-4 w-4" /> },
  'en_attente': { label: 'Dossier envoyé', color: 'secondary', icon: <Clock className="h-4 w-4" /> },
  'acceptee': { label: '🎉 Acceptée', color: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  'refusee': { label: 'Refusée', color: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  'bail_conclu': { label: 'Client accepte bail', color: 'default', icon: <FileSignature className="h-4 w-4" /> },
  'attente_bail': { label: 'Attente bail régie', color: 'secondary', icon: <Building2 className="h-4 w-4" /> },
  'bail_recu': { label: 'Bail reçu', color: 'default', icon: <FileCheck className="h-4 w-4" /> },
  'signature_planifiee': { label: 'Signature planifiée', color: 'default', icon: <CalendarCheck className="h-4 w-4" /> },
  'signature_effectuee': { label: 'Bail signé', color: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  'etat_lieux_fixe': { label: 'État des lieux fixé', color: 'default', icon: <Calendar className="h-4 w-4" /> },
  'cles_remises': { label: '🔑 Clés remises', color: 'default', icon: <Key className="h-4 w-4" /> },
};

interface Offre {
  id: string;
  adresse: string;
  prix: number;
  pieces?: number | null;
  date_envoi?: string | null;
}

interface Candidature {
  id: string;
  offre_id: string;
  client_id: string;
  statut: string;
  dossier_complet: boolean;
  message_client: string | null;
  date_depot: string;
  created_at: string;
  dates_signature_proposees: any;
  date_signature_choisie: string | null;
  lieu_signature: string | null;
  date_etat_lieux: string | null;
  heure_etat_lieux: string | null;
  client_accepte_conclure: boolean | null;
  client_accepte_conclure_at: string | null;
  agent_valide_regie: boolean | null;
  agent_valide_regie_at: string | null;
  bail_recu: boolean | null;
  bail_recu_at: string | null;
  signature_effectuee: boolean | null;
  signature_effectuee_at: string | null;
  cles_remises: boolean | null;
  cles_remises_at: string | null;
  offres: {
    adresse: string;
    prix: number;
    pieces: number | null;
    surface: number | null;
  } | null;
  clients: {
    user_id: string;
  } | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
}

export default function Candidatures() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const { syncEvent } = useGoogleCalendarSync();
  
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Dialogs
  const [showDatesDialog, setShowDatesDialog] = useState(false);
  const [showEtatLieuxDialog, setShowEtatLieuxDialog] = useState(false);
  const [showForceDialog, setShowForceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendDossierDialog, setShowSendDossierDialog] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [selectedCandidatureForSend, setSelectedCandidatureForSend] = useState<Candidature | null>(null);
  const [forceAction, setForceAction] = useState<{ statut: string; label: string } | null>(null);
  
  // Form states
  const [proposedDates, setProposedDates] = useState(['', '', '']);
  const [etatLieuxDate, setEtatLieuxDate] = useState('');
  const [etatLieuxHeure, setEtatLieuxHeure] = useState('');
  
  // Offres for SendDossierDialog
  const [clientOffres, setClientOffres] = useState<Offre[]>([]);

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    loadCandidatures();
  }, [user?.id, userRole]);

  // Handle URL params for deep linking
  useEffect(() => {
    const candidatureId = searchParams.get('candidatureId');
    if (candidatureId && candidatures.length > 0 && !loading) {
      setExpandedCards(prev => new Set([...prev, candidatureId]));
      setTimeout(() => {
        cardRefs.current[candidatureId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [searchParams, candidatures, loading]);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const loadCandidatures = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!agentData) {
        setLoading(false);
        return;
      }

      // Get clients via client_agents
      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);

      const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

      const { data: clientsData } = clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('id, user_id')
            .in('id', clientIds)
        : { data: [] };
      
      if (!clientsData || clientsData.length === 0) {
        setLoading(false);
        return;
      }

      const candidatureClientIds = clientsData.map(c => c.id);
      const clientUserIds = clientsData.map(c => c.user_id);

      const { data: candidaturesData, error } = await supabase
        .from('candidatures')
        .select(`
          *,
          offres (adresse, prix, pieces, surface),
          clients (user_id)
        `)
        .in('client_id', candidatureClientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidatures(candidaturesData || []);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email, telephone')
        .in('id', clientUserIds);

      if (profilesData) {
        setProfiles(new Map(profilesData.map(p => [p.id, p])));
      }
    } catch (error) {
      console.error('Error loading candidatures:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les candidatures', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatutChange = async (candidatureId: string, newStatut: string, additionalData?: any) => {
    try {
      const candidature = candidatures.find(c => c.id === candidatureId);
      
      const updateData: any = { statut: newStatut, ...additionalData };
      
      const { error: candError } = await supabase
        .from('candidatures')
        .update(updateData)
        .eq('id', candidatureId);

      if (candError) throw candError;

      // Sync offres status
      if (candidature?.offre_id) {
        const offreStatut = ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(newStatut) 
          ? 'acceptee' 
          : newStatut === 'refusee' ? 'refusee' : 'candidature_deposee';
        
        await supabase.from('offres').update({ statut: offreStatut }).eq('id', candidature.offre_id);
      }

      // Notification handled by database trigger (notify_on_candidature_status_change)

      setCandidatures(prev => prev.map(c => c.id === candidatureId ? { ...c, statut: newStatut, ...additionalData } : c));
      toast({ title: 'Statut mis à jour', description: `Candidature marquée comme ${getStatutLabel(newStatut).toLowerCase()}` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleForceProgression = (candidature: Candidature, targetStatut: string, label: string) => {
    setSelectedCandidature(candidature);
    setForceAction({ statut: targetStatut, label });
    setShowForceDialog(true);
  };

  const confirmForceProgression = async () => {
    if (!selectedCandidature || !forceAction) return;

    const additionalData: any = {};
    
    if (forceAction.statut === 'bail_conclu') {
      additionalData.client_accepte_conclure = true;
      additionalData.client_accepte_conclure_at = new Date().toISOString();
    } else if (forceAction.statut === 'signature_planifiee') {
      additionalData.date_signature_choisie = new Date().toISOString();
    }

    await handleStatutChange(selectedCandidature.id, forceAction.statut, additionalData);
    setShowForceDialog(false);
    setSelectedCandidature(null);
    setForceAction(null);
  };

  const handleProposeDates = async () => {
    if (!selectedCandidature) return;
    
    const validDates = proposedDates.filter(d => d).map(d => ({
      date: d,
      lieu: 'Chemin de l\'Esparcette 5, 1023 Crissier'
    }));

    if (validDates.length === 0) {
      toast({ title: 'Veuillez proposer au moins une date', variant: 'destructive' });
      return;
    }

    await handleStatutChange(selectedCandidature.id, 'bail_recu', {
      bail_recu: true,
      bail_recu_at: new Date().toISOString(),
      dates_signature_proposees: validDates,
    });

    setShowDatesDialog(false);
    setProposedDates(['', '', '']);
    setSelectedCandidature(null);
  };

  const handleSetEtatLieux = async () => {
    if (!selectedCandidature || !etatLieuxDate || !user) return;

    await handleStatutChange(selectedCandidature.id, 'etat_lieux_fixe', {
      date_etat_lieux: etatLieuxDate,
      heure_etat_lieux: etatLieuxHeure,
    });

    // Create calendar event for état des lieux
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (agentData) {
        // Combine date and time
        let eventDateTime = etatLieuxDate;
        if (etatLieuxHeure) {
          eventDateTime = `${etatLieuxDate.split('T')[0]}T${etatLieuxHeure}:00`;
        }

        await supabase.from('calendar_events').insert({
          title: `État des lieux - ${selectedCandidature.offres?.adresse || 'Appartement'}`,
          event_type: 'etat_lieux',
          event_date: eventDateTime,
          description: `Remise des clés\n${etatLieuxHeure ? `Heure: ${etatLieuxHeure}` : ''}`,
          client_id: selectedCandidature.client_id,
          agent_id: agentData.id,
          created_by: user.id,
        });

        // Sync to Google Calendar
        if (user) {
          syncEvent(user.id, {
            title: `État des lieux - ${selectedCandidature.offres?.adresse || 'Appartement'}`,
            description: `Remise des clés\n${etatLieuxHeure ? `Heure: ${etatLieuxHeure}` : ''}`,
            start: eventDateTime,
          });
        }

        // Send ICS invite via email
        const { data: clientProfile } = await supabase
          .from('clients')
          .select('user_id, profiles:user_id(email)')
          .eq('id', selectedCandidature.client_id)
          .maybeSingle();

        const clientEmail = (clientProfile?.profiles as any)?.email;
        if (clientEmail) {
          supabase.functions.invoke('send-calendar-invite', {
            body: {
              title: `État des lieux - ${selectedCandidature.offres?.adresse || 'Appartement'}`,
              description: `Remise des clés\n${etatLieuxHeure ? `Heure: ${etatLieuxHeure}` : ''}`,
              location: selectedCandidature.offres?.adresse || '',
              start_date: eventDateTime,
              end_date: new Date(new Date(eventDateTime).getTime() + 3600000).toISOString(),
              recipient_email: clientEmail,
            },
          });
        }

        // Notification handled by database trigger (notify_on_candidature_status_change)
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }

    setShowEtatLieuxDialog(false);
    setEtatLieuxDate('');
    setEtatLieuxHeure('');
    setSelectedCandidature(null);
  };

  const handleClesRemises = async (candidatureId: string) => {
    await handleStatutChange(candidatureId, 'cles_remises', {
      cles_remises: true,
      cles_remises_at: new Date().toISOString(),
    });
  };

  const handleDeleteCandidature = async () => {
    if (!selectedCandidature) return;
    
    try {
      const { error } = await supabase
        .from('candidatures')
        .delete()
        .eq('id', selectedCandidature.id);

      if (error) throw error;

      setCandidatures(prev => prev.filter(c => c.id !== selectedCandidature.id));
      toast({ title: 'Candidature supprimée', description: 'La candidature a été supprimée avec succès' });
      setShowDeleteDialog(false);
      setSelectedCandidature(null);
    } catch (error) {
      console.error('Error deleting candidature:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la candidature', variant: 'destructive' });
    }
  };

  const getStatutLabel = (statut: string) => WORKFLOW_STATUTS[statut]?.label || statut;
  const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
    const color = WORKFLOW_STATUTS[statut]?.color;
    if (color === 'destructive') return 'destructive';
    if (color === 'secondary') return 'secondary';
    if (color === 'outline') return 'outline';
    return 'default';
  };
  const getStatutIcon = (statut: string) => WORKFLOW_STATUTS[statut]?.icon || <Clock className="h-4 w-4" />;

  const filteredCandidatures = candidatures.filter(c => {
    const matchesStatut = filterStatut === 'all' || c.statut === filterStatut;
    const profile = c.clients?.user_id ? profiles.get(c.clients.user_id) : null;
    const clientName = profile ? `${profile.prenom} ${profile.nom}`.toLowerCase() : '';
    const address = c.offres?.adresse?.toLowerCase() || '';
    const matchesSearch = searchTerm === '' || clientName.includes(searchTerm.toLowerCase()) || address.includes(searchTerm.toLowerCase());
    return matchesStatut && matchesSearch;
  });

  const stats = {
    total: candidatures.length,
    candidature_deposee: candidatures.filter(c => c.statut === 'candidature_deposee').length,
    en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
    acceptee: candidatures.filter(c => ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe'].includes(c.statut)).length,
    cles_remises: candidatures.filter(c => c.statut === 'cles_remises').length,
    refusee: candidatures.filter(c => c.statut === 'refusee').length,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatutStyles = (statut: string) => {
    const styles: Record<string, { border: string; glow: string; badge: string }> = {
      cles_remises: {
        border: 'border-emerald-500/50',
        glow: 'shadow-emerald-500/20 shadow-lg',
        badge: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      },
      acceptee: {
        border: 'border-blue-500/50',
        glow: 'shadow-blue-500/10',
        badge: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
      },
      refusee: {
        border: 'border-destructive/50',
        glow: 'shadow-destructive/10',
        badge: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-700 dark:text-red-300 border-red-500/30',
      },
      bail_recu: {
        border: 'border-violet-500/50',
        glow: 'shadow-violet-500/10',
        badge: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30',
      },
    };
    return styles[statut] || { border: 'border-border/50', glow: '', badge: '' };
  };

  const renderExpandedActions = (candidature: Candidature, profile: Profile | null) => {
    return (
      <PremiumCandidatureDetails
        candidature={candidature}
        profile={profile}
        onNavigateToClient={() => navigate(`/agent/clients/${candidature.client_id}`)}
        onDelete={() => {
          setSelectedCandidature(candidature);
          setShowDeleteDialog(true);
        }}
        onStatutChange={handleStatutChange}
        onSendDossier={() => {
          if (candidature.offres) {
            setClientOffres([{
              id: candidature.offre_id,
              adresse: candidature.offres.adresse,
              prix: candidature.offres.prix,
              pieces: candidature.offres.pieces,
            }]);
          }
          setSelectedCandidatureForSend(candidature);
          setShowSendDossierDialog(true);
        }}
        onProposeDates={() => {
          setSelectedCandidature(candidature);
          setShowDatesDialog(true);
        }}
        onSetEtatLieux={() => {
          setSelectedCandidature(candidature);
          setShowEtatLieuxDialog(true);
        }}
        onForceProgression={(targetStatut, label) => handleForceProgression(candidature, targetStatut, label)}
        workflowTimeline={<CandidatureWorkflowTimeline currentStatut={candidature.statut} />}
      />
    );
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          title="Candidatures déposées"
          subtitle="Gérez le workflow complet des candidatures - Cliquez sur une carte pour voir les détails"
          icon={FileCheck}
          badge="Gestion"
        />

        {/* Stats avec PremiumKPICard */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 md:gap-4">
          <PremiumKPICard title="Total" value={stats.total} icon={FileCheck} delay={0} />
          <PremiumKPICard title="À envoyer" value={stats.candidature_deposee} icon={Send} delay={50} />
          <PremiumKPICard title="Envoyées" value={stats.en_attente} icon={Clock} variant="warning" delay={100} />
          <PremiumKPICard title="En cours" value={stats.acceptee} icon={CheckCircle} variant="success" delay={150} />
          <PremiumKPICard title="Clés remises" value={stats.cles_remises} icon={Key} variant="success" delay={200} />
          <PremiumKPICard title="Refusées" value={stats.refusee} icon={XCircle} variant="danger" delay={250} />
        </div>

        {/* Premium Filters */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border border-border/50 p-4 md:p-5">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent" />
          
          <div className="relative flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Rechercher par nom ou adresse..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 transition-all" 
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/50">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(WORKFLOW_STATUTS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Candidatures list */}
        {filteredCandidatures.length > 0 ? (
          <div className="space-y-4">
            {filteredCandidatures.map((candidature, index) => {
              const profile = candidature.clients?.user_id ? profiles.get(candidature.clients.user_id) : null;
              const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client inconnu';
              const isExpanded = expandedCards.has(candidature.id);
              const styles = getStatutStyles(candidature.statut);
              const isSpecialStatus = ['cles_remises', 'acceptee'].includes(candidature.statut);

              return (
                <Collapsible key={candidature.id} open={isExpanded} onOpenChange={() => toggleCard(candidature.id)}>
                  <div 
                    className={cn(
                      "group relative overflow-hidden rounded-2xl",
                      "bg-gradient-to-br from-card/95 to-card/80",
                      "backdrop-blur-sm border-2 transition-all duration-300",
                      "hover:shadow-xl hover:border-primary/30",
                      styles.border,
                      styles.glow,
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Gradient glow for special statuses */}
                    {isSpecialStatus && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50" />
                    )}

                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>

                    <CollapsibleTrigger className="w-full text-left p-5 md:p-6 relative z-10 cursor-pointer hover:bg-muted/10 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-lg">{clientName}</span>
                            </div>
                            <Badge 
                              variant={getStatutBadgeVariant(candidature.statut)} 
                              className={cn("flex items-center gap-1.5 px-3 py-1", styles.badge)}
                            >
                              {getStatutIcon(candidature.statut)}
                              {getStatutLabel(candidature.statut)}
                            </Badge>
                            {(candidature.statut === 'acceptee' || candidature.statut === 'bail_recu') && (
                              <Badge variant="outline" className="text-amber-600 border-amber-400/50 bg-amber-500/10 animate-pulse">
                                <Clock className="h-3 w-3 mr-1" />Attente client
                              </Badge>
                            )}
                          </div>
                          
                          {candidature.offres && (
                            <div className="flex items-start gap-3 mb-3">
                              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-foreground">{candidature.offres.adresse}</p>
                                <div className="flex flex-wrap gap-3 mt-1.5">
                                  <span className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg bg-muted/30">
                                    <span className="font-bold text-primary">{candidature.offres.prix?.toLocaleString()}</span> CHF
                                  </span>
                                  {candidature.offres.pieces && (
                                    <span className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg bg-muted/30">
                                      <Home className="h-3.5 w-3.5 text-muted-foreground" />
                                      {candidature.offres.pieces} pièces
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/20">
                              <Calendar className="h-3.5 w-3.5" />
                              Déposée le {format(new Date(candidature.date_depot || candidature.created_at), 'dd.MM.yyyy', { locale: fr })}
                            </span>
                            {candidature.date_signature_choisie && (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                Signature: {format(new Date(candidature.date_signature_choisie), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            )}
                            {candidature.date_etat_lieux && (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Key className="h-3.5 w-3.5" />
                                EDL: {format(new Date(candidature.date_etat_lieux), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand indicator */}
                        <div className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                          isExpanded ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"
                        )}>
                          <span className="text-sm font-medium">{isExpanded ? 'Réduire' : 'Détails'}</span>
                          <div className={cn("transition-transform duration-300", isExpanded && "rotate-180")}>
                            <ChevronDown className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-5 md:px-6 pb-5 md:pb-6 relative z-10 border-t border-border/30">
                        {renderExpandedActions(candidature, profile || null)}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune candidature</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatut !== 'all' ? "Aucune candidature ne correspond à vos critères" : "Les candidatures apparaîtront ici"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Proposer dates de signature */}
      <Dialog open={showDatesDialog} onOpenChange={setShowDatesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer des dates de signature</DialogTitle>
            <DialogDescription>
              Proposez jusqu'à 3 dates pour la signature du bail. Le client choisira celle qui lui convient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              📍 Lieu: Chemin de l'Esparcette 5, 1023 Crissier
            </p>
            {proposedDates.map((date, idx) => (
              <div key={idx} className="space-y-2">
                <Label>Date {idx + 1} {idx === 0 && '*'}</Label>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => {
                    const newDates = [...proposedDates];
                    newDates[idx] = e.target.value;
                    setProposedDates(newDates);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDatesDialog(false)}>Annuler</Button>
            <Button onClick={handleProposeDates} disabled={!proposedDates[0]}>
              <Send className="h-4 w-4 mr-2" />Envoyer au client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fixer état des lieux */}
      <Dialog open={showEtatLieuxDialog} onOpenChange={setShowEtatLieuxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fixer la date de l'état des lieux</DialogTitle>
            <DialogDescription>
              Indiquez la date et l'heure de l'état des lieux fixée avec la régie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Le client recevra une alerte importante concernant les documents nécessaires.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Date de l'état des lieux *</Label>
              <Input type="date" value={etatLieuxDate} onChange={(e) => setEtatLieuxDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Heure</Label>
              <Input type="time" value={etatLieuxHeure} onChange={(e) => setEtatLieuxHeure(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEtatLieuxDialog(false)}>Annuler</Button>
            <Button onClick={handleSetEtatLieux} disabled={!etatLieuxDate}>
              <Send className="h-4 w-4 mr-2" />Notifier le client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Force progression */}
      <Dialog open={showForceDialog} onOpenChange={setShowForceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FastForward className="h-5 w-5 text-orange-500" />
              Forcer la progression
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <p>Cette action permet de passer à l'étape suivante sans attendre la confirmation du client.</p>
                <p className="mt-2"><strong>À utiliser uniquement si :</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Le client vous a confirmé par téléphone ou email</li>
                  <li>Le client a des difficultés avec l'application</li>
                  <li>Vous agissez sur demande explicite du client</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Action: <strong>{forceAction?.label}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForceDialog(false)}>Annuler</Button>
            <Button onClick={confirmForceProgression} className="bg-orange-600 hover:bg-orange-700">
            <FastForward className="h-4 w-4 mr-2" />Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmer suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Supprimer la candidature
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette candidature ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          {selectedCandidature && (
            <div className="py-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm">
                  <strong>Bien:</strong> {selectedCandidature.offres?.adresse || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Statut actuel: {getStatutLabel(selectedCandidature.statut)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteCandidature}>
              <Trash2 className="h-4 w-4 mr-2" />Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SendDossierDialog for sending candidature to agency */}
      {selectedCandidatureForSend && (
        <SendDossierDialog
          open={showSendDossierDialog}
          onOpenChange={(open) => {
            setShowSendDossierDialog(open);
            if (!open) {
              setSelectedCandidatureForSend(null);
              setClientOffres([]);
            }
          }}
          clientId={selectedCandidatureForSend.client_id}
          clientName={(() => {
            const profile = selectedCandidatureForSend.clients?.user_id 
              ? profiles.get(selectedCandidatureForSend.clients.user_id) 
              : null;
            return profile ? `${profile.prenom} ${profile.nom}` : 'Client';
          })()}
          clientEmail={(() => {
            const profile = selectedCandidatureForSend.clients?.user_id 
              ? profiles.get(selectedCandidatureForSend.clients.user_id) 
              : null;
            return profile?.email;
          })()}
          offres={clientOffres}
          existingCandidatureId={selectedCandidatureForSend.id}
          preSelectedOffreId={selectedCandidatureForSend.offre_id}
          onCandidatureCreated={() => {
            loadCandidatures();
            setShowSendDossierDialog(false);
            setSelectedCandidatureForSend(null);
            setClientOffres([]);
          }}
        />
      )}
    </main>
  );
}
