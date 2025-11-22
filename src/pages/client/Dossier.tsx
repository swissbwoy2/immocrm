import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, Phone, MapPin, Calendar, Users, DollarSign, 
  Home, Building2, Briefcase, Heart, Car 
} from 'lucide-react';
import { calculateMandateDuration } from '@/utils/calculations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Dossier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !client || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { daysElapsed, daysRemaining, progressPercentage } = calculateMandateDuration(client.date_ajout || client.created_at);
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Mon dossier</h1>
            <p className="text-muted-foreground">Toutes vos informations personnelles</p>
          </div>

          {/* Barre de progression du mandat */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Progression du mandat</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {daysElapsed} jours écoulés sur 90
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{daysRemaining}</p>
                  <p className="text-sm text-muted-foreground">jours restants</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Début: {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</span>
                <span>Fin: {new Date(new Date(client.date_ajout || client.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CH')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Situation financière */}
          <div>
            <h2 className="text-xl font-semibold mb-4">💰 Situation financière</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm">Revenu mensuel</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm">Budget maximum</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(client.budget_max || 0).toLocaleString('fr-CH')} CHF</p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-sm">Budget recommandé</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {budgetRecommande.toLocaleString('fr-CH')} CHF
                  </p>
                  <Badge variant="secondary" className="mt-1">Règle du tiers</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Informations personnelles */}
          <div>
            <h2 className="text-xl font-semibold mb-4">👤 Informations personnelles</h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{profile.telephone || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Situation familiale</p>
                    <p className="font-medium">{client.situation_familiale || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nationalité / Permis</p>
                    <p className="font-medium">{client.nationalite || 'Non renseigné'} • {client.type_permis || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Situation professionnelle */}
          <div>
            <h2 className="text-xl font-semibold mb-4">💼 Situation professionnelle</h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Profession</p>
                    <p className="font-medium">{client.profession || 'Non renseigné'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Secteur d'activité</p>
                  <p className="font-medium">{client.secteur_activite || 'Non renseigné'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Revenu mensuel net</p>
                  <p className="font-medium">{(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critères de recherche */}
          <div>
            <h2 className="text-xl font-semibold mb-4">🔍 Critères de recherche</h2>
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Type de bien</p>
                    <p className="font-medium">{client.type_bien || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Nombre de pièces souhaité</p>
                    <p className="font-medium">{client.pieces || 'Non renseigné'} pièces</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Budget maximum</p>
                    <p className="font-medium">{(client.budget_max || 0).toLocaleString('fr-CH')} CHF</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Région recherchée</p>
                    <p className="font-medium">{client.region_recherche || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
