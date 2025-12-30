import { useEffect, useState } from 'react';
import { Settings, User, Bell, Shield, CreditCard, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PremiumPageHeader } from '@/components/premium';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Parametres() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [proprietaire, setProprietaire] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      const { data: proprioData } = await supabase
        .from('proprietaires')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProprietaire(proprioData);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          prenom: profile.prenom,
          nom: profile.nom,
          telephone: profile.telephone
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profil mis à jour');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProprietaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proprietaire) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('proprietaires')
        .update({
          adresse: proprietaire.adresse,
          code_postal: proprietaire.code_postal,
          ville: proprietaire.ville,
          telephone: proprietaire.telephone,
          iban: proprietaire.iban,
          nom_banque: proprietaire.nom_banque,
          titulaire_compte: proprietaire.titulaire_compte
        })
        .eq('id', proprietaire.id);

      if (error) throw error;
      toast.success('Informations mises à jour');
    } catch (error) {
      console.error('Error updating proprietaire:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Paramètres"
        subtitle="Gérez votre compte et vos préférences"
        icon={Settings}
      />

      <Tabs defaultValue="profil" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profil" className="gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="securite" className="gap-2">
            <Shield className="w-4 h-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="bancaire" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Bancaire
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Mettez à jour vos informations de contact</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={profile?.prenom || ''}
                      onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={profile?.nom || ''}
                      onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={profile?.telephone || ''}
                    onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {proprietaire && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Adresse de correspondance</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProprietaire} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse</Label>
                    <Input
                      id="adresse"
                      value={proprietaire?.adresse || ''}
                      onChange={(e) => setProprietaire({ ...proprietaire, adresse: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code_postal">Code postal</Label>
                      <Input
                        id="code_postal"
                        value={proprietaire?.code_postal || ''}
                        onChange={(e) => setProprietaire({ ...proprietaire, code_postal: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ville">Ville</Label>
                      <Input
                        id="ville"
                        value={proprietaire?.ville || ''}
                        onChange={(e) => setProprietaire({ ...proprietaire, ville: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="securite" className="space-y-6">
          <ChangePasswordCard />

          {/* Supprimer le compte */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Zone de danger
              </CardTitle>
              <CardDescription>
                Supprimer définitivement votre compte et toutes vos données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteAccountDialog userType="proprietaire" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bancaire">
          {proprietaire && (
            <Card>
              <CardHeader>
                <CardTitle>Coordonnées bancaires</CardTitle>
                <CardDescription>Pour le versement des loyers et commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProprietaire} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={proprietaire?.iban || ''}
                      onChange={(e) => setProprietaire({ ...proprietaire, iban: e.target.value })}
                      placeholder="CH93 0076 2011 6238 5295 7"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nom_banque">Nom de la banque</Label>
                    <Input
                      id="nom_banque"
                      value={proprietaire?.nom_banque || ''}
                      onChange={(e) => setProprietaire({ ...proprietaire, nom_banque: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="titulaire">Titulaire du compte</Label>
                    <Input
                      id="titulaire"
                      value={proprietaire?.titulaire_compte || ''}
                      onChange={(e) => setProprietaire({ ...proprietaire, titulaire_compte: e.target.value })}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notifications</CardTitle>
              <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications par email</p>
                  <p className="text-sm text-muted-foreground">Recevoir les alertes par email</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nouveaux tickets</p>
                  <p className="text-sm text-muted-foreground">Être notifié des nouveaux tickets techniques</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Paiements en retard</p>
                  <p className="text-sm text-muted-foreground">Alerte pour les loyers impayés</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Baux arrivant à échéance</p>
                  <p className="text-sm text-muted-foreground">Rappel avant fin de bail</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
