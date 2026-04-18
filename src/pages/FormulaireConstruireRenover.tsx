import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Send, Hammer, User, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  type_projet: z.string().min(1, 'Sélectionnez le type de projet'),
  nature_travaux: z.string().min(1, 'Indiquez la nature des travaux'),
  adresse: z.string().min(2, 'Adresse requise'),
  npa: z.string().optional(),
  ville: z.string().min(2, 'Ville requise'),
  surface: z.string().optional(),
  budget: z.string().min(1, 'Indiquez votre budget'),
  delai: z.string().min(1, 'Indiquez le délai souhaité'),
  description: z.string().optional(),
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Téléphone invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

type FormData = z.infer<typeof schema>;

export default function FormulaireConstruireRenover() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const totalSteps = 3;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Formulaire — Construire & Rénover";
  }, []);

  const { register, handleSubmit, setValue, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const next = async () => {
    const fields: (keyof FormData)[][] = [
      ['type_projet', 'nature_travaux', 'adresse', 'ville', 'budget', 'delai'],
      ['prenom', 'nom', 'email', 'telephone'],
      ['password'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep(s => Math.min(s + 1, totalSteps));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: data.prenom,
            last_name: data.nom,
            phone: data.telephone,
            user_type: 'maitre_ouvrage',
          },
        },
      });
      if (authError) throw authError;

      const { error: leadError } = await supabase.from('leads').insert({
        first_name: data.prenom,
        last_name: data.nom,
        email: data.email,
        phone: data.telephone,
        source: 'construire-renover',
        notes: JSON.stringify({
          type_projet: data.type_projet,
          nature_travaux: data.nature_travaux,
          adresse: data.adresse,
          npa: data.npa,
          ville: data.ville,
          surface: data.surface,
          budget: data.budget,
          delai: data.delai,
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
        <Button variant="ghost" onClick={() => navigate('/construire-renover')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Mon projet construction / rénovation
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
                  <Hammer className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Votre projet</h2>
                </div>

                <div>
                  <Label>Type de projet *</Label>
                  <Select onValueChange={(v) => setValue('type_projet', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Construction neuve">Construction neuve</SelectItem>
                      <SelectItem value="Rénovation complète">Rénovation complète</SelectItem>
                      <SelectItem value="Rénovation partielle">Rénovation partielle</SelectItem>
                      <SelectItem value="Extension / Surélévation">Extension / Surélévation</SelectItem>
                      <SelectItem value="Aménagement intérieur">Aménagement intérieur</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type_projet && <p className="text-xs text-destructive mt-1">{errors.type_projet.message}</p>}
                </div>

                <div>
                  <Label>Nature des travaux *</Label>
                  <Select onValueChange={(v) => setValue('nature_travaux', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cuisine">Cuisine</SelectItem>
                      <SelectItem value="Salle de bain">Salle de bain</SelectItem>
                      <SelectItem value="Toiture">Toiture</SelectItem>
                      <SelectItem value="Façade / Isolation">Façade / Isolation</SelectItem>
                      <SelectItem value="Électricité / Plomberie">Électricité / Plomberie</SelectItem>
                      <SelectItem value="Gros œuvre">Gros œuvre</SelectItem>
                      <SelectItem value="Tout corps d'état">Tout corps d'état</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.nature_travaux && <p className="text-xs text-destructive mt-1">{errors.nature_travaux.message}</p>}
                </div>

                <div>
                  <Label>Adresse du chantier *</Label>
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
                    <Input {...register('ville')} />
                    {errors.ville && <p className="text-xs text-destructive mt-1">{errors.ville.message}</p>}
                  </div>
                </div>

                <div>
                  <Label>Surface concernée (m²)</Label>
                  <Input {...register('surface')} type="number" placeholder="120" />
                </div>

                <div>
                  <Label>Budget estimé *</Label>
                  <Select onValueChange={(v) => setValue('budget', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir une fourchette..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="< 50k">Moins de 50'000 CHF</SelectItem>
                      <SelectItem value="50k-150k">50'000 - 150'000 CHF</SelectItem>
                      <SelectItem value="150k-300k">150'000 - 300'000 CHF</SelectItem>
                      <SelectItem value="300k-500k">300'000 - 500'000 CHF</SelectItem>
                      <SelectItem value="500k-1M">500'000 - 1'000'000 CHF</SelectItem>
                      <SelectItem value="> 1M">Plus de 1'000'000 CHF</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget.message}</p>}
                </div>

                <div>
                  <Label>Délai souhaité de démarrage *</Label>
                  <Select onValueChange={(v) => setValue('delai', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immédiat">Dès que possible</SelectItem>
                      <SelectItem value="1-3 mois">1 à 3 mois</SelectItem>
                      <SelectItem value="3-6 mois">3 à 6 mois</SelectItem>
                      <SelectItem value="6-12 mois">6 à 12 mois</SelectItem>
                      <SelectItem value="> 12 mois">Plus de 12 mois</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.delai && <p className="text-xs text-destructive mt-1">{errors.delai.message}</p>}
                </div>

                <div>
                  <Label>Description (optionnel)</Label>
                  <Textarea {...register('description')} placeholder="Décrivez votre projet, contraintes, attentes..." rows={3} />
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
                  Créez un mot de passe pour suivre votre projet et recevoir vos devis.
                </p>

                <div>
                  <Label>Mot de passe *</Label>
                  <Input {...register('password')} type="password" placeholder="8 caractères minimum" />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  En soumettant ce formulaire, vous acceptez d'être recontacté par Immo-Rama dans le cadre de votre projet.
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
