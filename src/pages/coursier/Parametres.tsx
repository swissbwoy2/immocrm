import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2, User, Phone, Mail, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';

export default function CoursierParametres() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    iban: '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('coursiers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setForm({
          prenom: data.prenom || '',
          nom: data.nom || '',
          telephone: data.telephone || '',
          email: data.email || user.email || '',
          iban: data.iban || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('coursiers')
        .update({
          prenom: form.prenom,
          nom: form.nom,
          telephone: form.telephone,
          email: form.email,
          iban: form.iban,
        })
        .eq('user_id', user!.id);

      if (error) throw error;
      toast.success('Paramètres enregistrés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        </div>
        <PremiumPageHeader
          icon={Settings}
          title="Paramètres"
          subtitle="Gérez vos informations personnelles et de paiement"
        />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="prenom"
                    value={form.prenom}
                    onChange={(e) => setForm(prev => ({ ...prev, prenom: e.target.value }))}
                    className="pl-10"
                    placeholder="Votre prénom"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telephone"
                  value={form.telephone}
                  onChange={(e) => setForm(prev => ({ ...prev, telephone: e.target.value }))}
                  className="pl-10"
                  placeholder="+41 XX XXX XX XX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  placeholder="votre@email.ch"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN (pour le paiement)</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="iban"
                  value={form.iban}
                  onChange={(e) => setForm(prev => ({ ...prev, iban: e.target.value }))}
                  className="pl-10"
                  placeholder="CH93 0076 2011 6238 5295 7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Votre IBAN sera utilisé pour le versement de vos rémunérations</p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
