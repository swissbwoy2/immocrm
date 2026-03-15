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
  FileCheck, User, MapPin, Calendar, Search, CheckCircle, XCircle, Clock,
  Building2, FileSignature, CalendarCheck, Key, AlertTriangle,
  ChevronDown, ChevronUp, FastForward, Phone, Users, UserCog, Receipt, Loader2
} from 'lucide-react';
import { useFinalInvoice } from '@/hooks/useFinalInvoice';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CandidatureWorkflowTimeline } from '@/components/CandidatureWorkflowTimeline';

const WORKFLOW_STATUTS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'en_attente': { label: 'En attente', color: 'secondary', icon: <Clock className="h-4 w-4" /> },
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
  facture_finale_invoice_id?: string | null;
  facture_finale_invoice_ref?: string | null;
  facture_finale_montant?: number | null;
  offres: {
    adresse: string;
    prix: number;
    pieces: number | null;
    surface: number | null;
    agent_id: string | null;
  } | null;
  clients: {
    user_id: string;
    agent_id: string | null;
  } | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
}

interface Agent {
  id: string;
  user_id: string;
}

export default function AdminCandidatures() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const { loading: invoiceLoading, createFinalInvoice } = useFinalInvoice();
  const { syncEvent } = useGoogleCalendarSync();
  
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [agents, setAgents] = useState<Map<string, { id: string; profile: Profile }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Dialogs
  const [showDatesDialog, setShowDatesDialog] = useState(false);
  const [showEtatLieuxDialog, setShowEtatLieuxDialog] = useState(false);
  const [showForceDialog, setShowForceDialog] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [forceAction, setForceAction] = useState<{ statut: string; label: string } | null>(null);
  
  // Form states
  const [proposedDates, setProposedDates] = useState(['', '', '']);
  const [etatLieuxDate, setEtatLieuxDate] = useState('');
  const [etatLieuxHeure, setEtatLieuxHeure] = useState('');

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    loadData();

    // Realtime subscription for candidatures
    const channel = supabase
      .channel('admin-candidatures-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidatures' },
        () => { loadData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load all candidatures (admin has access to all)
      const { data: candidaturesData, error } = await supabase
        .from('candidatures')
        .select(`
          *,
          offres (adresse, prix, pieces, surface, agent_id),
          clients (user_id, agent_id)
        `)
        .order('created_at', { ascending: false })
        .limit(15000);

      if (error) throw error;
      setCandidatures(candidaturesData || []);

      // Collect all user IDs (clients + agents)
      const clientUserIds = new Set<string>();
      const agentIds = new Set<string>();

      candidaturesData?.forEach(c => {
        if (c.clients?.user_id) clientUserIds.add(c.clients.user_id);
        if (c.clients?.agent_id) agentIds.add(c.clients.agent_id);
        if (c.offres?.agent_id) agentIds.add(c.offres.agent_id);
      });

      // Load client profiles
      if (clientUserIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, prenom, nom, email, telephone')
          .in('id', Array.from(clientUserIds));

        if (profilesData) {
          setProfiles(new Map(profilesData.map(p => [p.id, p])));
        }
      }

      // Load agents with profiles
      if (agentIds.size > 0) {
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, user_id')
          .in('id', Array.from(agentIds));

        if (agentsData) {
          const agentUserIds = agentsData.map(a => a.user_id);
          const { data: agentProfilesData } = await supabase
            .from('profiles')
            .select('id, prenom, nom, email, telephone')
            .in('id', agentUserIds);

          const agentsMap = new Map<string, { id: string; profile: Profile }>();
          agentsData.forEach(agent => {
            const profile = agentProfilesData?.find(p => p.id === agent.user_id);
            if (profile) {
              agentsMap.set(agent.id, { id: agent.id, profile });
            }
          });
          setAgents(agentsMap);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
      const agentId = selectedCandidature.clients?.agent_id || selectedCandidature.offres?.agent_id;
      
      if (agentId) {
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
          agent_id: agentId,
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

  const getStatutLabel = (statut: string) => WORKFLOW_STATUTS[statut]?.label || statut;
  const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
    const color = WORKFLOW_STATUTS[statut]?.color;
    if (color === 'destructive') return 'destructive';
    if (color === 'secondary') return 'secondary';
    if (color === 'outline') return 'outline';
    return 'default';
  };
  const getStatutIcon = (statut: string) => WORKFLOW_STATUTS[statut]?.icon || <Clock className="h-4 w-4" />;

  const getAgentName = (candidature: Candidature): string => {
    const agentId = candidature.clients?.agent_id || candidature.offres?.agent_id;
    if (!agentId) return 'Non assigné';
    const agent = agents.get(agentId);
    return agent ? `${agent.profile.prenom} ${agent.profile.nom}` : 'Agent inconnu';
  };

  const filteredCandidatures = candidatures.filter(c => {
    const matchesStatut = filterStatut === 'all' || c.statut === filterStatut;
    const agentId = c.clients?.agent_id || c.offres?.agent_id;
    const matchesAgent = filterAgent === 'all' || agentId === filterAgent;
    
    const profile = c.clients?.user_id ? profiles.get(c.clients.user_id) : null;
    const clientName = profile ? `${profile.prenom} ${profile.nom}`.toLowerCase() : '';
    const address = c.offres?.adresse?.toLowerCase() || '';
    const agentName = getAgentName(c).toLowerCase();
    const matchesSearch = searchTerm === '' || 
      clientName.includes(searchTerm.toLowerCase()) || 
      address.includes(searchTerm.toLowerCase()) ||
      agentName.includes(searchTerm.toLowerCase());
    
    return matchesStatut && matchesAgent && matchesSearch;
  });

  const stats = {
    total: candidatures.length,
    en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
    en_cours: candidatures.filter(c => ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe'].includes(c.statut)).length,
    cles_remises: candidatures.filter(c => c.statut === 'cles_remises').length,
    refusee: candidatures.filter(c => c.statut === 'refusee').length,
  };

  const agentsList = Array.from(agents.values());

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderExpandedActions = (candidature: Candidature, profile: Profile | null) => {
    const agentName = getAgentName(candidature);
    
    return (
      <div className="space-y-4 pt-4 border-t">
        <CandidatureWorkflowTimeline currentStatut={candidature.statut} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" />Client</h4>
            <p className="font-medium">{profile ? `${profile.prenom} ${profile.nom}` : 'N/A'}</p>
            <p className="text-muted-foreground">{profile?.email || 'N/A'}</p>
            {profile?.telephone && (
              <a href={`tel:${profile.telephone}`} className="text-primary hover:underline flex items-center gap-1">
                <Phone className="h-3 w-3" />{profile.telephone}
              </a>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><UserCog className="h-4 w-4" />Agent responsable</h4>
            <p className="font-medium">{agentName}</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />Dates</h4>
            <p><span className="text-muted-foreground">Dépôt:</span> {format(new Date(candidature.date_depot || candidature.created_at), 'dd/MM/yyyy', { locale: fr })}</p>
            {candidature.client_accepte_conclure_at && (
              <p><span className="text-muted-foreground">Confirmation:</span> {format(new Date(candidature.client_accepte_conclure_at), 'dd/MM/yyyy', { locale: fr })}</p>
            )}
            {candidature.date_signature_choisie && (
              <p><span className="text-muted-foreground">Signature:</span> {format(new Date(candidature.date_signature_choisie), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
            )}
            {candidature.date_etat_lieux && (
              <p><span className="text-muted-foreground">État des lieux:</span> {format(new Date(candidature.date_etat_lieux), 'dd/MM/yyyy', { locale: fr })} {candidature.heure_etat_lieux}</p>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Actions Admin (à la place de l'agent)
          </h4>
          
          <div className="flex flex-wrap gap-2">
            {candidature.statut === 'en_attente' && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatutChange(candidature.id, 'acceptee')}>
                  <CheckCircle className="h-4 w-4 mr-1" />Accepter
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleStatutChange(candidature.id, 'refusee')}>
                  <XCircle className="h-4 w-4 mr-1" />Refuser
                </Button>
              </>
            )}

            {candidature.statut === 'acceptee' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => handleForceProgression(candidature, 'bail_conclu', 'Conclure pour le client')}
              >
                <FastForward className="h-4 w-4 mr-1" />Forcer: Client confirme bail
              </Button>
            )}

            {candidature.statut === 'bail_conclu' && (
              <Button size="sm" onClick={() => handleStatutChange(candidature.id, 'attente_bail', { agent_valide_regie: true, agent_valide_regie_at: new Date().toISOString() })}>
                <Building2 className="h-4 w-4 mr-1" />Valider régie
              </Button>
            )}

            {candidature.statut === 'attente_bail' && (
              <>
                {/* Missing invoice warning */}
                {!candidature.facture_finale_invoice_id && candidature.offres?.prix && (
                  <div className="w-full mb-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                      ⚠️ Facture finale manquante
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      onClick={async () => {
                        if (!candidature.offres?.prix) return;
                        const result = await createFinalInvoice({
                          candidatureId: candidature.id,
                          clientId: candidature.client_id,
                          loyerMensuel: candidature.offres.prix,
                          acomptePaye: 300,
                          adresseBien: candidature.offres.adresse
                        });
                        if (result.success) {
                          loadData();
                        }
                      }}
                      disabled={invoiceLoading}
                    >
                      {invoiceLoading ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Création...</>
                      ) : (
                        <><Receipt className="h-4 w-4 mr-1" />Générer facture finale</>
                      )}
                    </Button>
                  </div>
                )}
                <Button size="sm" onClick={() => { setSelectedCandidature(candidature); setShowDatesDialog(true); }}>
                  <FileCheck className="h-4 w-4 mr-1" />Bail reçu - Proposer dates
                </Button>
              </>
            )}

            {candidature.statut === 'bail_recu' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => handleForceProgression(candidature, 'signature_planifiee', 'Forcer choix date signature')}
              >
                <FastForward className="h-4 w-4 mr-1" />Forcer: Date signature choisie
              </Button>
            )}

            {candidature.statut === 'signature_planifiee' && (
              <Button size="sm" onClick={() => handleStatutChange(candidature.id, 'signature_effectuee', { signature_effectuee: true, signature_effectuee_at: new Date().toISOString() })}>
                <CheckCircle className="h-4 w-4 mr-1" />Marquer bail signé
              </Button>
            )}

            {candidature.statut === 'signature_effectuee' && (
              <Button size="sm" onClick={() => { setSelectedCandidature(candidature); setShowEtatLieuxDialog(true); }}>
                <Calendar className="h-4 w-4 mr-1" />Fixer état des lieux
              </Button>
            )}

            {candidature.statut === 'etat_lieux_fixe' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleClesRemises(candidature.id)}>
                <Key className="h-4 w-4 mr-1" />Confirmer remise des clés
              </Button>
            )}

            {candidature.statut === 'cles_remises' && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />Affaire conclue
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            Toutes les candidatures
          </h1>
          <p className="text-muted-foreground">Supervision globale des candidatures en cours</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.en_attente}</div>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.en_cours}</div>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.cles_remises}</div>
            <p className="text-xs text-muted-foreground">Conclues</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.refusee}</div>
            <p className="text-xs text-muted-foreground">Refusées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher client, adresse, agent..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(WORKFLOW_STATUTS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                {agentsList.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.profile.prenom} {agent.profile.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidatures List */}
      <div className="space-y-4">
        {filteredCandidatures.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Aucune candidature trouvée</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatut !== 'all' || filterAgent !== 'all'
                  ? 'Modifiez vos filtres pour voir plus de résultats'
                  : 'Il n\'y a pas encore de candidatures'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidatures.map(candidature => {
            const profile = candidature.clients?.user_id ? profiles.get(candidature.clients.user_id) : null;
            const isExpanded = expandedCards.has(candidature.id);
            const agentName = getAgentName(candidature);

            return (
              <Collapsible key={candidature.id} open={isExpanded} onOpenChange={() => toggleCard(candidature.id)}>
                <Card className={`transition-all ${isExpanded ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start justify-between cursor-pointer">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getStatutBadgeVariant(candidature.statut)} className="flex items-center gap-1">
                              {getStatutIcon(candidature.statut)}
                              {getStatutLabel(candidature.statut)}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <UserCog className="h-3 w-3" />
                              {agentName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{profile ? `${profile.prenom} ${profile.nom}` : 'Client inconnu'}</span>
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {candidature.offres?.adresse || 'Adresse inconnue'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Déposée le {format(new Date(candidature.date_depot || candidature.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {renderExpandedActions(candidature, profile)}
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showDatesDialog} onOpenChange={setShowDatesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer des dates de signature</DialogTitle>
            <DialogDescription>Le client choisira parmi ces dates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {proposedDates.map((date, index) => (
              <div key={index}>
                <Label>Date {index + 1}</Label>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => {
                    const newDates = [...proposedDates];
                    newDates[index] = e.target.value;
                    setProposedDates(newDates);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDatesDialog(false)}>Annuler</Button>
            <Button onClick={handleProposeDates}>Envoyer au client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEtatLieuxDialog} onOpenChange={setShowEtatLieuxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fixer l'état des lieux</DialogTitle>
            <DialogDescription>Date et heure de la remise des clés</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={etatLieuxDate} onChange={(e) => setEtatLieuxDate(e.target.value)} />
            </div>
            <div>
              <Label>Heure</Label>
              <Input type="time" value={etatLieuxHeure} onChange={(e) => setEtatLieuxHeure(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEtatLieuxDialog(false)}>Annuler</Button>
            <Button onClick={handleSetEtatLieux}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForceDialog} onOpenChange={setShowForceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Forcer la progression
            </DialogTitle>
            <DialogDescription>
              Vous allez faire avancer le workflow à la place du client/agent. Cette action est réversible mais sera enregistrée.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Action: <strong>{forceAction?.label}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForceDialog(false)}>Annuler</Button>
            <Button variant="default" className="bg-orange-600 hover:bg-orange-700" onClick={confirmForceProgression}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
