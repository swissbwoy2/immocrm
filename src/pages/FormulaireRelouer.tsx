import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Loader2 } from 'lucide-react';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { ForgotPasswordLink } from '@/components/auth/ForgotPasswordLink';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumFormShell } from '@/components/forms-premium/PremiumFormShell';
import { PremiumStepIndicator } from '@/components/forms-premium/PremiumStepIndicator';
import { PremiumGuaranteeBanner } from '@/components/forms-premium/PremiumGuaranteeBanner';
import { PremiumProgressBlock } from '@/components/forms-premium/PremiumProgressBlock';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumButton } from '@/components/forms-premium/PremiumButton';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumTextarea } from '@/components/forms-premium/PremiumTextarea';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { PremiumCheckbox } from '@/components/forms-premium/PremiumCheckbox';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconHome, IconMail, IconPhone, IconLock, IconCamera, IconUser, IconWallet, IconCalendar } from '@/components/forms-premium/icons/LuxuryIcons';

const schema = z.object({
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
  loyer_actuel: z.string().min(1, 'Indiquez le loyer'),
  charges: z.string().optional(),
  date_disponibilite: z.string().min(1, 'Date de disponibilité requise'),
  motif_relocation: z.string().optional(),
  etat: z.string().optional(),
  description: z.string().optional(),
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Téléphone invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

type FormData = z.infer<typeof schema>;
interface PhotoData { url: string; path: string }

const STEPS = [
  { id: 1, title: 'Bien', icon: '🏠' },
  { id: 2, title: 'Location', icon: '💰' },
  { id: 3, title: 'Photos', icon: '📷' },
  { id: 4, title: 'Compte', icon: '👤' },
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

  return (
    <PremiumFormShell currentStep={step - 1} totalSteps={STEPS.length}>
      <PremiumGuaranteeBanner />
      <PremiumProgressBlock currentStep={step - 1} totalSteps={STEPS.length} stepTitle={STEPS[step - 1]?.title ?? ''} />
      <PremiumStepIndicator steps={STEPS} currentStep={step - 1} />

      <div className="container mx-auto px-4 max-w-3xl pb-8 pt-4">
        {/* Titre/sous-titre vivent dans chaque step */}

        <PremiumFormCard>
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">

              {/* ——— Step 1 : Votre bien ——— */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconHome size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Votre bien</h2>
                  </div>

                  <PremiumSelect
                    label="Type de bien"
                    required
                    value={watch('type_bien') || ''}
                    onValueChange={(v) => setValue('type_bien', v)}
                    options={[
                      { value: 'Appartement', label: 'Appartement' },
                      { value: 'Studio', label: 'Studio' },
                      { value: 'Maison', label: 'Maison' },
                      { value: 'Loft', label: 'Loft' },
                      { value: 'Duplex', label: 'Duplex' },
                    ]}
                    placeholder="Choisir..."
                    error={errors.type_bien?.message}
                  />

                  <div>
                    <p className="text-sm font-medium text-[hsl(40_20%_60%)] mb-1.5">Adresse <span className="text-red-400">*</span></p>
                    <GoogleAddressAutocomplete
                      value={watch('adresse') || ''}
                      onChange={handleAddressChange}
                      onInputChange={(v) => setValue('adresse', v)}
                      placeholder="Rue et numéro"
                      restrictToSwitzerland
                    />
                    {errors.adresse && <p className="text-xs text-red-400 mt-1">{errors.adresse.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInput label="NPA" {...register('npa')} value={watch('npa') || ''} placeholder="1207" />
                    <PremiumInput label="Ville" required {...register('ville')} value={watch('ville') || ''} placeholder="Genève" error={errors.ville?.message} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <PremiumInput label="Pièces" required {...register('nombre_pieces')} value={watch('nombre_pieces') || ''} type="number" step="0.5" placeholder="3.5" error={errors.nombre_pieces?.message} />
                    <PremiumInput label="Chambres" {...register('nombre_chambres')} value={watch('nombre_chambres') || ''} type="number" placeholder="2" />
                    <PremiumInput label="SDB" {...register('nombre_sdb')} value={watch('nombre_sdb') || ''} type="number" placeholder="1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInput label="Surface (m²)" {...register('surface')} value={watch('surface') || ''} type="number" placeholder="80" />
                    <PremiumInput label="Étage" {...register('etage')} value={watch('etage') || ''} placeholder="3" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[hsl(40_20%_60%)] mb-3">Équipements</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {equipementsList.map((eq) => (
                        <PremiumCheckbox
                          key={eq.key}
                          id={eq.key}
                          checked={watch(eq.key) as boolean || false}
                          onCheckedChange={(c) => setValue(eq.key, c as boolean)}
                          label={eq.label}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ——— Step 2 : Conditions de location ——— */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconWallet size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Conditions de location</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInput label="Loyer net (CHF)" required {...register('loyer_actuel')} value={watch('loyer_actuel') || ''} type="number" placeholder="1800" error={errors.loyer_actuel?.message} />
                    <PremiumInput label="Charges (CHF)" {...register('charges')} value={watch('charges') || ''} type="number" placeholder="200" />
                  </div>

                  <PremiumInput
                    label="Disponible à partir du"
                    required
                    {...register('date_disponibilite')}
                    value={watch('date_disponibilite') || ''}
                    type="date"
                    icon={<IconCalendar size={16} />}
                    error={errors.date_disponibilite?.message}
                  />

                  <PremiumSelect
                    label="Motif de la relocation"
                    value={watch('motif_relocation') || ''}
                    onValueChange={(v) => setValue('motif_relocation', v)}
                    options={[
                      { value: 'Déménagement', label: 'Déménagement' },
                      { value: 'Achat immobilier', label: 'Achat immobilier' },
                      { value: 'Mutation professionnelle', label: 'Mutation professionnelle' },
                      { value: 'Famille', label: 'Raisons familiales' },
                      { value: 'Autre', label: 'Autre' },
                    ]}
                    placeholder="Choisir..."
                  />

                  <PremiumSelect
                    label="État du bien"
                    value={watch('etat') || ''}
                    onValueChange={(v) => setValue('etat', v)}
                    options={[
                      { value: 'Neuf', label: 'Neuf / Rénové' },
                      { value: 'Bon état', label: 'Bon état' },
                      { value: 'État correct', label: 'État correct' },
                      { value: 'À rafraîchir', label: 'À rafraîchir' },
                    ]}
                    placeholder="Choisir..."
                  />

                  <PremiumTextarea
                    label="Description"
                    optional
                    {...register('description')}
                    value={watch('description') || ''}
                    placeholder="Atouts, équipements, environnement..."
                    rows={4}
                  />
                </motion.div>
              )}

              {/* ——— Step 3 : Photos ——— */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconCamera size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Photos du bien</h2>
                  </div>
                  <p className="text-sm text-[hsl(40_20%_50%)]">
                    Ajoutez jusqu'à 8 photos (10 Mo max chacune). De belles photos accélèrent la relocation.
                  </p>

                  <div className="relative border-2 border-dashed rounded-xl p-8 text-center border-[hsl(38_45%_48%/0.25)] hover:border-[hsl(38_55%_65%/0.4)] transition-colors duration-300 bg-[hsl(38_45%_48%/0.03)]">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[hsl(38_55%_65%)]" />
                        <p className="text-sm text-[hsl(40_20%_50%)]">Upload en cours...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto mb-3 text-[hsl(38_45%_48%)]" />
                        <p className="font-medium mb-1 text-[hsl(40_20%_75%)]">Glissez ou sélectionnez vos photos</p>
                        <p className="text-xs text-[hsl(40_20%_45%)] mb-4">JPG, PNG, WebP — 10 Mo max</p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleFiles(e.target.files)}
                          disabled={photos.length >= 8}
                          aria-label="Sélectionner des photos"
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[hsl(38_45%_48%/0.3)] text-[hsl(40_20%_60%)] text-sm pointer-events-none">
                          Parcourir les fichiers
                        </span>
                      </>
                    )}
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photos.map((p, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-[hsl(38_45%_48%/0.2)]">
                          <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            aria-label={`Supprimer photo ${i + 1}`}
                            className="absolute top-1 right-1 p-1 rounded-full bg-[hsl(30_15%_8%/0.8)] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ——— Step 4 : Compte ——— */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconUser size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Vos coordonnées et compte</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInput label="Prénom" required {...register('prenom')} value={watch('prenom') || ''} error={errors.prenom?.message} />
                    <PremiumInput label="Nom" required {...register('nom')} value={watch('nom') || ''} error={errors.nom?.message} />
                  </div>

                  <PremiumInput label="Email" required type="email" {...register('email')} value={watch('email') || ''} placeholder="vous@exemple.ch" icon={<IconMail size={16} />} error={errors.email?.message} />
                  <PremiumInput label="Téléphone" required type="tel" {...register('telephone')} value={watch('telephone') || ''} placeholder="+41 79 123 45 67" icon={<IconPhone size={16} />} error={errors.telephone?.message} />
                  <PremiumInput label="Mot de passe" required type="password" {...register('password')} value={watch('password') || ''} placeholder="8 caractères minimum" icon={<IconLock size={16} />} error={errors.password?.message} hint="Minimum 8 caractères" />

                  <div className="rounded-xl p-4 bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.2)] flex items-start gap-3">
                    <IconLock size={16} className="text-[hsl(38_55%_65%)] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[hsl(40_20%_50%)] leading-relaxed">
                      Un email de confirmation sera envoyé. Après validation, vous accéderez à votre espace client pour suivre votre dossier.
                    </p>
                  </div>

                  <div className="text-center">
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
