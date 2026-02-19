import { useState, useEffect } from 'react';
import { Users, UserPlus, Upload, Trash2, Pencil, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { AgentMultiSelect } from '@/components/AgentMultiSelect';
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
  profiles?: Profile;
}

interface AgentAssignment {
  agent_id: string;
  is_primary: boolean;
  commission_split: number;
}

interface ClientAgentAssignment {
  id: string;
  client_id: string;
  agent_id: string;
  is_primary: boolean;
  commission_split: number;
}

export default function Assignations() {
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clientProfiles, setClientProfiles] = useState<Map<string, Profile>>(new Map());
  const [clientAgents, setClientAgents] = useState<ClientAgentAssignment[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAgentAssignments, setSelectedAgentAssignments] = useState<AgentAssignment[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editAgentAssignments, setEditAgentAssignments] = useState<AgentAssignment[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedClients, setBulkSelectedClients] = useState<string[]>([]);
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

      // Load client profiles
      const clientUserIds = clientsData?.map(c => c.user_id) || [];
      const { data: clientProfilesData, error: clientProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      if (clientProfilesError) throw clientProfilesError;

      const clientProfilesMap = new Map(clientProfilesData?.map(p => [p.id, p]) || []);
      setClientProfiles(clientProfilesMap);

      // Load client_agents
      const { data: clientAgentsData, error: clientAgentsError } = await supabase
        .from('client_agents')
        .select('*');

      if (clientAgentsError) throw clientAgentsError;
      setClientAgents(clientAgentsData || []);

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
          user_id: agent.user_id,
          profile: agentProfilesMap.get(agent.user_id) as Profile,
          profiles: agentProfilesMap.get(agent.user_id) as Profile,
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

  const unassignedClients = clients.filter(c => 
    !clientAgents.some(ca => ca.client_id === c.id)
  );
  const assignedClients = clients.filter(c => 
    clientAgents.some(ca => ca.client_id === c.id)
  );

  const handleAssign = async (clientId: string, agentAssignments: Array<{ agent_id: string; is_primary: boolean; commission_split: number }>) => {
    try {
      // Delete existing assignments
      await supabase
        .from('client_agents')
        .delete()
        .eq('client_id', clientId);

      // Get old agent_id for decrementing
      const { data: oldClient } = await supabase
        .from('clients')
        .select('agent_id')
        .eq('id', clientId)
        .single();

      if (oldClient?.agent_id) {
        await supabase.rpc('decrement_agent_clients', { agent_uuid: oldClient.agent_id });
      }

      // Insert new assignments
      const assignmentsToInsert = agentAssignments.map(a => ({
        client_id: clientId,
        agent_id: a.agent_id,
        is_primary: a.is_primary,
        commission_split: a.commission_split,
      }));

      const { error: insertError } = await supabase
        .from('client_agents')
        .insert(assignmentsToInsert);

      if (insertError) throw insertError;

      // Update clients.agent_id and commission_split with primary agent for backward compatibility
      const primaryAgent = agentAssignments.find(a => a.is_primary);
      if (primaryAgent) {
        await supabase
          .from('clients')
          .update({ 
            agent_id: primaryAgent.agent_id,
            commission_split: primaryAgent.commission_split 
          })
          .eq('id', clientId);

        await supabase.rpc('increment_agent_clients', { agent_uuid: primaryAgent.agent_id });
      }

      // Unarchive conversations for re-assigned agents
      for (const assignment of agentAssignments) {
        await supabase
          .from('conversations')
          .update({ is_archived: false })
          .eq('agent_id', assignment.agent_id)
          .eq('client_id', clientId);
      }

      // Get client and agent details for notifications
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id, profiles!clients_user_id_fkey(prenom, nom)')
        .eq('id', clientId)
        .single();

      const clientName = clientData ? `${clientData.profiles.prenom} ${clientData.profiles.nom}` : 'un client';

      // Create notifications for each assigned agent
      for (const assignment of agentAssignments) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', assignment.agent_id)
          .single();

        if (agentData) {
          await supabase.rpc('create_notification', {
            p_user_id: agentData.user_id,
            p_type: 'client_assigned',
            p_title: assignment.is_primary ? 'Nouveau client assigné (Principal)' : 'Nouveau client assigné (Co-agent)',
            p_message: `${clientName} vous a été assigné${assignment.is_primary ? ' en tant qu\'agent principal' : ' en tant que co-agent'} (${assignment.commission_split}% de commission)`,
            p_link: '/agent/mes-clients',
            p_metadata: { client_id: clientId }
          });
        }
      }

      toast({
        title: "Succès",
        description: `Client assigné à ${agentAssignments.length} agent(s)`,
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error assigning client:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'assigner le client",
      });
    }
  };

  const handleReassign = async (clientId: string) => {
    try {
      // Get current assignments and client info
      const currentAssignments = clientAgents.filter(ca => ca.client_id === clientId);
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      const { data: clientProfile } = clientData ? await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', clientData.user_id)
        .single() : { data: null };

      const clientName = clientProfile ? `${clientProfile.prenom} ${clientProfile.nom}` : 'ce client';

      // Archive conversations for each removed agent
      for (const assignment of currentAssignments) {
        await supabase
          .from('conversations')
          .update({ is_archived: true })
          .eq('agent_id', assignment.agent_id)
          .eq('client_id', clientId);

        // Send notification to removed agent
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', assignment.agent_id)
          .single();

        if (agentData) {
          await supabase.rpc('create_notification', {
            p_user_id: agentData.user_id,
            p_type: 'client_removed',
            p_title: 'Client retiré',
            p_message: `${clientName} a été retiré de votre portefeuille`,
            p_link: '/agent/mes-clients',
            p_metadata: { client_id: clientId }
          });
        }
      }

      // Delete all assignments for this client
      const { error } = await supabase
        .from('client_agents')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;

      // Also clear legacy agent_id on clients table
      await supabase
        .from('clients')
        .update({ agent_id: null })
        .eq('id', clientId);

      // Decrement each agent's count
      for (const assignment of currentAssignments) {
        await (supabase.rpc as any)('decrement_agent_clients', { agent_uuid: assignment.agent_id });
      }

      // Reload data
      await loadData();

      toast({
        title: 'Désassignation réussie',
        description: 'Le client a été retiré de tous les agents',
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

  const handleUpdateAssignment = async () => {
    if (!editingClientId || editAgentAssignments.length === 0) return;

    if (editAgentAssignments.length > 4) {
      toast({
        title: 'Erreur',
        description: 'Maximum 4 agents peuvent être assignés à un client',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get current assignments and client info
      const currentAssignments = clientAgents.filter(ca => ca.client_id === editingClientId);
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', editingClientId)
        .single();

      const { data: clientProfile } = clientData ? await supabase
        .from('profiles')
        .select('prenom, nom')
        .eq('id', clientData.user_id)
        .single() : { data: null };

      const clientName = clientProfile ? `${clientProfile.prenom} ${clientProfile.nom}` : 'ce client';

      // Delete all current assignments
      const { error: deleteError } = await supabase
        .from('client_agents')
        .delete()
        .eq('client_id', editingClientId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      const insertPromises = editAgentAssignments.map(assignment =>
        supabase.from('client_agents').insert({
          client_id: editingClientId,
          agent_id: assignment.agent_id,
          is_primary: assignment.is_primary,
          commission_split: assignment.commission_split,
        })
      );

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error('Erreur lors de la mise à jour');
      }

      // Sync clients.agent_id with primary agent (or clear it if no primary)
      const primaryAgent = editAgentAssignments.find(a => a.is_primary);
      if (primaryAgent) {
        await supabase
          .from('clients')
          .update({ 
            agent_id: primaryAgent.agent_id,
            commission_split: primaryAgent.commission_split 
          })
          .eq('id', editingClientId);
      } else {
        // No primary agent — clear legacy agent_id
        await supabase
          .from('clients')
          .update({ agent_id: null })
          .eq('id', editingClientId);
      }

      // Update agent counts
      const oldAgentIds = currentAssignments.map(ca => ca.agent_id);
      const newAgentIds = editAgentAssignments.map(ea => ea.agent_id);

      // For removed agents: decrement count, archive conversation, notify
      for (const agentId of oldAgentIds) {
        if (!newAgentIds.includes(agentId)) {
          await (supabase.rpc as any)('decrement_agent_clients', { agent_uuid: agentId });
          
          // Archive conversation
          await supabase
            .from('conversations')
            .update({ is_archived: true })
            .eq('agent_id', agentId)
            .eq('client_id', editingClientId);

          // Send notification to removed agent
          const { data: agentData } = await supabase
            .from('agents')
            .select('user_id')
            .eq('id', agentId)
            .single();

          if (agentData) {
            await supabase.rpc('create_notification', {
              p_user_id: agentData.user_id,
              p_type: 'client_removed',
              p_title: 'Client retiré',
              p_message: `${clientName} a été retiré de votre portefeuille`,
              p_link: '/agent/mes-clients',
              p_metadata: { client_id: editingClientId }
            });
          }
        }
      }

      // For added agents: increment count, unarchive conversation
      for (const agentId of newAgentIds) {
        if (!oldAgentIds.includes(agentId)) {
          await (supabase.rpc as any)('increment_agent_clients', { agent_uuid: agentId });
          
          // Unarchive conversation if it exists
          await supabase
            .from('conversations')
            .update({ is_archived: false })
            .eq('agent_id', agentId)
            .eq('client_id', editingClientId);
        }
      }

      // Reload data
      await loadData();

      setEditingClientId(null);
      setEditAgentAssignments([]);
      
      toast({
        title: 'Modification réussie',
        description: 'L\'assignation a été mise à jour',
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier l\'assignation',
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

  const handleBulkAssign = async () => {
    if (bulkSelectedClients.length === 0 || selectedAgentAssignments.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un client et un agent',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAgentAssignments.length > 4) {
      toast({
        title: 'Erreur',
        description: 'Maximum 4 agents peuvent être assignés à un client',
        variant: 'destructive',
      });
      return;
    }

    try {
      let successCount = 0;

      for (const clientId of bulkSelectedClients) {
        // Insert assignments for this client
        const insertPromises = selectedAgentAssignments.map(assignment =>
          supabase.from('client_agents').insert({
            client_id: clientId,
            agent_id: assignment.agent_id,
            is_primary: assignment.is_primary,
            commission_split: assignment.commission_split,
          })
        );

        const results = await Promise.all(insertPromises);
        const errors = results.filter(r => r.error);

        if (errors.length === 0) {
          successCount++;
          // Increment each agent's client count
          for (const assignment of selectedAgentAssignments) {
            await (supabase.rpc as any)('increment_agent_clients', { agent_uuid: assignment.agent_id });
          }
        }
      }

      // Reload data
      await loadData();

      setBulkSelectedClients([]);
      setBulkMode(false);
      setSelectedAgentAssignments([]);

      toast({
        title: 'Assignation en masse réussie',
        description: `${successCount} client(s) ont été assignés avec ${selectedAgentAssignments.length} agent(s)`,
      });
    } catch (error) {
      console.error('Error bulk assigning clients:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'assignation en masse',
        variant: 'destructive',
      });
    }
  };

  const toggleSelectAll = () => {
    if (bulkSelectedClients.length === unassignedClients.length) {
      setBulkSelectedClients([]);
    } else {
      setBulkSelectedClients(unassignedClients.map(c => c.id));
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setBulkSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.profile.prenom} ${agent.profile.nom}` : 'Agent inconnu';
  };

  const getClientsByAgent = (agentId: string) => {
    const clientIds = clientAgents
      .filter(ca => ca.agent_id === agentId)
      .map(ca => ca.client_id);
    return clients.filter(c => clientIds.includes(c.id));
  };

  const getClientAssignments = (clientId: string) => {
    return clientAgents.filter(ca => ca.client_id === clientId);
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assigner des clients</CardTitle>
                    <CardDescription>
                      Sélectionnez un ou plusieurs clients sans agent et assignez-les à un agent
                    </CardDescription>
                  </div>
                  <Button
                    variant={bulkMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBulkMode(!bulkMode);
                      setBulkSelectedClients([]);
                    }}
                  >
                    <Users2 className="w-4 h-4 mr-2" />
                    Mode masse
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {bulkMode ? (
                  <div className="space-y-4">
                    {/* Header avec "Tout sélectionner" */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={bulkSelectedClients.length === unassignedClients.length && unassignedClients.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm font-medium">
                          Tout sélectionner ({bulkSelectedClients.length}/{unassignedClients.length})
                        </span>
                      </div>
                    </div>
                    
                    {/* Liste scrollable des clients */}
                    <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                      {unassignedClients.map(client => {
                        const profile = clientProfiles.get(client.user_id);
                        return (
                          <div key={client.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                            <Checkbox
                              checked={bulkSelectedClients.includes(client.id)}
                              onCheckedChange={() => toggleClientSelection(client.id)}
                            />
                            <span className="text-sm flex-1">
                              {profile ? `${profile.prenom} ${profile.nom}` : 'Client inconnu'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {profile?.email}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Sélection agents */}
                    <div className="space-y-2">
                      <Label>Agents (max 4)</Label>
                      <AgentMultiSelect
                        agents={agents}
                        selectedAssignments={selectedAgentAssignments}
                        onSelectionChange={(assignments) => {
                          if (assignments.length <= 4) {
                            setSelectedAgentAssignments(assignments);
                          } else {
                            toast({
                              title: 'Limite atteinte',
                              description: 'Maximum 4 agents peuvent être assignés',
                              variant: 'destructive',
                            });
                          }
                        }}
                      />
                    </div>
                    
                    {/* Bouton d'assignation en masse */}
                    <Button
                      onClick={handleBulkAssign}
                      disabled={bulkSelectedClients.length === 0 || selectedAgentAssignments.length === 0}
                      className="w-full"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assigner {bulkSelectedClients.length} client(s)
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Client</Label>
                        <Select value={selectedClient || ''} onValueChange={setSelectedClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir un client" />
                          </SelectTrigger>
                          <SelectContent>
                            {unassignedClients.map(client => {
                              const profile = clientProfiles.get(client.user_id);
                              const displayName = profile 
                                ? `${profile.prenom} ${profile.nom}` 
                                : `Client ID: ${client.id.substring(0, 8)}...`;
                              return (
                                <SelectItem key={client.id} value={client.id}>
                                  {displayName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Agents (max 4)</Label>
                        <AgentMultiSelect
                          agents={agents}
                          selectedAssignments={selectedAgentAssignments}
                          onSelectionChange={(assignments) => {
                            if (assignments.length <= 4) {
                              setSelectedAgentAssignments(assignments);
                            } else {
                              toast({
                                title: 'Limite atteinte',
                                description: 'Maximum 4 agents peuvent être assignés',
                                variant: 'destructive',
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        if (!selectedClient || selectedAgentAssignments.length === 0) {
                          toast({
                            title: 'Erreur',
                            description: 'Veuillez sélectionner un client et au moins un agent',
                            variant: 'destructive',
                          });
                          return;
                        }
                        if (selectedAgentAssignments.length > 4) {
                          toast({
                            title: 'Erreur',
                            description: 'Maximum 4 agents peuvent être assignés à un client',
                            variant: 'destructive',
                          });
                          return;
                        }
                        handleAssign(selectedClient, selectedAgentAssignments);
                      }}
                      disabled={!selectedClient || selectedAgentAssignments.length === 0}
                      className="w-full md:w-auto"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assigner le client
                    </Button>
                  </>
                )}
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
                        const profile = clientProfiles.get(client.user_id);
                        const displayName = profile 
                          ? `${profile.prenom} ${profile.nom}` 
                          : `Client ID: ${client.id.substring(0, 8)}...`;
                        const assignments = getClientAssignments(client.id);
                        const primaryAssignment = assignments.find(a => a.is_primary);
                        
                        return (
                          <div
                            key={client.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {displayName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {profile?.email} • Ajouté le {new Date(client.created_at || '').toLocaleDateString('fr-CH')}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {assignments.map(assignment => {
                                  const assignedAgent = agents.find(a => a.id === assignment.agent_id);
                                  return (
                                    <Badge key={assignment.id} variant={assignment.is_primary ? 'default' : 'secondary'} className="text-xs">
                                      {assignedAgent ? `${assignedAgent.profile.prenom} ${assignedAgent.profile.nom}` : 'Agent inconnu'} ({assignment.commission_split}%)
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingClientId(client.id);
                                  setEditAgentAssignments(assignments.map(a => ({
                                    agent_id: a.agent_id,
                                    is_primary: a.is_primary,
                                    commission_split: a.commission_split,
                                  })));
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Modifier
                              </Button>
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

      <Dialog open={!!editingClientId} onOpenChange={(open) => !open && setEditingClientId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'assignation</DialogTitle>
            <DialogDescription>
              Modifier les agents assignés (max 4) pour {editingClientId && (() => {
                const client = clients.find(c => c.id === editingClientId);
                return client ? clientProfiles.get(client.user_id)?.prenom : '';
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agents (max 4)</Label>
              <AgentMultiSelect
                agents={agents}
                selectedAssignments={editAgentAssignments}
                onSelectionChange={(assignments) => {
                  if (assignments.length <= 4) {
                    setEditAgentAssignments(assignments);
                  } else {
                    toast({
                      title: 'Limite atteinte',
                      description: 'Maximum 4 agents peuvent être assignés',
                      variant: 'destructive',
                    });
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingClientId(null);
              setEditAgentAssignments([]);
            }}>
              Annuler
            </Button>
            <Button onClick={handleUpdateAssignment}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadData}
      />
    </>
  );
}
