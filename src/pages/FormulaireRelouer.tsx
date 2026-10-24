import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BedDouble, Building2, Clock, Home, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { logSignupAttempt, humanizeAuthError } from '@/lib/signupTracking';
import { ForgotPasswordLink } from '@/components/auth/ForgotPasswordLink';
import {
  CheckRow, Choice, ChoiceList, DoneScreen, Field, FunnelBottomBar, FunnelHeader, FunnelMain, FunnelPage, Note,
  PrimaryButton, Question, StepTransition, TextArea, Tile, TrustLine, useFunnelSteps,
} from '@/components/funnel-ui/FunnelKit';

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


export default function FormulaireRelouer() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Formulaire locataire sortant — Relouer mon appartement | Logisorama';
  }, []);

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
      // id généré côté client, sans .select() : un visiteur anonyme n'a pas le droit de relire la table leads,
      // et une insertion avec relecture serait refusée en entier (le lead serait perdu).
      const leadId = crypto.randomUUID();
      const { error: leadError } = await (supabase.from('leads') as any).insert({
        id: leadId,
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

      const relouerProperty = {
        lead_id: leadError ? null : leadId,
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
        date_reprise: data.date_reprise,
        date_fin_bail: data.date_fin_bail,
        resiliation_donnee: data.resiliation_donnee,
        motif_depart: data.motif_depart,
        description: data.description,
        urgence: data.urgence,
      };

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

        const provisionBody: any = {
          email: data.email,
          first_name: data.prenom,
          last_name: data.nom,
          phone: data.telephone,
          source: SOURCE,
          formulaire: SOURCE,
          parcours: PARCOURS,
          intention: 'relouer_mon_appartement',
          relouer_property: relouerProperty,
        };

        if (signUpData?.user?.id) {
          provisionBody.user_id = signUpData.user.id;
          const { error: provisionError } = await supabase.functions.invoke('create-public-user', { body: provisionBody });
          if (provisionError) {
            await logSignupAttempt({ ...baseAttempt, stage: 'provision_failed', error_message: provisionError.message });
          } else {
            await logSignupAttempt({ ...baseAttempt, stage: 'succeeded' });
          }
        } else if (alreadyRegistered) {
          const { error: provisionError } = await supabase.functions.invoke('create-public-user', { body: provisionBody });
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

  /* ---------- Parcours : une question par page ---------- */
  type StepKey = 'type' | 'adresse' | 'pieces' | 'details' | 'loyer' | 'dates' | 'resiliation' | 'regie' | 'motif' | 'urgence' | 'photos' | 'coord';
  const STEP_KEYS: StepKey[] = ['type', 'adresse', 'pieces', 'details', 'loyer', 'dates', 'resiliation', 'regie', 'motif', 'urgence', 'photos', 'coord'];
  const STEP_FIELDS: Record<StepKey, (keyof FormData)[]> = {
    type: ['type_bien'], adresse: ['adresse', 'ville'], pieces: ['nombre_pieces'], details: [], loyer: ['loyer_net'],
    dates: ['date_reprise'], resiliation: ['resiliation_donnee'], regie: ['regie_accepte'], motif: [], urgence: ['urgence'],
    photos: [], coord: ['prenom', 'nom', 'email', 'telephone', 'password'],
  };
  const v = watch();
  const answered: Record<StepKey, boolean> = {
    type: !!v.type_bien,
    adresse: (v.adresse || '').length >= 2 && (v.ville || '').length >= 2,
    pieces: !!v.nombre_pieces,
    details: true,
    loyer: !!v.loyer_net,
    dates: !!v.date_reprise,
    resiliation: !!v.resiliation_donnee,
    regie: !!v.regie_accepte,
    motif: true,
    urgence: !!v.urgence,
    photos: !uploading,
    coord: true,
  };
  const missing = STEP_KEYS.findIndex((k) => !answered[k]);
  const { step, dir, go, pick } = useFunnelSteps(STEP_KEYS.length, missing === -1 ? STEP_KEYS.length - 1 : missing);
  const current = STEP_KEYS[step];
  const isLast = step === STEP_KEYS.length - 1;

  const choose = (field: keyof FormData, value: string) =>
    pick(() => setValue(field, value as any, { shouldValidate: true }), step + 1);

  const onNext = async () => {
    const ok = await trigger(STEP_FIELDS[current]);
    if (!ok) return;
    if (isLast) handleSubmit(onSubmit)();
    else go(step + 1);
  };

  // ───── Écran de succès ─────
  if (done) {
    return (
      <DoneScreen
        title="Demande envoyée"
        cta={
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={() => navigate('/')}>Retour à l’accueil</PrimaryButton>
            <button type="button" onClick={() => navigate('/rendez-vous')}
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-lg px-4 text-[16px] font-semibold text-[#222222] underline underline-offset-4 transition-colors duration-200 hover:bg-[#f7f7f7]">
              Prendre rendez-vous
            </button>
          </div>
        }
      >
        <p>
          Votre demande a bien été transmise à Logisorama.ch. Notre équipe va analyser votre logement et vous recontacter
          rapidement pour vous aider à trouver un repreneur solvable.
        </p>
      </DoneScreen>
    );
  }

  const ico = 'h-6 w-6';
  const questions: Record<StepKey, { q: string; s?: string }> = {
    type: { q: 'Quel type de logement quittez-vous ?', s: 'Votre logement actuel.' },
    adresse: { q: 'Quelle est son adresse ?', s: 'Rue et numéro, puis NPA et ville.' },
    pieces: { q: 'Combien de pièces ?' },
    details: { q: 'Surface, étage et équipements', s: 'Facultatif, mais les candidats adorent les détails.' },
    loyer: { q: 'Quel est votre loyer actuel ?', s: 'Le loyer net et les charges, par mois.' },
    dates: { q: 'Pour quand cherchez-vous un repreneur ?' },
    resiliation: { q: 'Avez-vous déjà donné votre résiliation ?' },
    regie: { q: 'La régie accepte-t-elle une reprise de bail ?' },
    motif: { q: 'Quel est le motif de votre départ ?', s: 'Facultatif.' },
    urgence: { q: 'Quel est votre niveau d’urgence ?' },
    photos: { q: 'Présentez votre logement', s: 'Jusqu’à 8 photos et une description. Des photos lumineuses attirent plus vite des candidats sérieux.' },
    coord: { q: 'Vos coordonnées', s: 'Dernière étape.' },
  };

  const err = (k: keyof FormData) => (errors[k]?.message as string | undefined) ?? null;

  return (
    <FunnelPage>
      <FunnelHeader step={step} total={STEP_KEYS.length} />
      <FunnelMain>
        {step === 0 && (
          <section className="mb-6">
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222] md:text-[40px]">Relouer mon appartement</h1>
            <p className="mt-2 text-[16px] leading-relaxed text-[#3f3f3f]">
              Décrivez votre logement : notre équipe trouve rapidement un repreneur solvable et vous évite une double charge de loyer.
            </p>
          </section>
        )}

        <StepTransition stepKey={current} dir={dir}>
          <Question {...questions[current]} />

          {current === 'type' && (
            <ChoiceList>
              {['Studio', 'Appartement', 'Duplex', 'Maison', 'Chambre / colocation'].map((o, i) => (
                <Choice key={o} index={i} selected={v.type_bien === o} onClick={() => choose('type_bien', o)}
                  icon={o === 'Maison' ? <Home className={ico} strokeWidth={1.6} /> : o === 'Chambre / colocation' ? <BedDouble className={ico} strokeWidth={1.6} /> : <Building2 className={ico} strokeWidth={1.6} />}
                  label={o} />
              ))}
            </ChoiceList>
          )}

          {current === 'adresse' && (
            <div className="mt-5 grid gap-3">
              <div>
                <GoogleAddressAutocomplete
                  value={v.adresse || ''}
                  onChange={handleAddressChange}
                  onInputChange={(val) => setValue('adresse', val)}
                  placeholder="Rue et numéro"
                  restrictToSwitzerland
                  className="h-14 rounded-lg border-[#b0b0b0] text-[16px] text-[#222222] focus-visible:ring-[#222222]"
                />
                {err('adresse') && <p className="mt-1.5 text-[13px] text-[#c13515]">{err('adresse')}</p>}
              </div>
              <div className="grid grid-cols-[2fr_3fr] gap-3">
                <Field id="rl-npa" label="NPA" value={v.npa || ''} onChange={(val) => setValue('npa', val)} inputMode="numeric" placeholder="1207" />
                <Field id="rl-ville" label="Ville" value={v.ville || ''} onChange={(val) => setValue('ville', val, { shouldValidate: !!errors.ville })} placeholder="Genève" error={err('ville')} />
              </div>
            </div>
          )}

          {current === 'pieces' && (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5+'].map((o) => (
                <Tile key={o} selected={v.nombre_pieces === o} onClick={() => choose('nombre_pieces', o)}>{o}</Tile>
              ))}
            </div>
          )}

          {current === 'details' && (
            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field id="rl-surface" label="Surface" value={v.surface || ''} onChange={(val) => setValue('surface', val)} inputMode="decimal" suffix="m²" placeholder="80" />
                <Field id="rl-etage" label="Étage" value={v.etage || ''} onChange={(val) => setValue('etage', val)} inputMode="numeric" placeholder="3" />
              </div>
              <p className="mt-2 text-[14px] font-semibold text-[#222222]">Équipements</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {([
                  ['ascenseur', 'Ascenseur'], ['balcon', 'Balcon'], ['terrasse', 'Terrasse'], ['cave', 'Cave'], ['parking', 'Parking'],
                ] as [keyof FormData, string][]).map(([key, label]) => (
                  <Tile key={key} selected={Boolean(v[key])} onClick={() => setValue(key, !v[key] as any)}>{label}</Tile>
                ))}
              </div>
            </div>
          )}

          {current === 'loyer' && (
            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field id="rl-loyer" label="Loyer net" value={v.loyer_net || ''} onChange={(val) => setValue('loyer_net', val, { shouldValidate: !!errors.loyer_net })} inputMode="decimal" suffix="CHF" autoFocus placeholder="1800" error={err('loyer_net')} />
                <Field id="rl-charges" label="Charges" value={v.charges || ''} onChange={(val) => setValue('charges', val)} inputMode="decimal" suffix="CHF" placeholder="200" />
              </div>
              {loyerBrut && <Note>Loyer brut estimé : <strong className="font-semibold text-[#222222]">{loyerBrut}</strong></Note>}
            </div>
          )}

          {current === 'dates' && (
            <div className="mt-5 grid gap-3">
              <Field id="rl-reprise" label="Date de reprise souhaitée" type="date" value={v.date_reprise || ''} onChange={(val) => setValue('date_reprise', val, { shouldValidate: !!errors.date_reprise })} error={err('date_reprise')} />
              <Field id="rl-finbail" label="Date de fin officielle du bail (facultatif)" type="date" value={v.date_fin_bail || ''} onChange={(val) => setValue('date_fin_bail', val)} />
            </div>
          )}

          {current === 'resiliation' && (
            <ChoiceList>
              {[['oui', 'Oui'], ['en_cours', 'En cours'], ['non', 'Non']].map(([val, label], i) => (
                <Choice key={val} index={i} selected={v.resiliation_donnee === val} onClick={() => choose('resiliation_donnee', val)} label={label} />
              ))}
            </ChoiceList>
          )}

          {current === 'regie' && (
            <ChoiceList>
              {[['oui', 'Oui'], ['non', 'Non'], ['inconnu', 'Je ne sais pas']].map(([val, label], i) => (
                <Choice key={val} index={i} selected={v.regie_accepte === val} onClick={() => choose('regie_accepte', val)} label={label} />
              ))}
            </ChoiceList>
          )}

          {current === 'motif' && (
            <ChoiceList>
              {['Déménagement', 'Achat immobilier', 'Mutation professionnelle', 'Séparation', 'Raisons familiales', 'Autre'].map((o, i) => (
                <Choice key={o} index={i} selected={v.motif_depart === o} onClick={() => choose('motif_depart', o)} label={o} />
              ))}
            </ChoiceList>
          )}

          {current === 'urgence' && (
            <ChoiceList>
              {[
                ['tres_urgent', 'Très urgent', 'Je risque de payer deux loyers'],
                ['urgent', 'Urgent', 'Reprise souhaitée sous 30 jours'],
                ['flexible', 'Flexible', 'Pas de contrainte de date stricte'],
              ].map(([val, label, hint], i) => (
                <Choice key={val} index={i} selected={v.urgence === val} onClick={() => choose('urgence', val)}
                  icon={<Clock className={ico} strokeWidth={1.6} />} label={label} hint={hint} />
              ))}
            </ChoiceList>
          )}

          {current === 'photos' && (
            <div className="mt-5 grid gap-4">
              <div className="relative rounded-[14px] bg-[#f7f7f7] p-8 text-center transition-colors duration-200 hover:bg-[#f2f2f2]">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#222222]" />
                    <p className="text-[15px] text-[#3f3f3f]">Envoi des photos…</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-7 w-7 text-[#222222]" strokeWidth={1.6} />
                    <p className="mt-3 text-[16px] font-semibold text-[#222222]">Ajouter des photos</p>
                    <p className="mt-1 text-[14px] text-[#6a6a6a]">JPG, PNG ou WebP · 10 Mo max · 8 photos max</p>
                    <input type="file" accept="image/*" multiple className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(e) => handleFiles(e.target.files)} disabled={photos.length >= 8} aria-label="Sélectionner des photos" />
                  </>
                )}
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((p, i) => (
                    <div key={p.path} className="relative aspect-square overflow-hidden rounded-[14px]">
                      <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removePhoto(i)} aria-label={`Supprimer la photo ${i + 1}`}
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-[#222222]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <TextArea id="rl-desc" label="Description (facultatif)" value={v.description || ''} onChange={(val) => setValue('description', val)} rows={4}
                placeholder="Atouts du logement, transports, commerces, écoles, vue, conditions particulières…" />
            </div>
          )}

          {current === 'coord' && (
            <form className="mt-5" noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="rl-prenom" label="Prénom" value={v.prenom || ''} onChange={(val) => setValue('prenom', val, { shouldValidate: !!errors.prenom })} autoComplete="given-name" autoFocus error={err('prenom')} />
                  <Field id="rl-nom" label="Nom" value={v.nom || ''} onChange={(val) => setValue('nom', val, { shouldValidate: !!errors.nom })} autoComplete="family-name" error={err('nom')} />
                </div>
                <Field id="rl-tel" label="Téléphone" type="tel" inputMode="tel" value={v.telephone || ''} onChange={(val) => setValue('telephone', val, { shouldValidate: !!errors.telephone })} autoComplete="tel" placeholder="+41 79 123 45 67" error={err('telephone')} />
                <Field id="rl-email" label="E-mail" type="email" inputMode="email" value={v.email || ''} onChange={(val) => setValue('email', val, { shouldValidate: !!errors.email })} autoComplete="email" placeholder="vous@exemple.ch" error={err('email')} />
                <CheckRow id="rl-compte" checked={Boolean(v.creer_compte)} onChange={(c) => setValue('creer_compte', c)}>
                  Créer un compte pour suivre ma demande
                  <span className="mt-0.5 block text-[14px] text-[#6a6a6a]">Facultatif : vous suivrez l’avancement de la reprise dans l’espace client.</span>
                </CheckRow>
                {v.creer_compte && (
                  <>
                    <Field id="rl-pass" label="Mot de passe (8 caractères minimum)" type="password" value={v.password || ''} onChange={(val) => setValue('password', val, { shouldValidate: !!errors.password })} autoComplete="new-password" error={err('password')} />
                    <div className="text-center"><ForgotPasswordLink defaultEmail={v.email} /></div>
                  </>
                )}
              </div>
              <button type="submit" className="sr-only">Envoyer</button>
            </form>
          )}
        </StepTransition>

        <TrustLine />
      </FunnelMain>

      <FunnelBottomBar step={step} total={STEP_KEYS.length} onBack={() => go(step - 1)} onNext={onNext}
        nextDisabled={!isLast && !answered[current]} loading={submitting}
        nextLabel={isLast ? 'Envoyer ma demande' : 'Suivant'} />
    </FunnelPage>
  );
}
