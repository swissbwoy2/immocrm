import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Square, Home, FileText, Building, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'Envoyée';
    case 'vue': return 'Vue';
    case 'interesse': return 'Intéressé';
    case 'visite_planifiee': return 'Visite planifiée';
    case 'visite_effectuee': return 'Visite effectuée';
    case 'candidature_deposee': return 'Candidature déposée';
    case 'acceptee': return 'Acceptée ✓';
    case 'refusee': return 'Refusée';
    default: return statut;
  }
};

const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
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

const MesCandidatures = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offres, setOffres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffres();
  }, [user]);

  const loadOffres = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        console.log('No client data found');
        return;
      }

      const { data: offresData, error } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date_envoi', { ascending: false });

      if (error) throw error;

      setOffres(offresData || []);
    } catch (error) {
      console.error('Error loading offres:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (offreId: string, newStatut: string) => {
    try {
      const offre = offres.find(o => o.id === offreId);
      if (!offre) return;

      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

      // Créer un message automatique pour notifier l'agent
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id) {
        // Trouver ou créer une conversation
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('agent_id', clientData.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              subject: 'Messages',
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          const messageContent = newStatut === 'interesse' 
            ? `✅ Le client est intéressé par l'offre : ${offre.adresse} (${offre.prix} CHF/mois)`
            : `❌ Le client a refusé l'offre : ${offre.adresse}`;

          await supabase
            .from('messages')
            .insert({
              conversation_id: conv.id,
              sender_id: user?.id,
              sender_type: 'client',
              content: messageContent,
            });
        }
      }

      setOffres(prev => 
        prev.map(o => o.id === offreId ? { ...o, statut: newStatut } : o)
      );

      toast({
        title: "Statut mis à jour",
        description: `L'offre a été ${newStatut === 'interesse' ? 'approuvée' : 'refusée'} et l'agent a été notifié.`,
      });
    } catch (error) {
      console.error('Error updating statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mes Candidatures</h1>
          <p className="text-muted-foreground">Suivez l'état de vos offres et candidatures en temps réel</p>
        </div>

        {offres.length > 0 ? (
          <div className="grid gap-6">
            {offres.map((offre) => (
              <Card key={offre.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{offre.adresse}</CardTitle>
                        <Badge variant={getStatutBadgeVariant(offre.statut)}>
                          {getStatutLabel(offre.statut)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">CHF {offre.prix.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">par mois</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{offre.pieces} pièces</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{offre.surface} m²</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{offre.etage} étage</span>
                    </div>
                  </div>

                  {offre.description && (
                    <p className="text-sm text-muted-foreground">{offre.description}</p>
                  )}

                  {offre.commentaires && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium text-sm">Commentaires</span>
                      </div>
                      <p className="text-sm">{offre.commentaires}</p>
                    </div>
                  )}

                  <div className="space-y-3 pt-4">
                    {offre.statut === 'envoyee' && (
                      <>
                        <Button 
                          onClick={() => updateStatut(offre.id, 'interesse')}
                          className="w-full"
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Je suis intéressé
                        </Button>
                        <Button 
                          onClick={() => updateStatut(offre.id, 'refusee')}
                          variant="destructive"
                          className="w-full"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Pas intéressé
                        </Button>
                      </>
                    )}
                    
                    {offre.statut === 'interesse' && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          ℹ️ Vous avez marqué cette offre comme intéressante. Votre agent va organiser une visite et gérer la suite du processus.
                        </p>
                      </div>
                    )}
                    
                    {['visite_planifiee', 'visite_effectuee', 'candidature_deposee'].includes(offre.statut) && (
                      <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          ✅ Votre agent gère activement cette candidature. Consultez la messagerie pour plus d'informations.
                        </p>
                      </div>
                    )}
                    
                    {offre.lien_annonce && (
                      <Button 
                        variant="outline"
                        onClick={() => window.open(offre.lien_annonce, '_blank')}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Voir l'annonce
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune offre reçue pour le moment
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MesCandidatures;