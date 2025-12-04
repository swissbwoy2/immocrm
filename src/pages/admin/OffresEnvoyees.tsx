import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Send, MapPin, Home, Calendar, User, Filter, Eye, ExternalLink, Phone, Building, Forward } from "lucide-react";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Offre {
  id: string;
  titre: string | null;
  adresse: string;
  prix: number;
  pieces: number | null;
  surface: number | null;
  type_bien: string | null;
  statut: string | null;
  date_envoi: string | null;
  client_id: string | null;
  agent_id: string | null;
  lien_annonce: string | null;
  description: string | null;
  disponibilite: string | null;
  etage: string | null;
  code_immeuble: string | null;
  commentaires: string | null;
  concierge_nom: string | null;
  concierge_tel: string | null;
  locataire_nom: string | null;
  locataire_tel: string | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
}

interface Agent {
  id: string;
  user_id: string;
}

interface Client {
  id: string;
  user_id: string;
}

export default function AdminOffresEnvoyees() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [offres, setOffres] = useState<Offre[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  
  // Dialog state
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTargetClient, setSelectedTargetClient] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user?.id, userRole]);

  const loadData = async () => {
    try {
      // Charger toutes les offres avec tous les champs
      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*')
        .order('date_envoi', { ascending: false });
      
      if (offresError) throw offresError;
      setOffres(offresData || []);

      // Charger les agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id');
      
      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Charger les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, user_id');
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Collecter tous les user_ids pour charger les profils
      const userIds = new Set<string>();
      agentsData?.forEach(a => userIds.add(a.user_id));
      clientsData?.forEach(c => userIds.add(c.user_id));

      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', Array.from(userIds));
        
        if (profilesError) throw profilesError;
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Erreur chargement offres:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Agent inconnu";
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return "Agent inconnu";
    const profile = profiles.get(agent.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Agent inconnu";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Client inconnu";
    const client = clients.find(c => c.id === clientId);
    if (!client) return "Client inconnu";
    const profile = profiles.get(client.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getStatusBadge = (statut: string | null, clickable: boolean = false) => {
    const baseClass = clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : "";
    switch (statut) {
      case 'envoyee':
        return <Badge variant="secondary" className={baseClass}>Envoyée</Badge>;
      case 'vue':
        return <Badge variant="outline" className={baseClass}>Vue</Badge>;
      case 'acceptee':
        return <Badge className={`bg-success text-success-foreground ${baseClass}`}>Acceptée</Badge>;
      case 'refusee':
        return <Badge variant="destructive" className={baseClass}>Refusée</Badge>;
      case 'visite_programmee':
        return <Badge className={`bg-primary text-primary-foreground ${baseClass}`}>Visite programmée</Badge>;
      default:
        return <Badge variant="outline" className={baseClass}>{statut || "Inconnue"}</Badge>;
    }
  };

  const handleOpenOffreDetail = (offre: Offre) => {
    setSelectedOffre(offre);
    setDetailDialogOpen(true);
  };

  const handleOpenTransferDialog = (offre: Offre, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOffre(offre);
    setSelectedTargetClient("");
    setTransferDialogOpen(true);
  };

  const handleTransferOffre = async () => {
    if (!selectedOffre || !selectedTargetClient) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    setTransferring(true);
    try {
      // Trouver l'agent assigné au client cible
      const targetClient = clients.find(c => c.id === selectedTargetClient);
      
      // Créer une nouvelle offre pour le nouveau client
      const { data: newOffre, error: offreError } = await supabase
        .from('offres')
        .insert({
          titre: selectedOffre.titre,
          adresse: selectedOffre.adresse,
          prix: selectedOffre.prix,
          pieces: selectedOffre.pieces,
          surface: selectedOffre.surface,
          type_bien: selectedOffre.type_bien,
          description: selectedOffre.description,
          lien_annonce: selectedOffre.lien_annonce,
          disponibilite: selectedOffre.disponibilite,
          etage: selectedOffre.etage,
          code_immeuble: selectedOffre.code_immeuble,
          commentaires: selectedOffre.commentaires,
          concierge_nom: selectedOffre.concierge_nom,
          concierge_tel: selectedOffre.concierge_tel,
          locataire_nom: selectedOffre.locataire_nom,
          locataire_tel: selectedOffre.locataire_tel,
          agent_id: selectedOffre.agent_id, // Garder le même agent
          client_id: selectedTargetClient,
          statut: 'envoyee',
          date_envoi: new Date().toISOString()
        })
        .select()
        .single();

      if (offreError) throw offreError;

      const targetClientName = getClientName(selectedTargetClient);

      toast.success(`Offre envoyée à ${targetClientName}`);
      setTransferDialogOpen(false);
      setDetailDialogOpen(false);
      
      // Recharger les données
      loadData();
    } catch (error) {
      console.error('Erreur transfert offre:', error);
      toast.error("Erreur lors de l'envoi de l'offre");
    } finally {
      setTransferring(false);
    }
  };

  // Filtrage
  const filteredOffres = offres.filter(offre => {
    const matchesSearch = 
      offre.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offre.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      getClientName(offre.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAgentName(offre.agent_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || offre.statut === statusFilter;
    const matchesAgent = agentFilter === "all" || offre.agent_id === agentFilter;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  // Stats
  const totalOffres = offres.length;
  const offresEnvoyees = offres.filter(o => o.statut === 'envoyee').length;
  const offresAcceptees = offres.filter(o => o.statut === 'acceptee').length;
  const offresRefusees = offres.filter(o => o.statut === 'refusee').length;

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Offres envoyées</h1>
          <p className="text-muted-foreground">Toutes les offres envoyées par les agents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalOffres}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{offresEnvoyees}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{offresAcceptees}</p>
              <p className="text-sm text-muted-foreground">Acceptées</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{offresRefusees}</p>
              <p className="text-sm text-muted-foreground">Refusées</p>
            </div>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Rechercher (adresse, client, agent...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="vue">Vue</SelectItem>
                  <SelectItem value="acceptee">Acceptée</SelectItem>
                  <SelectItem value="refusee">Refusée</SelectItem>
                  <SelectItem value="visite_programmee">Visite programmée</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {getAgentName(agent.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Liste des offres */}
        <div className="grid gap-4">
          {filteredOffres.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune offre trouvée</p>
                <p className="text-sm mt-1">Modifiez vos filtres ou attendez que les agents envoient des offres</p>
              </div>
            </Card>
          ) : (
            filteredOffres.map((offre) => (
              <Card 
                key={offre.id} 
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpenOffreDetail(offre)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenOffreDetail(offre)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">
                        {offre.titre || offre.adresse}
                      </h3>
                      <span className="pointer-events-none">
                        {getStatusBadge(offre.statut)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {offre.adresse}
                      </span>
                      {offre.type_bien && (
                        <span className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          {offre.type_bien}
                        </span>
                      )}
                      {offre.pieces && (
                        <span>{offre.pieces} pièces</span>
                      )}
                      {offre.surface && (
                        <span>{offre.surface} m²</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="font-medium text-primary">
                        CHF {offre.prix.toLocaleString()}/mois
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" />
                        Agent: {getAgentName(offre.agent_id)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" />
                        Client: {getClientName(offre.client_id)}
                      </span>
                    </div>

                    {offre.date_envoi && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => handleOpenTransferDialog(offre, e)}
                      className="relative z-10"
                    >
                      <Forward className="w-4 h-4 mr-1" />
                      Envoyer à un client
                    </Button>
                    {offre.client_id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/clients/${offre.client_id}`);
                        }}
                        className="relative z-10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir client
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog détail offre */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Détails de l'offre
              {selectedOffre && getStatusBadge(selectedOffre.statut)}
            </DialogTitle>
          </DialogHeader>

          {selectedOffre && (
            <div className="space-y-6">
              {/* En-tête avec adresse */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-lg">{selectedOffre.titre || selectedOffre.adresse}</h4>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedOffre.adresse}
                </div>
                {selectedOffre.date_envoi && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Envoyée le {format(new Date(selectedOffre.date_envoi), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>

              {/* Lien de l'annonce avec prévisualisation */}
              {selectedOffre.lien_annonce && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Lien de l'annonce</Label>
                  <LinkPreviewCard url={selectedOffre.lien_annonce} showInline />
                </div>
              )}

              {/* Caractéristiques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Prix</p>
                  <p className="font-bold text-primary">{selectedOffre.prix.toLocaleString()} CHF</p>
                </div>
                {selectedOffre.pieces && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Pièces</p>
                    <p className="font-bold">{selectedOffre.pieces}</p>
                  </div>
                )}
                {selectedOffre.surface && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Surface</p>
                    <p className="font-bold">{selectedOffre.surface} m²</p>
                  </div>
                )}
                {selectedOffre.etage && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Étage</p>
                    <p className="font-bold">{selectedOffre.etage}</p>
                  </div>
                )}
              </div>

              {/* Type et disponibilité */}
              <div className="grid grid-cols-2 gap-4">
                {selectedOffre.type_bien && (
                  <div>
                    <Label className="text-muted-foreground">Type de bien</Label>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Home className="h-4 w-4" />
                      {selectedOffre.type_bien}
                    </p>
                  </div>
                )}
                {selectedOffre.disponibilite && (
                  <div>
                    <Label className="text-muted-foreground">Disponibilité</Label>
                    <p className="font-medium mt-1">{selectedOffre.disponibilite}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedOffre.description && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Description</Label>
                  <div className="p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedOffre.description}</p>
                  </div>
                </div>
              )}

              {/* Commentaires agent */}
              {selectedOffre.commentaires && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Commentaires de l'agent</Label>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedOffre.commentaires}</p>
                  </div>
                </div>
              )}

              {/* Infos immeuble */}
              {selectedOffre.code_immeuble && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Code immeuble: <strong>{selectedOffre.code_immeuble}</strong></span>
                </div>
              )}

              {/* Contacts */}
              {(selectedOffre.concierge_nom || selectedOffre.locataire_nom) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedOffre.concierge_nom && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Concierge</p>
                      <p className="font-medium">{selectedOffre.concierge_nom}</p>
                      {selectedOffre.concierge_tel && (
                        <a 
                          href={`tel:${selectedOffre.concierge_tel}`} 
                          className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {selectedOffre.concierge_tel}
                        </a>
                      )}
                    </div>
                  )}
                  {selectedOffre.locataire_nom && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Locataire actuel</p>
                      <p className="font-medium">{selectedOffre.locataire_nom}</p>
                      {selectedOffre.locataire_tel && (
                        <a 
                          href={`tel:${selectedOffre.locataire_tel}`} 
                          className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {selectedOffre.locataire_tel}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Agent et Client */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Agent</Label>
                  <p className="font-medium mt-1">{getAgentName(selectedOffre.agent_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Client</Label>
                  <p className="font-medium mt-1">{getClientName(selectedOffre.client_id)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button 
              variant="secondary"
              onClick={() => {
                setDetailDialogOpen(false);
                handleOpenTransferDialog(selectedOffre!);
              }}
            >
              <Forward className="w-4 h-4 mr-2" />
              Envoyer à un client
            </Button>
            {selectedOffre?.lien_annonce && (
              <Button 
                variant="outline" 
                onClick={() => window.open(selectedOffre.lien_annonce!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir l'annonce
              </Button>
            )}
            {selectedOffre?.client_id && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                navigate(`/admin/clients/${selectedOffre.client_id}`);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                Voir le client
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog transfert offre à un client */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer l'offre à un autre client</DialogTitle>
            <DialogDescription>
              Cette offre sera dupliquée et envoyée au client sélectionné.
            </DialogDescription>
          </DialogHeader>

          {selectedOffre && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedOffre.titre || selectedOffre.adresse}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  CHF {selectedOffre.prix.toLocaleString()}/mois
                </p>
                <p className="text-sm text-muted-foreground">
                  Envoyée par: {getAgentName(selectedOffre.agent_id)}
                </p>
                {selectedOffre.client_id && (
                  <p className="text-sm text-muted-foreground">
                    Client actuel: {getClientName(selectedOffre.client_id)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sélectionner le client destinataire</Label>
                <Select value={selectedTargetClient} onValueChange={setSelectedTargetClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients
                      .filter(client => client.id !== selectedOffre.client_id)
                      .map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {getClientName(client.id)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleTransferOffre} 
              disabled={!selectedTargetClient || transferring}
            >
              {transferring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Envoi...
                </>
              ) : (
                <>
                  <Forward className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
