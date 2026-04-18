import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Send, Home, Calendar, User, Mail, Phone, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  // Bien
  type_bien: z.string().min(1, 'Sélectionnez le type de bien'),
  adresse: z.string().min(2, 'Adresse requise'),
  npa: z.string().optional(),
  ville: z.string().min(2, 'Ville requise'),
  nombre_pieces: z.string().min(1, 'Indiquez le nombre de pièces'),
  surface: z.string().optional(),
  loyer_actuel: z.string().min(1, 'Indiquez le loyer'),
  charges: z.string().optional(),
  date_disponibilite: z.string().min(1, 'Date de disponibilité requise'),
  description: z.string().optional(),
  // Contact
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Téléphone invalide'),
  // Compte
  password: z.string().min(8, 'Au moins 8 caractères'),
});

type FormData = z.infer<typeof schema>;

export default function FormulaireRelouer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const totalSteps = 3;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Formulaire — Relouer mon appartement";
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const next = async () => {
    const fields: (keyof FormData)[][] = [
      ['type_bien', 'adresse', 'ville', 'nombre_pieces', 'loyer_actuel', 'date_disponibilite'],
      ['prenom', 'nom', 'email', 'telephone'],
      ['password'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep(s => Math.min(s + 1, totalSteps));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: data.prenom,
            last_name: data.nom,
            phone: data.telephone,
            user_type: 'proprietaire_bailleur',
          },
        },
      });
      if (authError) throw authError;

      // Insert lead
      const { error: leadError } = await supabase.from('leads').insert({
        first_name: data.prenom,
        last_name: data.nom,
        email: data.email,
        phone: data.telephone,
        source: 'relouer-mon-appartement',
        notes: JSON.stringify({
          type_bien: data.type_bien,
          adresse: data.adresse,
          npa: data.npa,
          ville: data.ville,
          nombre_pieces: data.nombre_pieces,
          surface: data.surface,
          loyer_actuel: data.loyer_actuel,
          charges: data.charges,
          date_disponibilite: data.date_disponibilite,
          description: data.description,
        }),
      });
      if (leadError) console.warn('Lead insert warning:', leadError);

      toast.success('Demande envoyée ! Vérifiez votre email pour confirmer votre compte.');
      navigate('/inscription-validee');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/relouer-mon-appartement')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Trouver un repreneur pour mon bail
          </h1>
          <p className="text-muted-foreground">Étape {step} sur {totalSteps}</p>
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-2xl border border-border/40 p-6 md:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Votre bien</h2>
                </div>

                <div>
                  <Label>Type de bien *</Label>
                  <Select onValueChange={(v) => setValue('type_bien', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appartement">Appartement</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Maison">Maison</SelectItem>
                      <SelectItem value="Loft">Loft</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type_bien && <p className="text-xs text-destructive mt-1">{errors.type_bien.message}</p>}
                </div>

                <div>
                  <Label>Adresse *</Label>
                  <Input {...register('adresse')} placeholder="Rue et numéro" />
                  {errors.adresse && <p className="text-xs text-destructive mt-1">{errors.adresse.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NPA</Label>
                    <Input {...register('npa')} placeholder="1000" />
                  </div>
                  <div>
                    <Label>Ville *</Label>
                    <Input {...register('ville')} placeholder="Lausanne" />
                    {errors.ville && <p className="text-xs text-destructive mt-1">{errors.ville.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nb de pièces *</Label>
                    <Input {...register('nombre_pieces')} type="number" step="0.5" placeholder="3.5" />
                    {errors.nombre_pieces && <p className="text-xs text-destructive mt-1">{errors.nombre_pieces.message}</p>}
                  </div>
                  <div>
                    <Label>Surface (m²)</Label>
                    <Input {...register('surface')} type="number" placeholder="80" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Loyer net (CHF) *</Label>
                    <Input {...register('loyer_actuel')} type="number" placeholder="1800" />
                    {errors.loyer_actuel && <p className="text-xs text-destructive mt-1">{errors.loyer_actuel.message}</p>}
                  </div>
                  <div>
                    <Label>Charges (CHF)</Label>
                    <Input {...register('charges')} type="number" placeholder="200" />
                  </div>
                </div>

                <div>
                  <Label>Disponible à partir du *</Label>
                  <Input {...register('date_disponibilite')} type="date" />
                  {errors.date_disponibilite && <p className="text-xs text-destructive mt-1">{errors.date_disponibilite.message}</p>}
                </div>

                <div>
                  <Label>Description (optionnel)</Label>
                  <Textarea {...register('description')} placeholder="Atouts, équipements, étage, balcon..." rows={3} />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Vos coordonnées</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom *</Label>
                    <Input {...register('prenom')} />
                    {errors.prenom && <p className="text-xs text-destructive mt-1">{errors.prenom.message}</p>}
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input {...register('nom')} />
                    {errors.nom && <p className="text-xs text-destructive mt-1">{errors.nom.message}</p>}
                  </div>
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input {...register('email')} type="email" placeholder="vous@exemple.ch" />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label>Téléphone *</Label>
                  <Input {...register('telephone')} type="tel" placeholder="+41 79 123 45 67" />
                  {errors.telephone && <p className="text-xs text-destructive mt-1">{errors.telephone.message}</p>}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Création de votre compte</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Créez un mot de passe pour suivre votre dossier et échanger avec votre conseiller.
                </p>

                <div>
                  <Label>Mot de passe *</Label>
                  <Input {...register('password')} type="password" placeholder="8 caractères minimum" />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  En soumettant ce formulaire, vous acceptez d'être recontacté par Immo-Rama dans le cadre de votre demande.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
            )}
            <div className="ml-auto">
              {step < totalSteps && (
                <Button type="button" onClick={next}>
                  Suivant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {step === totalSteps && (
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Envoyer ma demande
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
