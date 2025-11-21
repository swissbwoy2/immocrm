import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, 
  FileText, User, Send, TrendingUp, Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateDaysElapsed } from '@/utils/calculations';
import { Progress } from '@/components/ui/progress';

interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  autres_credits?: boolean;
  apport_personnel?: number;
  commission_split?: number;
  secteur_activite?: string;
  etat_avancement?: string;
  priorite?: string;
  note_agent?: string;
  statut?: string;
  nationalite?: string;
  type_permis?: string;
  residence?: string;
  garanties?: string;
  region_recherche?: string;
  situation_familiale?: string;
  situation_financiere?: string;
  profession?: string;
  type_bien?: string;
  source_revenus?: string;
  anciennete_mois?: number;
  created_at?: string;
  date_ajout?: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadClientData();
  }, [id, user, navigate]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      // Load client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Load client profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load offers for this client
      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', id)
        .order('date_envoi', { ascending: false });

      if (offresError) throw offresError;
      setOffres(offresData || []);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du client',
        variant: 'destructive',
      });
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
        description: 'Le statut de l\'offre a été modifié',
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

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      'envoyee': 'Envoyée',
      'vue': 'Vue',
      'interesse': 'Intéressé',
      'visite_planifiee': 'Visite planifiée',
      'visite_effectuee': 'Visite effectuée',
      'candidature_deposee': 'Candidature déposée',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée',
    };
    return labels[statut] || statut;
  };

  const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
    if (statut === 'acceptee') return 'default';
    if (statut === 'refusee') return 'destructive';
    if (statut === 'envoyee') return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Client non trouvé</h2>
          <Button onClick={() => navigate('/agent/mes-clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux clients
          </Button>
        </div>
      </div>
    );
  }

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = 90 - daysElapsed;
  const progressPercentage = (daysElapsed / 90) * 100;
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                {profile.prenom} {profile.nom}
              </h1>
              <Badge variant="outline">{client.nationalite || 'N/A'}</Badge>
              <Badge variant="secondary">Permis {client.type_permis || 'N/A'}</Badge>
            </div>

            {/* Progress bar */}
            <div className="mt-4 max-w-2xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Progression du mandat</p>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  daysElapsed < 60 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : daysElapsed < 90 
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {Math.floor(daysRemaining)}j {Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)}h
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-right mb-2">
                {Math.floor(daysElapsed)} / 90 jours
              </p>
              <Progress 
                value={progressPercentage} 
                className="h-3" 
                indicatorClassName={
                  daysElapsed < 60 ? 'bg-green-500' :
                  daysElapsed < 90 ? 'bg-orange-500' :
                  'bg-red-500'
                }
              />
            </div>
          </div>

          <Button variant="outline" onClick={() => navigate('/agent/mes-clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          <Badge variant={client.statut === 'actif' ? 'default' : 'secondary'}>
            {client.statut || 'Actif'}
          </Badge>
          <Badge variant="outline">{client.priorite || 'Moyenne'}</Badge>
          {client.etat_avancement && (
            <Badge variant="secondary">{client.etat_avancement}</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.telephone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{client.residence || 'Non renseigné'}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Situation familiale</p>
                  <p className="font-medium">{client.situation_familiale || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profession</p>
                  <p className="font-medium">{client.profession || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations financières */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Informations financières
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus mensuels</p>
                  <p className="font-medium text-lg">
                    CHF {client.revenus_mensuels?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Charges mensuelles</p>
                  <p className="font-medium text-lg">
                    CHF {client.charges_mensuelles?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Budget maximum</p>
                  <p className="font-medium text-lg text-primary">
                    CHF {client.budget_max?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget recommandé</p>
                  <p className="font-medium text-lg text-green-600">
                    CHF {budgetRecommande.toLocaleString()}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Apport personnel</p>
                <p className="font-medium text-lg">
                  CHF {client.apport_personnel?.toLocaleString() || '0'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recherche immobilière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Recherche immobilière
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type de bien</p>
                  <p className="font-medium">{client.type_bien || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre de pièces</p>
                  <p className="font-medium">{client.pieces || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Région de recherche</p>
                <p className="font-medium">{client.region_recherche || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Type de contrat</p>
                <Badge>{client.type_contrat || 'Location'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Suivi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Suivi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Commission split</p>
                <p className="font-medium">{client.commission_split || 50}%</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Date d'ajout</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}
                  </span>
                </div>
              </div>
              {client.note_agent && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{client.note_agent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offres envoyées */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5" />
              Offres envoyées ({offres.length})
            </h2>
            <Button onClick={() => navigate(`/agent/envoyer-offre?clientId=${client.id}`)}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer une offre
            </Button>
          </div>

          {offres.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offres.map((offre) => (
                <Card key={offre.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{offre.adresse}</CardTitle>
                      <Badge variant={getStatutBadgeVariant(offre.statut)}>
                        {getStatutLabel(offre.statut)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prix</span>
                        <span className="font-medium">{offre.prix.toLocaleString('fr-CH')} CHF</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Surface</span>
                        <span className="font-medium">{offre.surface || 'N/A'} m²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pièces</span>
                        <span className="font-medium">{offre.pieces || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date d'envoi</span>
                        <span className="font-medium">
                          {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune offre envoyée pour le moment
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
