import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, CreditCard, Save } from 'lucide-react';

interface ApporteurProfile {
  id: string;
  civilite: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  iban: string | null;
  nom_banque: string | null;
  titulaire_compte: string | null;
  bic_swift: string | null;
  code_parrainage: string | null;
}

interface UserProfile {
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
}

export default function MonProfil() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [apporteur, setApporteur] = useState<ApporteurProfile | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, prenom, email, telephone')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load apporteur data
      const { data: apporteurData } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (apporteurData) {
        setApporteur(apporteurData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apporteur) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('apporteurs')
        .update({
          civilite: apporteur.civilite,
          adresse: apporteur.adresse,
          code_postal: apporteur.code_postal,
          ville: apporteur.ville,
          pays: apporteur.pays,
          telephone: apporteur.telephone,
          iban: apporteur.iban,
          nom_banque: apporteur.nom_banque,
          titulaire_compte: apporteur.titulaire_compte,
          bic_swift: apporteur.bic_swift,
        })
        .eq('id', apporteur.id);

      if (error) throw error;
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et bancaires
        </p>
      </div>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Vos informations de contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Civilité</Label>
              <Select
                value={apporteur?.civilite || ''}
                onValueChange={(value) => setApporteur(prev => prev ? { ...prev, civilite: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={profile?.prenom || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={profile?.nom || ''} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={apporteur?.telephone || ''}
                onChange={(e) => setApporteur(prev => prev ? { ...prev, telephone: e.target.value } : null)}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              value={apporteur?.adresse || ''}
              onChange={(e) => setApporteur(prev => prev ? { ...prev, adresse: e.target.value } : null)}
              placeholder="Rue et numéro"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Code postal</Label>
              <Input
                value={apporteur?.code_postal || ''}
                onChange={(e) => setApporteur(prev => prev ? { ...prev, code_postal: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={apporteur?.ville || ''}
                onChange={(e) => setApporteur(prev => prev ? { ...prev, ville: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input
                value={apporteur?.pays || 'Suisse'}
                onChange={(e) => setApporteur(prev => prev ? { ...prev, pays: e.target.value } : null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations bancaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informations bancaires
          </CardTitle>
          <CardDescription>
            Pour le versement de vos commissions (Article 9)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>IBAN *</Label>
            <Input
              value={apporteur?.iban || ''}
              onChange={(e) => setApporteur(prev => prev ? { ...prev, iban: e.target.value.toUpperCase() } : null)}
              placeholder="CH00 0000 0000 0000 0000 0"
            />
            <p className="text-xs text-muted-foreground">
              Format suisse: CH + 2 chiffres de contrôle + 17 caractères
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom de la banque</Label>
              <Input
                value={apporteur?.nom_banque || ''}
                onChange={(e) => setApporteur(prev => prev ? { ...prev, nom_banque: e.target.value } : null)}
                placeholder="Ex: PostFinance, UBS, Credit Suisse..."
              />
            </div>
            <div className="space-y-2">
              <Label>Titulaire du compte</Label>
              <Input
                value={apporteur?.titulaire_compte || ''}
                onChange={(e) => setApporteur(prev => prev ? { ...prev, titulaire_compte: e.target.value } : null)}
                placeholder="Nom tel qu'il apparaît sur le compte"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>BIC/SWIFT (optionnel)</Label>
            <Input
              value={apporteur?.bic_swift || ''}
              onChange={(e) => setApporteur(prev => prev ? { ...prev, bic_swift: e.target.value.toUpperCase() } : null)}
              placeholder="Ex: POFICHBEXXX"
            />
          </div>
        </CardContent>
      </Card>

      {/* Code parrainage (lecture seule) */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Code parrainage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <code className="bg-background px-4 py-2 rounded-lg font-mono text-lg">
              {apporteur?.code_parrainage}
            </code>
            <p className="text-sm text-muted-foreground">
              Ce code est unique et ne peut pas être modifié
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  );
}
