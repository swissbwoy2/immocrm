import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Building2, Trash2, RefreshCw, Home, Search, MapPin, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumPageHeader, PremiumCard, PremiumKPICard, PremiumEmptyState } from "@/components/premium";
import AddProprietaireDialog from "@/components/admin/AddProprietaireDialog";

interface ProprietaireWithProfile {
  id: string;
  user_id: string;
  statut: string;
  civilite: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  canton: string | null;
  telephone: string | null;
  agent_id: string | null;
  created_at: string;
  profiles: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    actif: boolean;
    avatar_url: string | null;
  };
  immeubles_count: number;
  agent_name?: string;
}

const Proprietaires = () => {
  const navigate = useNavigate();
  const [proprietaires, setProprietaires] = useState<ProprietaireWithProfile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProprietaires();
  }, []);

  const fetchProprietaires = async () => {
    try {
      // Fetch proprietaires
      const { data: proprietairesData, error } = await supabase
        .from('proprietaires')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!proprietairesData || proprietairesData.length === 0) {
        setProprietaires([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = proprietairesData.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email, telephone, actif, avatar_url')
        .in('id', userIds);

      // Fetch immeubles count
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('proprietaire_id');

      // Fetch agents for assigned ones
      const agentIds = proprietairesData.filter(p => p.agent_id).map(p => p.agent_id);
      let agentsMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, user_id')
          .in('id', agentIds);

        if (agentsData) {
          const agentUserIds = agentsData.map(a => a.user_id);
          const { data: agentProfiles } = await supabase
            .from('profiles')
            .select('id, prenom, nom')
            .in('id', agentUserIds);

          agentsData.forEach(agent => {
            const profile = agentProfiles?.find(p => p.id === agent.user_id);
            if (profile) {
              agentsMap[agent.id] = `${profile.prenom} ${profile.nom}`;
            }
          });
        }
      }

      // Merge data
      const mergedData = proprietairesData.map(proprietaire => {
        const profile = profilesData?.find(p => p.id === proprietaire.user_id);
        const immeublesCount = immeublesData?.filter(i => i.proprietaire_id === proprietaire.id).length || 0;

        return {
          ...proprietaire,
          profiles: profile || {
            nom: '',
            prenom: '',
            email: '',
            telephone: '',
            actif: false,
            avatar_url: null
          },
          immeubles_count: immeublesCount,
          agent_name: proprietaire.agent_id ? agentsMap[proprietaire.agent_id] : undefined,
        };
      });

      setProprietaires(mergedData);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les propriétaires",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteProprietaire = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce propriétaire ?")) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-proprietaire', {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Propriétaire supprimé avec succès",
      });

      fetchProprietaires();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const resendInvitation = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('resend-proprietaire-invitation', {
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

  const filteredProprietaires = proprietaires.filter(proprietaire =>
    `${proprietaire.profiles.prenom} ${proprietaire.profiles.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proprietaire.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (proprietaire.ville && proprietaire.ville.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: proprietaires.length,
    actifs: proprietaires.filter(p => p.statut === 'actif').length,
    enAttente: proprietaires.filter(p => p.statut === 'en_attente').length,
    totalImmeubles: proprietaires.reduce((sum, p) => sum + p.immeubles_count, 0),
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
          title="Gestion des Propriétaires"
          subtitle={`Gérez vos ${proprietaires.length} propriétaires`}
          badge="Propriétaires"
          icon={Home}
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Inviter un propriétaire
            </Button>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <PremiumKPICard
            title="Total"
            value={stats.total}
            icon={Home}
            delay={0}
          />
          <PremiumKPICard
            title="Actifs"
            value={stats.actifs}
            icon={UserCog}
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
            title="Immeubles"
            value={stats.totalImmeubles}
            icon={Building2}
            delay={150}
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un propriétaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:max-w-md"
          />
        </div>

        {/* Proprietaires List */}
        <div className="grid gap-3 md:gap-4">
          {filteredProprietaires.length === 0 ? (
            <PremiumEmptyState
              icon={Home}
              title="Aucun propriétaire trouvé"
              description={searchTerm ? "Essayez une autre recherche" : "Commencez par inviter un propriétaire"}
              action={
                !searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Inviter un propriétaire
                  </Button>
                )
              }
            />
          ) : (
            filteredProprietaires.map((proprietaire, index) => (
              <div 
                key={proprietaire.id}
                onClick={() => navigate(`/admin/proprietaires/${proprietaire.id}`)}
              >
                <PremiumCard 
                  delay={index * 40}
                  className="cursor-pointer"
                >
                  <div className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar et infos */}
                      <div className="flex items-start gap-3 md:gap-4 flex-1">
                        <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0 ring-2 ring-primary/10">
                          <AvatarImage src={proprietaire.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm md:text-base">
                            {proprietaire.profiles.prenom?.[0]}{proprietaire.profiles.nom?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base md:text-xl font-semibold truncate">
                              {proprietaire.civilite} {proprietaire.profiles.prenom} {proprietaire.profiles.nom}
                            </h3>
                            <Badge variant={proprietaire.statut === 'actif' ? "default" : "secondary"} className="text-xs">
                              {proprietaire.statut === 'actif' ? "Actif" : proprietaire.statut === 'en_attente' ? "En attente" : "Inactif"}
                            </Badge>
                          </div>
                          <div className="space-y-1 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="truncate">{proprietaire.profiles.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                              <span>{proprietaire.telephone || proprietaire.profiles.telephone || 'Non renseigné'}</span>
                            </div>
                            {proprietaire.ville && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                                <span>{proprietaire.code_postal} {proprietaire.ville}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                              <span>{proprietaire.immeubles_count} immeuble{proprietaire.immeubles_count > 1 ? 's' : ''}</span>
                            </div>
                            {proprietaire.agent_name && (
                              <div className="flex items-center gap-2">
                                <UserCog className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                                <span>Agent: {proprietaire.agent_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Boutons d'action */}
                      <div 
                        className="flex sm:flex-col gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/50 sm:pl-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {proprietaire.statut === 'en_attente' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none text-xs md:text-sm"
                            onClick={() => resendInvitation(proprietaire.user_id, proprietaire.profiles.email)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                            Renvoyer
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 sm:flex-none text-xs md:text-sm"
                          onClick={() => deleteProprietaire(proprietaire.user_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              </div>
            ))
          )}
        </div>
      </div>

      <AddProprietaireDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchProprietaires}
      />
    </div>
  );
};

export default Proprietaires;
