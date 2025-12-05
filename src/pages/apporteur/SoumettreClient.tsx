import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function SoumettreClient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apporteurId, setApporteurId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_nom: '',
    client_prenom: '',
    client_telephone: '',
    client_email: '',
    lieu_situation: '',
    type_affaire: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadApporteurId();
    }
  }, [user]);

  const loadApporteurId = async () => {
    const { data, error } = await supabase
      .from('apporteurs')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setApporteurId(data.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apporteurId) {
      toast.error('Erreur: Apporteur non trouvé');
      return;
    }

    if (!formData.client_nom || !formData.client_telephone || !formData.lieu_situation || !formData.type_affaire) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('referrals')
        .insert({
          apporteur_id: apporteurId,
          client_nom: formData.client_nom,
          client_prenom: formData.client_prenom,
          client_telephone: formData.client_telephone,
          client_email: formData.client_email,
          lieu_situation: formData.lieu_situation,
          type_affaire: formData.type_affaire,
          notes: formData.notes,
          statut: 'soumis',
        });

      if (error) throw error;

      toast.success('Client soumis avec succès !');
      navigate('/apporteur/mes-referrals');
    } catch (error) {
      console.error('Error submitting client:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/apporteur')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Soumettre un client</h1>
          <p className="text-muted-foreground">
            Remplissez les coordonnées du client que vous souhaitez référer (Article 1)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Coordonnées du client
          </CardTitle>
          <CardDescription>
            Les champs marqués d'un * sont obligatoires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_nom">Nom *</Label>
                <Input
                  id="client_nom"
                  value={formData.client_nom}
                  onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                  placeholder="Nom du client"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_prenom">Prénom</Label>
                <Input
                  id="client_prenom"
                  value={formData.client_prenom}
                  onChange={(e) => setFormData({ ...formData, client_prenom: e.target.value })}
                  placeholder="Prénom du client"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_telephone">Téléphone *</Label>
                <Input
                  id="client_telephone"
                  type="tel"
                  value={formData.client_telephone}
                  onChange={(e) => setFormData({ ...formData, client_telephone: e.target.value })}
                  placeholder="+41 XX XXX XX XX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lieu_situation">Lieu de situation du bien *</Label>
              <Input
                id="lieu_situation"
                value={formData.lieu_situation}
                onChange={(e) => setFormData({ ...formData, lieu_situation: e.target.value })}
                placeholder="Adresse ou localité du bien concerné"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type_affaire">Type d'affaire *</Label>
              <Select
                value={formData.type_affaire}
                onValueChange={(value) => setFormData({ ...formData, type_affaire: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type d'affaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vente">Vente (client vendeur)</SelectItem>
                  <SelectItem value="achat">Achat (client acheteur)</SelectItem>
                  <SelectItem value="location">Location (client locataire)</SelectItem>
                  <SelectItem value="mise_en_location">Mise en location (client propriétaire)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes complémentaires</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations supplémentaires sur le client ou le bien..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Soumission...' : 'Soumettre le client'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/apporteur')}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Rappel</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            En soumettant ce client, vous certifiez qu'il s'agit d'un contact que vous avez identifié 
            et qui souhaite vendre, acheter, louer ou mettre en location un bien immobilier.
          </p>
          <p>
            Votre commission sera calculée selon les termes de votre contrat d'apporteur d'affaires 
            dès la conclusion de l'affaire.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
