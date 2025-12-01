import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Users, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AgentWithProfile {
  id: string;
  user_id: string;
  statut: string;
  nombre_clients_assignes: number;
  profiles: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    actif: boolean;
    avatar_url: string | null;
  };
}

const Agents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentWithProfile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('id, user_id, statut, nombre_clients_assignes');

      if (error) throw error;

      // Fetch profiles separately
      const userIds = agentsData?.map(a => a.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email, telephone, actif, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const mergedData = agentsData?.map(agent => ({
        ...agent,
        profiles: profilesData?.find(p => p.id === agent.user_id) || {
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          actif: false,
          avatar_url: null
        }
      })) || [];

      setAgents(mergedData);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleAddAgent = async () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    try {
      // Call edge function to create agent with admin privileges
      const { data, error } = await supabase.functions.invoke('create-agent', {
        body: {
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email,
          telephone: formData.telephone,
        },
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Agent créé. Un email a été envoyé à ${formData.email}`,
      });

      setIsDialogOpen(false);
      setFormData({ nom: "", prenom: "", email: "", telephone: "" });
      fetchAgents();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de l'agent",
        variant: "destructive",
      });
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ actif: !currentStatus })
        .eq('id', agents.find(a => a.id === agentId)?.user_id);

      if (error) throw error;

      toast({ title: "Succès", description: "Statut mis à jour" });
      fetchAgents();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  const deleteAgent = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet agent ?")) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-agent', {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Agent supprimé avec succès",
      });

      fetchAgents();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de l'agent",
        variant: "destructive",
      });
    }
  };

  const resendInvitation = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('resend-agent-invitation', {
        body: { userId, email }
      });
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: `Invitation renvoyée à ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du renvoi de l'invitation",
        variant: "destructive",
      });
    }
  };

  const filteredAgents = agents.filter(agent =>
    `${agent.profiles.prenom} ${agent.profiles.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {/* Header responsive */}
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Agents</h1>
              <p className="text-sm md:text-base text-muted-foreground">Gérez votre équipe ({agents.length} agents)</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prénom</Label>
                      <Input value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                    </div>
                    <div>
                      <Label>Nom</Label>
                      <Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                    </div>
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

          <div className="mb-4 md:mb-6">
            <Input
              placeholder="Rechercher un agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-md"
            />
          </div>

          <div className="grid gap-3 md:gap-4">
            {filteredAgents.map((agent) => {
              return (
                <Card 
                  key={agent.id} 
                  className="p-4 md:p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/admin/agents/${agent.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Avatar et infos */}
                    <div className="flex items-start gap-3 md:gap-4 flex-1">
                      <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0">
                        <AvatarImage src={agent.profiles.avatar_url || undefined} alt={`${agent.profiles.prenom} ${agent.profiles.nom}`} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm md:text-base">
                          {agent.profiles.prenom?.[0]}{agent.profiles.nom?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base md:text-xl font-semibold truncate">{agent.profiles.prenom} {agent.profiles.nom}</h3>
                          <Badge variant={agent.profiles.actif ? "default" : "secondary"} className="text-xs">
                            {agent.profiles.actif ? "Actif" : "Inactif"}
                          </Badge>
                          {agent.statut === 'en_attente' && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                              En attente d'activation
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                            <span className="truncate">{agent.profiles.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                            <span>{agent.profiles.telephone || 'Non renseigné'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                            <span>{agent.nombre_clients_assignes} client{agent.nombre_clients_assignes > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Boutons d'action - empilés verticalement sur mobile */}
                    <div className="flex sm:flex-col gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-4">
                      {agent.statut === 'en_attente' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none text-xs md:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            resendInvitation(agent.user_id, agent.profiles.email);
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                          Renvoyer invitation
                        </Button>
                      )}
                      <Button
                        variant={agent.profiles.actif ? "outline" : "default"}
                        size="sm"
                        className="flex-1 sm:flex-none text-xs md:text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAgentStatus(agent.id, agent.profiles.actif);
                        }}
                      >
                        {agent.profiles.actif ? "Désactiver" : "Activer"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs md:text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAgent(agent.user_id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
      </div>
    </div>
  );
};

export default Agents;
