import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Users, Trash2, RefreshCw, UserCog, Search, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumPageHeader, PremiumCard, PremiumKPICard, PremiumEmptyState } from "@/components/premium";

interface AgentInvitationStatus {
  email: string | null;
  invitedAt: string | null;
  confirmationSentAt: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
}

interface AgentWithProfile {
  id: string;
  user_id: string;
  statut: string;
  clients_count: number;
  invitation: AgentInvitationStatus | null;
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
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [copyingLinkUserId, setCopyingLinkUserId] = useState<string | null>(null);
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
        .select('id, user_id, statut');

      if (error) throw error;

      const userIds = agentsData?.map((agent) => agent.user_id) || [];
      const agentIds = agentsData?.map((agent) => agent.id) || [];

      const [profilesResult, clientCountsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nom, prenom, email, telephone, actif, avatar_url')
          .in('id', userIds),
        supabase
          .from('client_agents')
          .select('agent_id, clients!inner(statut)')
          .in('agent_id', agentIds)
          .neq('clients.statut', 'reloge'),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const countByAgent: Record<string, number> = {};
      if (clientCountsResult.data) {
        for (const row of clientCountsResult.data) {
          countByAgent[row.agent_id] = (countByAgent[row.agent_id] || 0) + 1;
        }
      }

      let invitationStatusByUserId: Record<string, AgentInvitationStatus> = {};
      if (userIds.length > 0) {
        const { data: invitationData, error: invitationError } = await supabase.functions.invoke('get-agent-invitation-statuses', {
          body: {
            userIds,
            emails: profilesResult.data?.map((profile) => profile.email).filter(Boolean) || [],
          },
        });

        if (invitationError) {
          console.error('Invitation status error:', invitationError);
        } else {
          invitationStatusByUserId = Object.fromEntries(
            (invitationData?.statuses || []).map((status: AgentInvitationStatus & { userId: string }) => [status.userId, status])
          );
        }
      }

      const mergedData = agentsData?.map((agent) => ({
        ...agent,
        clients_count: countByAgent[agent.id] || 0,
        invitation: invitationStatusByUserId[agent.user_id] || null,
        profiles: profilesResult.data?.find((profile) => profile.id === agent.user_id) || {
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          actif: false,
          avatar_url: null,
        },
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
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;

      const newStatus = !currentStatus;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ actif: newStatus })
        .eq('id', agent.user_id);

      if (profileError) throw profileError;

      const { error: agentError } = await supabase
        .from('agents')
        .update({ statut: newStatus ? 'actif' : 'inactif' })
        .eq('id', agentId);

      if (agentError) throw agentError;

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
    setResendingUserId(userId);

    try {
      const { data, error } = await supabase.functions.invoke('resend-agent-invitation', {
        body: { userId, email }
      });
      
      if (error) throw error;

      toast({
        title: "Succès",
        description: data?.mode === 'recovery'
          ? `Email de définition du mot de passe renvoyé à ${email}`
          : `Invitation renvoyée à ${email}`,
      });

      fetchAgents();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du renvoi de l'invitation",
        variant: "destructive",
      });
    } finally {
      setResendingUserId(null);
    }
  };

  const copyAccessLink = async (userId: string, email: string) => {
    setCopyingLinkUserId(userId);

    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-access-link', {
        body: { userId, email },
      });

      if (error) throw error;
      if (!data?.actionLink) {
        throw new Error("Lien d'accès introuvable");
      }

      await navigator.clipboard.writeText(data.actionLink);

      toast({
        title: "Lien copié",
        description: `Lien ${data.linkType === 'recovery' ? 'de connexion' : 'd’invitation'} copié pour ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la copie du lien",
        variant: "destructive",
      });
    } finally {
      setCopyingLinkUserId(null);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return null;

    return new Intl.DateTimeFormat('fr-CH', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  const getInvitationSentAt = (agent: AgentWithProfile) => agent.invitation?.confirmationSentAt || agent.invitation?.invitedAt;

  const filteredAgents = agents.filter(agent =>
    `${agent.profiles.prenom} ${agent.profiles.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: agents.length,
    actifs: agents.filter(a => a.profiles.actif).length,
    enAttente: agents.filter(a => a.statut === 'en_attente').length,
    totalClients: agents.reduce((sum, a) => sum + (a.clients_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        {/* Premium Header */}
        <PremiumPageHeader
          title="Gestion des Agents"
          subtitle={`Gérez votre équipe de ${agents.length} agents`}
          badge="Équipe"
          icon={UserCog}
          action={
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
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
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <PremiumKPICard
            title="Total Agents"
            value={stats.total}
            icon={UserCog}
            delay={0}
          />
          <PremiumKPICard
            title="Actifs"
            value={stats.actifs}
            icon={Users}
            variant="success"
            delay={50}
          />
          <PremiumKPICard
            title="En attente"
            value={stats.enAttente}
            icon={RefreshCw}
            variant={stats.enAttente > 0 ? 'warning' : 'default'}
            delay={100}
          />
          <PremiumKPICard
            title="Clients gérés"
            value={stats.totalClients}
            icon={Users}
            delay={150}
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:max-w-md"
          />
        </div>

        {/* Agents List */}
        <div className="grid gap-3 md:gap-4">
          {filteredAgents.length === 0 ? (
            <PremiumEmptyState
              icon={UserCog}
              title="Aucun agent trouvé"
              description={searchTerm ? "Essayez une autre recherche" : "Commencez par ajouter un agent"}
              action={
                !searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un agent
                  </Button>
                )
              }
            />
          ) : (
            filteredAgents.map((agent, index) => (
              <PremiumCard 
                key={agent.id} 
                delay={index * 40}
                className="cursor-pointer"
              >
                <div 
                  className="p-4 md:p-6"
                  onClick={() => navigate(`/admin/agents/${agent.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Avatar et infos */}
                    <div className="flex items-start gap-3 md:gap-4 flex-1">
                      <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
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
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
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
                             <span>{agent.clients_count} client{agent.clients_count > 1 ? 's' : ''}</span>
                           </div>
                         </div>

                         {agent.statut === 'en_attente' && (
                           <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                             <div className="flex flex-wrap items-center gap-2">
                               <Badge variant="outline" className="text-xs">
                                 {getInvitationSentAt(agent) ? 'Invitation envoyée' : 'Invitation en attente'}
                               </Badge>
                               {agent.invitation?.lastSignInAt && (
                                 <Badge variant="secondary" className="text-xs">
                                   Déjà connecté
                                 </Badge>
                               )}
                             </div>
                             <p className="mt-2 text-xs text-muted-foreground">
                               {agent.invitation?.lastSignInAt
                                 ? `Dernière connexion le ${formatDateTime(agent.invitation.lastSignInAt)}`
                                 : getInvitationSentAt(agent)
                                   ? `Dernier envoi le ${formatDateTime(getInvitationSentAt(agent))}`
                                   : "Aucun envoi détecté côté authentification pour le moment."}
                             </p>
                           </div>
                         )}
                       </div>
                     </div>
                     
                     {/* Boutons d'action */}
                     <div 
                       className="flex sm:flex-col gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/50 sm:pl-4"
                       onClick={(e) => e.stopPropagation()}
                     >
                       {agent.statut === 'en_attente' && (
                         <>
                           <Button
                             variant="outline"
                             size="sm"
                             className="flex-1 sm:flex-none text-xs md:text-sm"
                             disabled={resendingUserId === agent.user_id}
                             onClick={() => resendInvitation(agent.user_id, agent.profiles.email)}
                           >
                             {resendingUserId === agent.user_id ? (
                               <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 animate-spin" />
                             ) : (
                               <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                             )}
                             Renvoyer
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             className="flex-1 sm:flex-none text-xs md:text-sm"
                             disabled={copyingLinkUserId === agent.user_id}
                             onClick={() => copyAccessLink(agent.user_id, agent.profiles.email)}
                           >
                             {copyingLinkUserId === agent.user_id ? (
                               <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 animate-spin" />
                             ) : (
                               <Copy className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                             )}
                             Copier le lien
                           </Button>
                         </>
                       )}
                       <Button
                         variant={agent.profiles.actif ? "outline" : "default"}
                         size="sm"
                         className="flex-1 sm:flex-none text-xs md:text-sm"
                         onClick={() => toggleAgentStatus(agent.id, agent.profiles.actif)}
                       >
                         {agent.profiles.actif ? "Désactiver" : "Activer"}
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         className="flex-1 sm:flex-none text-xs md:text-sm"
                         onClick={() => deleteAgent(agent.user_id)}
                       >
                         <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                         Supprimer
                       </Button>
                     </div>
                  </div>
                </div>
              </PremiumCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Agents;
