import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Users } from "lucide-react";
import { getClients, getAgents, getOffres } from "@/utils/localStorage";
import { calculateMandateDuration } from "@/utils/calculations";

const Clients = () => {
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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
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

          <div className="grid gap-4">
            {filteredClients.map((client) => {
              const duration = calculateMandateDuration(client.dateInscription);
              const offresCount = getClientOffresCount(client.id);
              
              return (
                <Card key={client.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">{client.prenom} {client.nom}</h3>
                        <Badge variant={duration.daysElapsed > 60 ? "destructive" : "default"}>
                          J+{duration.daysElapsed}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {client.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {client.telephone}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {client.adresse}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Inscrit le {new Date(client.dateInscription).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Agent: {getAgentName(client.agentId)}
                          </div>
                          <div>
                            {offresCount} offre{offresCount > 1 ? 's' : ''} envoyée{offresCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm">
                          <span className="font-medium">Budget max:</span> CHF {client.budgetMax.toLocaleString()} • 
                          <span className="font-medium ml-2">Recherche:</span> {client.typeBien} {client.nombrePiecesSouhaite} pièces
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clients;
