import { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, Upload, Trash2, Pencil, Users2, Search, Star, X, Crown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [coFilter, setCoFilter] = useState<'all' | 'mono' | 'multi'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'old' | 'name'>('recent');
  const [quickAddClient, setQuickAddClient] = useState<string | null>(null);
  const [quickAddAgentId, setQuickAddAgentId] = useState<string>('');
  const [quickAddSplit, setQuickAddSplit] = useState<number>(45);
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
        .is('anonymise_at', null)
        .order('created_at', { ascending: false })
        .limit(15000);

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Load client profiles
      const clientUserIds = clientsData?.map(c => c.user_id) || [];
      const { data: clientProfilesData, error: clientProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds)
        .limit(15000);

      if (clientProfilesError) throw clientProfilesError;

      const clientProfilesMap = new Map(clientProfilesData?.map(p => [p.id, p]) || []);
      setClientProfiles(clientProfilesMap);

      // Load client_agents
      const { data: clientAgentsData, error: clientAgentsError } = await supabase
        .from('client_agents')
        .select('*')
        .limit(15000);

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

  const handleRemoveSingleAgent = async (clientId: string, agentId: string) => {
    try {
      const assignments = clientAgents.filter(ca => ca.client_id === clientId);
      const removed = assignments.find(a => a.agent_id === agentId);
      if (!removed) return;
      const wasPrimary = removed.is_primary;
      const remaining = assignments.filter(a => a.agent_id !== agentId);

      // Delete the single line
      const { error: delErr } = await supabase
        .from('client_agents')
        .delete()
        .eq('client_id', clientId)
        .eq('agent_id', agentId);
      if (delErr) throw delErr;

      await (supabase.rpc as any)('decrement_agent_clients', { agent_uuid: agentId });

      // Archive conversation
      await supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('agent_id', agentId)
        .eq('client_id', clientId);

      // Notify removed agent
      const { data: agentData } = await supabase
        .from('agents').select('user_id').eq('id', agentId).single();
      const { data: clientData } = await supabase
        .from('clients').select('user_id').eq('id', clientId).single();
      const { data: clientProfile } = clientData ? await supabase
        .from('profiles').select('prenom, nom').eq('id', clientData.user_id).single() : { data: null };
      const clientName = clientProfile ? `${clientProfile.prenom} ${clientProfile.nom}` : 'ce client';
      if (agentData) {
        await supabase.rpc('create_notification', {
          p_user_id: agentData.user_id,
          p_type: 'client_removed',
          p_title: 'Client retiré',
          p_message: `${clientName} a été retiré de votre portefeuille`,
          p_link: '/agent/mes-clients',
          p_metadata: { client_id: clientId },
        });
      }

      // Re-sync clients.agent_id with current primary
      if (wasPrimary && remaining.length > 0) {
        // Promote the first remaining co-agent to primary
        const newPrimary = remaining[0];
        await supabase
          .from('client_agents')
          .update({ is_primary: true })
          .eq('client_id', clientId)
          .eq('agent_id', newPrimary.agent_id);
        await supabase
          .from('clients')
          .update({ agent_id: newPrimary.agent_id, commission_split: newPrimary.commission_split })
          .eq('id', clientId);
      } else if (remaining.length === 0) {
        await supabase.from('clients').update({ agent_id: null }).eq('id', clientId);
      }

      await loadData();
      toast({ title: 'Agent retiré', description: 'L\'agent a été retiré de ce client' });
    } catch (e: any) {
      console.error('handleRemoveSingleAgent', e);
      toast({ title: 'Erreur', description: 'Impossible de retirer cet agent', variant: 'destructive' });
    }
  };

  const handlePromoteToPrimary = async (clientId: string, agentId: string) => {
    try {
      const assignments = clientAgents.filter(ca => ca.client_id === clientId);
      const target = assignments.find(a => a.agent_id === agentId);
      if (!target || target.is_primary) return;

      // Unset all primaries
      await supabase
        .from('client_agents')
        .update({ is_primary: false })
        .eq('client_id', clientId);
      // Set new primary
      await supabase
        .from('client_agents')
        .update({ is_primary: true })
        .eq('client_id', clientId)
        .eq('agent_id', agentId);
      // Sync legacy column
      await supabase
        .from('clients')
        .update({ agent_id: agentId, commission_split: target.commission_split })
        .eq('id', clientId);

      await loadData();
      toast({ title: 'Agent principal mis à jour', description: 'Cet agent est désormais principal' });
    } catch (e: any) {
      console.error('handlePromoteToPrimary', e);
      toast({ title: 'Erreur', description: 'Impossible de promouvoir cet agent', variant: 'destructive' });
    }
  };

  const handleQuickAddCoAgent = async (clientId: string, agentId: string, split: number) => {
    try {
      const assignments = clientAgents.filter(ca => ca.client_id === clientId);
      if (assignments.length >= 4) {
        toast({ title: 'Limite atteinte', description: 'Maximum 4 agents par client', variant: 'destructive' });
        return;
      }
      if (assignments.some(a => a.agent_id === agentId)) {
        toast({ title: 'Déjà assigné', description: 'Cet agent est déjà assigné à ce client', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('client_agents').insert({
        client_id: clientId,
        agent_id: agentId,
        is_primary: false,
        commission_split: split,
      });
      if (error) throw error;

      await (supabase.rpc as any)('increment_agent_clients', { agent_uuid: agentId });
      await supabase
        .from('conversations')
        .update({ is_archived: false })
        .eq('agent_id', agentId)
        .eq('client_id', clientId);

      setQuickAddClient(null);
      setQuickAddAgentId('');
      setQuickAddSplit(45);
      await loadData();
      toast({ title: 'Co-agent ajouté', description: 'L\'agent a été ajouté en co-assignation' });
    } catch (e: any) {
      console.error('handleQuickAddCoAgent', e);
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter ce co-agent', variant: 'destructive' });
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <CardTitle className="text-sm font-medium">Co-assignés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {clients.filter(c => clientAgents.filter(ca => ca.client_id === c.id).length >= 2).length}
                </div>
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

          {/* Liste des clients assignés (vue par client) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Clients assignés</CardTitle>
                  <CardDescription>
                    Recherche, filtre et gestion fine des agents par client
                  </CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher (nom, email, téléphone)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger><SelectValue placeholder="Agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les agents</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.profile.prenom} {a.profile.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={coFilter} onValueChange={(v: any) => setCoFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="mono">Mono-agent</SelectItem>
                      <SelectItem value="multi">Co-assignés</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Récents</SelectItem>
                      <SelectItem value="old">Anciens</SelectItem>
                      <SelectItem value="name">Nom A→Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const q = search.trim().toLowerCase();
                let list = assignedClients.filter(c => {
                  const profile = clientProfiles.get(c.user_id);
                  if (q) {
                    const blob = `${profile?.prenom || ''} ${profile?.nom || ''} ${profile?.email || ''} ${profile?.telephone || ''}`.toLowerCase();
                    if (!blob.includes(q)) return false;
                  }
                  const assigns = clientAgents.filter(ca => ca.client_id === c.id);
                  if (agentFilter !== 'all' && !assigns.some(a => a.agent_id === agentFilter)) return false;
                  if (coFilter === 'mono' && assigns.length !== 1) return false;
                  if (coFilter === 'multi' && assigns.length < 2) return false;
                  return true;
                });
                list = [...list].sort((a, b) => {
                  if (sortBy === 'name') {
                    const pa = clientProfiles.get(a.user_id);
                    const pb = clientProfiles.get(b.user_id);
                    return `${pa?.nom || ''} ${pa?.prenom || ''}`.localeCompare(`${pb?.nom || ''} ${pb?.prenom || ''}`);
                  }
                  const ta = new Date(a.created_at || 0).getTime();
                  const tb = new Date(b.created_at || 0).getTime();
                  return sortBy === 'recent' ? tb - ta : ta - tb;
                });

                if (list.length === 0) {
                  return (
                    <div className="py-8 text-center text-muted-foreground">
                      Aucun client ne correspond à ces critères
                    </div>
                  );
                }

                return (
                  <TooltipProvider delayDuration={200}>
                    <div className="space-y-2">
                      {list.map(client => {
                        const profile = clientProfiles.get(client.user_id);
                        const displayName = profile
                          ? `${profile.prenom} ${profile.nom}`
                          : `Client ${client.id.substring(0, 8)}`;
                        const assigns = clientAgents.filter(ca => ca.client_id === client.id);
                        const primary = assigns.find(a => a.is_primary);
                        const coAgents = assigns.filter(a => !a.is_primary);
                        const availableAgents = agents.filter(a => !assigns.some(x => x.agent_id === a.id));

                        return (
                          <div
                            key={client.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {profile?.email} • Ajouté le {new Date(client.created_at || '').toLocaleDateString('fr-CH')}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                                {primary && (() => {
                                  const ag = agents.find(a => a.id === primary.agent_id);
                                  return (
                                    <Badge variant="default" className="gap-1 pr-1">
                                      <Crown className="h-3 w-3" />
                                      <span>{ag ? `${ag.profile.prenom} ${ag.profile.nom}` : 'Inconnu'}</span>
                                      <span className="opacity-70">{primary.commission_split}%</span>
                                      {assigns.length > 1 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={() => handleRemoveSingleAgent(client.id, primary.agent_id)}
                                              className="ml-1 hover:bg-primary-foreground/20 rounded p-0.5"
                                              aria-label="Retirer le principal"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>Retirer (un co-agent sera promu principal)</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </Badge>
                                  );
                                })()}
                                {coAgents.map(co => {
                                  const ag = agents.find(a => a.id === co.agent_id);
                                  return (
                                    <Badge key={co.id} variant="outline" className="gap-1 pr-1">
                                      <span>{ag ? `${ag.profile.prenom} ${ag.profile.nom}` : 'Inconnu'}</span>
                                      <span className="opacity-60">{co.commission_split}%</span>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handlePromoteToPrimary(client.id, co.agent_id)}
                                            className="ml-1 hover:bg-foreground/10 rounded p-0.5"
                                            aria-label="Promouvoir principal"
                                          >
                                            <Star className="h-3 w-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Définir comme principal</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleRemoveSingleAgent(client.id, co.agent_id)}
                                            className="hover:bg-destructive/20 rounded p-0.5"
                                            aria-label="Retirer ce co-agent"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Retirer ce co-agent</TooltipContent>
                                      </Tooltip>
                                    </Badge>
                                  );
                                })}
                                {assigns.length < 4 && availableAgents.length > 0 && (
                                  <Popover
                                    open={quickAddClient === client.id}
                                    onOpenChange={(o) => {
                                      setQuickAddClient(o ? client.id : null);
                                      if (o) { setQuickAddAgentId(''); setQuickAddSplit(45); }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                                        <Plus className="h-3 w-3" /> Co-agent
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 space-y-3" align="start">
                                      <div className="space-y-2">
                                        <Label className="text-xs">Agent</Label>
                                        <Select value={quickAddAgentId} onValueChange={setQuickAddAgentId}>
                                          <SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger>
                                          <SelectContent>
                                            {availableAgents.map(a => (
                                              <SelectItem key={a.id} value={a.id}>
                                                {a.profile.prenom} {a.profile.nom}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs">Commission %</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={quickAddSplit}
                                          onChange={(e) => setQuickAddSplit(Number(e.target.value) || 0)}
                                        />
                                      </div>
                                      <Button
                                        className="w-full"
                                        size="sm"
                                        disabled={!quickAddAgentId}
                                        onClick={() => handleQuickAddCoAgent(client.id, quickAddAgentId, quickAddSplit)}
                                      >
                                        Ajouter
                                      </Button>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingClientId(client.id);
                                  setEditAgentAssignments(assigns.map(a => ({
                                    agent_id: a.agent_id,
                                    is_primary: a.is_primary,
                                    commission_split: a.commission_split,
                                  })));
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Modifier
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    Désassigner tout
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Désassigner tous les agents ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {displayName} sera retiré de {assigns.length} agent(s). Les conversations seront archivées.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleReassign(client.id)}>
                                      Confirmer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                );
              })()}
            </CardContent>
          </Card>
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
