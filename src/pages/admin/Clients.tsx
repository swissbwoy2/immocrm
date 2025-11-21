import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Users, Eye, DollarSign } from "lucide-react";
import { getClients, getAgents, getOffres } from "@/utils/localStorage";
import { calculateMandateDuration } from "@/utils/calculations";
import { useNavigate } from "react-router-dom";

const Clients = () => {
  const navigate = useNavigate();
  const [clients] = useState(getClients());
  const [agents] = useState(getAgents());
  const [offres] = useState(getOffres());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");

  const filteredClients = clients.filter(client => {
    const matchesSearch = `${client.prenom} ${client.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = filterAgent === "all" || client.agentId === filterAgent;
    return matchesSearch && matchesAgent;
  });

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.prenom} ${agent.nom}` : "Non assigné";
  };

  const getClientOffresCount = (clientId: string) => {
    return offres.filter(o => o.clientId === clientId).length;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des Clients</h1>
            <p className="text-muted-foreground">Vue d'ensemble de tous les clients</p>
          </div>

          <div className="mb-6 flex gap-4">
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.prenom} {agent.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => {
              const duration = calculateMandateDuration(client.dateInscription);
              const offresCount = getClientOffresCount(client.id);
              const daysElapsed = duration.daysElapsed;
              const progressPercent = (daysElapsed / 90) * 100;
              
              return (
                <Card 
                  key={client.id} 
                  className="p-4 flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/agent/clients/${client.id}`)}
                >
                  {/* Nom et Badge */}
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      {client.prenom} {client.nom}
                    </h3>
                    <Badge variant={daysElapsed > 60 ? "destructive" : daysElapsed > 30 ? "default" : "secondary"}>
                      J+{daysElapsed}
                    </Badge>
                  </div>

                  {/* Budget */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 bg-primary/10 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Budget maximum</p>
                        <p className="text-sm font-semibold text-primary">CHF {client.budgetMax.toLocaleString()}</p>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{client.adresse}</span>
                    </div>
                  </div>

                  {/* Critères de recherche */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Critères</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {client.typeBien} {client.nombrePiecesSouhaite} pièces
                    </Badge>
                  </div>

                  {/* Agent assigné et offres */}
                  <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Agent: {getAgentName(client.agentId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{offresCount} offre{offresCount > 1 ? 's' : ''} envoyée{offresCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Date et barre de progression */}
                  <div className="mt-auto pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>Inscrit le {new Date(client.dateInscription).toLocaleDateString('fr-CH')}</span>
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

                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agent/clients/${client.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir le détail
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
      </div>
    </div>
  );
};

export default Clients;
