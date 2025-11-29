import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, Clock, MapPin, Home, 
  Maximize, User, Phone, KeyRound, CalendarCheck, Check, X, FileCheck, Eye, EyeOff, ThumbsUp, Users
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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadVisites();
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');
    
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

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', { 
      day: 'numeric', 
      month: 'short'
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

  // Séparer les visites à venir et passées
  const now = new Date();
  const visitesAVenir = visites.filter(v => new Date(v.date_visite) >= now && v.statut === 'planifiee');
  const visitesPassees = visites.filter(v => new Date(v.date_visite) < now || v.statut !== 'planifiee');

  const renderVisiteCard = (visite: any) => {
    const isExpanded = expandedCards.has(visite.id);
    const isPast = new Date(visite.date_visite) < now || visite.statut !== 'planifiee';

    return (
      <Card key={visite.id} className={`transition-shadow ${isPast ? 'opacity-80' : 'hover:shadow-lg'}`}>
        <CardHeader className="pb-3">
          {/* Version mobile compacte */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg leading-tight line-clamp-2">
                {visite.adresse}
              </CardTitle>
              
              {/* Badges en ligne */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {visite.statut === 'effectuee' ? (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Effectuée
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    <CalendarCheck className="w-3 h-3 mr-1" />
                    Planifiée
                  </Badge>
                )}
                {visite.est_deleguee && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Déléguée
                  </Badge>
                )}
                {visite.recommandation_agent && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Recommandé
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Prix et bouton expand */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {visite.offres && (
                <div className="text-right">
                  <p className="text-lg sm:text-xl font-bold text-primary">
                    {visite.offres.prix?.toLocaleString('fr-CH')} CHF
                  </p>
                  <p className="text-xs text-muted-foreground">/mois</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => toggleCardExpanded(visite.id)}
              >
                {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Date/heure compacte */}
          <div className="flex items-center gap-2 mt-3 p-2 bg-primary/5 rounded-md">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium">{formatShortDate(visite.date_visite)}</span>
            <Clock className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
            <span className="text-sm">
              {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </CardHeader>

        {/* Contenu étendu */}
        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {/* Date complète */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="font-medium text-sm sm:text-base">
                {formatDate(visite.date_visite)}
              </p>
            </div>

            {/* Caractéristiques du bien */}
            {visite.offres && (
              <div className="grid grid-cols-2 gap-3">
                {visite.offres.pieces && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Pièces</p>
                      <p className="font-semibold text-sm truncate">{visite.offres.pieces}</p>
                    </div>
                  </div>
                )}

                {visite.offres.surface && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <Maximize className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Surface</p>
                      <p className="font-semibold text-sm truncate">{visite.offres.surface} m²</p>
                    </div>
                  </div>
                )}

                {visite.offres.etage && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Étage</p>
                      <p className="font-semibold text-sm truncate">{visite.offres.etage}</p>
                    </div>
                  </div>
                )}

                {visite.offres.disponibilite && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Disponible</p>
                      <p className="font-semibold text-sm truncate">{visite.offres.disponibilite}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Informations pratiques */}
            {visite.offres && (visite.offres.code_immeuble || visite.offres.concierge_nom || visite.offres.locataire_nom) && (
              <div>
                <h4 className="font-semibold text-sm mb-2">📋 Informations pratiques</h4>
                <div className="grid grid-cols-1 gap-2">
                  {visite.offres.code_immeuble && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <KeyRound className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Code</p>
                        <p className="font-bold text-sm">{visite.offres.code_immeuble}</p>
                      </div>
                    </div>
                  )}

                  {visite.offres.concierge_nom && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Concierge</p>
                        <p className="font-medium text-sm truncate">{visite.offres.concierge_nom}</p>
                        {visite.offres.concierge_tel && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <a href={`tel:${visite.offres.concierge_tel}`} className="text-xs text-primary truncate">
                              {visite.offres.concierge_tel}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {visite.offres.locataire_nom && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Locataire actuel</p>
                        <p className="font-medium text-sm truncate">{visite.offres.locataire_nom}</p>
                        {visite.offres.locataire_tel && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <a href={`tel:${visite.offres.locataire_tel}`} className="text-xs text-primary truncate">
                              {visite.offres.locataire_tel}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommandation agent */}
            {visite.recommandation_agent && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  💬 Recommandation: {visite.recommandation_agent}
                </p>
              </div>
            )}

            {/* Notes */}
            {visite.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  💡 {visite.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {visite.statut === 'planifiee' && visite.offres?.statut !== 'visite_effectuee' && (
                <Button 
                  onClick={() => marquerVisiteEffectuee(visite)}
                  className="w-full"
                  size="sm"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marquer comme effectuée
                </Button>
              )}

              {(visite.statut === 'effectuee' || visite.offres?.statut === 'visite_effectuee') && 
               visite.offres?.statut !== 'interesse' && 
               visite.offres?.statut !== 'refusee' && 
               visite.offres?.statut !== 'candidature_deposee' && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-center">
                    Souhaitez-vous donner suite ?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => accepterOffre(visite)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Intéressé
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate('/client/offres-recues')}
                    >
                      <FileCheck className="mr-2 h-4 w-4" />
                      Déposer candidature
                    </Button>
                    <Button 
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => refuserOffre(visite)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/client/offres-recues')}
                  className="flex-1"
                >
                  Voir l'offre
                </Button>
                {visite.offres?.lien_annonce && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(visite.offres.lien_annonce, '_blank')}
                  >
                    Annonce
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        )}

        {/* Actions rapides quand fermé */}
        {!isExpanded && visite.statut === 'planifiee' && (
          <CardContent className="pt-0">
            <Button 
              onClick={() => marquerVisiteEffectuee(visite)}
              className="w-full"
              size="sm"
            >
              <Check className="mr-2 h-4 w-4" />
              Marquer effectuée
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Mes visites</h1>
          <p className="text-muted-foreground text-sm">
            {visites.length} visite{visites.length > 1 ? 's' : ''} au total
          </p>
        </div>

        {/* Section Visites à venir */}
        {visitesAVenir.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">À venir</h2>
              <Badge variant="default" className="ml-auto">{visitesAVenir.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {visitesAVenir.map(renderVisiteCard)}
            </div>
          </div>
        )}

        {/* Section Visites passées */}
        {visitesPassees.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-muted-foreground">Passées</h2>
              <Badge variant="secondary" className="ml-auto">{visitesPassees.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {visitesPassees.map(renderVisiteCard)}
            </div>
          </div>
        )}

        {/* État vide */}
        {visites.length === 0 && (
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
