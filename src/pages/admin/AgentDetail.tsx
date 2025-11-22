import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Agent {
  id: string;
  user_id: string;
  statut: string;
  nombre_clients_assignes: number;
  created_at: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  actif: boolean;
}

interface Client {
  id: string;
  user_id: string;
  budget_max: number | null;
  pieces: number | null;
  region_recherche: string | null;
  date_ajout: string | null;
  statut: string | null;
  profiles: Profile;
}

const AgentDetail = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
    }
  }, [agentId]);

  const fetchAgentDetails = async () => {
    try {
      // Fetch agent data
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', agentData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch assigned clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', agentId);

      if (clientsError) throw clientsError;

      // Fetch clients profiles
      const userIds = clientsData?.map(c => c.user_id) || [];
      if (userIds.length > 0) {
        const { data: clientProfilesData, error: clientProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (clientProfilesError) throw clientProfilesError;

        const mergedClients = clientsData?.map(client => ({
          ...client,
          profiles: clientProfilesData?.find(p => p.id === client.user_id) || {
            nom: '',
            prenom: '',
            email: '',
            telephone: '',
            actif: false
          }
        })) || [];

        setClients(mergedClients);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de l'agent",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agent || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent introuvable</h2>
          <Button onClick={() => navigate('/admin/agents')}>
            Retour aux agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/agents')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">
                    {profile.prenom} {profile.nom}
                  </h1>
                  <Badge variant={profile.actif ? "default" : "secondary"}>
                    {profile.actif ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">Agent immobilier</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Téléphone:</span>
                  <span>{profile.telephone}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Clients assignés:</span>
                  <span>{agent.nombre_clients_assignes}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Créé le:</span>
                  <span>
                    {format(new Date(agent.created_at), "d MMMM yyyy", { locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Clients Card */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">
              Clients assignés ({clients.length})
            </h2>

            {clients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun client assigné à cet agent
              </p>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <Card
                    key={client.id}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {client.profiles.prenom} {client.profiles.nom}
                          </h3>
                          <Badge variant="outline">{client.statut || 'actif'}</Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Budget:</span>{" "}
                            {client.budget_max ? `${client.budget_max.toLocaleString()} CHF` : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Pièces:</span>{" "}
                            {client.pieces || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Région:</span>{" "}
                            {client.region_recherche || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;
