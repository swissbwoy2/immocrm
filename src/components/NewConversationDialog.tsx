import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  user_id: string;
  prenom: string;
  nom: string;
}

interface NewConversationDialogProps {
  agentId: string;
  onConversationCreated: (conversationId: string) => void;
}

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export function NewConversationDialog({ agentId, onConversationCreated }: NewConversationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableClients();
    }
  }, [open, agentId]);

  const loadAvailableClients = async () => {
    try {
      setLoading(true);

      // Get all clients assigned to this agent via client_agents
      const { data: clientAgentsData, error: caError } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentId);

      if (caError) throw caError;
      
      if (!clientAgentsData || clientAgentsData.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const clientIds = clientAgentsData.map(ca => ca.client_id);

      // Get client data
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, user_id')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      // Get existing conversations via conversation_agents
      const { data: convAgentsData, error: convError } = await supabase
        .from('conversation_agents')
        .select('conversation_id')
        .eq('agent_id', agentId);

      if (convError) throw convError;
      
      const conversationIds = convAgentsData?.map(ca => ca.conversation_id) || [];
      
      // Get conversations client_ids
      const { data: conversationsData, error: convDataError } = await supabase
        .from('conversations')
        .select('client_id')
        .in('id', conversationIds);

      if (convDataError) throw convDataError;

      const existingClientIds = new Set(conversationsData?.map(c => c.client_id) || []);
      
      // Filter out clients who already have conversations
      const availableClients = clientsData?.filter(c => !existingClientIds.has(c.id)) || [];

      if (availableClients.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Get profiles for these clients
      const userIds = availableClients.map(c => c.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, prenom, nom')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Map profiles to clients
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const clientsWithProfiles = availableClients.map(client => {
        const profile = profilesMap.get(client.user_id);
        return {
          id: client.id,
          user_id: client.user_id,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
        };
      });

      setClients(clientsWithProfiles);
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

  const handleCreateConversation = async (client: Client) => {
    try {
      // Get all agents assigned to this client
      const { data: clientAgentsData, error: caError } = await supabase
        .from('client_agents')
        .select('agent_id')
        .eq('client_id', client.id);

      if (caError) throw caError;

      const allAgentIds = clientAgentsData?.map(ca => ca.agent_id) || [];

      // Create the conversation with client name
      const clientName = `${client.prenom} ${client.nom}`.trim();
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          client_id: client.id,
          client_name: clientName,
          subject: `Conversation avec ${clientName}`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add all agents to conversation_agents
      if (allAgentIds.length > 0) {
        const conversationAgents = allAgentIds.map(aid => ({
          conversation_id: data.id,
          agent_id: aid
        }));

        const { error: caInsertError } = await supabase
          .from('conversation_agents')
          .insert(conversationAgents);

        if (caInsertError) {
          console.error('Error adding agents to conversation:', caInsertError);
        }
      }

      toast({
        title: "Conversation créée",
        description: `Conversation avec ${client.prenom} ${client.nom} créée avec succès`,
      });

      setOpen(false);
      onConversationCreated(data.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la conversation",
        variant: "destructive",
      });
    }
  };

  const filteredClients = clients.filter(client => {
    const searchTerm = removeAccents(searchQuery.toLowerCase());
    const fullName = removeAccents(`${client.prenom} ${client.nom}`.toLowerCase());
    return fullName.includes(searchTerm);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <MessageSquarePlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nouvelle conversation</span>
          <span className="sm:hidden">Nouveau</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {clients.length === 0 
                  ? "Tous vos clients ont déjà une conversation" 
                  : "Aucun client trouvé"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <Button
                    key={client.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleCreateConversation(client)}
                  >
                    {client.prenom} {client.nom}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
