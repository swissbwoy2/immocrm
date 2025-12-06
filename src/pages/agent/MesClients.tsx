import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Calendar, Users, Building2, Car, DollarSign, AlertTriangle, Edit, Upload, Shield, CheckCircle, FileWarning, Home, Key, Bell, ChevronRight, Wallet, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateDaysElapsed } from "@/utils/calculations";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { hasStableStatus } from "@/hooks/useSolvabilityCheck";
import { CUMULATIVE_TYPES } from "@/hooks/useClientCandidates";
import { ClientTypeBadge } from "@/components/ClientTypeBadge";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { cn } from "@/lib/utils";

const MesClients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [selectedTypeRecherche, setSelectedTypeRecherche] = useState<'all' | 'Louer' | 'Acheter'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [clientReminders, setClientReminders] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadAgentAndClients();
    // Mark client_assigned notifications as read when visiting this page
    markTypeAsRead('client_assigned');
  }, [user?.id]);

  const loadAgentAndClients = async () => {
    if (!user) return;

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) {
        toast({
          title: "Erreur",
          description: "Agent introuvable",
          variant: "destructive",
        });
        return;
      }

      const currentAgentId = agentData.id;
      setAgentId(currentAgentId);

      // Load all clients via client_agents for multi-agent support
      const { data: clientAgentsData, error: caError } = await supabase
        .from('client_agents')
        .select('client_id, is_primary, commission_split')
        .eq('agent_id', currentAgentId);

      if (caError) throw caError;
      
      if (!clientAgentsData || clientAgentsData.length === 0) {
        setAllClients([]);
        setLoading(false);
        return;
      }

      const clientIds = clientAgentsData.map(ca => ca.client_id);

      // Load client data
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds);

      if (error) throw error;

      // Load profiles separately
      const userIds = clientsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      // Load co-agents for each client
      const { data: allClientAgentsData, error: allCaError } = await supabase
        .from('client_agents')
        .select(`
          client_id,
          is_primary,
          commission_split,
          agent_id,
          agents!inner (
            user_id,
            profiles:user_id (
              prenom,
              nom,
              email
            )
          )
        `)
        .in('client_id', clientIds);

      if (allCaError) throw allCaError;

      // Map agents by client
      const clientAgentsMap = new Map<string, any[]>();
      allClientAgentsData?.forEach((ca: any) => {
        if (!clientAgentsMap.has(ca.client_id)) {
          clientAgentsMap.set(ca.client_id, []);
        }
        clientAgentsMap.get(ca.client_id)?.push({
          agent_id: ca.agent_id,
          is_primary: ca.is_primary,
          commission_split: ca.commission_split,
          profile: ca.agents?.profiles
        });
      });

      // Load candidates for all clients
      const { data: candidatesData } = await supabase
        .from('client_candidates')
        .select('*')
        .in('client_id', clientIds);

      // Group candidates by client_id
      const candidatesMap = new Map<string, any[]>();
      candidatesData?.forEach(candidate => {
        const existing = candidatesMap.get(candidate.client_id) || [];
        existing.push(candidate);
        candidatesMap.set(candidate.client_id, existing);
      });
      
      // Load notes and count pending reminders per client
      const { data: notesData } = await supabase
        .from('client_notes')
        .select('client_id, is_completed, note_type')
        .in('client_id', clientIds)
        .eq('is_completed', false);
      
      const remindersMap = new Map<string, number>();
      notesData?.forEach(note => {
        if (note.note_type === 'rappel' || note.note_type === 'action') {
          const count = remindersMap.get(note.client_id) || 0;
          remindersMap.set(note.client_id, count + 1);
        }
      });
      setClientReminders(remindersMap);

      // Transform data to match expected format
      const transformedClients = clientsData?.map(client => {
        const profile = profilesMap.get(client.user_id);
        const candidates = candidatesMap.get(client.id) || [];
        const clientAgentsList = clientAgentsMap.get(client.id) || [];
        const coAgents = clientAgentsList.filter(ca => ca.agent_id !== currentAgentId);
        const isPrimaryAgent = clientAgentsList.find(ca => ca.agent_id === currentAgentId)?.is_primary || false;
        
        // Check client's stable status
        const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);
        
        // Calculate total revenue including ONLY stable cumulative candidates
        const clientRevenu = Number(client.revenus_mensuels) || 0;
        const stableCandidatesRevenu = candidates
          .filter(c => 
            CUMULATIVE_TYPES.includes(c.type) && 
            !c.poursuites &&
            hasStableStatus(c.type_permis, c.nationalite)
          )
          .reduce((sum, c) => sum + (Number(c.revenus_mensuels) || 0), 0);
        
        // If client has stable status, include their revenue; otherwise only count stable candidates
        const totalRevenus = clientHasStableStatus 
          ? clientRevenu + stableCandidatesRevenu 
          : stableCandidatesRevenu;
        
        // Calculate budget possible (33% of total revenue)
        const budgetPossible = Math.round(totalRevenus / 3);
        
        // Find valid guarantor (must have sufficient income AND stable status AND no poursuites)
        const garant = candidates.find(c => {
          if (c.type !== 'garant') return false;
          if (c.poursuites) return false;
          const garantRevenu = Number(c.revenus_mensuels) || 0;
          const budgetDemande = Number(client.budget_max) || 0;
          const garantHasStableStatus = hasStableStatus(c.type_permis, c.nationalite);
          return garantRevenu >= budgetDemande * 3 && garantHasStableStatus;
        });
        
        // Count candidates by type
        const candidatesCount = candidates.length;
        const garantsCount = candidates.filter(c => c.type === 'garant').length;
        const colocatairesCount = candidates.filter(c => c.type === 'colocataire').length;
        const coDebiteursCount = candidates.filter(c => c.type === 'co_debiteur').length;
        const signatairesCount = candidates.filter(c => c.type === 'signataire_solidaire').length;
        
        // Count unstable candidates (not counted in solvability)
        const unstableCandidatesCount = candidates.filter(c => 
          CUMULATIVE_TYPES.includes(c.type) && 
          !hasStableStatus(c.type_permis, c.nationalite)
        ).length;
        
        // Detect unstable garants
        const unstableGarants = candidates.filter(c => 
          c.type === 'garant' && 
          !c.poursuites &&
          !hasStableStatus(c.type_permis, c.nationalite)
        );
        
        // Check solvability
        const budgetDemande = Number(client.budget_max) || 0;
        const hasNoPoursuites = !client.poursuites;
        
        // Calculate effective budget possible based on who makes the dossier solvable
        let effectiveBudgetPossible = budgetPossible;
        let solvabilitySource: 'client' | 'garant' | 'combined' = 'client';
        
        if (!clientHasStableStatus && garant) {
          // Client unstable but has valid garant - garant's budget makes the decision
          effectiveBudgetPossible = Math.round((Number(garant.revenus_mensuels) || 0) / 3);
          solvabilitySource = 'garant';
        } else if (clientHasStableStatus && garant) {
          solvabilitySource = 'combined';
        }
        
        const budgetOk = effectiveBudgetPossible >= budgetDemande || budgetDemande === 0;
        const hasStableStatusOrGarant = clientHasStableStatus || !!garant;
        const isSolvable = budgetOk && hasStableStatusOrGarant && hasNoPoursuites;
        
        // Collect solvability issues for display
        const solvabilityIssues: string[] = [];
        
        if (client.poursuites) {
          solvabilityIssues.push('Poursuites');
        }
        if (!clientHasStableStatus && !garant) {
          solvabilityIssues.push(`Permis ${client.type_permis || 'non renseigné'}`);
        }
        if (!budgetOk && budgetDemande > 0) {
          solvabilityIssues.push('Budget insuffisant');
        }
        if (unstableGarants.length > 0) {
          solvabilityIssues.push(`Garant non stable (${unstableGarants[0].type_permis || '?'})`);
        }

        return {
          id: client.id,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
          email: profile?.email || '',
          telephone: profile?.telephone || '',
          adresse: '',
          nationalite: client.nationalite,
          typePermis: client.type_permis,
          etatCivil: client.situation_familiale,
          profession: client.profession,
          employeur: client.secteur_activite,
          revenuMensuel: client.revenus_mensuels,
          totalRevenus,
          budgetPossible: effectiveBudgetPossible,
          budgetMax: client.budget_max,
          nombrePiecesSouhaite: client.pieces?.toString() || '',
          regions: client.region_recherche ? [client.region_recherche] : [],
          animaux: false,
          vehicules: false,
          dateInscription: client.date_ajout || client.created_at,
          agentId: client.agent_id,
          typeBien: client.type_bien,
          typeRecherche: client.type_recherche || 'Louer',
          apportPersonnel: client.apport_personnel,
          garant: garant ? { 
            nom: garant.nom, 
            prenom: garant.prenom, 
            revenus: garant.revenus_mensuels,
            permis: garant.type_permis,
          } : null,
          candidates,
          candidatesCount,
          garantsCount,
          colocatairesCount,
          coDebiteursCount,
          signatairesCount,
          isSolvable,
          clientHasStableStatus,
          solvabilitySource,
          solvabilityIssues,
          unstableCandidatesCount,
          unstableGarants,
        };
      }) || [];

      setAllClients(transformedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
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

  const filteredClients = allClients.filter(client => {
    const matchSearch = searchTerm === "" || 
      client.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${client.prenom} ${client.nom}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchRegion = selectedRegions.length === 0 || 
      (client.regions && client.regions.length > 0 && client.regions.some((r: string) => selectedRegions.includes(r)));
    
    const matchPieces = selectedPieces.length === 0 || 
      selectedPieces.some(p => {
        if (p === 'Autre') return true;
        const pieceNum = parseFloat(p.replace('+', ''));
        const clientPieces = client.nombrePiecesSouhaite || '';
        const clientNum = parseFloat(clientPieces.toString().replace('+', ''));
        
        if (p.includes('+')) {
          return clientNum >= pieceNum;
        }
        
        return Math.floor(clientNum) === Math.floor(pieceNum);
      });
    
    const matchTypeRecherche = selectedTypeRecherche === 'all' || 
      client.typeRecherche === selectedTypeRecherche;
    
    return matchSearch && matchRegion && matchPieces && matchTypeRecherche;
  });

  // Compteurs par type
  const clientsLocation = allClients.filter(c => c.typeRecherche !== 'Acheter').length;
  const clientsAchat = allClients.filter(c => c.typeRecherche === 'Acheter').length;

  const sortedClients = [...filteredClients].sort((a, b) => {
    const dateA = new Date(a.dateInscription || 0).getTime();
    const dateB = new Date(b.dateInscription || 0).getTime();
    return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
  });


  const getProgressColor = (days: number) => {
    if (days < 60) return 'bg-green-500';
    if (days < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatTimeElapsed = (days: number) => {
    const totalHours = days * 24;
    const displayDays = Math.floor(days);
    const remainingHours = Math.floor((days - displayDays) * 24);
    const remainingMinutes = Math.floor(((days - displayDays) * 24 - remainingHours) * 60);
    return `${displayDays}j ${remainingHours}h ${remainingMinutes}m`;
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
            title="Mes Clients"
            subtitle={`${allClients.length} clients assignés`}
            icon={Users}
            badge="Portfolio"
          />

          {/* Barre de recherche */}
          <div className="mb-4 animate-fade-in">
            <Input
              placeholder="Rechercher un client par nom ou prénom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md input-focus-glow transition-all duration-200"
            />
          </div>

          {/* Filtres Régions */}
          <div className="mb-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
            <p className="text-sm font-medium mb-2">Régions</p>
            <div className="flex flex-wrap gap-2">
              {regions.map((region, index) => (
                <Button
                  key={region}
                  variant={selectedRegions.includes(region) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRegion(region)}
                  className="text-xs transition-all duration-200 hover:scale-105"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  {region}
                </Button>
              ))}
            </div>
          </div>

          {/* Filtres Nombre de pièces */}
          <div className="mb-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <p className="text-sm font-medium mb-2">Nombre de pièces</p>
            <div className="flex flex-wrap gap-2">
              {nombrePieces.map((pieces, index) => (
                <Button
                  key={pieces}
                  variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePieces(pieces)}
                  className="text-xs transition-all duration-200 hover:scale-105"
                >
                  {pieces}
                </Button>
              ))}
            </div>
          </div>

          {/* Filtre par type de recherche */}
          <div className="mb-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <p className="text-sm font-medium mb-2">Type de recherche</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTypeRecherche === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTypeRecherche('all')}
                className="text-xs transition-all duration-200 hover:scale-105"
              >
                Tous ({allClients.length})
              </Button>
              <Button
                variant={selectedTypeRecherche === 'Louer' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTypeRecherche('Louer')}
                className="text-xs bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105"
              >
                <Key className="w-3 h-3 mr-1" />
                Location ({clientsLocation})
              </Button>
              <Button
                variant={selectedTypeRecherche === 'Acheter' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTypeRecherche('Acheter')}
                className="text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                <Home className="w-3 h-3 mr-1" />
                Achat ({clientsAchat})
              </Button>
            </div>
          </div>

          {/* Tri par date de création */}
          <div className="mb-6 flex items-center gap-2">
            <p className="text-sm font-medium">Trier par :</p>
            <Button
              variant={sortOrder === 'recent' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortOrder('recent')}
              className="text-xs"
            >
              Plus récent
            </Button>
            <Button
              variant={sortOrder === 'ancien' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortOrder('ancien')}
              className="text-xs"
            >
              Plus ancien
            </Button>
          </div>

          {/* Grid de clients - Premium */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {sortedClients.map((client, index) => {
              const isAcheteur = client.typeRecherche === 'Acheter';
              const daysElapsed = calculateDaysElapsed(client.dateInscription);
              const daysRemaining = 90 - daysElapsed;
              const progressPercent = (daysElapsed / 90) * 100;
              const isCritical = daysElapsed >= 60;

              return (
                <div 
                  key={client.id} 
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4",
                    "cursor-pointer transition-all duration-300",
                    "hover:shadow-xl hover:border-primary/30 hover:-translate-y-1",
                    "animate-fade-in flex flex-col",
                    !client.isSolvable && "border-destructive/30"
                  )}
                  style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  onClick={() => navigate(`/agent/clients/${client.id}`)}
                >
                  {/* Actions en haut à droite */}
                  <div className="absolute top-3 right-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agent/clients/${client.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                   {/* Indicateur de solvabilité */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {client.isSolvable ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Solvable
                        {client.solvabilitySource === 'garant' && ' (via garant)'}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Non solvable
                      </Badge>
                    )}
                    {clientReminders.get(client.id) && clientReminders.get(client.id)! > 0 && (
                      <Badge variant="default" className="animate-pulse">
                        <Bell className="h-3 w-3 mr-1" />
                        {clientReminders.get(client.id)}
                      </Badge>
                    )}
                  </div>

                  {/* Nom et nationalité */}
                  <div className="mb-3 mt-14">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-primary">
                        {client.prenom} {client.nom}
                      </h3>
                      <ClientTypeBadge typeRecherche={client.typeRecherche} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{client.nationalite || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      {client.clientHasStableStatus ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Permis {client.typePermis || 'stable'}
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">
                          <FileWarning className="h-3 w-3 mr-1" />
                          Permis {client.typePermis || 'non stable'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Raisons de non-solvabilité */}
                    {!client.isSolvable && client.solvabilityIssues && client.solvabilityIssues.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Problèmes détectés:</p>
                        <div className="flex flex-wrap gap-1">
                          {client.solvabilityIssues.map((issue: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs border-red-300 text-red-600 dark:border-red-700 dark:text-red-400">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Alerte garant non stable */}
                    {client.unstableGarants && client.unstableGarants.length > 0 && (
                      <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                          ⚠️ Garant{client.unstableGarants.length > 1 ? 's' : ''} avec permis non stable:
                        </p>
                        {client.unstableGarants.map((g: any, idx: number) => (
                          <p key={idx} className="text-xs text-orange-600 dark:text-orange-500">
                            {g.prenom} {g.nom} - Permis {g.type_permis || 'non renseigné'}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {/* Détail des candidats par type */}
                    {client.candidatesCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {client.garantsCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            🛡️ {client.garantsCount} garant{client.garantsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.colocatairesCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            👥 {client.colocatairesCount} colocataire{client.colocatairesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.coDebiteursCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            🤝 {client.coDebiteursCount} co-débiteur{client.coDebiteursCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.signatairesCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            ✍️ {client.signatairesCount} signataire{client.signatairesCount > 1 ? 's' : ''} solidaire{client.signatairesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.unstableCandidatesCount > 0 && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                            ⚠️ {client.unstableCandidatesCount} non comptabilisé{client.unstableCandidatesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Finances */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Revenu total (dossier)</p>
                        <p className="text-sm font-semibold">CHF {client.totalRevenus?.toLocaleString() || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-primary/10 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {isAcheteur ? 'Prix recherché' : 'Budget demandé'}
                        </p>
                        <p className={`text-sm font-semibold ${client.budgetPossible >= (client.budgetMax || 0) ? 'text-green-600' : 'text-primary'}`}>
                          CHF {client.budgetMax?.toLocaleString() || 0}{!isAcheteur && '/mois'}
                        </p>
                      </div>
                    </div>
                    {isAcheteur && client.apportPersonnel > 0 && (
                      <div className="flex items-start gap-2 bg-emerald-500/10 p-2 rounded">
                        <DollarSign className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Apport disponible</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            CHF {client.apportPersonnel?.toLocaleString() || 0}
                          </p>
                        </div>
                      </div>
                    )}
                    {!isAcheteur && (
                      <div className="flex items-start gap-2 bg-blue-500/10 p-2 rounded">
                        <DollarSign className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Budget possible (33%)</p>
                          <p className={`text-sm font-semibold ${client.budgetPossible >= (client.budgetMax || 0) ? 'text-green-600' : 'text-blue-600'}`}>
                            CHF {client.budgetPossible?.toLocaleString() || 0}/mois
                          </p>
                        </div>
                      </div>
                    )}
                    {client.garant && (
                      <div className="flex items-start gap-2 bg-green-500/10 p-2 rounded">
                        <Shield className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Garant valide</p>
                          <p className="text-sm font-semibold text-green-600">
                            {client.garant.prenom} {client.garant.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CHF {Number(client.garant.revenus)?.toLocaleString() || 0}/mois
                            {client.garant.permis && ` • Permis ${client.garant.permis}`}
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                    {client.solvabilitySource === 'garant' && client.garant && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Solvabilité basée sur le garant
                      </p>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{client.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  </div>

                  {/* Critères de recherche */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Critères de recherche</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {client.typeBien || 'Location'}, {client.nombrePiecesSouhaite}
                      </Badge>
                    </div>
                  </div>

                  {/* Régions souhaitées */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Régions souhaitées:</span>
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground">
                      {client.regions?.join(', ') || 'Autre'}
                    </div>
                  </div>

                  {/* Date et barre de progression */}
                  <div className="mt-auto pt-3 border-t">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(client.dateInscription).toLocaleDateString('fr-CH')}</span>
                      </div>
                    </div>
                    
                    {/* Temps écoulé avec icône */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        daysElapsed < 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        daysElapsed < 90 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimeElapsed(daysElapsed)}</span>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(daysElapsed)}`}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>

                    {/* Alertes */}
                    {isCritical && (
                      <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs mt-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-700 dark:text-red-400 font-medium">
                          Attention - {daysElapsed} jours écoulés
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Hover arrow indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </div>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun client ne correspond aux filtres sélectionnés</p>
            </div>
          )}
        </div>
      </div>
  );
};

export default MesClients;