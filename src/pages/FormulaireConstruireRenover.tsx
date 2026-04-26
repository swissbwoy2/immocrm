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
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconHammer, IconDocument, IconCamera, IconUser, IconMail, IconPhone, IconLock, IconWallet, IconCalendar } from '@/components/forms-premium/icons/LuxuryIcons';

const schema = z.object({
  type_projet: z.string().min(1, 'Sélectionnez le type de projet'),
  nature_travaux: z.string().min(1, 'Indiquez la nature des travaux'),
  adresse: z.string().min(2, 'Adresse requise'),
  npa: z.string().optional(),
  ville: z.string().min(2, 'Ville requise'),
  surface: z.string().optional(),
  budget: z.string().min(1, 'Indiquez votre budget'),
  delai: z.string().min(1, 'Indiquez le délai souhaité'),
  pieces_concernees: z.string().optional(),
  etat_actuel: z.string().optional(),
  niveau_finitions: z.string().optional(),
  contraintes: z.string().optional(),
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
  { id: 1, title: 'Projet', icon: '🔨' },
  { id: 2, title: 'Détails', icon: '📄' },
  { id: 3, title: 'Photos / Plans', icon: '📷' },
  { id: 4, title: 'Compte', icon: '👤' },
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
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
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

      if (signUpData?.user?.id) {
        const { error: provisionError } = await supabase.functions.invoke('create-public-user', {
          body: {
            user_id: signUpData.user.id,
            email: data.email,
            first_name: data.prenom,
            last_name: data.nom,
            phone: data.telephone,
            source: 'construire-renover',
            parcours: 'renovation',
          },
        });
        if (provisionError) console.warn('create-public-user warning:', provisionError);
      }

      const { error: leadError } = await (supabase.from('leads') as any).insert({
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
    <PremiumFormShell currentStep={step - 1} totalSteps={STEPS.length}>
      <PremiumGuaranteeBanner />
      <PremiumProgressBlock currentStep={step - 1} totalSteps={STEPS.length} stepTitle={STEPS[step - 1]?.title ?? ''} />
      <PremiumStepIndicator steps={STEPS} currentStep={step - 1} />

      <div className="container mx-auto px-4 max-w-3xl pb-8 pt-4">
        {/* Titre/sous-titre vivent dans chaque step */}

        <PremiumFormCard>
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">

              {/* ——— Step 1 : Projet ——— */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconHammer size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Votre projet</h2>
                  </div>

                  <PremiumSelect
                    label="Type de projet"
                    required
                    value={watch('type_projet') || ''}
                    onValueChange={(v) => setValue('type_projet', v)}
                    options={[
                      { value: 'Construction neuve', label: 'Construction neuve' },
                      { value: 'Rénovation complète', label: 'Rénovation complète' },
                      { value: 'Rénovation partielle', label: 'Rénovation partielle' },
                      { value: 'Extension / Surélévation', label: 'Extension / Surélévation' },
                      { value: 'Aménagement intérieur', label: 'Aménagement intérieur' },
                    ]}
                    placeholder="Choisir..."
                    error={errors.type_projet?.message}
                  />

                  <PremiumSelect
                    label="Nature des travaux"
                    required
                    value={watch('nature_travaux') || ''}
                    onValueChange={(v) => setValue('nature_travaux', v)}
                    options={[
                      { value: 'Cuisine', label: 'Cuisine' },
                      { value: 'Salle de bain', label: 'Salle de bain' },
                      { value: 'Toiture', label: 'Toiture' },
                      { value: 'Façade / Isolation', label: 'Façade / Isolation' },
                      { value: 'Électricité / Plomberie', label: 'Électricité / Plomberie' },
                      { value: 'Gros œuvre', label: 'Gros œuvre' },
                      { value: "Tout corps d'état", label: "Tout corps d'état" },
                      { value: 'Autre', label: 'Autre' },
                    ]}
                    placeholder="Choisir..."
                    error={errors.nature_travaux?.message}
                  />

                  <div>
                    <p className="text-sm font-medium text-[hsl(40_20%_60%)] mb-1.5">Adresse du chantier <span className="text-red-400">*</span></p>
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

                  <PremiumInput label="Surface concernée (m²)" {...register('surface')} value={watch('surface') || ''} type="number" placeholder="120" optional />

                  <PremiumSelect
                    label="Budget estimé"
                    required
                    value={watch('budget') || ''}
                    onValueChange={(v) => setValue('budget', v)}
                    options={[
                      { value: '< 50k', label: "Moins de 50'000 CHF" },
                      { value: '50k-150k', label: "50'000 - 150'000 CHF" },
                      { value: '150k-300k', label: "150'000 - 300'000 CHF" },
                      { value: '300k-500k', label: "300'000 - 500'000 CHF" },
                      { value: '500k-1M', label: "500'000 - 1'000'000 CHF" },
                      { value: '> 1M', label: "Plus de 1'000'000 CHF" },
                    ]}
                    placeholder="Choisir une fourchette..."
                    error={errors.budget?.message}
                    icon={<IconWallet size={16} />}
                  />

                  <PremiumSelect
                    label="Délai souhaité de démarrage"
                    required
                    value={watch('delai') || ''}
                    onValueChange={(v) => setValue('delai', v)}
                    options={[
                      { value: 'Immédiat', label: 'Dès que possible' },
                      { value: '1-3 mois', label: '1 à 3 mois' },
                      { value: '3-6 mois', label: '3 à 6 mois' },
                      { value: '6-12 mois', label: '6 à 12 mois' },
                      { value: '> 12 mois', label: 'Plus de 12 mois' },
                    ]}
                    placeholder="Choisir..."
                    error={errors.delai?.message}
                    icon={<IconCalendar size={16} />}
                  />
                </motion.div>
              )}

              {/* ——— Step 2 : Détails ——— */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconDocument size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Détails du projet</h2>
                  </div>

                  <PremiumInput label="Pièces concernées" optional {...register('pieces_concernees')} value={watch('pieces_concernees') || ''} placeholder="Ex: cuisine, salon, 2 SDB" />

                  <PremiumSelect
                    label="État actuel"
                    value={watch('etat_actuel') || ''}
                    onValueChange={(v) => setValue('etat_actuel', v)}
                    options={[
                      { value: 'Neuf / Brut', label: 'Neuf / Brut' },
                      { value: 'Bon état', label: 'Bon état' },
                      { value: 'À rafraîchir', label: 'À rafraîchir' },
                      { value: 'Très dégradé', label: 'Très dégradé' },
                    ]}
                    placeholder="Choisir..."
                  />

                  <PremiumSelect
                    label="Niveau de finitions souhaité"
                    value={watch('niveau_finitions') || ''}
                    onValueChange={(v) => setValue('niveau_finitions', v)}
                    options={[
                      { value: 'Standard', label: 'Standard' },
                      { value: 'Confort', label: 'Confort' },
                      { value: 'Haut de gamme', label: 'Haut de gamme' },
                      { value: 'Luxe', label: 'Luxe' },
                    ]}
                    placeholder="Choisir..."
                  />

                  <PremiumTextarea
                    label="Contraintes particulières"
                    optional
                    {...register('contraintes')}
                    value={watch('contraintes') || ''}
                    placeholder="Bâtiment classé, copropriété, accès difficile, occupé pendant les travaux..."
                    rows={3}
                  />

                  <PremiumTextarea
                    label="Description complémentaire"
                    optional
                    {...register('description')}
                    value={watch('description') || ''}
                    placeholder="Décrivez votre projet, attentes, inspirations..."
                    rows={4}
                  />
                </motion.div>
              )}

              {/* ——— Step 3 : Photos / Plans ——— */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <LuxuryIconBadge size="sm"><IconCamera size={16} /></LuxuryIconBadge>
                    <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Photos & plans</h2>
                  </div>
                  <p className="text-sm text-[hsl(40_20%_50%)]">
                    Ajoutez des photos de l'existant ou des plans (jusqu'à 8 fichiers, 10 Mo max).
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
                        <p className="font-medium mb-1 text-[hsl(40_20%_75%)]">Glissez ou sélectionnez vos fichiers</p>
                        <p className="text-xs text-[hsl(40_20%_45%)] mb-4">JPG, PNG, WebP — 10 Mo max</p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleFiles(e.target.files)}
                          disabled={photos.length >= 8}
                          aria-label="Sélectionner des photos ou plans"
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
                          <img src={p.url} alt={`Fichier ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            aria-label={`Supprimer fichier ${i + 1}`}
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
                      Un email de confirmation sera envoyé. Après validation, vous accéderez à votre espace pour suivre votre projet et recevoir vos devis.
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
