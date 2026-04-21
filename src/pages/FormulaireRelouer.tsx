import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft, ChevronRight, Send, Home, User, Loader2,
  CheckCircle, Camera, Upload, X, Lock, KeyRound, Banknote, MapPinned,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { ForgotPasswordLink } from '@/components/auth/ForgotPasswordLink';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumFormShell } from '@/components/forms-premium/PremiumFormShell';
import { PremiumStepIndicator } from '@/components/forms-premium/PremiumStepIndicator';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumButton } from '@/components/forms-premium/PremiumButton';

const schema = z.object({
  // Étape 1 - Bien
  type_bien: z.string().min(1, 'Sélectionnez le type de bien'),
  adresse: z.string().min(2, 'Adresse requise'),
  npa: z.string().optional(),
  ville: z.string().min(2, 'Ville requise'),
  nombre_pieces: z.string().min(1, 'Indiquez le nombre de pièces'),
  nombre_chambres: z.string().optional(),
  nombre_sdb: z.string().optional(),
  surface: z.string().optional(),
  etage: z.string().optional(),
  balcon: z.boolean().optional(),
  terrasse: z.boolean().optional(),
  cave: z.boolean().optional(),
  parking: z.boolean().optional(),
  ascenseur: z.boolean().optional(),

  // Étape 2 - Location
  loyer_actuel: z.string().min(1, 'Indiquez le loyer'),
  charges: z.string().optional(),
  date_disponibilite: z.string().min(1, 'Date de disponibilité requise'),
  motif_relocation: z.string().optional(),
  etat: z.string().optional(),
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
  { id: 1, title: 'Bien', icon: Home },
  { id: 2, title: 'Location', icon: Banknote },
  { id: 3, title: 'Photos', icon: Camera },
  { id: 4, title: 'Compte', icon: User },
];

export default function FormulaireRelouer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Formulaire — Relouer mon appartement";
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      balcon: false, terrasse: false, cave: false, parking: false, ascenseur: false,
    },
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
      const path = `public-relouer/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('bien-photos').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('bien-photos').getPublicUrl(path);
      return { url: data.publicUrl, path };
    } catch (e) {
      console.error(e); return null;
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = 8 - photos.length;
    if (remaining <= 0) { toast.error('Maximum 8 photos'); return; }
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
        toast.success(`${uploaded.length} photo(s) ajoutée(s)`);
      }
    } finally { setUploading(false); }
  };

  const removePhoto = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const next = async () => {
    const fields: (keyof FormData)[][] = [
      ['type_bien', 'adresse', 'ville', 'nombre_pieces'],
      ['loyer_actuel', 'date_disponibilite'],
      [],
      ['prenom', 'nom', 'email', 'telephone', 'password'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep(s => Math.min(s + 1, 4));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
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

      // Create profile + assign 'client' role server-side (RLS-safe)
      if (signUpData?.user?.id) {
        const { error: provisionError } = await supabase.functions.invoke('create-public-user', {
          body: {
            user_id: signUpData.user.id,
            email: data.email,
            first_name: data.prenom,
            last_name: data.nom,
            phone: data.telephone,
            source: 'relouer-mon-appartement',
            parcours: 'relocation',
          },
        });
        if (provisionError) console.warn('create-public-user warning:', provisionError);
      }

      const equipements: string[] = [];
      if (data.balcon) equipements.push('Balcon');
      if (data.terrasse) equipements.push('Terrasse');
      if (data.cave) equipements.push('Cave');
      if (data.parking) equipements.push('Parking');
      if (data.ascenseur) equipements.push('Ascenseur');

      const { error: leadError } = await (supabase.from('leads') as any).insert({
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
          nombre_chambres: data.nombre_chambres,
          nombre_sdb: data.nombre_sdb,
          surface: data.surface,
          etage: data.etage,
          equipements,
          loyer_actuel: data.loyer_actuel,
          charges: data.charges,
          date_disponibilite: data.date_disponibilite,
          motif_relocation: data.motif_relocation,
          etat: data.etat,
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

  const equipementsList: { key: keyof FormData; label: string }[] = [
    { key: 'balcon', label: 'Balcon' },
    { key: 'terrasse', label: 'Terrasse' },
    { key: 'cave', label: 'Cave' },
    { key: 'parking', label: 'Parking' },
    { key: 'ascenseur', label: 'Ascenseur' },
  ];

  const premiumSteps = STEPS.map(s => ({ title: s.title, icon: '●' }));

  return (
    <PremiumFormShell currentStep={step - 1} totalSteps={STEPS.length}>
      <PremiumStepIndicator steps={premiumSteps} currentStep={step - 1} />

      <div className="container mx-auto px-4 max-w-3xl pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-[hsl(40_20%_88%)] mb-2">
            Trouver un repreneur pour mon bail
          </h1>
          <p className="text-[hsl(40_20%_45%)] text-sm">Étape {step} sur 4</p>
        </div>

        <PremiumFormCard>
          <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Votre bien</h2>
                </div>

                <div>
                  <Label>Type de bien *</Label>
                  <Select onValueChange={(v) => setValue('type_bien', v)} value={watch('type_bien')}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appartement">Appartement</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Maison">Maison</SelectItem>
                      <SelectItem value="Loft">Loft</SelectItem>
                      <SelectItem value="Duplex">Duplex</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type_bien && <p className="text-xs text-destructive mt-1">{errors.type_bien.message}</p>}
                </div>

                <div>
                  <Label className="flex items-center gap-2"><MapPinned className="w-4 h-4 text-muted-foreground" /> Adresse *</Label>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Pièces *</Label>
                    <Input {...register('nombre_pieces')} type="number" step="0.5" placeholder="3.5" />
                    {errors.nombre_pieces && <p className="text-xs text-destructive mt-1">{errors.nombre_pieces.message}</p>}
                  </div>
                  <div>
                    <Label>Chambres</Label>
                    <Input {...register('nombre_chambres')} type="number" placeholder="2" />
                  </div>
                  <div>
                    <Label>SDB</Label>
                    <Input {...register('nombre_sdb')} type="number" placeholder="1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Surface (m²)</Label>
                    <Input {...register('surface')} type="number" placeholder="80" />
                  </div>
                  <div>
                    <Label>Étage</Label>
                    <Input {...register('etage')} placeholder="3" />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Équipements</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {equipementsList.map((eq) => (
                      <div key={eq.key} className="flex items-center gap-2 p-3 rounded-lg border border-border">
                        <Checkbox
                          id={eq.key}
                          checked={watch(eq.key) as boolean}
                          onCheckedChange={(c) => setValue(eq.key, c as boolean)}
                        />
                        <Label htmlFor={eq.key} className="cursor-pointer text-sm">{eq.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Banknote className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Conditions de location</h2>
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
                  <Label>Motif de la relocation</Label>
                  <Select onValueChange={(v) => setValue('motif_relocation', v)} value={watch('motif_relocation')}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Déménagement">Déménagement</SelectItem>
                      <SelectItem value="Achat immobilier">Achat immobilier</SelectItem>
                      <SelectItem value="Mutation professionnelle">Mutation professionnelle</SelectItem>
                      <SelectItem value="Famille">Raisons familiales</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>État du bien</Label>
                  <Select onValueChange={(v) => setValue('etat', v)} value={watch('etat')}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Neuf">Neuf / Rénové</SelectItem>
                      <SelectItem value="Bon état">Bon état</SelectItem>
                      <SelectItem value="État correct">État correct</SelectItem>
                      <SelectItem value="À rafraîchir">À rafraîchir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description (optionnel)</Label>
                  <Textarea {...register('description')} placeholder="Atouts, équipements, environnement..." rows={4} />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Photos du bien</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Ajoutez jusqu'à 8 photos (10 Mo max chacune). De belles photos accélèrent la relocation.
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
                      <p className="font-medium mb-1">Glissez ou sélectionnez vos photos</p>
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
                        <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
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
                  <span>Un email de confirmation sera envoyé. Après validation, vous accéderez à votre espace client pour suivre votre dossier.</span>
                </div>

                <div className="text-center pt-2">
                  <ForgotPasswordLink defaultEmail={watch('email')} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-[hsl(38_45%_48%/0.15)] gap-4">
              <PremiumButton type="button" variant="back" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
                Précédent
              </PremiumButton>
              {step < 4 ? (
                <PremiumButton type="button" variant="next" onClick={next}>
                  Suivant
                </PremiumButton>
              ) : (
                <PremiumButton type="submit" variant="submit" loading={submitting} disabled={submitting}>
                  Créer mon compte et envoyer
                </PremiumButton>
              )}
            </div>
          </form>
        </PremiumFormCard>
      </div>
    </PremiumFormShell>
  );
}
