import { useState, useEffect } from 'react';
import { Users, UserPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { getClients, saveClients, getAgents } from '@/utils/localStorage';
import { Client, Agent } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function Assignations() {
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedSplit, setSelectedSplit] = useState<'45-55' | '60-40'>('45-55');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setClients(getClients());
    setAgents(getAgents());
  };

  const unassignedClients = clients.filter(c => !c.agentId);
  const assignedClients = clients.filter(c => c.agentId);

  const handleAssign = () => {
    if (!selectedClient || !selectedAgent) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un client et un agent',
        variant: 'destructive',
      });
      return;
    }

    const [splitAgent, splitAgence] = selectedSplit === '45-55' ? [45, 55] : [60, 40];

    const updatedClients = clients.map(c => {
      if (c.id === selectedClient) {
        return {
          ...c,
          agentId: selectedAgent,
          splitAgent,
          splitAgence,
        };
      }
      return c;
    });

    saveClients(updatedClients);
    setClients(updatedClients);
    setSelectedClient(null);
    setSelectedAgent('');

    toast({
      title: 'Assignation réussie',
      description: 'Le client a été assigné à l\'agent',
    });
  };

  const handleReassign = (clientId: string) => {
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          agentId: undefined,
        };
      }
      return c;
    });

    saveClients(updatedClients);
    setClients(updatedClients);

    toast({
      title: 'Désassignation réussie',
      description: 'Le client a été retiré de l\'agent',
    });
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.prenom} ${agent.nom}` : 'Agent inconnu';
  };

  const getClientsByAgent = (agentId: string) => {
    return assignedClients.filter(c => c.agentId === agentId);
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Assignations</h1>
              <p className="text-muted-foreground">
                Gérer l'assignation des clients aux agents
              </p>
            </div>
            <Button onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importer CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Clients sans agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unassignedClients.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Clients assignés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedClients.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Agents actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Assignation Section */}
          {unassignedClients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Assigner un client</CardTitle>
                <CardDescription>
                  Sélectionnez un client sans agent et assignez-le à un agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={selectedClient || ''} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.prenom} {client.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Agent</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.prenom} {agent.nom} ({getClientsByAgent(agent.id).length} clients)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Commission Split</Label>
                    <RadioGroup value={selectedSplit} onValueChange={(v) => setSelectedSplit(v as '45-55' | '60-40')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="45-55" id="split-45" />
                        <Label htmlFor="split-45" className="font-normal cursor-pointer">
                          45% Agent / 55% Agence
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="60-40" id="split-60" />
                        <Label htmlFor="split-60" className="font-normal cursor-pointer">
                          60% Agent / 40% Agence
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Button 
                  onClick={handleAssign} 
                  disabled={!selectedClient || !selectedAgent}
                  className="w-full md:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assigner le client
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Liste des clients par agent */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Clients assignés par agent</h2>
            {agents.map(agent => {
              const agentClients = getClientsByAgent(agent.id);
              if (agentClients.length === 0) return null;

              return (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {agent.prenom} {agent.nom}
                        </CardTitle>
                        <CardDescription>{agent.email}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {agentClients.length} clients
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {agentClients.map(client => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {client.prenom} {client.nom}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {client.email} • {client.telephone}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">
                              Split {client.splitAgent}/{client.splitAgence}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReassign(client.id)}
                            >
                              Retirer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {assignedClients.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucun client assigné pour le moment
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadData}
      />
    </div>
  );
}
