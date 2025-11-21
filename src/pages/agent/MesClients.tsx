import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Calendar, Users, Building2, Car, DollarSign, AlertTriangle, Edit, Trash2, Upload, Trash } from "lucide-react";
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
import { getClients, saveClients, getAgents, getCurrentUser } from "@/utils/localStorage";
import { calculateDaysElapsed } from "@/utils/calculations";
import { CSVImportDialog } from "@/components/CSVImportDialog";

const MesClients = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const agents = getAgents();
  const agent = agents.find(a => a.userId === currentUser?.id);
  
  const [allClients, setAllClients] = useState(() => 
    getClients().filter(c => c.agentId === agent?.id)
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const handleImportComplete = () => {
    // Reload clients from localStorage
    const updatedClients = getClients().filter(c => c.agentId === agent?.id);
    setAllClients(updatedClients);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      const allClientsData = getClients();
      const updatedClients = allClientsData.filter(c => c.id !== clientId);
      saveClients(updatedClients);
      setAllClients(updatedClients.filter(c => c.agentId === agent?.id));
    }
  };

  const handleDeleteAllClients = () => {
    const allClientsData = getClients();
    // Garder seulement les clients qui ne sont pas à cet agent
    const otherAgentsClients = allClientsData.filter(c => c.agentId !== agent?.id);
    saveClients(otherAgentsClients);
    setAllClients([]);
    setDeleteAllDialogOpen(false);
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
      (client.regions && client.regions.length > 0 && client.regions.some(r => selectedRegions.includes(r)));
    
    const matchPieces = selectedPieces.length === 0 || 
      selectedPieces.some(p => {
        if (p === 'Autre') return true;
        const pieceNum = parseFloat(p.replace('+', ''));
        const clientPieces = client.nombrePiecesSouhaite || '';
        
        // Handle both "2.5" and "2+" formats
        const clientNum = parseFloat(clientPieces.toString().replace('+', ''));
        
        if (p.includes('+')) {
          return clientNum >= pieceNum;
        }
        
        return Math.floor(clientNum) === Math.floor(pieceNum);
      });
    
    return matchSearch && matchRegion && matchPieces;
  });

  // Trier les clients par date de création
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

  const getProgressBarColor = (days: number) => {
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

  return (
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
              <Button onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Importer CSV
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
              const isWarning = daysElapsed >= 45;
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

                  {/* Nom et nationalité */}
                  <div className="mb-3">
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
                  </div>

                  {/* Finances */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Revenu mensuel</p>
                        <p className="text-sm font-semibold">CHF {client.revenuMensuel?.toLocaleString() || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-primary/10 p-2 rounded">
                      <DollarSign className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Budget maximum</p>
                        <p className="text-sm font-semibold text-primary">CHF {client.budgetMax?.toLocaleString() || 0}</p>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{client.adresse}</span>
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

                  {/* Informations supplémentaires */}
                  <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{client.employeur || client.profession}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>État civil: {client.etatCivil || 'Non renseigné'}</span>
                    </div>
                    {client.vehicules && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span>Véhicules</span>
                      </div>
                    )}
                  </div>

                  {/* Date et barre de progression */}
                  <div className="mt-auto pt-3 border-t">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(client.dateInscription).toLocaleDateString('fr-CH')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Depuis le {new Date(client.dateInscription).toLocaleDateString('fr-CH')}</span>
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
                        className={`h-2 rounded-full transition-all ${getProgressBarColor(daysElapsed)}`}
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

      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
        currentAgentId={agent?.id}
      />

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer tous les clients ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous vos clients ({allClients.length}) seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllClients} className="bg-destructive hover:bg-destructive/90">
              Supprimer tous
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MesClients;
