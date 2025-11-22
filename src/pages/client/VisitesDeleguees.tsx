import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Home, Square, ThumbsUp, ThumbsDown, Minus, MessageSquare } from 'lucide-react';
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

  const visitesEnAttente = visites.filter(v => v.statut === 'planifiee');
  const visitesEffectuees = visites.filter(v => v.statut === 'effectuee');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Visites déléguées</h1>
          <p className="text-muted-foreground">
            Historique des visites effectuées par votre agent
          </p>
        </div>

        {/* Visites en attente */}
        {visitesEnAttente.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">⏳ En attente du feedback de l'agent</h2>
            <div className="grid gap-4">
              {visitesEnAttente.map(visite => (
                <Card key={visite.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Demandée le {new Date(visite.created_at).toLocaleDateString('fr-CH')}
                        </div>
                      </div>
                      <Badge variant="secondary">En cours</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visite.offres && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.pieces} pièces</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.offres.surface} m²</span>
                        </div>
                        <div className="text-primary font-semibold">
                          CHF {visite.offres.prix.toLocaleString()}/mois
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-3">
                      🤝 Votre agent effectuera la visite et vous partagera son feedback
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites effectuées avec feedback */}
        <div>
          <h2 className="text-xl font-semibold mb-4">✅ Visites effectuées</h2>
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
                          <CardTitle>{visite.adresse}</CardTitle>
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
                        <div className="flex items-center gap-4 text-sm pb-3 border-b">
                          <div className="flex items-center gap-1">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>{visite.offres.pieces} pièces</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Square className="h-4 w-4 text-muted-foreground" />
                            <span>{visite.offres.surface} m²</span>
                          </div>
                          <div className="text-primary font-semibold">
                            CHF {visite.offres.prix.toLocaleString()}/mois
                          </div>
                        </div>
                      )}

                      {visite.recommandation_agent && recommandationConfig && Icon && (
                        <div className={`p-4 rounded-lg ${recommandationConfig.bgColor}`}>
                          <div className="flex items-center gap-2 mb-2">
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
      </div>
    </div>
  );
}