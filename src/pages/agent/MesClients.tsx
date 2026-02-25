import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Calendar, Users, Building2, Car, DollarSign, AlertTriangle, Edit, Upload, Shield, CheckCircle, FileWarning, Home, Key, Bell, ChevronRight, Wallet, TrendingUp, Sparkles, Filter } from "lucide-react";
import { PremiumClientCard } from "@/components/premium/PremiumClientCard";
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
  const [offresToday, setOffresToday] = useState<Map<string, number>>(new Map());

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

      // Load profiles separately - now including presence fields
      const userIds = clientsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email, telephone, last_seen_at, is_online')
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

      // Load today's offers count per client
      const today = new Date().toISOString().split('T')[0];
      const { data: offresData } = await supabase
        .from('offres')
        .select('client_id')
        .eq('agent_id', currentAgentId)
        .gte('date_envoi', `${today}T00:00:00`)
        .lt('date_envoi', `${today}T23:59:59`);

      const offresMap = new Map<string, number>();
      offresData?.forEach(offre => {
        if (offre.client_id) {
          const count = offresMap.get(offre.client_id) || 0;
          offresMap.set(offre.client_id, count + 1);
        }
      });
      setOffresToday(offresMap);

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
          statut: client.statut, // Ajout du statut pour filtrer les relogés
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
          lastSeenAt: profile?.last_seen_at,
          isOnline: profile?.is_online,
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
  const nombrePieces = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5+'];

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
        const clientNum = Number.parseFloat(client.nombrePiecesSouhaite?.toString() || '');
        if (Number.isNaN(clientNum)) return false;
        if (p === '5+') return clientNum >= 5;

        const pieceNum = Number(p);
        return !Number.isNaN(pieceNum) && Math.abs(clientNum - pieceNum) < 0.01;
      });
    
    const matchTypeRecherche = selectedTypeRecherche === 'all' || 
      client.typeRecherche === selectedTypeRecherche;
    
    return matchSearch && matchRegion && matchPieces && matchTypeRecherche;
  });

  // Compteurs par type (exclure les clients relogés des statistiques actives)
  // Note: Les clients relogés restent visibles dans la liste mais ne comptent pas dans les KPIs
  const clientsActifsOnly = allClients.filter(c => c.statut !== 'reloge');
  const clientsLocation = clientsActifsOnly.filter(c => c.typeRecherche !== 'Acheter').length;
  const clientsAchat = clientsActifsOnly.filter(c => c.typeRecherche === 'Acheter').length;

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
            subtitle={`${clientsActifsOnly.length} clients actifs`}
            icon={Users}
            badge="Portfolio"
          />

          {/* Filtres Section - Premium */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-card via-card/95 to-muted/30 border border-border/50 space-y-4">
            {/* Barre de recherche */}
            <div className="animate-fade-in">
              <Input
                placeholder="Rechercher un client par nom ou prénom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200"
              />
            </div>

            {/* Filtres Régions */}
            <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Régions
              </p>
              <div className="flex flex-wrap gap-2">
                {regions.map((region, index) => (
                  <Button
                    key={region}
                    variant={selectedRegions.includes(region) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRegion(region)}
                    className={cn(
                      "text-xs transition-all duration-200 hover:scale-105",
                      selectedRegions.includes(region) && "shadow-lg shadow-primary/20"
                    )}
                  >
                    {region}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtres Nombre de pièces */}
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <p className="text-sm font-medium mb-2">Nombre de pièces</p>
              <div className="flex flex-wrap gap-2">
                {nombrePieces.map((pieces) => (
                  <Button
                    key={pieces}
                    variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePieces(pieces)}
                    className={cn(
                      "text-xs transition-all duration-200 hover:scale-105",
                      selectedPieces.includes(pieces) && "shadow-lg shadow-primary/20"
                    )}
                  >
                    {pieces === '5+' ? '5+ pièces' : `${pieces} pièce${pieces === '1' ? '' : 's'}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtre par type de recherche */}
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
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
                  className={cn(
                    "text-xs transition-all duration-200 hover:scale-105",
                    selectedTypeRecherche === 'Louer' && "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  )}
                >
                  <Key className="w-3 h-3 mr-1" />
                  Location ({clientsLocation})
                </Button>
                <Button
                  variant={selectedTypeRecherche === 'Acheter' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTypeRecherche('Acheter')}
                  className={cn(
                    "text-xs transition-all duration-200 hover:scale-105",
                    selectedTypeRecherche === 'Acheter' && "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                  )}
                >
                  <Home className="w-3 h-3 mr-1" />
                  Achat ({clientsAchat})
                </Button>
              </div>
            </div>

            {/* Tri par date */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
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
          </div>

          {/* Grid de clients - Premium */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedClients.map((client, index) => {
              const daysElapsed = calculateDaysElapsed(client.dateInscription);
              const reminderCount = clientReminders.get(client.id) || 0;

              return (
                <PremiumClientCard
                  key={client.id}
                  client={client}
                  index={index}
                  daysElapsed={daysElapsed}
                  hasReminders={reminderCount}
                  offresToday={offresToday.get(client.id) || 0}
                  onEdit={(id) => navigate(`/agent/clients/${id}`)}
                  onClick={(id) => navigate(`/agent/clients/${id}`)}
                />
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className="relative text-center py-16">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <div className="inline-flex p-6 rounded-2xl bg-muted/30 border border-border/50 mb-6">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <p className="text-xl font-medium text-muted-foreground mb-2">Aucun client trouvé</p>
                <p className="text-sm text-muted-foreground/60">Essayez de modifier vos filtres de recherche</p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default MesClients;