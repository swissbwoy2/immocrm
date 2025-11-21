import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  };
}

const Agents = () => {
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
        .select('id, nom, prenom, email, telephone, actif')
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
          actif: false
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

  const generateTemporaryPassword = () => {
    return Math.random().toString(36).slice(-12) + 'A1!';
  };

  const handleAddAgent = async () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    try {
      // 1. Create user in Supabase Auth using service role key via edge function
      const tempPassword = generateTemporaryPassword();
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Utilisateur non créé');

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email,
          telephone: formData.telephone,
          actif: true,
        });

      if (profileError) throw profileError;

      // 3. Assign agent role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'agent',
        });

      if (roleError) throw roleError;

      // 4. Create agent entry
      const { error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: authData.user.id,
          statut: 'actif',
          nombre_clients_assignes: 0,
        });

      if (agentError) throw agentError;

      // 5. Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        formData.email,
        {
          redirectTo: `${window.location.origin}/first-login`,
        }
      );

      if (resetError) console.error('Error sending reset email:', resetError);

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
              return (
                <Card key={agent.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">{agent.profiles.prenom} {agent.profiles.nom}</h3>
                        <Badge variant={agent.profiles.actif ? "default" : "secondary"}>
                          {agent.profiles.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {agent.profiles.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {agent.profiles.telephone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {agent.nombre_clients_assignes} client{agent.nombre_clients_assignes > 1 ? 's' : ''} assigné{agent.nombre_clients_assignes > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={agent.profiles.actif ? "outline" : "default"}
                      onClick={() => toggleAgentStatus(agent.id, agent.profiles.actif)}
                    >
                      {agent.profiles.actif ? "Désactiver" : "Activer"}
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

export default Agents;
