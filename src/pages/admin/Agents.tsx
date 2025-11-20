import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Users } from "lucide-react";
import { getAgents, getClients, saveAgents } from "@/utils/localStorage";
import type { Agent } from "@/data/mockData";

const Agents = () => {
  const [agents, setAgents] = useState(getAgents());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const clients = getClients();

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
  });

  const handleAddAgent = () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      userId: `user-${Date.now()}`,
      ...formData,
      clientsAssignes: [],
      actif: true,
    };

    const updatedAgents = [...agents, newAgent];
    setAgents(updatedAgents);
    saveAgents(updatedAgents);
    setIsDialogOpen(false);
    setFormData({ nom: "", prenom: "", email: "", telephone: "" });
    toast({ title: "Succès", description: "Agent ajouté avec succès" });
  };

  const toggleAgentStatus = (agentId: string) => {
    const updatedAgents = agents.map(agent =>
      agent.id === agentId ? { ...agent, actif: !agent.actif } : agent
    );
    setAgents(updatedAgents);
    saveAgents(updatedAgents);
    toast({ title: "Succès", description: "Statut mis à jour" });
  };

  const filteredAgents = agents.filter(agent =>
    `${agent.prenom} ${agent.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestion des Agents</h1>
              <p className="text-muted-foreground">Gérez votre équipe d'agents immobiliers</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel Agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Prénom</Label>
                    <Input value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nom</Label>
                    <Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
                  </div>
                  <Button onClick={handleAddAgent} className="w-full">Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-6">
            <Input
              placeholder="Rechercher un agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid gap-4">
            {filteredAgents.map((agent) => {
              const agentClients = clients.filter(c => c.agentId === agent.id);
              return (
                <Card key={agent.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">{agent.prenom} {agent.nom}</h3>
                        <Badge variant={agent.actif ? "default" : "secondary"}>
                          {agent.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {agent.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {agent.telephone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {agentClients.length} client{agentClients.length > 1 ? 's' : ''} assigné{agentClients.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={agent.actif ? "outline" : "default"}
                      onClick={() => toggleAgentStatus(agent.id)}
                    >
                      {agent.actif ? "Désactiver" : "Activer"}
                    </Button>
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

export default Agents;
