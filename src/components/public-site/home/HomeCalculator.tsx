import { useId, useMemo, useState, type FormEvent, type HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUTMParams } from '@/hooks/useUTMParams';
import { REGIONS, isEmail, isPhone, normalizePhone, prefillMandat, saveFunnel, trackPixel } from '@/pages/funnel/funnelShared';
import { AlertTriangle, ArrowLeft, ArrowRight, Calculator, CheckCircle2, Info, Landmark, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { cn } from '@/lib/utils';
import { ACCENT_BG, ACCENT_TEXT, CONTAINER, H2, Reveal, SURFACE } from './homeUi';

/*
 * Calculateur de la page d’accueil (ancre #analyse-dossier, cible du menu « Test solvabilité »
 * et des boutons du haut de page). Mêmes règles de calcul et mêmes textes que BudgetCalcSection,
 * présentés comme le tunnel /courtier : vrais libellés, champs de 56 px, résultat annoncé.
 */

const permitTypes = [
  { value: 'suisse', label: 'Nationalité suisse' }, { value: 'C', label: 'Permis C (établissement)' },
  { value: 'B', label: 'Permis B (séjour)' }, { value: 'G', label: 'Permis G (frontalier)' },
  { value: 'L', label: 'Permis L (courte durée)' }, { value: 'F', label: 'Permis F (admission provisoire)' },
  { value: 'N', label: "Permis N (requérant d’asile)" },
];

const propertyTypes = [
  { value: 'appartement', label: 'Appartement' }, { value: 'maison', label: 'Maison / Villa' },
  { value: 'immeuble', label: 'Immeuble de rendement' }, { value: 'terrain', label: 'Terrain à bâtir' },
];

const formatCHF = (amount: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount);

const FIELD = 'relative rounded-lg border border-[var(--home-field)] bg-white transition-[border-color,box-shadow] duration-150 focus-within:border-foreground focus-within:shadow-[inset_0_0_0_1px_hsl(var(--foreground))]'; // taste-skill-ignore : champ de formulaire
const FIELD_ERROR = 'border-[var(--home-error)] shadow-[inset_0_0_0_1px_var(--home-error)]'; // taste-skill-ignore : état d’erreur du champ
const LABEL = 'pointer-events-none absolute left-3 top-2 text-[12px] font-medium text-foreground/70';
const CONTROL = 'h-14 w-full rounded-lg bg-transparent px-3 pb-2 pt-6 text-[16px] text-foreground outline-none';

function NumberField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className={FIELD}>
        <label htmlFor={id} className={LABEL}>{label}</label>
        <input id={id} type="number" inputMode="numeric" min={0} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)} className={cn(CONTROL, 'tabular-nums placeholder:text-foreground/65')} />
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-foreground/70">{hint}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', autoComplete, inputMode, error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']; error?: string | null;
}) {
  const id = useId();
  return (
    <div>
      <div className={cn(FIELD, error && FIELD_ERROR)}>
        <label htmlFor={id} className={LABEL}>{label}</label>
        <input id={id} type={type} value={value} autoComplete={autoComplete} inputMode={inputMode} aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)} className={CONTROL} />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-[var(--home-error)]">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string;
}) {
  const id = useId();
  return (
    <div className={FIELD}>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(CONTROL, 'cursor-pointer appearance-none', !value && 'text-foreground/65')}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function HomeCalculator() {
  const { isAchat } = useSearchType();
  const [revenus, setRevenus] = useState('');
  const [budget, setBudget] = useState('');
  const [permit, setPermit] = useState('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true);
  const [revenusAchat, setRevenusAchat] = useState('');
  const [apport, setApport] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [showResult, setShowResult] = useState(false);
  // Étape 2 : coordonnées, enregistrées dans les leads
  const [leadOpen, setLeadOpen] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const navigate = useNavigate();
  const utm = useUTMParams();
  const reset = () => { setShowResult(false); setLeadOpen(false); };

  const resultLocation = useMemo(() => {
    const revenusNum = parseFloat(revenus) || 0;
    const budgetNum = parseFloat(budget) || 0;
    if (revenusNum <= 0) return null;
    const budgetPossible = Math.floor(revenusNum / 3);
    const isBudgetOk = budgetNum <= budgetPossible;
    const isPermitStable = ['suisse', 'C', 'B'].includes(permit);
    const hasPoursuites = !confirmNoPoursuites;
    const isSolvable = isBudgetOk && !hasPoursuites && (isPermitStable || !permit);
    const problems: string[] = [];
    if (!isBudgetOk && budgetNum > 0) problems.push(`Ton budget demandé (${formatCHF(budgetNum)}) dépasse le maximum recommandé`);
    if (hasPoursuites) problems.push('Les poursuites sont un frein majeur pour les régies');
    if (!isPermitStable && permit) problems.push('Ton type de permis rend les candidatures très difficiles');
    return { budgetPossible, isSolvable, problems };
  }, [revenus, budget, permit, confirmNoPoursuites]);

  const resultAchat = useMemo(() => {
    const revenusNum = parseFloat(revenusAchat) || 0;
    const apportNum = parseFloat(apport) || 0;
    if (revenusNum <= 0 && apportNum <= 0) return null;
    const chargesMaxAnnuelles = revenusNum * 12 * 0.33;
    const prixMaxParRevenus = chargesMaxAnnuelles / 0.05;
    const prixMaxParApport = apportNum / 0.2;
    const prixMax = Math.min(prixMaxParRevenus || Infinity, prixMaxParApport || Infinity);
    const empruntMax = prixMax * 0.8;
    const problems: string[] = [];
    let isSolvable = true;
    if (apportNum < 100000) { problems.push("Apport inférieur à CHF 100'000 - difficile d’obtenir un prêt"); isSolvable = false; }
    if (revenusNum > 0 && prixMaxParRevenus < prixMaxParApport) problems.push("Tes revenus limitent ta capacité d’emprunt (charges > 33%)");
    if (apportNum > 0 && prixMaxParApport < prixMaxParRevenus && revenusNum > 0) problems.push("Ton apport limite le prix d’achat (min 20% de fonds propres)");
    return {
      prixMax: prixMax === Infinity ? 0 : prixMax,
      empruntMax: empruntMax === Infinity ? 0 : empruntMax,
      isSolvable: isSolvable && prixMax > 0 && prixMax !== Infinity,
      problems,
    };
  }, [revenusAchat, apport]);

  const canCalculate = isAchat ? !!(revenusAchat || apport) : !!revenus;
  const result = isAchat ? resultAchat : resultLocation;
  const title = isAchat ? 'Quel bien peux-tu te permettre ?' : 'Quel loyer peux-tu te permettre ?';
  const subtitle = isAchat ? "Estime ta capacité d’achat en 30 secondes" : 'Découvre ton budget maximum en 30 secondes';
  const disclaimer = isAchat
    ? "Ce calcul est indicatif, basé sur les critères bancaires suisses (charges max 33%, fonds propres min 20%). Chaque banque a ses propres critères."
    : "Ce calcul est indicatif et basé sur la règle du tiers (loyer = 1/3 des revenus). Chaque situation est unique, nos experts peuvent t’aider à optimiser ton dossier.";

  const leadErrors = {
    prenom: prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    nom: nom.trim().length < 2 ? 'Indique ton nom.' : null,
    telephone: !isPhone(telephone) ? 'Numéro de téléphone invalide.' : null,
    email: !isEmail(email) ? 'Adresse e-mail invalide.' : null,
    region: !region ? 'Choisis une région.' : null,
  };
  const leadValid = Object.values(leadErrors).every((e) => !e);
  const ctaLabel = result?.isSolvable ? (isAchat ? 'Trouver mon bien' : 'Recevoir ma shortlist gratuite') : 'Parler à un expert';
  const intent = result?.isSolvable ? (isAchat ? 'trouver_mon_bien' : 'shortlist') : 'parler_expert';
  const err = (k: keyof typeof leadErrors) => (tried ? leadErrors[k] : null);

  const submitLead = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!leadValid || sending || !result) return;
    setSending(true);
    setSendError(null);
    const phone = normalizePhone(telephone);
    const cleanEmail = email.trim().toLowerCase();
    const typeRecherche = isAchat ? 'achat' : 'location';
    const revenusNum = parseFloat(isAchat ? revenusAchat : revenus) || null;
    const budgetMax = isAchat ? (resultAchat ? Math.round(resultAchat.prixMax) || null : null) : (resultLocation?.budgetPossible ?? null);
    const budgetSouhaite = parseFloat(budget) || 0;
    const permitLabel = permitTypes.find((p) => p.value === permit)?.label ?? null;
    const typeBienLabel = propertyTypes.find((p) => p.value === propertyType)?.label ?? null;
    const resume = isAchat && resultAchat
      ? `Prix d’achat maximum estimé ${formatCHF(resultAchat.prixMax)}, capacité d’emprunt ${formatCHF(resultAchat.empruntMax)}, apport ${apport ? formatCHF(parseFloat(apport) || 0) : 'non indiqué'}`
      : `Budget maximum recommandé ${formatCHF(resultLocation?.budgetPossible ?? 0)}/mois${budgetSouhaite ? `, budget souhaité ${formatCHF(budgetSouhaite)}/mois` : ''}`;
    const notes = `Calculateur de la page d’accueil, bouton « ${ctaLabel} ». ${resume}. ${
      result.isSolvable ? 'Profil solide.' : `Points d’attention : ${result.problems.join(' ; ')}.`
    }`;
    try {
      const { error } = await supabase.from('leads').insert({
        email: cleanEmail,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: phone,
        phone_e164: phone.startsWith('+') ? phone : null,
        localite: region,
        localite_recherche: region,
        budget: budgetSouhaite ? String(budgetSouhaite) : budgetMax ? String(budgetMax) : null,
        budget_max_chf: budgetMax,
        type_recherche: typeRecherche,
        source: 'accueil_calculateur',
        formulaire: intent,
        revenu_net_mensuel_chf: revenusNum,
        ratio_revenu_loyer: !isAchat && revenusNum && budgetSouhaite ? Math.round((revenusNum / budgetSouhaite) * 100) / 100 : null,
        permis_nationalite: isAchat ? null : permitLabel,
        poursuites: isAchat ? false : !confirmNoPoursuites,
        apport_personnel: isAchat && apport ? apport : null,
        type_bien: isAchat ? typeBienLabel : null,
        notes,
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
          localite: region, budget: budgetMax ? String(budgetMax) : null, type_recherche: typeRecherche,
          utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
        },
      }).catch((e2) => console.error('notify-new-lead', e2));

      const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
      trackPixel('Lead', { content_name: 'accueil_calculateur', content_category: typeRecherche }, eventId);

      const answers = {
        projet: (isAchat ? 'acheter' : 'louer') as 'acheter' | 'louer',
        region,
        budget: budgetMax ? String(budgetMax) : '',
        budgetLabel: budgetMax ? (isAchat ? `Jusqu’à ${formatCHF(budgetMax)}` : `Jusqu’à ${formatCHF(budgetMax)}/mois`) : '',
        budgetMax,
        prenom: prenom.trim(), nom: nom.trim(), email: cleanEmail, telephone: phone,
      };
      saveFunnel(answers);
      // Origine du contact pour le formulaire de mandat (sans écraser un brouillon existant)
      try {
        const raw = localStorage.getItem('mandat_form_data');
        const draft = raw ? JSON.parse(raw) : {};
        if (!draft.decouverte_agence) {
          draft.decouverte_agence = 'Internet';
          localStorage.setItem('mandat_form_data', JSON.stringify(draft));
        }
      } catch { /* navigation privée */ }
      prefillMandat(answers);
      navigate('/courtier/mandat');
    } catch (e3) {
      console.error('lead accueil', e3);
      setSendError('Petit souci technique, réessaie dans un instant.');
      setSending(false);
    }
  };

  return (
    <section id="analyse-dossier" className="scroll-mt-28 bg-white pt-14 md:pt-20" aria-labelledby="home-calc-title">
      <div className={CONTAINER}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
          <Reveal>
            <h2 id="home-calc-title" className={H2}>{title}</h2>
            <p className="mt-2 text-[16px] text-foreground/80">{subtitle}</p>
            <p className="mt-1 text-[14px] text-foreground/70">Étape 1 sur 2 : ton calcul, puis tes coordonnées pour recevoir ta solution.</p>

            <form
              className="mt-6 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); if (canCalculate) setShowResult(true); }}
              noValidate
            >
              {isAchat ? (
                <>
                  <NumberField label="Revenus mensuels nets du ménage (CHF)" placeholder="Ex: 12000" value={revenusAchat}
                    onChange={(v) => { setRevenusAchat(v); reset(); }} />
                  <NumberField label="Apport personnel / Fonds propres (CHF)" placeholder="Ex: 200000" value={apport}
                    onChange={(v) => { setApport(v); reset(); }} hint="Minimum 20% du prix d’achat requis" />
                  <div className="sm:col-span-2">
                    <SelectField label="Type de bien recherché" placeholder="Sélectionne le type" value={propertyType}
                      onChange={setPropertyType} options={propertyTypes} />
                  </div>
                </>
              ) : (
                <>
                  <NumberField label="Revenus mensuels nets (CHF)" placeholder="Ex: 5500" value={revenus}
                    onChange={(v) => { setRevenus(v); reset(); }} />
                  <NumberField label="Budget souhaité (CHF/mois), optionnel" placeholder="Ex: 1800" value={budget}
                    onChange={(v) => { setBudget(v); reset(); }} />
                  <div className="sm:col-span-2">
                    <SelectField label="Statut / Permis" placeholder="Sélectionne ton statut" value={permit}
                      onChange={(v) => { setPermit(v); reset(); }} options={permitTypes} />
                  </div>
                  <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg px-4 py-3 sm:col-span-2', SURFACE)}>
                    <input type="checkbox" checked={confirmNoPoursuites}
                      onChange={(e) => { setConfirmNoPoursuites(e.target.checked); reset(); }}
                      className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-[var(--home-accent)]" />
                    <span>
                      <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">
                        <ShieldCheck className={cn('h-4 w-4', ACCENT_TEXT)} aria-hidden="true" />
                        Je confirme n’avoir aucune poursuite
                      </span>
                      <span className="mt-0.5 block text-[13px] text-foreground/70">Ni actes de défaut de bien en cours</span>
                    </span>
                  </label>
                </>
              )}
              <button
                type="submit"
                disabled={!canCalculate}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 active:scale-[0.96] text-[16px] font-medium text-white transition-colors duration-150 sm:col-span-2',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
                  canCalculate ? cn(ACCENT_BG, 'cursor-pointer') : 'cursor-not-allowed bg-[var(--home-accent-disabled)]',
                )}
              >
                {isAchat ? <Landmark className="h-5 w-5" aria-hidden="true" /> : <Calculator className="h-5 w-5" aria-hidden="true" />}
                {isAchat ? "Calculer ma capacité d’achat" : 'Calculer mon budget'}
              </button>
            </form>

            <p className="mt-4 flex gap-2 text-[13px] leading-[1.5] text-foreground/70">
              <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              {disclaimer}
            </p>
          </Reveal>

          {/* Résultat : carte grise, collante sur ordinateur */}
          <div>
            <div className={cn('rounded-[14px] p-6 lg:sticky lg:top-28', SURFACE)} aria-live="polite">
              {!showResult || !result ? (
                <div className="flex min-h-[180px] flex-col items-start justify-center">
                  {isAchat ? <Landmark className="h-7 w-7 text-foreground/60" aria-hidden="true" /> : <Calculator className="h-7 w-7 text-foreground/60" aria-hidden="true" />}
                  <p className="mt-3 text-[16px] text-foreground/80">Remplis le formulaire pour voir ton résultat</p>
                </div>
              ) : (
                <div>
                  {isAchat && resultAchat ? (
                    <>
                      <p className="text-[14px] text-foreground/70">Prix d’achat maximum estimé</p>
                      <p className="mt-1 text-[32px] font-semibold leading-tight tabular-nums text-foreground">{formatCHF(resultAchat.prixMax)}</p>
                      {resultAchat.empruntMax > 0 && (
                        <p className="mt-1 text-[15px] text-foreground/80">
                          Capacité d’emprunt : <span className="font-semibold tabular-nums">{formatCHF(resultAchat.empruntMax)}</span> (80%)
                        </p>
                      )}
                    </>
                  ) : resultLocation ? (
                    <>
                      <p className="text-[14px] text-foreground/70">Budget maximum recommandé</p>
                      <p className="mt-1 text-[32px] font-semibold leading-tight tabular-nums text-foreground">
                        {formatCHF(resultLocation.budgetPossible)}
                        <span className="text-[17px] font-normal text-foreground/70">/mois</span>
                      </p>
                    </>
                  ) : null}

                  {result.isSolvable ? (
                    <div className="mt-5 rounded-lg bg-white p-4">
                      <p className={cn('flex items-center gap-2 text-[16px] font-semibold', ACCENT_TEXT)}>
                        <CheckCircle2 className="h-5 w-5 flex-none" aria-hidden="true" />
                        {isAchat ? "Ta capacité d’achat est solide !" : 'Ton profil est solide !'}
                      </p>
                      <p className="mt-1 text-[15px] text-foreground/80">
                        {isAchat ? 'Avec nos experts, trouve le bien idéal dans ton budget.' : 'Avec nos experts, tu as toutes les chances de trouver rapidement.'}
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-5 space-y-2">
                      {result.problems.map((p) => (
                        <li key={p} className="flex gap-2 rounded-lg bg-[var(--home-notice-bg)] p-3 text-[14px] leading-[1.45] text-[var(--home-notice-ink)]">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}

                  {!leadOpen ? (
                    <button
                      type="button"
                      onClick={() => { setLeadOpen(true); setTried(false); setSendError(null); }}
                      className={cn(
                        'mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 active:scale-[0.96] text-[16px] font-medium transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
                        result.isSolvable ? cn(ACCENT_BG, 'text-white') : 'imr-lg-glass text-foreground',
                      )}
                    >
                      {ctaLabel}
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : (
                    <form onSubmit={submitLead} noValidate className="mt-5 rounded-lg bg-white p-4" aria-label={ctaLabel}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[16px] font-semibold text-foreground">Où t’envoyer ta solution ?</p>
                        <span className="flex-none text-[13px] text-foreground/70">Étape 2 sur 2</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1" aria-hidden="true">
                        <span className="h-1 rounded-full bg-[var(--home-accent)]" />
                        <span className="h-1 rounded-full bg-[var(--home-accent)]" />
                      </div>
                      <p className="mt-2 text-[14px] text-foreground/80">Aucun appel commercial. Ton courtier te répond par e-mail.</p>

                      <div className="mt-4 grid gap-3">
                        <TextField label="Prénom" value={prenom} onChange={setPrenom} autoComplete="given-name" error={err('prenom')} />
                        <TextField label="Nom" value={nom} onChange={setNom} autoComplete="family-name" error={err('nom')} />
                        <TextField label="Téléphone" type="tel" inputMode="tel" value={telephone} onChange={setTelephone} autoComplete="tel" error={err('telephone')} />
                        <TextField label="E-mail" type="email" inputMode="email" value={email} onChange={setEmail} autoComplete="email" error={err('email')} />
                        <div>
                          <SelectField label="Région recherchée" placeholder="Choisis une région" value={region} onChange={setRegion} options={REGIONS} />
                          {err('region') && <p className="mt-1.5 text-[13px] text-[var(--home-error)]">{err('region')}</p>}
                        </div>
                      </div>

                      {sendError && <p role="alert" className="mt-3 text-[14px] text-[var(--home-error)]">{sendError}</p>}

                      <button
                        type="submit"
                        disabled={sending}
                        aria-busy={sending}
                        className={cn(
                          'mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 active:scale-[0.96] text-[16px] font-medium text-white transition-colors duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
                          sending ? 'cursor-wait bg-[var(--home-accent-disabled)]' : cn(ACCENT_BG, 'cursor-pointer'),
                        )}
                      >
                        {sending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            Envoi en cours…
                          </>
                        ) : (
                          <>
                            {ctaLabel}
                            <ArrowRight className="h-5 w-5" aria-hidden="true" />
                          </>
                        )}
                      </button>
                      <p className="mt-3 flex items-start gap-2 text-[13px] leading-[1.45] text-foreground/70">
                        <Lock className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                        Tes informations restent confidentielles et servent uniquement à ta recherche.
                      </p>
                      <button
                        type="button"
                        onClick={() => setLeadOpen(false)}
                        className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[14px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Revenir au résultat
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
