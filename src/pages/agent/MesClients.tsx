import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Calendar, Users, Building2, Car, DollarSign, AlertTriangle, Edit, Trash2, Upload, Trash, Shield, CheckCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateDaysElapsed } from "@/utils/calculations";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

const MesClients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    loadAgentAndClients();
    // Mark client_assigned notifications as read when visiting this page
    markTypeAsRead('client_assigned');
  }, [user]);

  const loadAgentAndClients = async () => {
    if (!user) return;

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) {
        toast({
          title: "Erreur",
          description: "Agent introuvable",
          variant: "destructive",
        });
        return;
      }

      setAgentId(agentData.id);

      // Load clients
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', agentData.id);

      if (error) throw error;

      // Load profiles separately
      const userIds = clientsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      // Load candidates for all clients
      const clientIds = clientsData?.map(c => c.id) || [];
      const { data: candidatesData } = await supabase
        .from('client_candidates')
        .select('*')
        .in('client_id', clientIds);

      // Group candidates by client_id
      const candidatesMap = new Map<string, any[]>();
      candidatesData?.forEach(candidate => {
        const existing = candidatesMap.get(candidate.client_id) || [];
        existing.push(candidate);
        candidatesMap.set(candidate.client_id, existing);
      });

      // Types cumulatifs pour le calcul du revenu total (doivent correspondre à useClientCandidates)
      const CUMULATIVE_TYPES = ['colocataire', 'co_debiteur', 'signataire_solidaire'];

      // Transform data to match expected format
      const transformedClients = clientsData?.map(client => {
        const profile = profilesMap.get(client.user_id);
        const candidates = candidatesMap.get(client.id) || [];
        
        // Calculate total revenue including cumulative candidates
        const clientRevenu = Number(client.revenus_mensuels) || 0;
        const candidatesRevenu = candidates
          .filter(c => CUMULATIVE_TYPES.includes(c.type))
          .reduce((sum, c) => sum + (Number(c.revenus_mensuels) || 0), 0);
        const totalRevenus = clientRevenu + candidatesRevenu;
        
        // Calculate budget possible (33% of total revenue)
        const budgetPossible = Math.round(totalRevenus / 3);
        
        // Helper function to check if someone has a stable status (permit B/C or Swiss)
        const hasStableStatus = (permis: string | null, nationalite: string | null) => {
          const stablePermits = ['B', 'C', 'Suisse', 'Suisse / Autre'];
          const isSwiss = nationalite?.toLowerCase().includes('suisse') || false;
          const hasStablePermit = permis ? stablePermits.some(p => permis.includes(p)) : false;
          return isSwiss || hasStablePermit;
        };
        
        // Check client's stable status
        const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);
        
        // Find valid guarantor (must have sufficient income AND stable status)
        const garant = candidates.find(c => {
          if (c.type !== 'garant') return false;
          const garantRevenu = Number(c.revenus_mensuels) || 0;
          const budgetDemande = Number(client.budget_max) || 0;
          const garantHasStableStatus = hasStableStatus(c.type_permis, c.nationalite);
          // Garant must have 3x budget AND stable status
          return garantRevenu >= budgetDemande * 3 && garantHasStableStatus;
        });
        
        // Count candidates by type
        const candidatesCount = candidates.length;
        const garantsCount = candidates.filter(c => c.type === 'garant').length;
        const colocatairesCount = candidates.filter(c => c.type === 'colocataire').length;
        const coDebiteursCount = candidates.filter(c => c.type === 'co_debiteur').length;
        const signatairesCount = candidates.filter(c => c.type === 'signataire_solidaire').length;
        
        // Check solvability: budget OK AND (client stable OR valid guarantor)
        const budgetDemande = Number(client.budget_max) || 0;
        const budgetOk = budgetPossible >= budgetDemande;
        const isSolvable = budgetOk && (clientHasStableStatus || !!garant);

        return {
          id: client.id,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
          email: profile?.email || '',
          telephone: profile?.telephone || '',
          adresse: '', // Not in DB
          nationalite: client.nationalite,
          typePermis: client.type_permis,
          etatCivil: client.situation_familiale,
          profession: client.profession,
          employeur: client.secteur_activite,
          revenuMensuel: client.revenus_mensuels,
          totalRevenus,
          budgetPossible,
          budgetMax: client.budget_max,
          nombrePiecesSouhaite: client.pieces?.toString() || '',
          regions: client.region_recherche ? [client.region_recherche] : [],
          animaux: false,
          vehicules: false,
          dateInscription: client.date_ajout || client.created_at,
          agentId: client.agent_id,
          typeBien: client.type_bien,
          garant: garant ? { nom: garant.nom, prenom: garant.prenom, revenus: garant.revenus_mensuels } : null,
          candidates,
          candidatesCount,
          garantsCount,
          colocatairesCount,
          coDebiteursCount,
          signatairesCount,
          isSolvable,
        };
      }) || [];

      setAllClients(transformedClients);
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

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setAllClients(allClients.filter(c => c.id !== clientId));
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllClients = async () => {
    if (!agentId) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('agent_id', agentId);

      if (error) throw error;

      setAllClients([]);
      setDeleteAllDialogOpen(false);
      toast({
        title: "Clients supprimés",
        description: "Tous les clients ont été supprimés",
      });
    } catch (error) {
      console.error('Error deleting all clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les clients",
        variant: "destructive",
      });
    }
  };

  const regions = ['Chablais', 'Fribourg', 'Gros-de-Vaud', 'Lausanne et région', 'Ouest-lausannois', 'Lavaux', 'Nord-vaudois', 'Nyon et région', 'Riviera', 'Valais', 'Genève', 'Autre'];
  const nombrePieces = ['1+', '2+', '3+', '4+', '5+', 'Autre'];

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const togglePieces = (pieces: string) => {
    setSelectedPieces(prev => 
      prev.includes(pieces) ? prev.filter(p => p !== pieces) : [...prev, pieces]
    );
  };

  const filteredClients = allClients.filter(client => {
    const matchSearch = searchTerm === "" || 
      client.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${client.prenom} ${client.nom}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchRegion = selectedRegions.length === 0 || 
      (client.regions && client.regions.length > 0 && client.regions.some((r: string) => selectedRegions.includes(r)));
    
    const matchPieces = selectedPieces.length === 0 || 
      selectedPieces.some(p => {
        if (p === 'Autre') return true;
        const pieceNum = parseFloat(p.replace('+', ''));
        const clientPieces = client.nombrePiecesSouhaite || '';
        const clientNum = parseFloat(clientPieces.toString().replace('+', ''));
        
        if (p.includes('+')) {
          return clientNum >= pieceNum;
        }
        
        return Math.floor(clientNum) === Math.floor(pieceNum);
      });
    
    return matchSearch && matchRegion && matchPieces;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    const dateA = new Date(a.dateInscription || 0).getTime();
    const dateB = new Date(b.dateInscription || 0).getTime();
    return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
  });

  const getProgressColor = (days: number) => {
    if (days < 60) return 'bg-green-500';
    if (days < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatTimeElapsed = (days: number) => {
    const totalHours = days * 24;
    const displayDays = Math.floor(days);
    const remainingHours = Math.floor((days - displayDays) * 24);
    const remainingMinutes = Math.floor(((days - displayDays) * 24 - remainingHours) * 60);
    return `${displayDays}j ${remainingHours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Clients</h1>
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={allClients.length === 0}
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer tous
              </Button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="mb-4">
            <Input
              placeholder="Rechercher un client par nom ou prénom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Filtres Régions */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Régions</p>
            <div className="flex flex-wrap gap-2">
              {regions.map(region => (
                <Button
                  key={region}
                  variant={selectedRegions.includes(region) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRegion(region)}
                  className="text-xs"
                >
                  {region}
                </Button>
              ))}
            </div>
          </div>

          {/* Filtres Nombre de pièces */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Nombre de pièces</p>
            <div className="flex flex-wrap gap-2">
              {nombrePieces.map(pieces => (
                <Button
                  key={pieces}
                  variant={selectedPieces.includes(pieces) ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePieces(pieces)}
                  className="text-xs"
                >
                  {pieces}
                </Button>
              ))}
            </div>
          </div>

          {/* Tri par date de création */}
          <div className="mb-6 flex items-center gap-2">
            <p className="text-sm font-medium">Trier par :</p>
            <Button
              variant={sortOrder === 'recent' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortOrder('recent')}
              className="text-xs"
            >
              Plus récent
            </Button>
            <Button
              variant={sortOrder === 'ancien' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortOrder('ancien')}
              className="text-xs"
            >
              Plus ancien
            </Button>
          </div>

          {/* Grid de clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedClients.map((client) => {
              const daysElapsed = calculateDaysElapsed(client.dateInscription);
              const daysRemaining = 90 - daysElapsed;
              const progressPercent = (daysElapsed / 90) * 100;
              const isCritical = daysElapsed >= 60;

              return (
                <Card 
                  key={client.id} 
                  className="p-4 flex flex-col relative cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/agent/clients/${client.id}`)}
                >
                  {/* Actions en haut à droite */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agent/clients/${client.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Indicateur de solvabilité */}
                  <div className="absolute top-3 left-3">
                    {client.isSolvable ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Solvable
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        À valider
                      </Badge>
                    )}
                  </div>

                  {/* Nom et nationalité */}
                  <div className="mb-3 mt-6">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      {client.prenom} {client.nom}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{client.nationalite}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Users className="h-4 w-4" />
                      <span>Type de permis: {client.typePermis}</span>
                    </div>
                    {/* Détail des candidats par type */}
                    {client.candidatesCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {client.garantsCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            🛡️ {client.garantsCount} garant{client.garantsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.colocatairesCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            👥 {client.colocatairesCount} colocataire{client.colocatairesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.coDebiteursCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            🤝 {client.coDebiteursCount} co-débiteur{client.coDebiteursCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.signatairesCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            ✍️ {client.signatairesCount} signataire{client.signatairesCount > 1 ? 's' : ''} solidaire{client.signatairesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Finances */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Revenu total (dossier)</p>
                        <p className="text-sm font-semibold">CHF {client.totalRevenus?.toLocaleString() || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-primary/10 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Budget possible</p>
                        <p className={`text-sm font-semibold ${client.budgetPossible >= (client.budgetMax || 0) ? 'text-green-600' : 'text-primary'}`}>
                          CHF {client.budgetPossible?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                    {client.garant && (
                      <div className="flex items-start gap-2 bg-green-500/10 p-2 rounded">
                        <Shield className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Garant valide</p>
                          <p className="text-sm font-semibold text-green-600">
                            {client.garant.prenom} {client.garant.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CHF {Number(client.garant.revenus)?.toLocaleString() || 0}/mois
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{client.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  </div>

                  {/* Critères de recherche */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Critères de recherche</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {client.typeBien || 'Location'}, {client.nombrePiecesSouhaite}
                      </Badge>
                    </div>
                  </div>

                  {/* Régions souhaitées */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Régions souhaitées:</span>
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground">
                      {client.regions?.join(', ') || 'Autre'}
                    </div>
                  </div>

                  {/* Date et barre de progression */}
                  <div className="mt-auto pt-3 border-t">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(client.dateInscription).toLocaleDateString('fr-CH')}</span>
                      </div>
                    </div>
                    
                    {/* Temps écoulé avec icône */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        daysElapsed < 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        daysElapsed < 90 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimeElapsed(daysElapsed)}</span>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(daysElapsed)}`}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>

                    {/* Alertes */}
                    {isCritical && (
                      <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs mt-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-700 dark:text-red-400 font-medium">
                          Attention - {daysElapsed} jours écoulés
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun client ne correspond aux filtres sélectionnés</p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer tous les clients</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer tous vos clients ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllClients} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MesClients;