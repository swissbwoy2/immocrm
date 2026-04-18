import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Send, Hammer, User, Loader2,
  CheckCircle, Camera, Upload, X, Lock, KeyRound, FileText, MapPinned,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  // Étape 1 - Projet
  type_projet: z.string().min(1, 'Sélectionnez le type de projet'),
  nature_travaux: z.string().min(1, 'Indiquez la nature des travaux'),
  adresse: z.string().min(2, 'Adresse requise'),
  npa: z.string().optional(),
  ville: z.string().min(2, 'Ville requise'),
  surface: z.string().optional(),
  budget: z.string().min(1, 'Indiquez votre budget'),
  delai: z.string().min(1, 'Indiquez le délai souhaité'),

  // Étape 2 - Détails
  pieces_concernees: z.string().optional(),
  etat_actuel: z.string().optional(),
  niveau_finitions: z.string().optional(),
  contraintes: z.string().optional(),
  description: z.string().optional(),

  // Étape 4 - Contact + Compte
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Téléphone invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

type FormData = z.infer<typeof schema>;
interface PhotoData { url: string; path: string }

const STEPS = [
  { id: 1, title: 'Projet', icon: Hammer },
  { id: 2, title: 'Détails', icon: FileText },
  { id: 3, title: 'Photos / Plans', icon: Camera },
  { id: 4, title: 'Compte', icon: User },
];

export default function FormulaireConstruireRenover() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Formulaire — Construire & Rénover";
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleAddressChange = (c: AddressComponents | null) => {
    if (!c) return;
    setValue('adresse', c.fullAddress);
    setValue('npa', c.postalCode || '');
    setValue('ville', c.city || '');
  };

  const uploadPhoto = async (file: File): Promise<PhotoData | null> => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `public-renovation/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('bien-photos').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('bien-photos').getPublicUrl(path);
      return { url: data.publicUrl, path };
    } catch (e) { console.error(e); return null; }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = 8 - photos.length;
    if (remaining <= 0) { toast.error('Maximum 8 fichiers'); return; }
    setUploading(true);
    try {
      const arr = Array.from(files).slice(0, remaining);
      const uploaded: PhotoData[] = [];
      for (const f of arr) {
        if (!f.type.startsWith('image/')) { toast.error(`${f.name} n'est pas une image`); continue; }
        if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} > 10 Mo`); continue; }
        const p = await uploadPhoto(f);
        if (p) uploaded.push(p);
      }
      if (uploaded.length) {
        setPhotos(prev => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} fichier(s) ajouté(s)`);
      }
    } finally { setUploading(false); }
  };

  const removePhoto = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const next = async () => {
    const fields: (keyof FormData)[][] = [
      ['type_projet', 'nature_travaux', 'adresse', 'ville', 'budget', 'delai'],
      [],
      [],
      ['prenom', 'nom', 'email', 'telephone', 'password'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep(s => Math.min(s + 1, 4));
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
          pieces_concernees: data.pieces_concernees,
          etat_actuel: data.etat_actuel,
          niveau_finitions: data.niveau_finitions,
          contraintes: data.contraintes,
          description: data.description,
          photos: photos.map(p => p.url),
        }),
      });
      if (leadError) console.warn('Lead insert warning:', leadError);

      toast.success('Demande envoyée ! Vérifiez votre email.');
      navigate('/inscription-validee');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="theme-luxury min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/construire-renover')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Mon projet construction / rénovation
          </h1>
          <p className="text-muted-foreground">Étape {step} sur 4</p>
        </div>

        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center w-full">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-border text-muted-foreground'}`}>
                    {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <p className={`text-xs mt-1 hidden sm:block ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{s.title}</p>
                </div>
                {idx < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 ${done ? 'bg-emerald-500' : 'bg-border'}`} />}
              </div>
            );
          })}
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
                  <Select onValueChange={(v) => setValue('type_projet', v)} value={watch('type_projet')}>
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
                  <Select onValueChange={(v) => setValue('nature_travaux', v)} value={watch('nature_travaux')}>
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
                  <Label className="flex items-center gap-2"><MapPinned className="w-4 h-4 text-muted-foreground" /> Adresse du chantier *</Label>
                  <GoogleAddressAutocomplete
                    value={watch('adresse') || ''}
                    onChange={handleAddressChange}
                    onInputChange={(v) => setValue('adresse', v)}
                    placeholder="Rue et numéro"
                    restrictToSwitzerland
                  />
                  {errors.adresse && <p className="text-xs text-destructive mt-1">{errors.adresse.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NPA</Label>
                    <Input {...register('npa')} placeholder="1207" />
                  </div>
                  <div>
                    <Label>Ville *</Label>
                    <Input {...register('ville')} placeholder="Genève" />
                    {errors.ville && <p className="text-xs text-destructive mt-1">{errors.ville.message}</p>}
                  </div>
                </div>

                <div>
                  <Label>Surface concernée (m²)</Label>
                  <Input {...register('surface')} type="number" placeholder="120" />
                </div>

                <div>
                  <Label>Budget estimé *</Label>
                  <Select onValueChange={(v) => setValue('budget', v)} value={watch('budget')}>
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
                  <Select onValueChange={(v) => setValue('delai', v)} value={watch('delai')}>
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
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Détails du projet</h2>
                </div>

                <div>
                  <Label>Pièces concernées</Label>
                  <Input {...register('pieces_concernees')} placeholder="Ex: cuisine, salon, 2 SDB" />
                </div>

                <div>
                  <Label>État actuel</Label>
                  <Select onValueChange={(v) => setValue('etat_actuel', v)} value={watch('etat_actuel')}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Neuf / Brut">Neuf / Brut</SelectItem>
                      <SelectItem value="Bon état">Bon état</SelectItem>
                      <SelectItem value="À rafraîchir">À rafraîchir</SelectItem>
                      <SelectItem value="Très dégradé">Très dégradé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Niveau de finitions souhaité</Label>
                  <Select onValueChange={(v) => setValue('niveau_finitions', v)} value={watch('niveau_finitions')}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Confort">Confort</SelectItem>
                      <SelectItem value="Haut de gamme">Haut de gamme</SelectItem>
                      <SelectItem value="Luxe">Luxe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contraintes particulières</Label>
                  <Textarea {...register('contraintes')} placeholder="Bâtiment classé, copropriété, accès difficile, occupé pendant les travaux..." rows={3} />
                </div>

                <div>
                  <Label>Description complémentaire</Label>
                  <Textarea {...register('description')} placeholder="Décrivez votre projet, attentes, inspirations..." rows={4} />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Photos & plans</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Ajoutez des photos de l'existant ou des plans (jusqu'à 8 fichiers, 10 Mo max).
                </p>

                <div className="relative border-2 border-dashed rounded-xl p-8 text-center border-border hover:border-primary/50 transition">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Upload en cours...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium mb-1">Glissez ou sélectionnez vos fichiers</p>
                      <p className="text-xs text-muted-foreground mb-3">JPG, PNG, WebP — 10 Mo max</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => handleFiles(e.target.files)}
                        disabled={photos.length >= 8}
                      />
                      <Button type="button" variant="outline" size="sm" className="pointer-events-none">Parcourir</Button>
                    </>
                  )}
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {photos.map((p, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={p.url} alt={`Fichier ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Vos coordonnées et compte</h2>
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

                <div>
                  <Label className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-muted-foreground" /> Mot de passe *</Label>
                  <Input {...register('password')} type="password" placeholder="8 caractères minimum" />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Un email de confirmation sera envoyé. Après validation, vous accéderez à votre espace pour suivre votre projet et recevoir vos devis.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8 pt-6 border-t gap-4">
            <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Précédent
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={next}>
                Suivant <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Créer mon compte et envoyer
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
