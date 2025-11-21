import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface Agent {
  id: string;
  profile: Profile;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [id]);

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

      // Load agent if assigned
      if (clientData.agent_id) {
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id, user_id, profiles!inner(*)')
          .eq('id', clientData.agent_id)
          .single();

        if (agentError) {
          console.error('Error loading agent:', agentError);
        } else {
          setAgent({
            id: agentData.id,
            profile: agentData.profiles as unknown as Profile,
          });
        }
      }
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
          <Button onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {profile.prenom} {profile.nom}
            </h1>
            <p className="text-muted-foreground">Détails du client</p>
          </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Prénom</p>
                  <p className="font-medium">{profile.prenom}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{profile.nom}</p>
                </div>
              </div>
              <Separator />
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
                  <span>{client.nationalite || 'Non renseigné'}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Situation familiale</p>
                  <p className="font-medium">{client.situation_familiale || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de permis</p>
                  <p className="font-medium">{client.type_permis || 'Non renseigné'}</p>
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
                  <p className="text-sm text-muted-foreground">Apport personnel</p>
                  <p className="font-medium text-lg">
                    CHF {client.apport_personnel?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Situation financière</p>
                  <p className="font-medium">{client.situation_financiere || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profession</p>
                  <p className="font-medium">{client.profession || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Autres crédits</p>
                  <Badge variant={client.autres_credits ? 'destructive' : 'default'}>
                    {client.autres_credits ? 'Oui' : 'Non'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recherche immobilière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
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

          {/* Agent et suivi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Agent et suivi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Agent assigné</p>
                    <p className="font-medium">
                      {agent.profile.prenom} {agent.profile.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">{agent.profile.email}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Commission split</p>
                    <p className="font-medium">{client.commission_split || 50}%</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Aucun agent assigné</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate('/admin/assignations')}
                  >
                    Assigner un agent
                  </Button>
                </div>
              )}
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
                    <p className="text-sm text-muted-foreground mb-2">Notes de l'agent</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{client.note_agent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
