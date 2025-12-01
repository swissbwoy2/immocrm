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
import { Mail, MapPin, DollarSign, Maximize, Calendar, Eye, ExternalLink, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ResendOfferDialog } from '@/components/ResendOfferDialog';

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
  const { user } = useAuth();
  const [agent, setAgent] = useState<any>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;
      setAgent(agentData);

      // Load agent's offers
      const { data: offresData, error } = await supabase
        .from('offres')
        .select('*, clients(*, profiles!clients_user_id_fkey(nom, prenom))')
        .eq('agent_id', agentData.id)
        .order('date_envoi', { ascending: false });

      if (error) throw error;
      setOffres(offresData || []);
      
      // Load all clients for resending
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*, profiles!clients_user_id_fkey(nom, prenom, email)')
        .eq('agent_id', agentData.id);
      
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatutChange = async (offreId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

      setOffres(offres.map(o => 
        o.id === offreId ? { ...o, statut: newStatut } : o
      ));
      
      toast({
        title: 'Statut mis à jour',
        description: `Le statut a été changé en "${getStatutLabel(newStatut)}"`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const getClientName = (offre: any) => {
    if (offre.clients?.profiles) {
      return `${offre.clients.profiles.prenom} ${offre.clients.profiles.nom}`;
    }
    return 'Client inconnu';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                      <CardTitle className="text-lg">{offre.adresse}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pour: {getClientName(offre)}
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
                      <span className="font-medium">{Number(offre.prix).toLocaleString('fr-CH')} CHF</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Maximize className="h-4 w-4 text-muted-foreground" />
                      <span>{offre.surface} m²</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{offre.pieces} pcs</span>
                    </div>
                  </div>

                  {/* Date d'envoi */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}</span>
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
                        onClick={() => {
                          setSelectedOffer(offre);
                          setResendDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Renvoyer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/agent/clients/${offre.client_id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir client
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (offre.lien_annonce && offre.lien_annonce.trim()) {
                            window.open(offre.lien_annonce, '_blank');
                          } else {
                            toast({
                              title: 'Lien manquant',
                              description: 'Aucun lien d\'annonce n\'a été renseigné pour cette offre',
                              variant: 'destructive',
                            });
                          }
                        }}
                        disabled={!offre.lien_annonce || !offre.lien_annonce.trim()}
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
      
      {selectedOffer && (
        <ResendOfferDialog
          offer={selectedOffer}
          clients={clients}
          agentId={agent?.id || ''}
          open={resendDialogOpen}
          onOpenChange={setResendDialogOpen}
          onSuccess={loadData}
        />
      )}
    </main>
  );
}
