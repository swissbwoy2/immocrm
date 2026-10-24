import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck, Briefcase, Building2, Home, KeyRound, Landmark, MapPin, PiggyBank, ShieldAlert, ShieldCheck, Trees, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUTMParams } from '@/hooks/useUTMParams';
import heroPhoto from '@/assets/hero-couple-keys.jpg';
import {
  AnswerChips, Choice, ChoiceList, ConsentNote, Field, FunnelBottomBar, FunnelHeader, FunnelIntro, FunnelMain,
  FunnelPage, Question, StepTransition, TrustLine, useFunnelSteps,
} from '@/components/funnel-ui/FunnelKit';
import {
  PROJETS, REGIONS, budgetsFor, isEmail, isPhone, normalizePhone, prefillMandat, saveFunnel, trackPixel,
  type Projet,
} from './funnelShared';

/*
 * Analyse gratuite du dossier (site public, boutons « Analyser gratuitement mon dossier » / « Tester ma solvabilité »).
 * Mêmes questions que l'ancien formulaire (salarié, permis, poursuites | accord bancaire, apport, type de bien),
 * précédées de projet → région → budget comme le tunnel /courtier. Plus de prise de rendez-vous téléphonique :
 * le prospect voit la page de vente du mandat, l'appel n'intervient que s'il démarre son mandat.
 */
const TOTAL = 7;

const PERMIS = [
  { value: 'Suisse', label: 'Nationalité suisse' },
  { value: 'C', label: 'Permis C', hint: 'Établissement' },
  { value: 'B', label: 'Permis B', hint: 'Séjour' },
  { value: 'G', label: 'Permis G', hint: 'Frontalier' },
  { value: 'Autre', label: 'Autre permis' },
];
const APPORTS = [
  { value: '< 100000', label: "Moins de 100'000 CHF" },
  { value: '100000-200000', label: "100'000 à 200'000 CHF" },
  { value: '200000-500000', label: "200'000 à 500'000 CHF" },
  { value: '> 500000', label: "Plus de 500'000 CHF" },
];
const TYPES_BIEN = [
  { value: 'appartement', label: 'Appartement', icon: Building2 },
  { value: 'maison', label: 'Maison ou villa', icon: Home },
  { value: 'immeuble', label: 'Immeuble de rendement', icon: Landmark },
  { value: 'terrain', label: 'Terrain', icon: Trees },
];

export default function FunnelAnalyse() {
  const navigate = useNavigate();
  const utm = useUTMParams();
  const [search] = useSearchParams();
  const initialType = search.get('type');
  const [projet, setProjet] = useState<Projet | null>(initialType === 'achat' ? 'acheter' : initialType === 'location' ? 'louer' : null);
  const [region, setRegion] = useState('');
  const [budget, setBudget] = useState('');
  // Location
  const [statutEmploi, setStatutEmploi] = useState('');
  const [permis, setPermis] = useState('');
  const [poursuites, setPoursuites] = useState<'' | 'aucune' | 'oui'>('');
  // Achat
  const [accordBancaire, setAccordBancaire] = useState('');
  const [apport, setApport] = useState('');
  const [typeBien, setTypeBien] = useState('');
  // Coordonnées
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);

  const isAchat = projet === 'acheter';
  const answered = [
    !!projet, !!region, !!budget,
    isAchat ? !!accordBancaire : !!statutEmploi,
    isAchat ? !!apport : !!permis,
    isAchat ? !!typeBien : !!poursuites,
  ];
  const firstMissing = answered.indexOf(false) === -1 ? 6 : answered.indexOf(false);
  const { step, dir, go, pick } = useFunnelSteps(TOTAL, firstMissing);

  useEffect(() => {
    document.title = 'Analyse gratuite de ton dossier | Logisorama';
    trackPixel('ViewContent', { content_name: 'analyse_dossier' });
  }, []);

  const budgets = useMemo(() => budgetsFor(projet), [projet]);
  const budgetOpt = budgets.find((b) => b.value === budget) ?? null;

  const errors = {
    prenom: prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    nom: nom.trim().length < 2 ? 'Indique ton nom.' : null,
    telephone: !isPhone(telephone) ? 'Numéro de téléphone invalide.' : null,
    email: !isEmail(email) ? 'Adresse e-mail invalide.' : null,
  };
  const contactValid = !errors.prenom && !errors.nom && !errors.telephone && !errors.email;
  const canNext = step === 6 ? contactValid : answered[step];

  const submit = async () => {
    setTried(true);
    if (!projet || !region || !budgetOpt || !contactValid || sending) return;
    setSending(true);
    const phone = normalizePhone(telephone);
    const cleanEmail = email.trim().toLowerCase();
    const typeRecherche = isAchat ? 'achat' : 'location';
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
        statut_emploi: isAchat ? null : statutEmploi,
        permis_nationalite: isAchat ? null : permis,
        poursuites: isAchat ? null : poursuites === 'oui',
        a_garant: false,
        is_qualified: true,
        source: 'landing_analyse_dossier',
        formulaire: 'analyse-dossier',
        type_recherche: typeRecherche,
        accord_bancaire: isAchat ? accordBancaire === 'oui' : null,
        apport_personnel: isAchat ? apport : null,
        type_bien: isAchat ? typeBien : null,
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
          localite: region, budget: budgetOpt.value,
          statut_emploi: isAchat ? null : statutEmploi,
          permis_nationalite: isAchat ? null : permis,
          poursuites: isAchat ? null : poursuites === 'oui',
          is_qualified: true,
          type_recherche: typeRecherche,
          utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
        },
      }).catch((err) => console.error('notify-new-lead', err));

      const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
      trackPixel('Lead', { content_name: 'analyse_dossier', content_category: typeRecherche }, eventId);

      const answers = {
        projet, region, budget: budgetOpt.value, budgetLabel: budgetOpt.label, budgetMax: budgetOpt.max,
        prenom: prenom.trim(), nom: nom.trim(), email: cleanEmail, telephone: phone,
      };
      saveFunnel(answers);
      prefillMandat(answers);
      navigate('/courtier/mandat');
    } catch (err) {
      console.error('analyse dossier lead', err);
      toast.error('Petit souci technique, réessaie dans un instant.');
      setSending(false);
    }
  };

  const onNext = () => (step === TOTAL - 1 ? submit() : canNext && go(step + 1));
  const ico = 'h-6 w-6';

  const questions = [
    { q: 'Tu veux louer ou acheter ?', s: 'Choisis ton projet pour commencer.' },
    { q: 'Dans quelle région ?', s: 'Là où tu aimerais vivre.' },
    isAchat ? { q: "Quel est ton budget d'achat ?", s: 'Choisis une tranche.' } : { q: 'Quel est ton loyer maximum ?', s: 'Par mois, charges comprises.' },
    isAchat ? { q: 'As-tu un accord de principe bancaire ?', s: 'La banque a déjà validé ton financement.' } : { q: 'Es-tu salarié(e) ?', s: 'Les régies demandent tes fiches de salaire.' },
    isAchat ? { q: 'Quel est ton apport personnel ?', s: 'Fonds propres disponibles : épargne, 2e et 3e pilier.' } : { q: 'Quel est ton permis ou ta nationalité ?', s: 'Pour préparer le bon dossier.' },
    isAchat ? { q: 'Quel type de bien recherches-tu ?' } : { q: 'As-tu des poursuites ?', s: 'Poursuites ou actes de défaut de biens en cours.' },
    { q: 'Où t’envoyer ta solution ?', s: 'Dernière étape. Aucun appel commercial.' },
  ];

  return (
    <FunnelPage>
      <FunnelHeader step={step} total={TOTAL} />
      <FunnelMain>
        {step === 0 && (
          <FunnelIntro photo={heroPhoto} alt="Couple tenant les clés de son nouveau logement"
            title="Analyse gratuite de ton dossier"
            text="6 questions pour vérifier ton dossier et voir comment nos courtiers trouvent ton logement." />
        )}

        <StepTransition stepKey={`${step}-${isAchat ? 'a' : 'l'}`} dir={dir}>
          <Question {...questions[step]} />

          {step === 0 && (
            <ChoiceList>
              {PROJETS.map((p, i) => (
                <Choice key={p.value} index={i} selected={projet === p.value}
                  onClick={() => pick(() => { if (projet !== p.value) setBudget(''); setProjet(p.value); }, 1)}
                  icon={p.value === 'louer' ? <KeyRound className={ico} strokeWidth={1.6} /> : <Home className={ico} strokeWidth={1.6} />}
                  label={p.label} hint={p.hint} />
              ))}
            </ChoiceList>
          )}

          {step === 1 && (
            <ChoiceList>
              {REGIONS.map((r, i) => (
                <Choice key={r.value} index={i} selected={region === r.value} onClick={() => pick(() => setRegion(r.value), 2)}
                  icon={<MapPin className={ico} strokeWidth={1.6} />} label={r.label} />
              ))}
            </ChoiceList>
          )}

          {step === 2 && (
            <ChoiceList>
              {budgets.map((b, i) => (
                <Choice key={b.value} index={i} selected={budget === b.value} onClick={() => pick(() => setBudget(b.value), 3)}
                  icon={<Wallet className={ico} strokeWidth={1.6} />} label={b.label} />
              ))}
            </ChoiceList>
          )}

          {step === 3 && (
            <ChoiceList>
              {isAchat ? (
                <>
                  <Choice index={0} selected={accordBancaire === 'oui'} onClick={() => pick(() => setAccordBancaire('oui'), 4)} icon={<BadgeCheck className={ico} strokeWidth={1.6} />} label="Oui" />
                  <Choice index={1} selected={accordBancaire === 'non'} onClick={() => pick(() => setAccordBancaire('non'), 4)} icon={<Landmark className={ico} strokeWidth={1.6} />} label="Non, pas encore" hint="On peut lancer l'appel d'offres bancaire pour toi." />
                </>
              ) : (
                <>
                  <Choice index={0} selected={statutEmploi === 'salarie'} onClick={() => pick(() => setStatutEmploi('salarie'), 4)} icon={<Briefcase className={ico} strokeWidth={1.6} />} label="Oui, salarié(e)" />
                  <Choice index={1} selected={statutEmploi === 'autre'} onClick={() => pick(() => setStatutEmploi('autre'), 4)} icon={<Briefcase className={ico} strokeWidth={1.6} />} label="Non" hint="Indépendant, étudiant, retraité, en recherche d'emploi…" />
                </>
              )}
            </ChoiceList>
          )}

          {step === 4 && (
            <ChoiceList>
              {isAchat
                ? APPORTS.map((a, i) => (
                    <Choice key={a.value} index={i} selected={apport === a.value} onClick={() => pick(() => setApport(a.value), 5)} icon={<PiggyBank className={ico} strokeWidth={1.6} />} label={a.label} />
                  ))
                : PERMIS.map((p, i) => (
                    <Choice key={p.value} index={i} selected={permis === p.value} onClick={() => pick(() => setPermis(p.value), 5)} icon={<ShieldCheck className={ico} strokeWidth={1.6} />} label={p.label} hint={p.hint} />
                  ))}
            </ChoiceList>
          )}

          {step === 5 && (
            <ChoiceList>
              {isAchat
                ? TYPES_BIEN.map((t, i) => (
                    <Choice key={t.value} index={i} selected={typeBien === t.value} onClick={() => pick(() => setTypeBien(t.value), 6)} icon={<t.icon className={ico} strokeWidth={1.6} />} label={t.label} />
                  ))
                : (
                  <>
                    <Choice index={0} selected={poursuites === 'aucune'} onClick={() => pick(() => setPoursuites('aucune'), 6)} icon={<ShieldCheck className={ico} strokeWidth={1.6} />} label="Non, aucune poursuite" hint="Ni acte de défaut de biens en cours." />
                    <Choice index={1} selected={poursuites === 'oui'} onClick={() => pick(() => setPoursuites('oui'), 6)} icon={<ShieldAlert className={ico} strokeWidth={1.6} />} label="Oui, j'ai des poursuites" hint="On regarde avec toi les solutions, par exemple un garant." />
                  </>
                )}
            </ChoiceList>
          )}

          {step === 6 && (
            <form className="mt-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <AnswerChips items={[
                { label: isAchat ? 'Acheter' : 'Louer', onClick: () => go(0), icon: isAchat ? Building2 : KeyRound },
                { label: region, onClick: () => go(1), icon: MapPin },
                { label: budgetOpt?.label ?? '', onClick: () => go(2), icon: Wallet },
              ]} />
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="a-prenom" label="Prénom" value={prenom} onChange={setPrenom} autoComplete="given-name" autoFocus error={tried ? errors.prenom : null} />
                  <Field id="a-nom" label="Nom" value={nom} onChange={setNom} autoComplete="family-name" error={tried ? errors.nom : null} />
                </div>
                <Field id="a-tel" label="Téléphone" value={telephone} onChange={setTelephone} type="tel" inputMode="tel" autoComplete="tel" error={tried ? errors.telephone : null} />
                <Field id="a-email" label="E-mail" value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="email" error={tried ? errors.email : null} />
              </div>
              <ConsentNote />
              <button type="submit" className="sr-only">Envoyer</button>
            </form>
          )}
        </StepTransition>

        <TrustLine />
      </FunnelMain>

      <FunnelBottomBar step={step} total={TOTAL} onBack={() => go(step - 1)} onNext={onNext}
        nextDisabled={step < TOTAL - 1 && !canNext} loading={sending}
        nextLabel={step === TOTAL - 1 ? 'Voir ma solution' : 'Suivant'} />
    </FunnelPage>
  );
}
