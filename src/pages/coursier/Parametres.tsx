import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, User, Phone, Mail, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DASH_CARD, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';

export default function CoursierParametres() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Section dont le bouton « Enregistrer » a été pressé (affichage du chargement). */
  const [sectionEnCours, setSectionEnCours] = useState<'profil' | 'paiement' | null>(null);
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

      if (error) throw error; await supabase.from('profiles').update({ prenom: form.prenom, nom: form.nom, telephone: form.telephone }).eq('id', user!.id);
      toast.success('Paramètres enregistrés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashPage>
        <div className="mx-auto max-w-2xl animate-pulse space-y-4" role="status" aria-label="Chargement des paramètres">
          <div className="h-8 w-44 rounded-lg bg-muted" />
          <div className="h-72 rounded-2xl bg-muted" />
        </div>
      </DashPage>
    );
  }

  const LABEL = 'text-sm font-medium text-foreground';

  return (
    <DashPage>
      <div className="mx-auto max-w-2xl space-y-5">
      <DashPageHeader
        title="Paramètres"
        subtitle="Vos coordonnées et votre compte de versement"
      />

      <section className={`${DASH_CARD} p-5 sm:p-6`} aria-labelledby="coursier-param-profil">
        <h2 id="coursier-param-profil" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <User className="h-5 w-5 text-primary" />
          Informations personnelles
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prenom" className={LABEL}>Prénom</Label>
            <Input
              id="prenom"
              value={form.prenom}
              onChange={(e) => setForm(prev => ({ ...prev, prenom: e.target.value }))}
              className="h-11 text-base md:text-sm"
              placeholder="Votre prénom"
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nom" className={LABEL}>Nom</Label>
            <Input
              id="nom"
              value={form.nom}
              onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
              className="h-11 text-base md:text-sm"
              placeholder="Votre nom"
              autoComplete="family-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telephone" className={`flex items-center gap-1.5 ${LABEL}`}><Phone className="h-4 w-4" /> Téléphone</Label>
            <Input
              id="telephone"
              type="tel"
              value={form.telephone}
              onChange={(e) => setForm(prev => ({ ...prev, telephone: e.target.value }))}
              className="h-11 text-base md:text-sm"
              placeholder="+41 XX XXX XX XX"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={`flex items-center gap-1.5 ${LABEL}`}><Mail className="h-4 w-4" /> Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="h-11 text-base md:text-sm"
              placeholder="votre@email.ch"
              autoComplete="email"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end border-t border-border/60 pt-4">
          <Button onClick={() => { setSectionEnCours('profil'); handleSave(); }} disabled={saving} className="h-12 w-full px-6 sm:h-11 sm:w-auto">
            {saving && sectionEnCours === 'profil' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer mes informations
          </Button>
        </div>
      </section>

      <section className={`${DASH_CARD} p-5 sm:p-6`} aria-labelledby="coursier-param-paiement">
        <h2 id="coursier-param-paiement" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          Paiement
        </h2>
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="iban" className={LABEL}>IBAN (pour le paiement)</Label>
          <Input
            id="iban"
            value={form.iban}
            onChange={(e) => setForm(prev => ({ ...prev, iban: e.target.value }))}
            className="h-11 font-mono text-base md:text-sm"
            placeholder="CH93 0076 2011 6238 5295 7"
          />
          <p className="text-sm text-muted-foreground">Votre IBAN sera utilisé pour le versement de vos rémunérations.</p>
        </div>
        <div className="mt-5 flex justify-end border-t border-border/60 pt-4">
          <Button onClick={() => { setSectionEnCours('paiement'); handleSave(); }} disabled={saving} className="h-12 w-full px-6 sm:h-11 sm:w-auto">
            {saving && sectionEnCours === 'paiement' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer le paiement
          </Button>
        </div>
      </section>
      </div>
    </DashPage>
  );
}
