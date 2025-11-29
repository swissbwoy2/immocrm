import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Home, Square, ThumbsUp, ThumbsDown, Minus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  }, [user]);

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
        bgColor: 'bg-green-50 dark:bg-green-950'
      },
      neutre: { 
        icon: Minus, 
        label: 'Avis neutre', 
        variant: 'secondary' as const,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-950'
      },
      deconseille: { 
        icon: ThumbsDown, 
        label: 'Non recommandé', 
        variant: 'destructive' as const,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950'
      }
    }[recommandation];
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Visites déléguées</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Suivez les visites que votre agent effectue pour vous
          </p>
        </div>

        {/* Visites en attente de confirmation */}
        {visitesEnAttente.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-5 w-5" />
              En attente de confirmation
              <Badge variant="secondary">{visitesEnAttente.length}</Badge>
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              Votre agent n'a pas encore confirmé ces demandes de visites
            </p>
            <div className="grid gap-4">
              {visitesEnAttente.map(visite => (
                <Card key={visite.id} className="border-amber-300 dark:border-amber-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Demandée le {new Date(visite.created_at).toLocaleDateString('fr-CH')}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        En attente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visite.offres && (
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.surface} m²</span>
                        </div>
                        <div className="text-primary font-semibold">
                          CHF {visite.offres.prix?.toLocaleString()}/mois
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-3">
                      ⏳ Votre agent va bientôt confirmer cette demande
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites confirmées */}
        {visitesConfirmees.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <CheckCircle className="h-5 w-5" />
              Visites programmées
              <Badge variant="secondary">{visitesConfirmees.length}</Badge>
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Votre agent va effectuer ces visites pour vous
            </p>
            <div className="grid gap-4">
              {visitesConfirmees.map(visite => (
                <Card key={visite.id} className="border-blue-300 dark:border-blue-700">
                  <CardHeader>
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
                      <Badge className="bg-blue-600">
                        Confirmée
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visite.offres && (
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.surface} m²</span>
                        </div>
                        <div className="text-primary font-semibold">
                          CHF {visite.offres.prix?.toLocaleString()}/mois
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
                      ✅ Votre agent effectuera la visite et vous partagera son feedback
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites refusées */}
        {visitesRefusees.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Non disponibles
              <Badge variant="secondary">{visitesRefusees.length}</Badge>
            </h2>
            <div className="grid gap-4">
              {visitesRefusees.map(visite => (
                <Card key={visite.id} className="opacity-75">
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
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1">
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
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Visites effectuées
            <Badge variant="secondary">{visitesEffectuees.length}</Badge>
          </h2>
          {visitesEffectuees.length > 0 ? (
            <div className="grid gap-4">
              {visitesEffectuees.map(visite => {
                const recommandationConfig = getRecommandationConfig(visite.recommandation_agent);
                const Icon = recommandationConfig?.icon;

                return (
                  <Card key={visite.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{visite.adresse}</CardTitle>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Visitée le {new Date(visite.updated_at).toLocaleDateString('fr-CH')}
                          </div>
                        </div>
                        <Badge variant="default">Effectuée</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {visite.offres && (
                        <div className="flex items-center gap-4 text-sm pb-3 border-b flex-wrap">
                          <div className="flex items-center gap-1">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>{visite.offres.pieces} pièces</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Square className="h-4 w-4 text-muted-foreground" />
                            <span>{visite.offres.surface} m²</span>
                          </div>
                          <div className="text-primary font-semibold">
                            CHF {visite.offres.prix?.toLocaleString()}/mois
                          </div>
                        </div>
                      )}

                      {visite.recommandation_agent && recommandationConfig && Icon && (
                        <div className={`p-4 rounded-lg ${recommandationConfig.bgColor}`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${recommandationConfig.color}`} />
                            <span className="font-semibold">{recommandationConfig.label}</span>
                          </div>
                        </div>
                      )}

                      {visite.feedback_agent && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MessageSquare className="h-4 w-4" />
                            <span>Feedback de votre agent</span>
                          </div>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm whitespace-pre-line">{visite.feedback_agent}</p>
                          </div>
                        </div>
                      )}

                      {visite.offres && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate('/client/offres-recues')}
                        >
                          Voir l'offre complète
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="mb-4">Aucune visite déléguée effectuée pour le moment</p>
                <Button onClick={() => navigate('/client/offres-recues')}>
                  Voir mes offres
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Message si aucune visite */}
        {visites.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="mb-4">Vous n'avez pas encore délégué de visites à votre agent</p>
              <p className="text-sm mb-4">
                Lorsque vous recevez une offre, vous pouvez demander à votre agent d'effectuer la visite pour vous
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