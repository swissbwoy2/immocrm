import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { Building2, Check, ChevronLeft, Home, KeyRound, Loader2, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUTMParams } from '@/hooks/useUTMParams';
import logo from '@/assets/logisorama-logo.png';
import heroPhoto from '@/assets/hero-couple-keys.jpg';
import {
  PROJETS, REGIONS, budgetsFor, isEmail, isPhone, normalizePhone, prefillMandat, saveFunnel, trackPixel,
  type Projet,
} from './funnelShared';

/*
 * Tunnel publicitaire « courtiers » — langage visuel type marketplace (référence Airbnb) :
 * fond blanc, texte encre #222222, un seul accent (vert Logisorama #2C9273), coins arrondis,
 * une seule ombre, photo d'abord. Une page par question (?etape=1..4), réponses obligatoires.
 */
const ACCENT = '#1F7A5C';
const TOTAL = 4;

function Choice({ selected, onClick, icon, label, hint, index = 0 }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint?: string; index?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 * index, ease: 'easeOut' }}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex w-full cursor-pointer items-center gap-4 rounded-[14px] border bg-white px-4 py-4 text-left transition-[border-color,background-color,box-shadow] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2',
        selected ? 'border-[#222222] bg-[#f7f7f7] shadow-[inset_0_0_0_1px_#222222]' : 'border-[#dddddd] hover:border-[#222222]', // taste-skill-ignore : contrôle de formulaire
      ].join(' ')}
    >
      <span className="flex h-6 w-6 flex-none items-center justify-center text-[#222222]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-tight text-[#222222]">{label}</span>
        {hint && <span className="mt-1 block text-[14px] leading-snug text-[#6a6a6a]">{hint}</span>}
      </span>
      <span
        className={[
          'flex h-6 w-6 flex-none items-center justify-center rounded-full border transition-colors duration-200',
          selected ? 'border-[#222222] bg-[#222222] text-white' : 'border-[#b0b0b0] text-transparent', // taste-skill-ignore : case à cocher, pas du texte en dégradé
        ].join(' ')}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </motion.button>
  );
}

function Input({ id, label, value, onChange, type = 'text', autoComplete, inputMode, error, autoFocus }: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; error?: string | null; autoFocus?: boolean;
}) {
  return (
    <div>
      <div
        className={[
          'relative rounded-lg border bg-white transition-[border-color,box-shadow] duration-150',
          error ? 'border-[#c13515] shadow-[inset_0_0_0_1px_#c13515]' : 'border-[#b0b0b0] focus-within:border-[#222222] focus-within:shadow-[inset_0_0_0_1px_#222222]', // taste-skill-ignore : champ de saisie
        ].join(' ')}
      >
        <label htmlFor={id} className="pointer-events-none absolute left-3 top-2 text-[12px] font-medium text-[#6a6a6a]">{label}</label>
        <input
          id={id}
          type={type}
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className="h-14 w-full rounded-lg bg-transparent px-3 pb-2 pt-6 text-[16px] text-[#222222] outline-none"
        />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-[#c13515]">{error}</p>}
    </div>
  );
}

export default function FunnelCourtier() {
  const navigate = useNavigate();
  const utm = useUTMParams();
  const reduce = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const [projet, setProjet] = useState<Projet | null>(null);
  const [region, setRegion] = useState('');
  const [budget, setBudget] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [dir, setDir] = useState(1);
  const timer = useRef<number | null>(null);

  // Une page par question : l'étape vit dans l'URL, le retour du téléphone fonctionne.
  const rawStep = Math.min(Math.max(parseInt(params.get('etape') || '1', 10) || 1, 1), TOTAL) - 1;
  const firstMissing = !projet ? 0 : !region ? 1 : !budget ? 2 : 3;
  const step = Math.min(rawStep, firstMissing);

  useEffect(() => {
    document.title = "Ton courtier immobilier | Logisorama";
    trackPixel('ViewContent', { content_name: 'funnel_courtier' });
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  const budgets = useMemo(() => budgetsFor(projet), [projet]);
  const budgetOpt = budgets.find((b) => b.value === budget) ?? null;

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    const next = new URLSearchParams(params);
    if (to === 0) next.delete('etape'); else next.set('etape', String(to + 1));
    setParams(next);
    window.scrollTo({ top: 0 });
  };
  const pick = (fn: () => void, next: number) => {
    fn();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(next), 220);
  };

  const errors = {
    prenom: prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    nom: nom.trim().length < 2 ? 'Indique ton nom.' : null,
    telephone: !isPhone(telephone) ? 'Numéro de téléphone invalide.' : null,
    email: !isEmail(email) ? 'Adresse e-mail invalide.' : null,
  };
  const contactValid = !errors.prenom && !errors.nom && !errors.telephone && !errors.email;
  const canNext = [!!projet, !!region, !!budget, contactValid][step];

  const submit = async () => {
    setTried(true);
    if (!projet || !region || !budgetOpt || !contactValid || sending) return;
    setSending(true);
    const phone = normalizePhone(telephone);
    const cleanEmail = email.trim().toLowerCase();
    const typeRecherche = projet === 'acheter' ? 'achat' : 'location';
    try {
      const { error } = await supabase.from('leads').insert({
        email: cleanEmail,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: phone,
        phone_e164: phone.startsWith('+') ? phone : null,
        localite: region,
        localite_recherche: region,
        budget: budgetOpt.value,
        budget_max_chf: budgetOpt.max,
        type_recherche: typeRecherche,
        source: 'funnel_courtier',
        formulaire: 'courtier-meta',
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
      } as any);
      if (error) throw error;

      supabase.functions.invoke('notify-new-lead', {
        body: {
          email: cleanEmail, prenom: prenom.trim(), nom: nom.trim(), telephone: phone,
          localite: region, budget: budgetOpt.value, type_recherche: typeRecherche,
          utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
        },
      }).catch((err) => console.error('notify-new-lead', err));

      const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
      trackPixel('Lead', { content_name: 'funnel_courtier', content_category: typeRecherche }, eventId);

      const answers = {
        projet, region, budget: budgetOpt.value, budgetLabel: budgetOpt.label, budgetMax: budgetOpt.max,
        prenom: prenom.trim(), nom: nom.trim(), email: cleanEmail, telephone: phone,
      };
      saveFunnel(answers);
      prefillMandat(answers);
      navigate('/courtier/mandat');
    } catch (err) {
      console.error('funnel lead', err);
      toast.error('Petit souci technique, réessaie dans un instant.');
      setSending(false);
    }
  };

  const onNext = () => (step === TOTAL - 1 ? submit() : canNext && go(step + 1));
  const nextDisabled = sending || (step < TOTAL - 1 && !canNext);

  const questions = [
    { q: 'Tu veux louer ou acheter ?', s: 'Choisis ton projet pour commencer.' },
    { q: 'Dans quelle région ?', s: 'Là où tu aimerais vivre.' },
    projet === 'acheter'
      ? { q: "Quel est ton budget d'achat ?", s: 'Choisis une tranche.' }
      : { q: 'Quel est ton loyer maximum ?', s: 'Par mois, charges comprises.' },
    { q: 'Où t’envoyer ta solution ?', s: 'Dernière étape. Aucun appel commercial.' },
  ];

  const motionProps = reduce
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: dir * 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -24 },
        transition: { duration: 0.2, ease: 'easeOut' as const },
      };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-[100dvh] bg-white text-[#222222]" style={{ fontFamily: "Inter, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif" }}>
      <header className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <Link to="/" aria-label="Logisorama, accueil" className="cursor-pointer"><img src={logo} alt="Logisorama" className="h-6 w-auto" /></Link>
          <span className="text-[14px] font-medium text-[#6a6a6a]">Étape {step + 1} sur {TOTAL}</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-40 pt-6">
        {step === 0 && (
          <section className="mb-6">
            <div className="relative overflow-hidden rounded-[14px]">
              <img src={heroPhoto} alt="Couple tenant les clés de son nouvel appartement" className="aspect-[16/9] w-full object-cover" />
            </div>
            <h1 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222] md:text-[40px]">Ton logement, trouvé par nos courtiers</h1>
            <p className="mt-2 text-[16px] leading-relaxed text-[#3f3f3f]">
              3 questions pour voir comment on cherche, visite et postule à ta place.
            </p>
            
          </section>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={step} {...motionProps}>
            <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.2px] text-[#222222]">{questions[step].q}</h2>
            <p className="mt-1.5 text-[16px] text-[#3f3f3f]">{questions[step].s}</p>

            {step === 0 && (
              <div className="mt-5 grid gap-3">
                {PROJETS.map((p, i) => (
                  <Choice key={p.value} index={i} selected={projet === p.value}
                    onClick={() => pick(() => { if (projet !== p.value) setBudget(''); setProjet(p.value); }, 1)}
                    icon={p.value === 'louer' ? <KeyRound className="h-6 w-6" strokeWidth={1.6} /> : <Home className="h-6 w-6" strokeWidth={1.6} />}
                    label={p.label} hint={p.hint} />
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="mt-5 grid gap-3">
                {REGIONS.map((r, i) => (
                  <Choice key={r.value} index={i} selected={region === r.value} onClick={() => pick(() => setRegion(r.value), 2)}
                    icon={<MapPin className="h-6 w-6" strokeWidth={1.6} />} label={r.label} />
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="mt-5 grid gap-3">
                {budgets.map((b, i) => (
                  <Choice key={b.value} index={i} selected={budget === b.value} onClick={() => pick(() => setBudget(b.value), 3)}
                    icon={<Wallet className="h-6 w-6" strokeWidth={1.6} />} label={b.label} />
                ))}
              </div>
            )}

            {step === 3 && (
              <form className="mt-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div className="mb-5 flex flex-wrap gap-2">
                  {[
                    { t: projet === 'acheter' ? 'Acheter' : 'Louer', s: 0, i: projet === 'acheter' ? Building2 : KeyRound },
                    { t: region, s: 1, i: MapPin },
                    { t: budgetOpt?.label ?? '', s: 2, i: Wallet },
                  ].filter((c) => c.t).map((c) => (
                    <button key={c.s} type="button" onClick={() => go(c.s)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#f2f2f2] px-3 py-1.5 text-[14px] font-medium text-[#222222] transition-colors duration-200 hover:bg-[#e8e8e8]">
                      <c.i className="h-4 w-4" strokeWidth={1.8} />{c.t}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="f-prenom" label="Prénom" value={prenom} onChange={setPrenom} autoComplete="given-name" autoFocus error={tried ? errors.prenom : null} />
                    <Input id="f-nom" label="Nom" value={nom} onChange={setNom} autoComplete="family-name" error={tried ? errors.nom : null} />
                  </div>
                  <Input id="f-tel" label="Téléphone" value={telephone} onChange={setTelephone} type="tel" inputMode="tel" autoComplete="tel" error={tried ? errors.telephone : null} />
                  <Input id="f-email" label="E-mail" value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="email" error={tried ? errors.email : null} />
                </div>
                <p className="mt-4 text-[13px] leading-[1.4] text-[#6a6a6a]">
                  En continuant, tu acceptes de recevoir par e-mail nos conseils et nouvelles offres (désinscription en un clic).{' '}
                  <Link to="/politique-confidentialite" className="cursor-pointer font-medium text-[#222222] underline">Politique de confidentialité</Link>
                </p>
                <button type="submit" className="sr-only">Envoyer</button>
              </form>
            )}
          </motion.section>
        </AnimatePresence>

        <div className="mt-10 flex items-center gap-2 text-[15px] text-[#3f3f3f]">
          <ShieldCheck className="h-5 w-5 flex-none" strokeWidth={1.6} style={{ color: ACCENT }} />
          Un service Immo-Rama, agence immobilière à Crissier depuis 2016.
        </div>
      </main>

      {/* Barre d'action fixe : progression, retour, suivant */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white">
        <div className="flex h-1.5 w-full gap-1">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className="h-full flex-1 bg-[#ebebeb]">
              <div className="h-full bg-[#222222] transition-[width] duration-300 ease-out" style={{ width: i < step ? '100%' : i === step ? '40%' : '0%' }} />
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)}
              className="inline-flex h-12 cursor-pointer items-center gap-1 rounded-lg px-2 text-[16px] font-semibold text-[#222222] underline underline-offset-4 transition-colors duration-200 hover:bg-[#f7f7f7]">
              <ChevronLeft className="h-5 w-5" /> Retour
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className={[
              'inline-flex h-12 min-w-[150px] cursor-pointer items-center justify-center gap-2 rounded-lg px-6 text-[16px] font-medium text-white transition-colors duration-200',
              nextDisabled ? 'cursor-not-allowed bg-[#ebebeb] !text-[#6a6a6a]' : 'bg-[#1F7A5C] hover:bg-[#1A6B50] active:bg-[#155A43]',
            ].join(' ')}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : step === TOTAL - 1 ? 'Voir ma solution' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
