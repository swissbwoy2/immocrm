import { useState, useEffect } from 'react';
import { Users, UserPlus, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  commission_split?: number;
  created_at?: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

interface Agent {
  id: string;
  user_id: string;
  profile: Profile;
}

export default function Assignations() {
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedSplit, setSelectedSplit] = useState<'45-55' | '60-40'>('45-55');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

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

      // Load agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id, statut')
        .eq('statut', 'actif');

      if (agentsError) throw agentsError;

      // Load agent profiles separately
      const agentUserIds = agentsData?.map(a => a.user_id) || [];
      const { data: agentProfilesData, error: agentProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', agentUserIds);

      if (agentProfilesError) throw agentProfilesError;

      const agentProfilesMap = new Map(agentProfilesData?.map(p => [p.id, p]));

      // Transform the data to match our interface
      const transformedAgents = agentsData?.map(agent => ({
        id: agent.id,
        user_id: agent.user_id,
        profile: agentProfilesMap.get(agent.user_id) as Profile || {
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
        },
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

  const unassignedClients = clients.filter(c => !c.agent_id);
  const assignedClients = clients.filter(c => c.agent_id);

  const handleAssign = async () => {
    if (!selectedClient || !selectedAgent) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un client et un agent',
        variant: 'destructive',
      });
      return;
    }

    try {
      const commissionValue = selectedSplit === '45-55' ? 45 : 60;

      const { error } = await supabase
        .from('clients')
        .update({
          agent_id: selectedAgent,
          commission_split: commissionValue,
        })
        .eq('id', selectedClient);

      if (error) throw error;

      // Update local state
      setClients(clients.map(c => 
        c.id === selectedClient
          ? { ...c, agent_id: selectedAgent, commission_split: commissionValue }
          : c
      ));

      setSelectedClient(null);
      setSelectedAgent('');

      toast({
        title: 'Assignation réussie',
        description: 'Le client a été assigné à l\'agent',
      });
    } catch (error) {
      console.error('Error assigning client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner le client',
        variant: 'destructive',
      });
    }
  };

  const handleReassign = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          agent_id: null,
        })
        .eq('id', clientId);

      if (error) throw error;

      // Update local state
      setClients(clients.map(c => 
        c.id === clientId ? { ...c, agent_id: undefined } : c
      ));

      toast({
        title: 'Désassignation réussie',
        description: 'Le client a été retiré de l\'agent',
      });
    } catch (error) {
      console.error('Error reassigning client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le client',
        variant: 'destructive',
      });
    }
  };

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

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.profile.prenom} ${agent.profile.nom}` : 'Agent inconnu';
  };

  const getClientsByAgent = (agentId: string) => {
    return assignedClients.filter(c => c.agent_id === agentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
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
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={clients.length === 0 || deleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? 'Suppression...' : 'Supprimer tous les clients'}
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
              <Button onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Importer CSV
              </Button>
            </div>
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
                        {unassignedClients.map(client => {
                          // Find profile for this client
                          const profile = agents.find(a => a.user_id === client.user_id)?.profile;
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              Client ID: {client.id.substring(0, 8)}...
                            </SelectItem>
                          );
                        })}
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
                            {agent.profile.prenom} {agent.profile.nom} ({getClientsByAgent(agent.id).length} clients)
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
                          {agent.profile.prenom} {agent.profile.nom}
                        </CardTitle>
                        <CardDescription>{agent.profile.email}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {agentClients.length} clients
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {agentClients.map(client => {
                        const commissionSplit = client.commission_split || 50;
                        const agencySplit = 100 - commissionSplit;
                        
                        return (
                          <div
                            key={client.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                Client ID: {client.id.substring(0, 8)}...
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Ajouté le {new Date(client.created_at || '').toLocaleDateString('fr-CH')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">
                                Split {commissionSplit}/{agencySplit}
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
                        );
                      })}
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
    </>
  );
}
