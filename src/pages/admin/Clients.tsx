import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Users, Upload, Trash2, Pencil, Send, ArrowUpDown, Search, AlertTriangle, CheckCircle, Shield, UserX, ChevronRight, Sparkles, Filter } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { calculateDaysElapsed } from "@/utils/calculations";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { hasStableStatus } from "@/hooks/useSolvabilityCheck";
import { CUMULATIVE_TYPES } from "@/hooks/useClientCandidates";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { cn } from "@/lib/utils";

import { AnimatedCounter } from "@/components/AnimatedCounter";

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
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
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
    const matchesUnassigned = !showUnassignedOnly || !client.agent_id;
    
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
    
    return matchesSearch && matchesAgent && matchesUnassigned && matchRegion && matchPieces;
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
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin border-b-primary/40" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-muted-foreground animate-pulse">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <PremiumPageHeader
          title="Gestion des Clients"
          subtitle={`${clients.length} clients au total`}
          icon={Users}
          badge="Administration"
          action={
            <div className="flex flex-wrap gap-2">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={clients.length === 0 || deleting}>
                    <Trash2 className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{deleting ? 'Suppression...' : 'Supprimer tous'}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Cela supprimera définitivement tous les clients ({clients.length}) 
                      et toutes leurs données associées.
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
              </Button>
            </div>
          }
        />

        {/* Premium Filter Section */}
        <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-4 md:p-6 mb-6 animate-fade-in">
          {/* Subtle background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-2 right-10 w-16 h-16 bg-primary/5 rounded-full blur-2xl animate-float" />
            <div className="absolute bottom-2 left-20 w-12 h-12 bg-accent/5 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="relative z-10">
            {/* Header with filter icon */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Filtres de recherche</span>
              {(selectedRegions.length > 0 || selectedPieces.length > 0 || showUnassignedOnly || filterAgent !== 'all') && (
                <Badge className="bg-primary/20 text-primary border-0 text-[10px] animate-scale-in">
                  {selectedRegions.length + selectedPieces.length + (showUnassignedOnly ? 1 : 0) + (filterAgent !== 'all' ? 1 : 0)} actifs
                </Badge>
              )}
            </div>

            {/* Main filters row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1 sm:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
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
              <Button
                variant={showUnassignedOnly ? "default" : "outline"}
                onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                className={cn(
                  "w-full sm:w-auto transition-all duration-300",
                  showUnassignedOnly && "shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                )}
              >
                <UserX className="w-4 h-4 mr-2" />
                Sans agent
              </Button>
            </div>

            {/* Filtres dépliables sur mobile */}
            <details className="sm:hidden">
              <summary className="text-sm font-medium cursor-pointer p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Filtres avancés
                </span>
              </summary>
              <div className="mt-3 space-y-4 animate-fade-in">
                {/* Filtres Régions */}
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Régions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {regions.map(region => (
                      <Button
                        key={region}
                        variant={selectedRegions.includes(region) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRegion(region)}
                        className={cn(
                          "text-[10px] h-7 px-2 transition-all duration-300",
                          selectedRegions.includes(region) && "shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                        )}
                      >
                        {region}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Filtres Nombre de pièces */}
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Nombre de pièces</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nombrePieces.map(pieces => (
                      <Button
                        key={pieces}
                        variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePieces(pieces)}
                        className={cn(
                          "text-[10px] h-7 px-2 transition-all duration-300",
                          selectedPieces.includes(pieces) && "shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                        )}
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
              <p className="text-xs font-medium mb-2 text-muted-foreground">Régions</p>
              <div className="flex flex-wrap gap-2">
                {regions.map(region => (
                  <Button
                    key={region}
                    variant={selectedRegions.includes(region) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRegion(region)}
                    className={cn(
                      "text-xs transition-all duration-300 hover:scale-105",
                      selectedRegions.includes(region) && "shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                    )}
                  >
                    {region}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtres Nombre de pièces - desktop */}
            <div className="hidden sm:block">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Nombre de pièces</p>
              <div className="flex flex-wrap gap-2">
                {nombrePieces.map(pieces => (
                  <Button
                    key={pieces}
                    variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePieces(pieces)}
                    className={cn(
                      "text-xs transition-all duration-300 hover:scale-105",
                      selectedPieces.includes(pieces) && "shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                    )}
                  >
                    {pieces}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Sort Section */}
        <div className="mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Trier par:</p>
            {[
              { field: 'date' as SortField, label: 'Date' },
              { field: 'name' as SortField, label: 'Nom' },
              { field: 'agent' as SortField, label: 'Agent' },
              { field: 'budget' as SortField, label: 'Budget' },
              { field: 'days' as SortField, label: 'Jours' },
            ].map(({ field, label }) => (
              <Button
                key={field}
                variant={sortField === field ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort(field)}
                className={cn(
                  "text-[10px] md:text-xs h-7 transition-all duration-300",
                  sortField === field && "shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                )}
              >
                <ArrowUpDown className={cn(
                  "h-3 w-3 mr-1 transition-transform",
                  sortField === field && sortOrder === 'asc' && "rotate-180"
                )} />
                {label}
              </Button>
            ))}
          </div>
          
          {/* Animated results counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">
              <AnimatedCounter value={sortedClients.length} /> client{sortedClients.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {sortedClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary/50" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/20 animate-ping opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Aucun client trouvé</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Modifiez vos filtres ou importez des clients via CSV
            </p>
          </div>
        )}

        {/* Premium Grid de clients */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {sortedClients.map((client, index) => {
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
              <div 
                key={client.id} 
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-card/90 backdrop-blur-xl p-4 md:p-5",
                  "border border-border/50 cursor-pointer flex flex-col",
                  "transition-all duration-500 ease-out",
                  "hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-primary/40 hover:-translate-y-2",
                  "animate-fade-in",
                  !isSolvable && "border-destructive/30 hover:border-destructive/50"
                )}
                style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                onClick={() => navigate(`/admin/clients/${client.id}`)}
              >
                {/* Animated glow border on hover */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                  isSolvable 
                    ? "shadow-[inset_0_0_20px_rgba(var(--primary),0.15)]" 
                    : "shadow-[inset_0_0_20px_rgba(var(--destructive),0.15)]"
                )} />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                </div>
                
                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-3 right-12 w-8 h-8 bg-primary/10 rounded-full blur-xl animate-float" />
                  <div className="absolute bottom-8 left-4 w-6 h-6 bg-accent/10 rounded-full blur-lg animate-float" style={{ animationDelay: '0.5s' }} />
                </div>
                
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
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

                {/* SECTION 1: Identité avec statut solvabilité - Premium */}
                <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30 pr-20">
                  {/* Premium Avatar/Initials */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-sm md:text-base font-bold shrink-0",
                      "bg-gradient-to-br shadow-lg transition-all duration-300",
                      isSolvable 
                        ? "from-primary/20 to-primary/10 text-primary group-hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]" 
                        : "from-destructive/20 to-destructive/10 text-destructive group-hover:shadow-[0_0_20px_rgba(var(--destructive),0.3)]"
                    )}>
                      {profile.prenom.charAt(0)}{profile.nom.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
                        {profile.prenom} {profile.nom}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {!client.agent_id && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-[10px] animate-pulse-soft">
                            Sans agent
                          </Badge>
                        )}
                        {isSolvable ? (
                          <Badge className="bg-green-500/20 text-green-600 border border-green-500/30 text-[10px] shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            Solvable
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/20 text-destructive border border-destructive/30 text-[10px] animate-pulse-soft">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            Non solvable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs md:text-sm pl-[52px] md:pl-[60px]">
                    <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                      <span className="truncate">{client.nationalite || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Users className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className={cn(
                        "truncate",
                        !clientHasStableStatus ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                      )}>
                        Permis: {client.type_permis || '-'}
                        {!clientHasStableStatus && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Finances - Premium */}
                <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
                  <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
                    <span className="text-base">💰</span> Finances
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-2 md:p-2.5 rounded-xl text-center border border-border/30">
                      <p className="text-[10px] md:text-xs text-muted-foreground">Revenu total</p>
                      <p className="text-xs md:text-sm font-bold">CHF {totalRevenus.toLocaleString()}</p>
                    </div>
                    <div className={cn(
                      "p-2 md:p-2.5 rounded-xl text-center border transition-all",
                      budgetOk 
                        ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30' 
                        : 'bg-gradient-to-br from-destructive/15 to-destructive/5 border-destructive/30'
                    )}>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Budget max</p>
                      <p className={cn(
                        "text-xs md:text-sm font-bold",
                        budgetOk ? 'text-primary' : 'text-destructive'
                      )}>
                        CHF {budgetDemande.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {/* Info garant */}
                  {validGarant && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-green-600 bg-green-500/10 px-2 py-1 rounded-full w-fit">
                      <Shield className="w-3 h-3" />
                      <span className="font-medium">Garant valide</span>
                    </div>
                  )}
                  {excludedCandidates > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-orange-600">
                      <AlertTriangle className="w-3 h-3 animate-pulse-soft" />
                      <span>{excludedCandidates} candidat(s) non comptabilisé(s)</span>
                    </div>
                  )}
                </div>

                {/* SECTION 3: Contact - Premium */}
                <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
                  <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
                    <span className="text-base">📞</span> Contact
                  </p>
                  <div className="space-y-1 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                      <span className="truncate">{profile.telephone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                      <span className="truncate text-[10px] md:text-xs">{profile.email}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Recherche - Premium */}
                <div className="relative z-10 mb-3 md:mb-4">
                  <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
                    <span className="text-base">🏠</span> Recherche
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge className="bg-secondary/80 text-secondary-foreground border-0 text-[10px] md:text-xs hover:bg-secondary transition-colors">
                      {client.type_bien || 'Location'}
                    </Badge>
                    <Badge className="bg-secondary/80 text-secondary-foreground border-0 text-[10px] md:text-xs hover:bg-secondary transition-colors">
                      {client.pieces || 0} pièces
                    </Badge>
                    <Badge variant="outline" className="text-[10px] md:text-xs bg-background/50 hover:bg-background transition-colors">
                      {client.region_recherche || 'N/A'}
                    </Badge>
                  </div>
                </div>

                {/* Agent assigné - Premium */}
                <div className="relative z-10 text-xs text-muted-foreground mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Users className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    <span className="truncate">Agent: <span className="font-medium text-foreground">{getAgentName(client.agent_id)}</span></span>
                  </div>
                </div>

                {/* Date et barre de progression - Premium */}
                <div className="relative z-10 mt-auto">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px] md:text-xs">
                      <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span>{new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold transition-all",
                      daysElapsed < 60 
                        ? 'bg-green-500/20 text-green-600 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                        : daysElapsed < 90 
                          ? 'bg-orange-500/20 text-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.2)]' 
                          : 'bg-red-500/20 text-red-600 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse-soft'
                    )}>
                      <span>J+{Math.floor(daysElapsed)}</span>
                    </div>
                  </div>

                  {/* Premium Progress bar with glow */}
                  <div className="relative w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        daysElapsed < 60 
                          ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                          : daysElapsed < 90 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]' 
                            : 'bg-gradient-to-r from-red-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                      )}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* Navigation indicator */}
                <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
                
                {/* Hover arrow indicator */}
                <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
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
