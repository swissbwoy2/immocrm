import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Home, KeyRound, MapPin, Wallet } from 'lucide-react';
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
 * Tunnel publicitaire « courtiers » (pubs Meta) : 3 questions + coordonnées, une page par question,
 * puis page de vente du mandat (/courtier/mandat). Aucun appel commercial.
 */
const TOTAL = 4;

export default function FunnelCourtier() {
  const navigate = useNavigate();
  const utm = useUTMParams();
  const [projet, setProjet] = useState<Projet | null>(null);
  const [region, setRegion] = useState('');
  const [budget, setBudget] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);

  const firstMissing = !projet ? 0 : !region ? 1 : !budget ? 2 : 3;
  const { step, dir, go, pick } = useFunnelSteps(TOTAL, firstMissing);

  useEffect(() => {
    document.title = 'Ton courtier immobilier | Logisorama';
    trackPixel('ViewContent', { content_name: 'funnel_courtier' });
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

  const questions = [
    { q: 'Tu veux louer ou acheter ?', s: 'Choisis ton projet pour commencer.' },
    { q: 'Dans quelle région ?', s: 'Là où tu aimerais vivre.' },
    projet === 'acheter'
      ? { q: "Quel est ton budget d'achat ?", s: 'Choisis une tranche.' }
      : { q: 'Quel est ton loyer maximum ?', s: 'Par mois, charges comprises.' },
    { q: 'Où t’envoyer ta solution ?', s: 'Dernière étape. Aucun appel commercial.' },
  ];

  return (
    <FunnelPage>
      <FunnelHeader step={step} total={TOTAL} />
      <FunnelMain>
        {step === 0 && (
          <FunnelIntro photo={heroPhoto} alt="Couple tenant les clés de son nouvel appartement"
            title="Ton logement, trouvé par nos courtiers"
            text="3 questions pour voir comment on cherche, visite et postule à ta place." />
        )}

        <StepTransition stepKey={step} dir={dir}>
          <Question {...questions[step]} />

          {step === 0 && (
            <ChoiceList>
              {PROJETS.map((p, i) => (
                <Choice key={p.value} index={i} selected={projet === p.value}
                  onClick={() => pick(() => { if (projet !== p.value) setBudget(''); setProjet(p.value); }, 1)}
                  icon={p.value === 'louer' ? <KeyRound className="h-6 w-6" strokeWidth={1.6} /> : <Home className="h-6 w-6" strokeWidth={1.6} />}
                  label={p.label} hint={p.hint} />
              ))}
            </ChoiceList>
          )}

          {step === 1 && (
            <ChoiceList>
              {REGIONS.map((r, i) => (
                <Choice key={r.value} index={i} selected={region === r.value} onClick={() => pick(() => setRegion(r.value), 2)}
                  icon={<MapPin className="h-6 w-6" strokeWidth={1.6} />} label={r.label} />
              ))}
            </ChoiceList>
          )}

          {step === 2 && (
            <ChoiceList>
              {budgets.map((b, i) => (
                <Choice key={b.value} index={i} selected={budget === b.value} onClick={() => pick(() => setBudget(b.value), 3)}
                  icon={<Wallet className="h-6 w-6" strokeWidth={1.6} />} label={b.label} />
              ))}
            </ChoiceList>
          )}

          {step === 3 && (
            <form className="mt-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <AnswerChips items={[
                { label: projet === 'acheter' ? 'Acheter' : 'Louer', onClick: () => go(0), icon: projet === 'acheter' ? Building2 : KeyRound },
                { label: region, onClick: () => go(1), icon: MapPin },
                { label: budgetOpt?.label ?? '', onClick: () => go(2), icon: Wallet },
              ]} />
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="f-prenom" label="Prénom" value={prenom} onChange={setPrenom} autoComplete="given-name" autoFocus error={tried ? errors.prenom : null} />
                  <Field id="f-nom" label="Nom" value={nom} onChange={setNom} autoComplete="family-name" error={tried ? errors.nom : null} />
                </div>
                <Field id="f-tel" label="Téléphone" value={telephone} onChange={setTelephone} type="tel" inputMode="tel" autoComplete="tel" error={tried ? errors.telephone : null} />
                <Field id="f-email" label="E-mail" value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="email" error={tried ? errors.email : null} />
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
