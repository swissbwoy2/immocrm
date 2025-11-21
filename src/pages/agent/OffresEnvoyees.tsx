import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, MapPin, DollarSign, Maximize, Calendar, Eye, ExternalLink } from 'lucide-react';
import { getCurrentUser, getAgents, getOffres, getClients, saveOffres } from '@/utils/localStorage';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import type { Offre } from '@/data/mockData';

const getStatutBadgeVariant = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'secondary';
    case 'vue': return 'outline';
    case 'interesse': return 'default';
    case 'visite_planifiee': return 'default';
    case 'visite_effectuee': return 'default';
    case 'candidature_deposee': return 'default';
    case 'acceptee': return 'default';
    case 'refusee': return 'destructive';
    default: return 'secondary';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'Envoyée';
    case 'vue': return 'Vue';
    case 'interesse': return 'Intéressé';
    case 'visite_planifiee': return 'Visite planifiée';
    case 'visite_effectuee': return 'Visite effectuée';
    case 'candidature_deposee': return 'Candidature déposée';
    case 'acceptee': return 'Acceptée';
    case 'refusee': return 'Refusée';
    default: return statut;
  }
};

export default function OffresEnvoyees() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const agents = getAgents();
  const agent = agents.find(a => a.userId === currentUser?.id);
  
  const [offres, setOffres] = useState<Offre[]>([]);
  const [clients, setClients] = useState(() => getClients());

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'agent') {
      navigate('/login');
      return;
    }

    const allOffres = getOffres();
    const mesOffres = allOffres.filter(o => o.agentId === agent?.id);
    // Trier par date décroissante
    mesOffres.sort((a, b) => new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime());
    setOffres(mesOffres);
  }, [currentUser, navigate, agent?.id]);

  const handleStatutChange = (offreId: string, newStatut: string) => {
    const allOffres = getOffres();
    const updatedOffres = allOffres.map(o => 
      o.id === offreId 
        ? { ...o, statut: newStatut as Offre['statut'], dateStatut: new Date().toISOString() }
        : o
    );
    saveOffres(updatedOffres);
    setOffres(updatedOffres.filter(o => o.agentId === agent?.id));
    
    toast({
      title: 'Statut mis à jour',
      description: `Le statut a été changé en "${getStatutLabel(newStatut)}"`,
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.prenom} ${client.nom}` : 'Client inconnu';
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Offres envoyées</h1>
            <p className="text-muted-foreground mt-1">
              Gérez et suivez toutes vos offres envoyées
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{offres.length}</div>
                <div className="text-sm text-muted-foreground">Total envoyées</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {offres.filter(o => o.statut === 'interesse' || o.statut === 'visite_planifiee').length}
                </div>
                <div className="text-sm text-muted-foreground">En cours</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {offres.filter(o => o.statut === 'acceptee').length}
                </div>
                <div className="text-sm text-muted-foreground">Acceptées</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {offres.filter(o => o.statut === 'refusee').length}
                </div>
                <div className="text-sm text-muted-foreground">Refusées</div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des offres */}
          {offres.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {offres.map((offre) => (
                <Card key={offre.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{offre.localisation}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pour: {getClientName(offre.clientId)}
                        </p>
                      </div>
                      <Badge variant={getStatutBadgeVariant(offre.statut)}>
                        {getStatutLabel(offre.statut)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Infos du bien */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{offre.prix.toLocaleString('fr-CH')} CHF</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Maximize className="h-4 w-4 text-muted-foreground" />
                        <span>{offre.surface} m²</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{offre.nombrePieces} pcs</span>
                      </div>
                    </div>

                    {/* Date d'envoi */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Envoyée le {new Date(offre.dateEnvoi).toLocaleDateString('fr-CH')}</span>
                    </div>

                    {/* Description courte */}
                    {offre.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {offre.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Statut de la candidature:</span>
                        <Select 
                          value={offre.statut} 
                          onValueChange={(value) => handleStatutChange(offre.id, value)}
                        >
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="envoyee">Envoyée</SelectItem>
                            <SelectItem value="vue">Vue</SelectItem>
                            <SelectItem value="interesse">Intéressé</SelectItem>
                            <SelectItem value="visite_planifiee">Visite planifiée</SelectItem>
                            <SelectItem value="visite_effectuee">Visite effectuée</SelectItem>
                            <SelectItem value="candidature_deposee">Candidature déposée</SelectItem>
                            <SelectItem value="acceptee">Acceptée</SelectItem>
                            <SelectItem value="refusee">Refusée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/agent/clients/${offre.clientId}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le client
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (offre.lienAnnonce && offre.lienAnnonce.trim()) {
                              window.open(offre.lienAnnonce, '_blank');
                            } else {
                              toast({
                                title: 'Lien manquant',
                                description: 'Aucun lien d\'annonce n\'a été renseigné pour cette offre',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={!offre.lienAnnonce || !offre.lienAnnonce.trim()}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Annonce
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Aucune offre envoyée pour le moment</p>
                <Button onClick={() => navigate('/agent/envoyer-offre')}>
                  Envoyer une première offre
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  }
