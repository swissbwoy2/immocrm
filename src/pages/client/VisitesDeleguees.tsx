import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Home, Square, ThumbsUp, ThumbsDown, Minus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function VisitesDeleguees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisites();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('visites-deleguees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites'
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

      if (!clientData) return;

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .eq('est_deleguee', true)
        .order('created_at', { ascending: false });

      setVisites(visitesData || []);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommandationConfig = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    return {
      recommande: { 
        icon: ThumbsUp, 
        label: 'Recommandé par votre agent', 
        variant: 'default' as const,
        color: 'text-green-600',
        bgColor: 'bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30'
      },
      neutre: { 
        icon: Minus, 
        label: 'Avis neutre', 
        variant: 'secondary' as const,
        color: 'text-gray-600',
        bgColor: 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-950/50 dark:to-gray-900/30'
      },
      deconseille: { 
        icon: ThumbsDown, 
        label: 'Non recommandé', 
        variant: 'destructive' as const,
        color: 'text-red-600',
        bgColor: 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30'
      }
    }[recommandation];
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-r-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  // Séparer les visites par statut
  const visitesEnAttente = visites.filter(v => v.statut === 'planifiee');
  const visitesConfirmees = visites.filter(v => v.statut === 'confirmee');
  const visitesEffectuees = visites.filter(v => v.statut === 'effectuee');
  const visitesRefusees = visites.filter(v => v.statut === 'refusee');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header modernisé */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              Visites déléguées
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Suivez les visites que votre agent effectue pour vous
            </p>
          </div>
        </div>

        {/* Visites en attente de confirmation */}
        {visitesEnAttente.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 p-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/30 rounded-full blur-2xl" />
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-200 relative">
              <AlertCircle className="h-5 w-5" />
              En attente de confirmation
              <Badge variant="secondary" className="ml-2 bg-amber-200/50 text-amber-800">{visitesEnAttente.length}</Badge>
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              Votre agent n'a pas encore confirmé ces demandes de visites
            </p>
            <div className="grid gap-4 relative">
              {visitesEnAttente.map((visite, index) => (
                <Card key={visite.id} className="group card-interactive border-amber-300/50 dark:border-amber-700/50 animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  </div>
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Demandée le {new Date(visite.created_at).toLocaleDateString('fr-CH')}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-100/50 text-amber-800 border-amber-300">
                        En attente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    {visite.offres && (
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.surface} m²</span>
                        </div>
                        <div className="text-primary font-semibold">
                          CHF {visite.offres.prix?.toLocaleString()}/mois
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                      <span className="animate-pulse">⏳</span> Votre agent va bientôt confirmer cette demande
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites confirmées */}
        {visitesConfirmees.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 p-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl" />
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200 relative">
              <CheckCircle className="h-5 w-5" />
              Visites programmées
              <Badge variant="secondary" className="ml-2 bg-blue-200/50 text-blue-800">{visitesConfirmees.length}</Badge>
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Votre agent va effectuer ces visites pour vous
            </p>
            <div className="grid gap-4 relative">
              {visitesConfirmees.map((visite, index) => (
                <Card key={visite.id} className="group card-interactive border-blue-300/50 dark:border-blue-700/50 animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  </div>
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleDateString('fr-CH', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-blue-600 to-blue-500">
                        Confirmée
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    {visite.offres && (
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.surface} m²</span>
                        </div>
                        <div className="text-primary font-semibold">
                          CHF {visite.offres.prix?.toLocaleString()}/mois
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Votre agent effectuera la visite et vous partagera son feedback
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites refusées */}
        {visitesRefusees.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Non disponibles
              <Badge variant="secondary">{visitesRefusees.length}</Badge>
            </h2>
            <div className="grid gap-4">
              {visitesRefusees.map((visite, index) => (
                <Card key={visite.id} className="group card-interactive opacity-75 animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Demandée le {new Date(visite.created_at).toLocaleDateString('fr-CH')}
                        </div>
                      </div>
                      <Badge variant="destructive">Non disponible</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visite.offres && (
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.surface} m²</span>
                        </div>
                        <div className="text-primary font-semibold">
                          CHF {visite.offres.prix?.toLocaleString()}/mois
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-3">
                      Votre agent n'était pas disponible pour cette visite
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                      onClick={() => navigate('/client/offres-recues')}
                    >
                      Voir l'offre
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites effectuées avec feedback */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Visites effectuées
            <Badge variant="secondary" className="bg-primary/10 text-primary">{visitesEffectuees.length}</Badge>
          </h2>
          {visitesEffectuees.length > 0 ? (
            <div className="grid gap-4">
              {visitesEffectuees.map((visite, index) => {
                const recommandationConfig = getRecommandationConfig(visite.recommandation_agent);
                const Icon = recommandationConfig?.icon;

                  return (
                  <Card key={visite.id} className="group card-interactive animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    </div>
                    <CardHeader className="relative">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{visite.adresse}</CardTitle>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Visitée le {new Date(visite.updated_at).toLocaleDateString('fr-CH')}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-gradient-to-r from-green-600 to-green-500">Effectuée</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 relative">
                      {visite.offres && (
                        <div className="flex items-center gap-4 text-sm pb-3 border-b flex-wrap">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>{visite.offres.pieces} pièces</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                            <Square className="h-4 w-4 text-muted-foreground" />
                            <span>{visite.offres.surface} m²</span>
                          </div>
                          <div className="text-primary font-semibold">
                            CHF {visite.offres.prix?.toLocaleString()}/mois
                          </div>
                        </div>
                      )}

                      {visite.recommandation_agent && recommandationConfig && Icon && (
                        <div className={`p-4 rounded-xl ${recommandationConfig.bgColor} border border-current/10`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${recommandationConfig.color}`} />
                            <span className="font-semibold">{recommandationConfig.label}</span>
                          </div>
                        </div>
                      )}

                      {visite.feedback_agent && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <span>Feedback de votre agent</span>
                          </div>
                          <div className="glass-morphism p-4 rounded-xl">
                            <p className="text-sm whitespace-pre-line">{visite.feedback_agent}</p>
                          </div>
                        </div>
                      )}

                      {visite.offres && (
                        <Button 
                          variant="outline" 
                          className="w-full group/btn"
                          onClick={() => navigate('/client/offres-recues')}
                        >
                          <span className="group-hover/btn:translate-x-1 transition-transform">Voir l'offre complète</span>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="card-interactive animate-fade-in overflow-hidden">
              <CardContent className="py-12 text-center">
                <div className="relative inline-block mb-4">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 animate-float" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                </div>
                <p className="text-muted-foreground mb-4">Aucune visite déléguée effectuée pour le moment</p>
                <Button onClick={() => navigate('/client/offres-recues')}>
                  Voir mes offres
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Message si aucune visite */}
        {visites.length === 0 && (
          <Card className="card-interactive animate-fade-in overflow-hidden">
            <CardContent className="py-12 text-center">
              <div className="relative inline-block mb-4">
                <Users className="w-16 h-16 text-muted-foreground/30 animate-float" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
              <p className="text-lg font-medium mb-2">Vous n'avez pas encore délégué de visites</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Lorsque vous recevez une offre, vous pouvez demander à votre agent d'effectuer la visite pour vous
              </p>
              <Button onClick={() => navigate('/client/offres-recues')} className="group">
                <span className="group-hover:translate-x-1 transition-transform">Voir mes offres</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
