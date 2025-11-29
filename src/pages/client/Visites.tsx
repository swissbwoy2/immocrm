import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, Clock, MapPin, Home, DollarSign, 
  Maximize, User, Phone, KeyRound, CalendarCheck, Check, X, FileCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export default function Visites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisites();
    // Mark visit notifications as read when visiting this page
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');
    
    // Écouter les changements en temps réel sur les visites
    const channel = supabase
      .channel('visites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites',
        },
        () => {
          // Recharger les visites quand il y a un changement
          loadVisites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadVisites = async () => {
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

      const { data: visitesData, error } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .order('date_visite', { ascending: true });

      if (error) throw error;

      setVisites(visitesData || []);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const marquerVisiteEffectuee = async (visite: any) => {
    try {
      await supabase
        .from('visites')
        .update({ statut: 'effectuee' })
        .eq('id', visite.id);

      await supabase
        .from('offres')
        .update({ statut: 'visite_effectuee' })
        .eq('id', visite.offre_id);

      toast({
        title: 'Succès',
        description: 'La visite a été marquée comme effectuée'
      });

      await loadVisites();
    } catch (error) {
      console.error('Error updating visite:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la visite',
        variant: 'destructive'
      });
    }
  };

  const accepterOffre = async (visite: any) => {
    try {
      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', visite.offre_id);

      // Notifier l'agent
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id && visite.offres) {
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
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `✅ **Le client est intéressé par l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n💰 Loyer: ${visite.offres.prix.toLocaleString()} CHF/mois\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`
          });
        }
      }

      toast({
        title: '✅ Offre acceptée',
        description: 'Votre agent a été notifié de votre intérêt'
      });

      await loadVisites();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter l\'offre',
        variant: 'destructive'
      });
    }
  };

  const refuserOffre = async (visite: any) => {
    try {
      await supabase
        .from('offres')
        .update({ statut: 'refusee' })
        .eq('id', visite.offre_id);

      // Notifier l'agent
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id && visite.offres) {
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
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `❌ **Le client a refusé l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`
          });
        }
      }

      toast({
        title: 'Offre refusée',
        description: 'Votre agent a été notifié'
      });

      await loadVisites();
    } catch (error) {
      console.error('Error refusing offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser l\'offre',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Prochaines visites</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {visites.length} visite{visites.length > 1 ? 's' : ''} planifiée{visites.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Liste des visites */}
          {visites.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {visites.map((visite) => (
                <Card key={visite.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl mb-2">
                          {visite.adresse}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="default" className="flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3" />
                            {visite.statut === 'planifiee' ? 'Visite planifiée' : 'Visite effectuée'}
                          </Badge>
                        </div>
                      </div>
                      {visite.offres && (
                        <div className="text-left sm:text-right">
                          <p className="text-xl sm:text-2xl font-bold text-primary">
                            {visite.offres.prix.toLocaleString('fr-CH')} CHF
                          </p>
                          <p className="text-sm text-muted-foreground">par mois</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Date et heure de la visite */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-4">
                        <Calendar className="w-8 h-8 text-primary" />
                        <div className="flex-1">
                          <p className="font-semibold text-lg">
                            {formatDate(visite.date_visite)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Caractéristiques du bien */}
                    {visite.offres && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Home className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Pièces</p>
                            <p className="font-semibold">{visite.offres.pieces}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Maximize className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Surface</p>
                            <p className="font-semibold">{visite.offres.surface} m²</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Étage</p>
                            <p className="font-semibold">{visite.offres.etage}</p>
                          </div>
                        </div>

                        {visite.offres.disponibilite && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Disponible</p>
                              <p className="font-semibold">
                                {visite.offres.disponibilite}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informations pratiques */}
                    {visite.offres && (
                      <div>
                        <h4 className="font-semibold mb-3">📋 Informations pratiques</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {visite.offres.code_immeuble && (
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                              <KeyRound className="w-5 h-5 text-primary mt-1" />
                              <div>
                                <p className="text-sm text-muted-foreground">Code d'immeuble</p>
                                <p className="font-bold text-lg">{visite.offres.code_immeuble}</p>
                              </div>
                            </div>
                          )}

                          {visite.offres.concierge_nom && (
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                              <User className="w-5 h-5 text-primary mt-1" />
                              <div>
                                <p className="text-sm text-muted-foreground">Concierge</p>
                                <p className="font-medium">{visite.offres.concierge_nom}</p>
                                {visite.offres.concierge_tel && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">{visite.offres.concierge_tel}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {visite.offres.locataire_nom && (
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                              <User className="w-5 h-5 text-primary mt-1" />
                              <div>
                                <p className="text-sm text-muted-foreground">Locataire actuel</p>
                                <p className="font-medium">{visite.offres.locataire_nom}</p>
                                {visite.offres.locataire_tel && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">{visite.offres.locataire_tel}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {visite.notes && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          💡 {visite.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                      {visite.statut === 'planifiee' && visite.offres?.statut !== 'visite_effectuee' && (
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => marquerVisiteEffectuee(visite)}
                            className="flex-1"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Marquer comme effectuée
                          </Button>
                        </div>
                      )}

                      {(visite.statut === 'effectuee' || visite.offres?.statut === 'visite_effectuee') && 
                       visite.offres?.statut !== 'interesse' && 
                       visite.offres?.statut !== 'refusee' && 
                       visite.offres?.statut !== 'candidature_deposee' && (
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                          <p className="text-sm font-medium text-center">
                            Suite à cette visite, souhaitez-vous donner suite à cette offre ?
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Button 
                              variant="default"
                              className="w-full"
                              onClick={() => accepterOffre(visite)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Intéressé
                            </Button>
                            <Button 
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate('/client/offres-recues')}
                            >
                              <FileCheck className="mr-2 h-4 w-4" />
                              Candidature
                            </Button>
                            <Button 
                              variant="destructive"
                              className="w-full"
                              onClick={() => refuserOffre(visite)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/client/offres-recues')}
                          className="flex-1"
                        >
                          Voir l'offre complète
                        </Button>
                        {visite.offres?.lien_annonce && (
                          <Button 
                            variant="outline"
                            onClick={() => window.open(visite.offres.lien_annonce, '_blank')}
                          >
                            Annonce
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucune visite planifiée</h3>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas de visite programmée pour le moment.
                </p>
                <Button onClick={() => navigate('/client/offres-recues')}>
                  Voir mes offres
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  );
}