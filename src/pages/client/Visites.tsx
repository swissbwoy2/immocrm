import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, Clock, MapPin, Home, 
  Maximize, User, Phone, KeyRound, CalendarCheck, Check, X, FileCheck, Eye, EyeOff, ThumbsUp, Users, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';

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
  }, [user?.id]);

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
      const { error: visiteError } = await supabase
        .from('visites')
        .update({ statut: 'effectuee' })
        .eq('id', visite.id);

      if (visiteError) {
        console.error('Error updating visite:', visiteError);
        throw visiteError;
      }

      if (visite.offre_id) {
        const { error: offreError } = await supabase
          .from('offres')
          .update({ statut: 'visite_effectuee' })
          .eq('id', visite.offre_id);

        if (offreError) {
          console.error('Error updating offre:', offreError);
        }
      }

      if (visite.offres) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, agent_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (clientData?.agent_id) {
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
            const messageContent = `✅ **Visite effectuée !**\n\n🏠 Bien visité:\n📍 ${visite.offres.adresse}\n💰 ${visite.offres.prix?.toLocaleString()} CHF/mois\n\n📝 **Prêt à postuler ?**\nSi ce bien vous intéresse, vous pouvez maintenant déposer votre candidature depuis la page "Offres Reçues".\n\n👉 Cliquez sur "Demander l'aide de l'agent" pour que votre agent postule pour vous.`;

            await supabase.from('messages').insert({
              conversation_id: conv.id,
              sender_id: user?.id,
              sender_type: 'client',
              content: messageContent,
              offre_id: visite.offre_id
            });
          }
        }
      }

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
            content: `✅ **Le client est intéressé par l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n💰 Loyer: ${visite.offres.prix.toLocaleString()} CHF/mois\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`,
            offre_id: visite.offre_id
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
            content: `❌ **Le client a refusé l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`,
            offre_id: visite.offre_id
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
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary/30 absolute inset-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  const now = new Date();
  const visitesAVenir = visites.filter(v => new Date(v.date_visite) >= now && v.statut === 'planifiee');
  const visitesPassees = visites.filter(v => new Date(v.date_visite) < now || v.statut !== 'planifiee');

  const renderVisiteCard = (visite: any, index: number) => {
    const isExpanded = expandedCards.has(visite.id);
    const isPast = new Date(visite.date_visite) < now || visite.statut !== 'planifiee';

    return (
      <Card 
        key={visite.id} 
        className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 ${
          isPast 
            ? 'bg-gradient-to-br from-card via-card to-muted/30 opacity-90' 
            : 'bg-gradient-to-br from-card via-card to-primary/5'
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        {!isPast && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary animate-gradient-x" />
        )}

        <CardHeader className="relative pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {visite.offres && (
              <div className="flex items-center justify-between sm:order-2 sm:flex-col sm:items-end">
                <div className="text-left sm:text-right">
                  <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {visite.offres.prix?.toLocaleString('fr-CH')} CHF
                  </p>
                  <p className="text-xs text-muted-foreground">/mois</p>
                </div>
                <Button
                  variant="ghost"
                  className="touch-target h-10 w-10 p-0 shrink-0 hover:bg-primary/10 transition-colors"
                  onClick={() => toggleCardExpanded(visite.id)}
                >
                  {isExpanded ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            )}
            
            <div className="flex-1 min-w-0 sm:order-1">
              <CardTitle className="text-base sm:text-lg leading-tight mb-2">
                {visite.adresse}
              </CardTitle>
              
              <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto scrollbar-thin pb-1">
                {visite.statut === 'effectuee' ? (
                  <Badge className="text-xs shrink-0 bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-lg shadow-emerald-500/25">
                    <Check className="w-3 h-3 mr-1" />
                    Effectuée
                  </Badge>
                ) : (
                  <Badge className="text-xs shrink-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg shadow-primary/25">
                    <CalendarCheck className="w-3 h-3 mr-1" />
                    Planifiée
                  </Badge>
                )}
                {visite.est_deleguee && (
                  <Badge variant="outline" className="text-xs shrink-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                    <Users className="w-3 h-3 mr-1" />
                    Déléguée
                  </Badge>
                )}
                {visite.recommandation_agent && (
                  <Badge variant="outline" className="text-xs shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Recommandé
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 p-3 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm rounded-xl border border-primary/20">
            <div className="p-1.5 bg-primary/20 rounded-lg">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm sm:text-base font-medium">{formatShortDate(visite.date_visite)}</span>
            <div className="p-1.5 bg-primary/20 rounded-lg ml-auto sm:ml-2">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm sm:text-base font-medium">
              {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="relative space-y-5 pt-0">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <p className="font-medium text-sm sm:text-base capitalize">
                {formatDate(visite.date_visite)}
              </p>
            </div>

            {visite.offres && (
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                {visite.offres.pieces && (
                  <div className="flex items-center gap-2.5 p-3 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Home className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Pièces</p>
                      <p className="font-semibold text-sm sm:text-base truncate">{visite.offres.pieces}</p>
                    </div>
                  </div>
                )}

                {visite.offres.surface && (
                  <div className="flex items-center gap-2.5 p-3 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Maximize className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Surface</p>
                      <p className="font-semibold text-sm sm:text-base truncate">{visite.offres.surface} m²</p>
                    </div>
                  </div>
                )}

                {visite.offres.etage && (
                  <div className="flex items-center gap-2.5 p-3 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Étage</p>
                      <p className="font-semibold text-sm sm:text-base truncate">{visite.offres.etage}</p>
                    </div>
                  </div>
                )}

                {visite.offres.disponibilite && (
                  <div className="flex items-center gap-2.5 p-3 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Disponible</p>
                      <p className="font-semibold text-sm sm:text-base truncate">{visite.offres.disponibilite}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {visite.offres && (visite.offres.code_immeuble || visite.offres.concierge_nom || visite.offres.locataire_nom) && (
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                  <span className="p-1.5 bg-amber-500/10 rounded-lg">📋</span>
                  Informations pratiques
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {visite.offres.code_immeuble && (
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <KeyRound className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Code</p>
                        <p className="font-bold text-sm">{visite.offres.code_immeuble}</p>
                      </div>
                    </div>
                  )}

                  {visite.offres.concierge_nom && (
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Concierge</p>
                        <p className="font-medium text-sm truncate">{visite.offres.concierge_nom}</p>
                        {visite.offres.concierge_tel && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <a href={`tel:${visite.offres.concierge_tel}`} className="text-xs text-primary truncate hover:underline">
                              {visite.offres.concierge_tel}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {visite.offres.locataire_nom && (
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Locataire actuel</p>
                        <p className="font-medium text-sm truncate">{visite.offres.locataire_nom}</p>
                        {visite.offres.locataire_tel && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <a href={`tel:${visite.offres.locataire_tel}`} className="text-xs text-primary truncate hover:underline">
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

            {visite.recommandation_agent && (
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <ThumbsUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {visite.recommandation_agent}
                </p>
              </div>
            )}

            {visite.notes && (
              <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  💡 {visite.notes}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {visite.statut === 'planifiee' && visite.offres?.statut !== 'visite_effectuee' && (
                <Button 
                  onClick={() => marquerVisiteEffectuee(visite)}
                  className="w-full touch-target bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                  size="lg"
                >
                  <Check className="mr-2 h-5 w-5" />
                  Marquer comme effectuée
                </Button>
              )}

              {(visite.statut === 'effectuee' || visite.offres?.statut === 'visite_effectuee') && 
               visite.offres?.statut !== 'interesse' && 
               visite.offres?.statut !== 'refusee' && 
               visite.offres?.statut !== 'candidature_deposee' && (
                <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50 space-y-3">
                  <p className="text-sm font-medium text-center">
                    Souhaitez-vous donner suite ?
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      size="lg"
                      className="w-full touch-target bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/25"
                      onClick={() => accepterOffre(visite)}
                    >
                      <Check className="mr-2 h-5 w-5" />
                      Intéressé
                    </Button>
                    <Button 
                      variant="outline"
                      size="lg"
                      className="w-full touch-target border-primary/30 hover:bg-primary/10"
                      onClick={() => navigate('/client/offres-recues')}
                    >
                      <FileCheck className="mr-2 h-5 w-5" />
                      Déposer candidature
                    </Button>
                    <Button 
                      variant="destructive"
                      size="lg"
                      className="w-full touch-target bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/25"
                      onClick={() => refuserOffre(visite)}
                    >
                      <X className="mr-2 h-5 w-5" />
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
                  className="flex-1 border-border/50 hover:bg-muted"
                >
                  Voir l'offre
                </Button>
                {visite.offres?.lien_annonce && (
                  <LinkPreviewCard url={visite.offres.lien_annonce} />
                )}
              </div>
            </div>
          </CardContent>
        )}

        {!isExpanded && visite.statut === 'planifiee' && (
          <CardContent className="relative pt-0">
            <Button 
              onClick={() => marquerVisiteEffectuee(visite)}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
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
    <div className="flex-1 overflow-y-auto smooth-scroll">
      {/* Animated Header */}
      <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary animate-gradient-x" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                Mes visites
                <Sparkles className="h-5 w-5 text-white/70 animate-pulse" />
              </h1>
              <p className="text-white/80 mt-1">
                {visites.length} visite{visites.length > 1 ? 's' : ''} au total
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 pt-0 space-y-6 pb-safe">
        {/* Section Visites à venir */}
        {visitesAVenir.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">À venir</h2>
              <Badge className="ml-auto bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg shadow-primary/25">
                {visitesAVenir.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {visitesAVenir.map((visite, index) => renderVisiteCard(visite, index))}
            </div>
          </div>
        )}

        {/* Section Visites passées */}
        {visitesPassees.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-muted to-muted/50 rounded-lg">
                <Check className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-muted-foreground">Passées</h2>
              <Badge variant="secondary" className="ml-auto">
                {visitesPassees.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {visitesPassees.map((visite, index) => renderVisiteCard(visite, index))}
            </div>
          </div>
        )}

        {/* État vide */}
        {visites.length === 0 && (
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
            <CardContent className="relative py-12 text-center">
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full animate-pulse" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-primary animate-float" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucune visite planifiée</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Vous n'avez pas de visite programmée pour le moment.
              </p>
              <Button 
                onClick={() => navigate('/client/offres-recues')}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                Voir mes offres
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
