import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, Phone, MapPin, Calendar, Users, DollarSign, 
  Home, Building2, Briefcase, Heart, Car 
} from 'lucide-react';
import { getCurrentUser } from '@/utils/localStorage';
import { getClients } from '@/utils/localStorage';
import { Client } from '@/data/mockData';
import { calculateMandateDuration } from '@/utils/calculations';

export default function Dossier() {
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'client') {
      navigate('/login');
      return;
    }

    const clients = getClients();
    const userClient = clients.find(c => c.id === currentUser.clientId);
    
    if (userClient) {
      setClient(userClient);
    }
  }, [currentUser, navigate]);

  if (!client) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement...</p>
        </main>
      </div>
    );
  }

  const { daysElapsed, daysRemaining, progressPercentage } = calculateMandateDuration(client.dateInscription);
  const budgetRecommande = Math.round(client.revenuMensuel / 3);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">
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
                <span>Début: {new Date(client.dateInscription).toLocaleDateString('fr-CH')}</span>
                <span>Fin: {new Date(new Date(client.dateInscription).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CH')}</span>
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
                  <p className="text-2xl font-bold">{client.revenuMensuel.toLocaleString('fr-CH')} CHF</p>
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
                  <p className="text-2xl font-bold">{client.budgetMax.toLocaleString('fr-CH')} CHF</p>
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
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{client.telephone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="font-medium">{client.adresse}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date de naissance</p>
                    <p className="font-medium">{new Date(client.dateNaissance).toLocaleDateString('fr-CH')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">État civil</p>
                    <p className="font-medium">{client.etatCivil}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nationalité / Permis</p>
                    <p className="font-medium">{client.nationalite} • {client.typePermis}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Situation actuelle */}
          <div>
            <h2 className="text-xl font-semibold mb-4">🏠 Situation actuelle</h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Gérance actuelle</p>
                  <p className="font-medium">{client.geranceActuelle || 'Non renseigné'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Contact gérance</p>
                  <p className="font-medium">{client.contactGerance || 'Non renseigné'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Loyer actuel</p>
                  <p className="font-medium">{client.loyerActuel.toLocaleString('fr-CH')} CHF</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Depuis le</p>
                  <p className="font-medium">{client.depuisLe ? new Date(client.depuisLe).toLocaleDateString('fr-CH') : 'Non renseigné'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Nombre de pièces actuel</p>
                  <p className="font-medium">{client.nombrePiecesActuel} pièces</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Motif du changement</p>
                  <p className="font-medium">{client.motifChangement}</p>
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
                    <p className="font-medium">{client.profession}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Employeur</p>
                  <p className="font-medium">{client.employeur}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Date d'engagement</p>
                  <p className="font-medium">{client.dateEngagement ? new Date(client.dateEngagement).toLocaleDateString('fr-CH') : 'Non renseigné'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Revenu mensuel net</p>
                  <p className="font-medium">{client.revenuMensuel.toLocaleString('fr-CH')} CHF</p>
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
                    <p className="text-sm text-muted-foreground">Type de recherche</p>
                    <p className="font-medium">{client.typeRecherche}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Type de bien</p>
                    <p className="font-medium">{client.typeBien}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Nombre de pièces souhaité</p>
                    <p className="font-medium">{client.nombrePiecesSouhaite} pièces</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Budget maximum</p>
                    <p className="font-medium">{client.budgetMax.toLocaleString('fr-CH')} CHF</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Régions recherchées</p>
                  <div className="flex flex-wrap gap-2">
                    {client.regions.map((region, index) => (
                      <Badge key={index} variant="secondary">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Animaux</p>
                      <Badge variant={client.animaux ? "default" : "secondary"}>
                        {client.animaux ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Véhicules</p>
                      <Badge variant={client.vehicules ? "default" : "secondary"}>
                        {client.vehicules ? `Oui (${client.numeroPlaques})` : 'Non'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {client.souhaitsParticuliers && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Souhaits particuliers</p>
                    <p className="font-medium p-4 bg-muted rounded-lg">{client.souhaitsParticuliers}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
