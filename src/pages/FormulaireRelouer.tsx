import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Loader2, KeyRound, Home, Wallet, Camera, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { logSignupAttempt, humanizeAuthError } from '@/lib/signupTracking';
import { ForgotPasswordLink } from '@/components/auth/ForgotPasswordLink';

import { LandingFormShell } from '@/components/forms-premium/LandingFormShell';
import { LandingFormCard } from '@/components/forms-premium/LandingFormCard';
import { LandingStepIndicator } from '@/components/forms-premium/LandingStepIndicator';
import { LandingProgressBlock } from '@/components/forms-premium/LandingProgressBlock';
import { RelouerForfaitBanner } from '@/components/forms-premium/RelouerForfaitBanner';
import { LandingButton } from '@/components/forms-premium/LandingButton';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LandingSelect } from '@/components/forms-premium/LandingSelect';
import { LandingTextarea } from '@/components/forms-premium/LandingTextarea';
import { LandingCheckbox } from '@/components/forms-premium/LandingCheckbox';
import { LandingRadioGroup } from '@/components/forms-premium/LandingRadioGroup';

// ───────────────────────── Schema ─────────────────────────
const schema = z.object({
  // Step 1 — logement
  type_bien: z.string().min(1, 'Sélectionnez le type'),
  adresse: z.string().min(2, 'Adresse requise'),
  npa: z.string().optional(),
  ville: z.string().min(2, 'Ville requise'),
  nombre_pieces: z.string().min(1, 'Nombre de pièces requis'),
  surface: z.string().optional(),
  etage: z.string().optional(),
  ascenseur: z.boolean().optional(),
  balcon: z.boolean().optional(),
  terrasse: z.boolean().optional(),
  cave: z.boolean().optional(),
  parking: z.boolean().optional(),

  // Step 2 — bail actuel
  loyer_net: z.string().min(1, 'Loyer net requis'),
  charges: z.string().optional(),
  date_reprise: z.string().min(1, 'Date de reprise souhaitée requise'),
  date_fin_bail: z.string().optional(),
  resiliation_donnee: z.string().min(1, 'Précisez la résiliation'),
  regie_accepte: z.string().min(1, 'Précisez la position de la régie'),
  motif_depart: z.string().optional(),
  urgence: z.string().min(1, 'Précisez l’urgence'),
  description: z.string().optional(),

  // Step 4 — coordonnées
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(8, 'Téléphone invalide'),
  creer_compte: z.boolean().optional(),
  password: z.string().optional(),
}).refine((d) => !d.creer_compte || (d.password && d.password.length >= 8), {
  path: ['password'],
  message: 'Au moins 8 caractères pour créer un compte',
});

type FormData = z.infer<typeof schema>;
interface PhotoData { url: string; path: string }

const STEPS = [
  { id: 1, title: 'Logement', icon: '🏠' },
  { id: 2, title: 'Bail actuel', icon: '📄' },
  { id: 3, title: 'Photos', icon: '📷' },
  { id: 4, title: 'Coordonnées', icon: '👤' },
];

export default function FormulaireRelouer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Formulaire locataire sortant — Relouer mon appartement | Logisorama';
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const {
    register, handleSubmit, watch, setValue, formState: { errors }, trigger,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ascenseur: false, balcon: false, terrasse: false, cave: false, parking: false,
      creer_compte: false,
    },
  });

  const loyerNet = watch('loyer_net');
  const chargesV = watch('charges');
  const loyerBrut = useMemo(() => {
    const n = parseFloat(loyerNet || '0') || 0;
    const c = parseFloat(chargesV || '0') || 0;
    return n + c > 0 ? `${(n + c).toLocaleString('fr-CH')} CHF` : '';
  }, [loyerNet, chargesV]);

  const handleAddressChange = (c: AddressComponents | null) => {
    if (!c) return;
    setValue('adresse', c.fullAddress);
    setValue('npa', c.postalCode || '');
    setValue('ville', c.city || '');
  };

  // ───── Upload Supabase Storage (logique conservée) ─────
  const uploadPhoto = async (file: File): Promise<PhotoData | null> => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `public-relouer/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('bien-photos').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('bien-photos').getPublicUrl(path);
      return { url: data.publicUrl, path };
    } catch (e) {
      console.error('upload error', e);
      return null;
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
        if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} dépasse 10 Mo`); continue; }
        const p = await uploadPhoto(f);
        if (p) uploaded.push(p);
      }
      if (uploaded.length) {
        setPhotos((prev) => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} photo(s) ajoutée(s)`);
      }
    } finally { setUploading(false); }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const next = async () => {
    const fields: (keyof FormData)[][] = [
      ['type_bien', 'adresse', 'ville', 'nombre_pieces'],
      ['loyer_net', 'date_reprise', 'resiliation_donnee', 'regie_accepte', 'urgence'],
      [],
      ['prenom', 'nom', 'email', 'telephone', 'password'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep((s) => Math.min(s + 1, 4));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const SOURCE = 'relouer-mon-appartement';
    const PARCOURS = 'locataire-sortant';
    const baseAttempt = {
      email: data.email, phone: data.telephone,
      first_name: data.prenom, last_name: data.nom,
      source: SOURCE, parcours: PARCOURS,
    };

    try {
      const equipements: string[] = [];
      if (data.ascenseur) equipements.push('Ascenseur');
      if (data.balcon) equipements.push('Balcon');
      if (data.terrasse) equipements.push('Terrasse');
      if (data.cave) equipements.push('Cave');
      if (data.parking) equipements.push('Parking');

      // 1) Toujours créer le lead pour ne jamais perdre le contact
      const { error: leadError } = await (supabase.from('leads') as any).insert({
        prenom: data.prenom,
        nom: data.nom,
        email: data.email,
        telephone: data.telephone,
        source: SOURCE,
        formulaire: SOURCE,
        type_bien: data.type_bien,
        localite: data.ville,
        nb_pieces: data.nombre_pieces ? parseFloat(data.nombre_pieces) : null,
        notes: JSON.stringify({
          parcours: 'locataire_sortant',
          type_bien: data.type_bien,
          adresse: data.adresse,
          npa: data.npa,
          ville: data.ville,
          nombre_pieces: data.nombre_pieces,
          surface: data.surface,
          etage: data.etage,
          equipements,
          loyer_net: data.loyer_net,
          charges: data.charges,
          date_reprise_souhaitee: data.date_reprise,
          date_fin_bail: data.date_fin_bail,
          resiliation_donnee: data.resiliation_donnee,
          regie_accepte_reprise: data.regie_accepte,
          motif_depart: data.motif_depart,
          urgence: data.urgence,
          description: data.description,
          photos: photos.map((p) => p.url),
        }),
      });
      if (leadError) console.warn('Lead insert warning:', leadError);

      // 2) Signup auth uniquement si demandé
      if (data.creer_compte && data.password && data.password.length >= 8) {
        const { data: signUpData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: data.prenom,
              last_name: data.nom,
              phone: data.telephone,
              user_type: 'locataire_sortant',
            },
          },
        });

        const alreadyRegistered =
          !!authError && /already|registered|exists/i.test(authError.message || '');

        if (signUpData?.user?.id) {
          // Nouveau compte — provisionner profil + rôle
          const { error: provisionError } = await supabase.functions.invoke('create-public-user', {
            body: {
              user_id: signUpData.user.id,
              email: data.email,
              first_name: data.prenom,
              last_name: data.nom,
              phone: data.telephone,
              source: SOURCE,
              parcours: PARCOURS,
            },
          });
          if (provisionError) {
            await logSignupAttempt({ ...baseAttempt, stage: 'provision_failed', error_message: provisionError.message });
          } else {
            await logSignupAttempt({ ...baseAttempt, stage: 'succeeded' });
          }
        } else if (alreadyRegistered) {
          // Compte déjà existant — créer profil + rôle si manquants (sans écraser)
          const { error: provisionError } = await supabase.functions.invoke('create-public-user', {
            body: {
              email: data.email,
              first_name: data.prenom,
              last_name: data.nom,
              phone: data.telephone,
              source: SOURCE,
              parcours: PARCOURS,
            },
          });
          if (provisionError) {
            await logSignupAttempt({ ...baseAttempt, stage: 'provision_failed', error_message: provisionError.message });
          } else {
            await logSignupAttempt({ ...baseAttempt, stage: 'succeeded' });
          }
          toast.info('Un compte existe déjà avec cet email — connectez-vous pour accéder à votre dashboard.');
        } else {
          await logSignupAttempt({ ...baseAttempt, stage: 'auth_signup_failed', error_message: authError?.message || 'user null' });
          toast.warning(humanizeAuthError(authError?.message) + ' — votre demande a quand même été transmise.');
        }
      }

      toast.success('Demande envoyée ! Notre équipe vous recontacte rapidement.');
      setDone(true);
    } catch (e: any) {
      console.error(e);
      toast.error(humanizeAuthError(e?.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ───── Écran de succès ─────
  if (done) {
    return (
      <LandingFormShell>
        <div className="container mx-auto px-4 max-w-2xl py-16">
          <LandingFormCard>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Demande envoyée !
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Votre demande a bien été transmise à Logisorama.ch. Notre équipe va analyser
                votre logement et vous recontacter rapidement pour vous aider à trouver un
                repreneur solvable.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md hover:scale-[1.02] transition-all"
                >
                  Retour à l’accueil
                </button>
                <button
                  onClick={() => navigate('/rendez-vous')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  Prendre rendez-vous
                </button>
              </div>
            </div>
          </LandingFormCard>
        </div>
      </LandingFormShell>
    );
  }

  return (
    <LandingFormShell>
      <RelouerForfaitBanner />
      <LandingProgressBlock currentStep={step - 1} totalSteps={STEPS.length} stepTitle={STEPS[step - 1]?.title ?? ''} />
      <LandingStepIndicator steps={STEPS} currentStep={step - 1} />

      <div className="container mx-auto px-4 max-w-3xl pb-12 pt-2">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Formulaire locataire sortant — Relouer mon appartement
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Complétez les informations de votre logement afin que notre équipe puisse vous aider
            à trouver rapidement un repreneur solvable et éviter une double charge de loyer.
          </p>
        </div>

        <LandingFormCard>
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">

              {/* ─── Step 1 ─── */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Votre logement actuel</h2>
                  </div>

                  <LandingSelect
                    label="Type de logement"
                    required
                    value={watch('type_bien') || ''}
                    onValueChange={(v) => setValue('type_bien', v, { shouldValidate: true })}
                    options={[
                      { value: 'Studio', label: 'Studio' },
                      { value: 'Appartement', label: 'Appartement' },
                      { value: 'Duplex', label: 'Duplex' },
                      { value: 'Maison', label: 'Maison' },
                      { value: 'Chambre / colocation', label: 'Chambre / colocation' },
                    ]}
                    placeholder="Choisir..."
                    error={errors.type_bien?.message}
                  />

                  <div>
                    <p className="text-sm font-medium text-foreground mb-1.5">
                      Adresse du logement <span className="text-destructive">*</span>
                    </p>
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
                    <LandingInput label="NPA" {...register('npa')} value={watch('npa') || ''} placeholder="1207" />
                    <LandingInput label="Ville" required {...register('ville')} value={watch('ville') || ''} placeholder="Genève" error={errors.ville?.message} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative">
                      <label className="absolute left-4 top-1 text-[11px] font-medium text-primary z-10 pointer-events-none">
                        Pièces<span className="text-destructive ml-0.5">*</span>
                      </label>
                      <select
                        {...register('nombre_pieces')}
                        defaultValue=""
                        className="w-full appearance-none rounded-xl border border-border bg-background text-foreground pt-6 pb-2 px-4 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all"
                      >
                        <option value="" disabled>Choisir…</option>
                        {['1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','6.5+'].map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      {errors.nombre_pieces?.message && (
                        <p className="text-[11px] text-destructive mt-1 pl-1">{errors.nombre_pieces.message}</p>
                      )}
                    </div>
                    <LandingInput label="Surface (m²)" {...register('surface')} type="text" inputMode="decimal" pattern="[0-9]*" placeholder="80" />
                    <LandingInput label="Étage" {...register('etage')} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="3" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Équipements</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {([
                        ['ascenseur', 'Ascenseur'],
                        ['balcon', 'Balcon'],
                        ['terrasse', 'Terrasse'],
                        ['cave', 'Cave'],
                        ['parking', 'Parking'],
                      ] as [keyof FormData, string][]).map(([key, label]) => (
                        <LandingCheckbox
                          key={key}
                          id={String(key)}
                          checked={Boolean(watch(key))}
                          onCheckedChange={(c) => setValue(key, c as any)}
                          label={label}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Step 2 ─── */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Conditions de votre bail actuel</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <LandingInput label="Loyer net (CHF)" required {...register('loyer_net')} type="text" inputMode="decimal" pattern="[0-9]*" placeholder="1800" error={errors.loyer_net?.message} />
                    <LandingInput label="Charges (CHF)" {...register('charges')} type="text" inputMode="decimal" pattern="[0-9]*" placeholder="200" />
                  </div>

                  {loyerBrut && (
                    <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">Loyer brut estimé : </span>
                      <span className="font-bold text-primary">{loyerBrut}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LandingInput label="Date de reprise souhaitée" required type="date" {...register('date_reprise')} value={watch('date_reprise') || ''} error={errors.date_reprise?.message} />
                    <LandingInput label="Date de fin officielle du bail" optional type="date" {...register('date_fin_bail')} value={watch('date_fin_bail') || ''} />
                  </div>

                  <LandingRadioGroup
                    label="Avez-vous déjà donné votre résiliation ?"
                    required
                    columns={3}
                    value={watch('resiliation_donnee') || ''}
                    onChange={(v) => setValue('resiliation_donnee', v, { shouldValidate: true })}
                    options={[
                      { value: 'oui', label: 'Oui' },
                      { value: 'en_cours', label: 'En cours' },
                      { value: 'non', label: 'Non' },
                    ]}
                  />
                  {errors.resiliation_donnee && <p className="text-xs text-destructive">{errors.resiliation_donnee.message}</p>}

                  <LandingRadioGroup
                    label="La régie accepte-t-elle une reprise de bail ?"
                    required
                    columns={3}
                    value={watch('regie_accepte') || ''}
                    onChange={(v) => setValue('regie_accepte', v, { shouldValidate: true })}
                    options={[
                      { value: 'oui', label: 'Oui' },
                      { value: 'non', label: 'Non' },
                      { value: 'inconnu', label: 'Je ne sais pas' },
                    ]}
                  />
                  {errors.regie_accepte && <p className="text-xs text-destructive">{errors.regie_accepte.message}</p>}

                  <LandingSelect
                    label="Motif du départ"
                    value={watch('motif_depart') || ''}
                    onValueChange={(v) => setValue('motif_depart', v)}
                    options={[
                      { value: 'Déménagement', label: 'Déménagement' },
                      { value: 'Achat immobilier', label: 'Achat immobilier' },
                      { value: 'Mutation professionnelle', label: 'Mutation professionnelle' },
                      { value: 'Séparation', label: 'Séparation' },
                      { value: 'Raisons familiales', label: 'Raisons familiales' },
                      { value: 'Autre', label: 'Autre' },
                    ]}
                    placeholder="Choisir..."
                  />

                  <LandingRadioGroup
                    label="Quel est votre niveau d’urgence ?"
                    required
                    columns={1}
                    value={watch('urgence') || ''}
                    onChange={(v) => setValue('urgence', v, { shouldValidate: true })}
                    options={[
                      { value: 'tres_urgent', label: 'Très urgent', description: 'Je risque de payer deux loyers' },
                      { value: 'urgent', label: 'Urgent', description: 'Reprise souhaitée sous 30 jours' },
                      { value: 'flexible', label: 'Flexible', description: 'Pas de contrainte de date stricte' },
                    ]}
                  />
                  {errors.urgence && <p className="text-xs text-destructive">{errors.urgence.message}</p>}

                  <LandingTextarea
                    label="Description libre"
                    optional
                    {...register('description')}
                    value={watch('description') || ''}
                    placeholder="Atouts du logement, transports, commerces, écoles, vue, équipements, conditions particulières, informations utiles pour les candidats…"
                    rows={4}
                  />
                </motion.div>
              )}

              {/* ─── Step 3 ─── */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Ajoutez les photos de votre logement</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Vous pouvez ajouter jusqu’à 8 photos. Des photos lumineuses permettent
                    d’attirer plus rapidement des candidats sérieux.
                  </p>

                  <div className="relative border-2 border-dashed rounded-2xl p-8 text-center border-border bg-muted/30 hover:border-primary/50 transition-colors">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Upload en cours…</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium mb-1 text-foreground">Glissez ou sélectionnez vos photos</p>
                        <p className="text-xs text-muted-foreground mb-4">JPG, PNG, WebP — 10 Mo max par image · 8 photos max</p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleFiles(e.target.files)}
                          disabled={photos.length >= 8}
                          aria-label="Sélectionner des photos"
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-foreground text-sm pointer-events-none">
                          Parcourir les fichiers
                        </span>
                      </>
                    )}
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photos.map((p, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                          <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            aria-label={`Supprimer photo ${i + 1}`}
                            className="absolute top-1 right-1 p-1 rounded-full bg-background/90 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── Step 4 ─── */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Vos coordonnées</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <LandingInput label="Prénom" required {...register('prenom')} value={watch('prenom') || ''} error={errors.prenom?.message} />
                    <LandingInput label="Nom" required {...register('nom')} value={watch('nom') || ''} error={errors.nom?.message} />
                  </div>

                  <LandingInput label="Téléphone" required type="tel" {...register('telephone')} value={watch('telephone') || ''} placeholder="+41 79 123 45 67" error={errors.telephone?.message} />
                  <LandingInput label="Email" required type="email" {...register('email')} value={watch('email') || ''} placeholder="vous@exemple.ch" error={errors.email?.message} />

                  <LandingCheckbox
                    id="creer_compte"
                    checked={Boolean(watch('creer_compte'))}
                    onCheckedChange={(c) => setValue('creer_compte', c as boolean)}
                    label="Créer un compte pour suivre ma demande"
                    description="Optionnel — vous pourrez suivre l’avancement de la reprise dans l’espace client."
                  />

                  {watch('creer_compte') && (
                    <>
                      <LandingInput
                        label="Mot de passe"
                        required
                        type="password"
                        {...register('password')}
                        value={watch('password') || ''}
                        placeholder="8 caractères minimum"
                        error={errors.password?.message}
                        hint="Minimum 8 caractères"
                      />
                      <div className="text-center">
                        <ForgotPasswordLink defaultEmail={watch('email')} />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-border gap-4">
              <LandingButton
                variant="back"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                Précédent
              </LandingButton>
              {step < 4 ? (
                <LandingButton variant="next" onClick={next}>
                  Suivant
                </LandingButton>
              ) : (
                <LandingButton variant="submit" loading={submitting} disabled={submitting} onClick={handleSubmit(onSubmit)}>
                  Envoyer ma demande de reprise de bail
                </LandingButton>
              )}
            </div>
          </form>
        </LandingFormCard>
      </div>
    </LandingFormShell>
  );
}
