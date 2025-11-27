import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MapPin, Home, Calendar, User, Filter, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Offre {
  id: string;
  titre: string | null;
  adresse: string;
  prix: number;
  pieces: number | null;
  surface: number | null;
  type_bien: string | null;
  statut: string | null;
  date_envoi: string | null;
  client_id: string | null;
  agent_id: string | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
}

interface Agent {
  id: string;
  user_id: string;
}

interface Client {
  id: string;
  user_id: string;
}

export default function AdminOffresEnvoyees() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [offres, setOffres] = useState<Offre[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user, userRole, navigate]);

  const loadData = async () => {
    try {
      // Charger toutes les offres
      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*')
        .order('date_envoi', { ascending: false });
      
      if (offresError) throw offresError;
      setOffres(offresData || []);

      // Charger les agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id');
      
      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Charger les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, user_id');
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Collecter tous les user_ids pour charger les profils
      const userIds = new Set<string>();
      agentsData?.forEach(a => userIds.add(a.user_id));
      clientsData?.forEach(c => userIds.add(c.user_id));

      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', Array.from(userIds));
        
        if (profilesError) throw profilesError;
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Erreur chargement offres:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Agent inconnu";
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return "Agent inconnu";
    const profile = profiles.get(agent.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Agent inconnu";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Client inconnu";
    const client = clients.find(c => c.id === clientId);
    if (!client) return "Client inconnu";
    const profile = profiles.get(client.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getStatusBadge = (statut: string | null) => {
    switch (statut) {
      case 'envoyee':
        return <Badge variant="secondary">Envoyée</Badge>;
      case 'vue':
        return <Badge variant="outline">Vue</Badge>;
      case 'acceptee':
        return <Badge className="bg-success text-success-foreground">Acceptée</Badge>;
      case 'refusee':
        return <Badge variant="destructive">Refusée</Badge>;
      case 'visite_programmee':
        return <Badge className="bg-primary text-primary-foreground">Visite programmée</Badge>;
      default:
        return <Badge variant="outline">{statut || "Inconnue"}</Badge>;
    }
  };

  // Filtrage
  const filteredOffres = offres.filter(offre => {
    const matchesSearch = 
      offre.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offre.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      getClientName(offre.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAgentName(offre.agent_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || offre.statut === statusFilter;
    const matchesAgent = agentFilter === "all" || offre.agent_id === agentFilter;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  // Stats
  const totalOffres = offres.length;
  const offresEnvoyees = offres.filter(o => o.statut === 'envoyee').length;
  const offresAcceptees = offres.filter(o => o.statut === 'acceptee').length;
  const offresRefusees = offres.filter(o => o.statut === 'refusee').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Offres envoyées</h1>
          <p className="text-muted-foreground">Toutes les offres envoyées par les agents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalOffres}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{offresEnvoyees}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{offresAcceptees}</p>
              <p className="text-sm text-muted-foreground">Acceptées</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{offresRefusees}</p>
              <p className="text-sm text-muted-foreground">Refusées</p>
            </div>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Rechercher (adresse, client, agent...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="vue">Vue</SelectItem>
                  <SelectItem value="acceptee">Acceptée</SelectItem>
                  <SelectItem value="refusee">Refusée</SelectItem>
                  <SelectItem value="visite_programmee">Visite programmée</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {getAgentName(agent.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Liste des offres */}
        <div className="grid gap-4">
          {filteredOffres.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune offre trouvée</p>
                <p className="text-sm mt-1">Modifiez vos filtres ou attendez que les agents envoient des offres</p>
              </div>
            </Card>
          ) : (
            filteredOffres.map((offre) => (
              <Card key={offre.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">
                        {offre.titre || offre.adresse}
                      </h3>
                      {getStatusBadge(offre.statut)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {offre.adresse}
                      </span>
                      {offre.type_bien && (
                        <span className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          {offre.type_bien}
                        </span>
                      )}
                      {offre.pieces && (
                        <span>{offre.pieces} pièces</span>
                      )}
                      {offre.surface && (
                        <span>{offre.surface} m²</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="font-medium text-primary">
                        CHF {offre.prix.toLocaleString()}/mois
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" />
                        Agent: {getAgentName(offre.agent_id)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" />
                        Client: {getClientName(offre.client_id)}
                      </span>
                    </div>

                    {offre.date_envoi && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {offre.client_id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/clients/${offre.client_id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir client
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
