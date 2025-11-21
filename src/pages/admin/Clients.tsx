import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Users, DollarSign } from "lucide-react";
import { calculateDaysElapsed } from "@/utils/calculations";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  nationalite?: string;
  type_permis?: string;
  region_recherche?: string;
  type_bien?: string;
  created_at?: string;
  date_ajout?: string;
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

const Clients = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientProfiles, setClientProfiles] = useState<Map<string, Profile>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [loading, setLoading] = useState(true);

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

      // Load agents with their profiles
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id, statut, profiles!inner(nom, prenom, email, telephone)')
        .eq('statut', 'actif');

      if (agentsError) throw agentsError;

      const transformedAgents = agentsData?.map(agent => ({
        id: agent.id,
        profile: agent.profiles as unknown as Profile,
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

  // Trier les clients par date de création
  const sortedClients = [...filteredClients].sort((a, b) => {
    const dateA = new Date(a.date_ajout || a.created_at || 0).getTime();
    const dateB = new Date(b.date_ajout || b.created_at || 0).getTime();
    return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
  });

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.profile.prenom} ${agent.profile.nom}` : "Non assigné";
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Gestion des Clients</h1>
          <p className="text-muted-foreground">Vue d'ensemble de tous les clients</p>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Rechercher un client par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="mb-4">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-[200px]">
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

        {/* Filtres Régions */}
        <div className="mb-4">
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

        {/* Filtres Nombre de pièces */}
        <div className="mb-4">
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

        {/* Grid de clients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedClients.map((client) => {
            const profile = clientProfiles.get(client.user_id);
            const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
            const progressPercent = (daysElapsed / 90) * 100;

            if (!profile) return null;

            return (
              <Card 
                key={client.id} 
                className="p-4 flex flex-col relative cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/admin/clients/${client.id}`)}
              >
                {/* Nom et nationalité */}
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-primary mb-1">
                    {profile.prenom} {profile.nom}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{client.nationalite || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Users className="h-4 w-4" />
                    <span>Type de permis: {client.type_permis || 'Non renseigné'}</span>
                  </div>
                </div>

                {/* Finances */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                    <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Revenu mensuel</p>
                      <p className="text-sm font-semibold">CHF {client.revenus_mensuels?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-primary/10 p-2 rounded">
                    <DollarSign className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Budget maximum</p>
                      <p className="text-sm font-semibold text-primary">CHF {client.budget_max?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1 mb-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{profile.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{profile.email}</span>
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
                      {client.type_bien || 'Location'}, {client.pieces || 0} pièces
                    </Badge>
                  </div>
                </div>

                {/* Région souhaitée */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Région souhaitée:</span>
                  </div>
                  <div className="pl-6 text-xs text-muted-foreground">
                    {client.region_recherche || 'Non renseigné'}
                  </div>
                </div>

                {/* Agent */}
                <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Agent: {getAgentName(client.agent_id)}</span>
                  </div>
                </div>

                {/* Date et barre de progression */}
                <div className="mt-auto pt-3 border-t">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}</span>
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
                      className={`h-2 rounded-full transition-all ${
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun client ne correspond aux filtres sélectionnés</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
