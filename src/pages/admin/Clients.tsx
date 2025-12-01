import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Users, DollarSign, Upload, Trash2, Pencil, Send, ArrowUpDown, Search, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { calculateDaysElapsed } from "@/utils/calculations";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { hasStableStatus } from "@/hooks/useSolvabilityCheck";
import { CUMULATIVE_TYPES } from "@/hooks/useClientCandidates";

interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  nationalite?: string;
  type_permis?: string;
  region_recherche?: string;
  type_bien?: string;
  situation_familiale?: string;
  profession?: string;
  secteur_activite?: string;
  residence?: string;
  created_at?: string;
  date_ajout?: string;
  poursuites?: boolean;
}

interface ClientCandidate {
  id: string;
  client_id: string;
  type: string;
  revenus_mensuels?: number;
  type_permis?: string;
  nationalite?: string;
  poursuites?: boolean;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

interface Agent {
  id: string;
  profile: Profile;
}

type SortField = 'date' | 'name' | 'agent' | 'budget' | 'days';
type SortOrder = 'asc' | 'desc';

const Clients = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientProfiles, setClientProfiles] = useState<Map<string, Profile>>(new Map());
  const [clientCandidates, setClientCandidates] = useState<Map<string, ClientCandidate[]>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Load all client profiles
      const clientUserIds = clientsData?.map(c => c.user_id) || [];
      const clientIds = clientsData?.map(c => c.id) || [];

      if (clientUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientUserIds);

        if (profilesError) throw profilesError;

        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile as Profile);
        });
        setClientProfiles(profilesMap);
      }

      // Load all client candidates for solvability
      if (clientIds.length > 0) {
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('client_candidates')
          .select('id, client_id, type, revenus_mensuels, type_permis, nationalite, poursuites')
          .in('client_id', clientIds);

        if (!candidatesError && candidatesData) {
          const candidatesMap = new Map<string, ClientCandidate[]>();
          candidatesData.forEach(candidate => {
            const existing = candidatesMap.get(candidate.client_id) || [];
            existing.push(candidate as ClientCandidate);
            candidatesMap.set(candidate.client_id, existing);
          });
          setClientCandidates(candidatesMap);
        }
      }

      // Load agents with active profiles
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id');

      if (agentsError) throw agentsError;

      // Load agent profiles separately, filtering by actif = true
      const agentUserIds = agentsData?.map(a => a.user_id) || [];
      const { data: agentProfilesData, error: agentProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', agentUserIds)
        .eq('actif', true);

      if (agentProfilesError) throw agentProfilesError;

      const agentProfilesMap = new Map(agentProfilesData?.map(p => [p.id, p]));

      // Only keep agents with active profiles
      const transformedAgents = agentsData
        ?.filter(agent => agentProfilesMap.has(agent.user_id))
        .map(agent => ({
          id: agent.id,
          profile: agentProfilesMap.get(agent.user_id) as Profile,
        })) || [];

      setAgents(transformedAgents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const regions = ['Chablais', 'Fribourg', 'Gros-de-Vaud', 'Lausanne et région', 'Ouest-lausannois', 'Lavaux', 'Nord-vaudois', 'Nyon et région', 'Riviera', 'Valais', 'Genève', 'Autre'];
  const nombrePieces = ['1+', '2+', '3+', '4+', '5+', 'Autre'];

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const togglePieces = (pieces: string) => {
    setSelectedPieces(prev => 
      prev.includes(pieces) ? prev.filter(p => p !== pieces) : [...prev, pieces]
    );
  };

  const filteredClients = clients.filter(client => {
    const profile = clientProfiles.get(client.user_id);
    const matchesSearch = profile 
      ? (`${profile.prenom} ${profile.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
         profile.email.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    const matchesAgent = filterAgent === "all" || client.agent_id === filterAgent;
    
    const matchRegion = selectedRegions.length === 0 || 
      (client.region_recherche && selectedRegions.includes(client.region_recherche));
    
    const matchPieces = selectedPieces.length === 0 || 
      selectedPieces.some(p => {
        if (p === 'Autre') return true;
        const pieceNum = parseFloat(p.replace('+', ''));
        const clientPieces = client.pieces || 0;
        
        if (p.includes('+')) {
          return clientPieces >= pieceNum;
        }
        return Math.floor(clientPieces) === Math.floor(pieceNum);
      });
    
    return matchesSearch && matchesAgent && matchRegion && matchPieces;
  });

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.profile.prenom} ${agent.profile.nom}` : "Non assigné";
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Trier les clients
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      const profileA = clientProfiles.get(a.user_id);
      const profileB = clientProfiles.get(b.user_id);
      let comparison = 0;

      switch (sortField) {
        case 'date':
          const dateA = new Date(a.date_ajout || a.created_at || 0).getTime();
          const dateB = new Date(b.date_ajout || b.created_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'name':
          const nameA = profileA ? `${profileA.prenom} ${profileA.nom}`.toLowerCase() : '';
          const nameB = profileB ? `${profileB.prenom} ${profileB.nom}`.toLowerCase() : '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'agent':
          const agentA = getAgentName(a.agent_id).toLowerCase();
          const agentB = getAgentName(b.agent_id).toLowerCase();
          comparison = agentA.localeCompare(agentB);
          break;
        case 'budget':
          comparison = (a.budget_max || 0) - (b.budget_max || 0);
          break;
        case 'days':
          const daysA = calculateDaysElapsed(a.date_ajout || a.created_at);
          const daysB = calculateDaysElapsed(b.date_ajout || b.created_at);
          comparison = daysA - daysB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredClients, sortField, sortOrder, clientProfiles, agents]);

  const handleDeleteAllClients = async () => {
    try {
      setDeleting(true);

      const { data, error } = await supabase.functions.invoke('delete-all-clients');

      if (error) throw error;

      console.log('Delete all clients response:', data);

      toast({
        title: 'Suppression réussie',
        description: `${data.deletedClients} clients supprimés`,
      });

      // Reload data
      await loadData();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting all clients:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer tous les clients',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatTimeElapsed = (days: number) => {
    const totalHours = days * 24;
    const displayDays = Math.floor(days);
    const remainingHours = Math.floor((days - displayDays) * 24);
    const remainingMinutes = Math.floor(((days - displayDays) * 24 - remainingHours) * 60);
    return `${displayDays}j ${remainingHours}h ${remainingMinutes}m`;
  };

  const handleDeleteClient = async (clientUserId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la navigation vers la page de détail
    
    try {
      setDeletingClientId(clientUserId);

      const { error } = await supabase.functions.invoke('delete-client', {
        body: { userId: clientUserId }
      });

      if (error) throw error;

      toast({
        title: 'Client supprimé',
        description: 'Le client a été supprimé avec succès',
      });

      // Recharger les données
      await loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le client',
        variant: 'destructive',
      });
    } finally {
      setDeletingClientId(null);
    }
  };

  const handleInviteClient = async (email: string, clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setInvitingClientId(clientId);

      const { error } = await supabase.functions.invoke('invite-client', {
        body: { email, clientId }
      });

      if (error) throw error;

      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été envoyée à ${email}`,
      });
    } catch (error) {
      console.error('Error inviting client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'invitation',
        variant: 'destructive',
      });
    } finally {
      setInvitingClientId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-6">
          {/* Header responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Clients</h1>
              <p className="text-sm md:text-base text-muted-foreground">Vue d'ensemble ({clients.length} clients)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={clients.length === 0 || deleting}>
                    <Trash2 className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{deleting ? 'Suppression...' : 'Supprimer tous'}</span>
                    <span className="sm:hidden">{deleting ? '...' : 'Tout suppr.'}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Cela supprimera définitivement tous les clients ({clients.length}) 
                      et toutes leurs données associées (profils, comptes utilisateurs).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllClients} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Supprimer tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setShowImportDialog(true)} size="sm">
                <Upload className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Importer CSV</span>
                <span className="sm:hidden">Import</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filtres responsive */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md"
          />
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.profile.prenom} {agent.profile.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtres dépliables sur mobile */}
        <details className="mb-4 sm:hidden">
          <summary className="text-sm font-medium cursor-pointer p-2 bg-muted/50 rounded-md">Filtres avancés</summary>
          <div className="mt-3 space-y-4">
            {/* Filtres Régions */}
            <div>
              <p className="text-xs font-medium mb-2">Régions</p>
              <div className="flex flex-wrap gap-1.5">
                {regions.map(region => (
                  <Button
                    key={region}
                    variant={selectedRegions.includes(region) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRegion(region)}
                    className="text-[10px] h-7 px-2"
                  >
                    {region}
                  </Button>
                ))}
              </div>
            </div>
            {/* Filtres Nombre de pièces */}
            <div>
              <p className="text-xs font-medium mb-2">Nombre de pièces</p>
              <div className="flex flex-wrap gap-1.5">
                {nombrePieces.map(pieces => (
                  <Button
                    key={pieces}
                    variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePieces(pieces)}
                    className="text-[10px] h-7 px-2"
                  >
                    {pieces}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Filtres Régions - desktop */}
        <div className="mb-4 hidden sm:block">
          <p className="text-sm font-medium mb-2">Régions</p>
          <div className="flex flex-wrap gap-2">
            {regions.map(region => (
              <Button
                key={region}
                variant={selectedRegions.includes(region) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleRegion(region)}
                className="text-xs"
              >
                {region}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtres Nombre de pièces - desktop */}
        <div className="mb-4 hidden sm:block">
          <p className="text-sm font-medium mb-2">Nombre de pièces</p>
          <div className="flex flex-wrap gap-2">
            {nombrePieces.map(pieces => (
              <Button
                key={pieces}
                variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                size="sm"
                onClick={() => togglePieces(pieces)}
                className="text-xs"
              >
                {pieces}
              </Button>
            ))}
          </div>
        </div>

        {/* Tri */}
        <div className="mb-4 md:mb-6 flex flex-wrap items-center gap-2">
          <p className="text-xs md:text-sm font-medium">Trier par:</p>
          <Button
            variant={sortField === 'date' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort('date')}
            className="text-[10px] md:text-xs h-7"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Date
          </Button>
          <Button
            variant={sortField === 'name' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort('name')}
            className="text-[10px] md:text-xs h-7"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Nom
          </Button>
          <Button
            variant={sortField === 'agent' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort('agent')}
            className="text-[10px] md:text-xs h-7"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Agent
          </Button>
          <Button
            variant={sortField === 'budget' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort('budget')}
            className="text-[10px] md:text-xs h-7"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Budget
          </Button>
          <Button
            variant={sortField === 'days' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort('days')}
            className="text-[10px] md:text-xs h-7"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Jours
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{sortedClients.length} client{sortedClients.length > 1 ? 's' : ''}</p>

        {/* Grid de clients - responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {sortedClients.map((client) => {
            const profile = clientProfiles.get(client.user_id);
            const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
            const progressPercent = (daysElapsed / 90) * 100;
            const candidates = clientCandidates.get(client.id) || [];

            // Calculate solvability
            const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);
            const clientRevenus = client.revenus_mensuels || 0;
            const budgetDemande = client.budget_max || 0;
            
            // Filter candidates with stable status for cumulative calculation
            const stableCumulativeCandidates = candidates.filter(c => {
              if (!CUMULATIVE_TYPES.includes(c.type as any)) return false;
              if (c.poursuites) return false;
              return hasStableStatus(c.type_permis, c.nationalite);
            });
            
            const candidatesRevenus = stableCumulativeCandidates.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);
            const totalRevenus = clientHasStableStatus ? clientRevenus + candidatesRevenus : candidatesRevenus;
            const budgetPossible = Math.round(totalRevenus / 3);
            
            // Check for valid guarantor
            const garants = candidates.filter(c => c.type === 'garant');
            const validGarant = garants.find(g => 
              !g.poursuites && 
              hasStableStatus(g.type_permis, g.nationalite) &&
              (g.revenus_mensuels || 0) >= budgetDemande * 3
            );
            
            // Determine solvability
            const hasCriticalProblems = client.poursuites || (!clientHasStableStatus && !validGarant);
            const budgetOk = budgetDemande === 0 || 
              (clientHasStableStatus && budgetPossible >= budgetDemande) ||
              (validGarant && Math.round((validGarant.revenus_mensuels || 0) / 3) >= budgetDemande);
            const isSolvable = !hasCriticalProblems && budgetOk && (clientHasStableStatus || !!validGarant);
            
            // Count excluded candidates
            const excludedCandidates = candidates.filter(c => 
              CUMULATIVE_TYPES.includes(c.type as any) && 
              !c.poursuites &&
              !hasStableStatus(c.type_permis, c.nationalite)
            ).length;

            if (!profile) return null;

            return (
              <Card 
                key={client.id} 
                className={`p-3 md:p-4 flex flex-col relative cursor-pointer hover:shadow-lg transition-shadow ${
                  !isSolvable ? 'border-red-200 dark:border-red-900' : ''
                }`}
                onClick={() => navigate(`/admin/clients/${client.id}`)}
              >
                {/* Boutons d'actions - plus gros sur mobile */}
                <div className="absolute top-2 right-2 flex gap-0.5 md:gap-1">
                  {/* Bouton Renvoyer invitation */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                    onClick={(e) => handleInviteClient(profile.email, client.id, e)}
                    disabled={invitingClientId === client.id}
                    title="Renvoyer l'invitation"
                  >
                    <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>

                  {/* Bouton Modifier */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/clients/${client.id}`);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>

                  {/* Bouton Supprimer */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()}
                        disabled={deletingClientId === client.user_id}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()} className="max-w-[95vw] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le client {profile?.prenom} {profile?.nom} et toutes ses données seront définitivement supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => handleDeleteClient(client.user_id, e)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* SECTION 1: Identité avec statut solvabilité */}
                <div className="mb-2 md:mb-3 pb-2 md:pb-3 border-b pr-20">
                  <div className="flex items-center gap-2 flex-wrap mb-1 md:mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-primary">
                      {profile.prenom} {profile.nom}
                    </h3>
                    {!client.agent_id && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                        Sans agent
                      </Badge>
                    )}
                    {isSolvable ? (
                      <Badge className="bg-green-600 text-white text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-0.5" />
                        Solvable
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        Non solvable
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-0.5 md:space-y-1 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{client.nationalite || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 text-muted-foreground" />
                      <span className={`truncate ${!clientHasStableStatus ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                        Permis: {client.type_permis || '-'}
                        {!clientHasStableStatus && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Finances avec solvabilité */}
                <div className="mb-2 md:mb-3 pb-2 md:pb-3 border-b">
                  <p className="text-xs md:text-sm font-medium mb-1 md:mb-2">💰 Finances</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/30 p-1.5 md:p-2 rounded text-center">
                      <p className="text-[10px] md:text-xs text-muted-foreground">Revenu total</p>
                      <p className="text-xs md:text-sm font-semibold">CHF {totalRevenus.toLocaleString()}</p>
                    </div>
                    <div className={`p-1.5 md:p-2 rounded text-center ${budgetOk ? 'bg-primary/10' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Budget max</p>
                      <p className={`text-xs md:text-sm font-semibold ${budgetOk ? 'text-primary' : 'text-red-600'}`}>
                        CHF {budgetDemande.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {/* Info garant */}
                  {validGarant && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-600">
                      <Shield className="w-3 h-3" />
                      <span>Garant valide</span>
                    </div>
                  )}
                  {excludedCandidates > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-orange-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{excludedCandidates} candidat(s) non comptabilisé(s)</span>
                    </div>
                  )}
                </div>

                {/* SECTION 3: Contact - condensé */}
                <div className="mb-2 md:mb-3 pb-2 md:pb-3 border-b">
                  <p className="text-xs md:text-sm font-medium mb-1 md:mb-2">📞 Contact</p>
                  <div className="space-y-0.5 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{profile.telephone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate text-[10px] md:text-xs">{profile.email}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Recherche */}
                <div className="mb-2 md:mb-3">
                  <p className="text-xs md:text-sm font-medium mb-1 md:mb-2">🏠 Recherche</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] md:text-xs">
                      {client.type_bien || 'Location'}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] md:text-xs">
                      {client.pieces || 0} pièces
                    </Badge>
                    <Badge variant="outline" className="text-[10px] md:text-xs">
                      {client.region_recherche || 'N/A'}
                    </Badge>
                  </div>
                </div>

                {/* Agent assigné */}
                <div className="text-xs text-muted-foreground mb-2 md:mb-3 pb-2 md:pb-3 border-b">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="truncate">Agent: {getAgentName(client.agent_id)}</span>
                  </div>
                </div>

                {/* Date et barre de progression */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px] md:text-xs">
                      <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span>{new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium ${
                      daysElapsed < 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      daysElapsed < 90 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      <span>J+{Math.floor(daysElapsed)}</span>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="w-full bg-muted rounded-full h-1.5 md:h-2">
                    <div
                      className={`h-1.5 md:h-2 rounded-full transition-all ${
                        daysElapsed < 60 ? 'bg-green-500' :
                        daysElapsed < 90 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {sortedClients.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <p className="text-sm md:text-base text-muted-foreground">Aucun client ne correspond aux filtres sélectionnés</p>
          </div>
        )}
      </div>

      <CSVImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={() => {
          setShowImportDialog(false);
          loadData();
        }}
      />
    </div>
  );
};

export default Clients;
