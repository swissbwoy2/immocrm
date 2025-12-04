import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquarePlus, Users, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  user_id: string;
  prenom: string;
  nom: string;
  agent_id: string | null;
}

interface Agent {
  id: string;
  user_id: string;
  prenom: string;
  nom: string;
}

interface AdminNewConversationDialogProps {
  onConversationCreated: (conversationId: string) => void;
}

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export function AdminNewConversationDialog({ onConversationCreated }: AdminNewConversationDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, user_id, agent_id');

      if (clientsError) throw clientsError;

      // Load all agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id');

      if (agentsError) throw agentsError;

      // Get all user ids for profiles
      const allUserIds = [
        ...(clientsData?.map(c => c.user_id) || []),
        ...(agentsData?.map(a => a.user_id) || [])
      ];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, prenom, nom')
        .in('id', allUserIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Map clients with profiles
      const clientsWithProfiles = clientsData?.map(client => {
        const profile = profilesMap.get(client.user_id);
        return {
          id: client.id,
          user_id: client.user_id,
          agent_id: client.agent_id,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
        };
      }) || [];

      // Map agents with profiles
      const agentsWithProfiles = agentsData?.map(agent => {
        const profile = profilesMap.get(agent.user_id);
        return {
          id: agent.id,
          user_id: agent.user_id,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
        };
      }) || [];

      setClients(clientsWithProfiles);
      setAgents(agentsWithProfiles);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClientConversation = async (client: Client) => {
    try {
      // Determine the agent for this conversation
      const agentId = selectedAgent !== "all" && selectedAgent !== "none" 
        ? selectedAgent 
        : client.agent_id;

      if (!agentId) {
        toast({
          title: "Erreur",
          description: "Ce client n'a pas d'agent assigné. Veuillez sélectionner un agent.",
          variant: "destructive",
        });
        return;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', client.id)
        .eq('agent_id', agentId)
        .eq('conversation_type', 'client-agent')
        .single();

      if (existingConv) {
        toast({
          title: "Conversation existante",
          description: "Une conversation existe déjà entre ce client et cet agent",
          variant: "default",
        });
        setOpen(false);
        onConversationCreated(existingConv.id);
        return;
      }

      const clientName = `${client.prenom} ${client.nom}`.trim();
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          client_id: client.id,
          client_name: clientName,
          subject: `Conversation avec ${clientName}`,
          last_message_at: new Date().toISOString(),
          conversation_type: 'client-agent',
        })
        .select()
        .single();

      if (error) throw error;

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

  const handleCreateAgentConversation = async (agent: Agent) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('admin_user_id', user.id)
        .eq('conversation_type', 'admin-agent')
        .single();

      if (existingConv) {
        toast({
          title: "Conversation existante",
          description: "Une conversation existe déjà avec cet agent",
          variant: "default",
        });
        setOpen(false);
        onConversationCreated(existingConv.id);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agent.id,
          client_id: null,
          admin_user_id: user.id,
          subject: `Discussion avec ${agent.prenom} ${agent.nom}`,
          last_message_at: new Date().toISOString(),
          conversation_type: 'admin-agent',
        })
        .select()
        .single();

      if (error) throw error;

      // Add agent to conversation_agents for proper RLS access
      await supabase
        .from('conversation_agents')
        .insert({
          conversation_id: data.id,
          agent_id: agent.id,
        });

      toast({
        title: "Conversation créée",
        description: `Conversation avec ${agent.prenom} ${agent.nom} créée avec succès`,
      });

      setOpen(false);
      onConversationCreated(data.id);
    } catch (error) {
      console.error('Error creating agent conversation:', error);
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
    const matchesSearch = fullName.includes(searchTerm);
    
    // Filter by agent if selected
    if (selectedAgent === "none") {
      return matchesSearch && !client.agent_id;
    } else if (selectedAgent !== "all") {
      return matchesSearch && client.agent_id === selectedAgent;
    }
    
    return matchesSearch;
  });

  const filteredAgents = agents.filter(agent => {
    const searchTerm = removeAccents(agentSearchQuery.toLowerCase());
    const fullName = removeAccents(`${agent.prenom} ${agent.nom}`.toLowerCase());
    return fullName.includes(searchTerm);
  });

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Sans agent";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.prenom} ${agent.nom}` : "Agent inconnu";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Nouvelle conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Agents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clients" className="space-y-4">
            <div className="space-y-2">
              <Label>Filtrer par agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  <SelectItem value="none">Sans agent</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.prenom} {agent.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun client trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => (
                    <Button
                      key={client.id}
                      variant="outline"
                      className="w-full justify-start flex-col items-start h-auto py-3"
                      onClick={() => handleCreateClientConversation(client)}
                    >
                      <span className="font-medium">{client.prenom} {client.nom}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {getAgentName(client.agent_id)}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="agents" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un agent..."
                value={agentSearchQuery}
                onChange={(e) => setAgentSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <ScrollArea className="h-[350px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun agent trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAgents.map((agent) => (
                    <Button
                      key={agent.id}
                      variant="outline"
                      className="w-full justify-start flex-col items-start h-auto py-3"
                      onClick={() => handleCreateAgentConversation(agent)}
                    >
                      <span className="font-medium">{agent.prenom} {agent.nom}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCog className="h-3 w-3" />
                        Agent
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}