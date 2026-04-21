import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, MapPin, Wallet, CheckCircle, XCircle, Clock, ShieldCheck, Home, Building, User, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { useUTMParams } from '@/hooks/useUTMParams';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { PremiumRadioGroup } from '@/components/forms-premium/PremiumRadioGroup';
import { PremiumCheckbox } from '@/components/forms-premium/PremiumCheckbox';
import { PremiumButton } from '@/components/forms-premium/PremiumButton';
import { PremiumStepTransition } from '@/components/forms-premium/PremiumStepTransition';
import { motion } from 'framer-motion';

// Budget options for RENTAL
const budgetOptionsLocation = [
  { value: '< 1500', label: 'Moins de 1\'500 CHF' },
  { value: '1500-2000', label: '1\'500 - 2\'000 CHF' },
  { value: '2000-2500', label: '2\'000 - 2\'500 CHF' },
  { value: '2500-3000', label: '2\'500 - 3\'000 CHF' },
  { value: '3000-4000', label: '3\'000 - 4\'000 CHF' },
  { value: '> 4000', label: 'Plus de 4\'000 CHF' },
];

// Budget options for PURCHASE
const budgetOptionsAchat = [
  { value: '< 500000', label: 'Moins de 500\'000 CHF' },
  { value: '500000-750000', label: '500\'000 - 750\'000 CHF' },
  { value: '750000-1000000', label: '750\'000 - 1\'000\'000 CHF' },
  { value: '1000000-1500000', label: '1\'000\'000 - 1\'500\'000 CHF' },
  { value: '1500000-2000000', label: '1\'500\'000 - 2\'000\'000 CHF' },
  { value: '> 2000000', label: 'Plus de 2\'000\'000 CHF' },
];

// Optimized order: qualified permits first
const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C (établissement)' },
  { value: 'B', label: 'Permis B (séjour)' },
  { value: 'G', label: 'Permis G (frontalier)' },
  { value: 'Autre', label: 'Autre permis' },
];

// Property types for purchase
const typeBienOptions = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison / Villa' },
  { value: 'immeuble', label: 'Immeuble de rendement' },
  { value: 'terrain', label: 'Terrain' },
];

// Apport personnel options
const apportOptions = [
  { value: '< 100000', label: 'Moins de 100\'000 CHF' },
  { value: '100000-200000', label: '100\'000 - 200\'000 CHF' },
  { value: '200000-500000', label: '200\'000 - 500\'000 CHF' },
  { value: '> 500000', label: 'Plus de 500\'000 CHF' },
];

type FormStep = 'qualification' | 'info' | 'garant';

export function QuickLeadForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchType, isAchat } = useSearchType();
  const utmParams = useUTMParams();
  
  // Step order changed: qualification FIRST, then personal info
  const [step, setStep] = useState<FormStep>('qualification');
  
  // Step 1 - Qualification LOCATION
  const [statutEmploi, setStatutEmploi] = useState<string>('salarie');
  const [permisNationalite, setPermisNationalite] = useState('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true);
  const [aGarant, setAGarant] = useState<string>('');
  
  // Step 1 - Qualification ACHAT
  const [accordBancaire, setAccordBancaire] = useState<string>('');
  const [apportPersonnel, setApportPersonnel] = useState('');
  const [typeBien, setTypeBien] = useState('');
  
  // Step 2 - Personal info
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [localite, setLocalite] = useState('');
  const [budget, setBudget] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'qualified' | 'not_qualified' | null>(null);

  // Hydrate form from PremiumHero query params
  // Mapping: zone → localite, budget → budget, permis → permisNationalite
  useEffect(() => {
    const zoneParam = searchParams.get('zone');
    const budgetParam = searchParams.get('budget');
    const permisParam = searchParams.get('permis');
    
    if (zoneParam) setLocalite(zoneParam);              // zone → localite
    if (budgetParam) setBudget(budgetParam);             // budget → budget
    if (permisParam) setPermisNationalite(permisParam);  // permis → permisNationalite
  }, [searchParams]);

  // Validation for each step
  const isQualificationValidLocation = statutEmploi && permisNationalite;
  const isQualificationValidAchat = accordBancaire && apportPersonnel;
  const isQualificationValid = isAchat ? isQualificationValidAchat : isQualificationValidLocation;
  const isInfoValid = prenom.trim() && email.trim() && telephone.trim();

  const calculateQualification = () => {
    if (isAchat) {
      // For purchase: need bank agreement or significant apport
      const hasAccord = accordBancaire === 'oui';
      const hasGoodApport = ['200000-500000', '> 500000'].includes(apportPersonnel);
      return hasAccord || hasGoodApport;
    } else {
      // For rental
      const isSalarie = statutEmploi === 'salarie';
      const hasValidPermis = ['B', 'C', 'Suisse'].includes(permisNationalite);
      const hasPoursuites = !confirmNoPoursuites;
      const hasGarant = aGarant === 'oui';
      
      return isSalarie && hasValidPermis && (!hasPoursuites || (hasPoursuites && hasGarant));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const isQualified = calculateQualification();
    
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          email,
          prenom: prenom.trim(),
          nom: '',
          telephone: telephone.trim(),
          localite: localite || null,
          budget: budget || null,
          statut_emploi: isAchat ? null : statutEmploi,
          permis_nationalite: isAchat ? null : permisNationalite,
          poursuites: isAchat ? null : !confirmNoPoursuites,
          a_garant: isAchat ? null : (aGarant === 'oui'),
          is_qualified: isQualified,
          source: isAchat ? 'landing_quickform_achat' : 'landing_quickform',
          type_recherche: isAchat ? 'achat' : 'location',
          accord_bancaire: isAchat ? (accordBancaire === 'oui') : null,
          apport_personnel: isAchat ? apportPersonnel : null,
          type_bien: isAchat ? typeBien : null,
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_content: utmParams.utm_content,
          utm_term: utmParams.utm_term,
        });

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke('notify-new-lead', {
        body: { 
          email, 
          prenom: prenom.trim(),
          nom: '',
          telephone: telephone.trim(),
          localite: localite || null, 
          budget: budget || null,
          statut_emploi: isAchat ? null : statutEmploi,
          permis_nationalite: isAchat ? null : permisNationalite,
          poursuites: isAchat ? null : !confirmNoPoursuites,
          a_garant: isAchat ? null : (aGarant === 'oui'),
          is_qualified: isQualified,
          type_recherche: isAchat ? 'achat' : 'location',
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
        }
      }).catch((err) => console.error('Email notification error:', err));

      setSubmitResult(isQualified ? 'qualified' : 'not_qualified');

      if (isQualified) {
        // Meta Pixel Lead conversion -- fired on qualified quick lead form submission
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Lead');
          console.log('[Meta Pixel] Lead fired on qualified quick lead form submission');
        }
        navigate('/test-24h-active');
        return;
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 'qualification' && isQualificationValid) {
      if (!isAchat && !confirmNoPoursuites) {
        setStep('garant');
      } else {
        setStep('info');
      }
    } else if (step === 'garant') {
      if (aGarant === 'non') {
        setSubmitResult('not_qualified');
      } else if (aGarant === 'oui') {
        setStep('info');
      }
    } else if (step === 'info' && isInfoValid) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === 'info') {
      if (!isAchat && !confirmNoPoursuites) {
        setStep('garant');
      } else {
        setStep('qualification');
      }
    } else if (step === 'garant') {
      setStep('qualification');
    }
  };

  const budgetOptions = isAchat ? budgetOptionsAchat : budgetOptionsLocation;

  const stepKey = step === 'qualification' ? 0 : step === 'garant' ? 1 : 2;
  const stepProgress = stepKey / 2;

  if (submitResult === 'qualified') {
    return (
      <section id="quickform" className="py-8 md:py-12 bg-[hsl(30_15%_8%)]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center"
          >
            <PremiumFormCard>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[hsl(38_45%_48%/0.15)] border-2 border-[hsl(38_45%_48%/0.5)] flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-[hsl(38_55%_65%)]" />
                </div>
                <h3 className="text-xl font-bold font-serif text-[hsl(40_20%_88%)]">Félicitations {prenom} !</h3>
                <p className="text-sm text-[hsl(40_20%_55%)] leading-relaxed">
                  {isAchat
                    ? "Ton profil est qualifié ! Notre équipe analyse ta demande et te contactera sous 24h avec une sélection de biens correspondant à tes critères d'achat."
                    : "Ton profil est qualifié ! Notre équipe analyse ta demande et te contactera sous 24h avec une sélection personnalisée de biens correspondant à tes critères."}
                </p>
              </div>
            </PremiumFormCard>
          </motion.div>
        </div>
      </section>
    );
  }

  if (submitResult === 'not_qualified') {
    return (
      <section id="quickform" className="py-8 md:py-12 bg-[hsl(30_15%_8%)]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center"
          >
            <PremiumFormCard>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold font-serif text-[hsl(40_20%_88%)]">
                  Merci pour ton intérêt{prenom ? `, ${prenom}` : ''}
                </h3>
                <p className="text-sm text-[hsl(40_20%_55%)] leading-relaxed">
                  {isAchat
                    ? "Pour bénéficier de notre service d'accompagnement à l'achat, il faut avoir un accord de principe bancaire ou un apport personnel conséquent (200k+ CHF). N'hésite pas à nous recontacter quand tu auras ces éléments !"
                    : "Malheureusement, ton profil ne correspond pas à nos critères actuels pour bénéficier de notre service de shortlist. Pour être éligible, il faut être salarié(e), avoir un permis B, C ou la nationalité suisse, et ne pas avoir de poursuites (sauf si tu as un garant solvable)."}
                </p>
                <p className="text-sm text-[hsl(40_20%_45%)]">N'hésite pas à nous recontacter si ta situation évolue !</p>
              </div>
            </PremiumFormCard>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="quickform" className="py-8 md:py-16 bg-[hsl(30_15%_8%)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-[hsl(38_45%_48%/0.04)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[hsl(28_35%_35%/0.04)] rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold font-serif text-[hsl(40_20%_88%)] mb-2">
              {isAchat ? 'Reçois ta sélection de biens à acheter 🏡' : 'Reçois ta shortlist personnalisée 📬'}
            </h3>
            <p className="text-sm text-[hsl(40_20%_48%)] mb-4">Gratuit • Sans engagement • Réponse sous 24h</p>
            <div className="inline-flex items-center gap-2 text-xs text-[hsl(38_45%_55%)] bg-[hsl(38_45%_48%/0.08)] border border-[hsl(38_45%_48%/0.2)] rounded-full px-3 py-1.5">
              <Clock className="h-3 w-3" />
              <span>Réponds en 30 secondes</span>
            </div>

            {/* Progress bar */}
            <div className="flex justify-center gap-2 mt-5">
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  animate={{ backgroundColor: stepProgress > i * 0.5 ? 'hsl(38 55% 65%)' : 'hsl(38 45% 48% / 0.15)' }}
                  transition={{ duration: 0.35 }}
                  className="h-1.5 w-20 rounded-full"
                />
              ))}
            </div>
          </div>

          <PremiumFormCard>
            <PremiumStepTransition stepKey={stepKey}>

              {/* Step 1: Qualification LOCATION */}
              {step === 'qualification' && !isAchat && (
                <div className="space-y-6">
                  <PremiumRadioGroup
                    label="Es-tu salarié(e) ?"
                    required
                    value={statutEmploi}
                    onChange={setStatutEmploi}
                    options={[
                      { value: 'salarie', label: 'Oui, salarié(e)' },
                      { value: 'autre', label: 'Non' },
                    ]}
                  />
                  <PremiumSelect
                    label="Permis ou nationalité"
                    required
                    value={permisNationalite}
                    onValueChange={setPermisNationalite}
                    options={permisOptions}
                    placeholder="Sélectionne ton permis/nationalité"
                  />
                  <PremiumCheckbox
                    checked={confirmNoPoursuites}
                    onCheckedChange={setConfirmNoPoursuites}
                    label={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[hsl(38_45%_55%)]" /> Je confirme n'avoir aucune poursuite</span>}
                    description="Ni actes de défaut de bien en cours"
                  />
                </div>
              )}

              {/* Step 1: Qualification ACHAT */}
              {step === 'qualification' && isAchat && (
                <div className="space-y-6">
                  <PremiumRadioGroup
                    label="As-tu obtenu un accord de principe bancaire ?"
                    required
                    value={accordBancaire}
                    onChange={setAccordBancaire}
                    options={[
                      { value: 'oui', label: 'Oui' },
                      { value: 'non', label: 'Non / Pas encore' },
                    ]}
                  />
                  <PremiumSelect
                    label="Apport personnel disponible"
                    required
                    value={apportPersonnel}
                    onValueChange={setApportPersonnel}
                    options={apportOptions}
                    placeholder="Sélectionne ton apport"
                  />
                  <PremiumSelect
                    label="Type de bien recherché"
                    value={typeBien}
                    onValueChange={setTypeBien}
                    options={typeBienOptions}
                    placeholder="Sélectionne le type de bien"
                    icon={<Building className="h-4 w-4" />}
                  />
                  <div className="rounded-xl p-4 bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.2)] flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-[hsl(38_55%_65%)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[hsl(40_20%_80%)]">0% de commission pour l'acheteur</p>
                      <p className="text-xs text-[hsl(40_20%_48%)] mt-1">La commission est payée par le vendeur. Tu ne paies rien de plus que le prix du bien.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Garant */}
              {step === 'garant' && (
                <div className="space-y-6">
                  <div className="rounded-xl p-4 bg-orange-500/8 border border-orange-500/20">
                    <p className="text-sm text-[hsl(40_20%_60%)]">
                      Tu as indiqué avoir des poursuites ou actes de défaut de bien. Pour bénéficier de notre service, il te faut un garant solvable.
                    </p>
                  </div>
                  <PremiumRadioGroup
                    label="As-tu un garant solvable ?"
                    required
                    value={aGarant}
                    onChange={setAGarant}
                    options={[
                      { value: 'oui', label: 'Oui' },
                      { value: 'non', label: 'Non' },
                    ]}
                  />
                </div>
              )}

              {/* Step 2: Personal Info */}
              {step === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PremiumInput
                      label="Prénom"
                      required
                      type="text"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      icon={<User className="h-4 w-4" />}
                    />
                    <PremiumInput
                      label="Email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<Mail className="h-4 w-4" />}
                    />
                  </div>
                  <PremiumInput
                    label="Téléphone (pour te recontacter sous 24h)"
                    required
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    icon={<Phone className="h-4 w-4" />}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PremiumInput
                      label="Localité souhaitée"
                      optional
                      type="text"
                      value={localite}
                      onChange={(e) => setLocalite(e.target.value)}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                    <PremiumSelect
                      label={isAchat ? "Budget d'achat" : 'Budget mensuel'}
                      value={budget}
                      onValueChange={setBudget}
                      options={budgetOptions}
                      placeholder="Budget"
                      icon={<Wallet className="h-4 w-4" />}
                    />
                  </div>
                </div>
              )}

            </PremiumStepTransition>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-[hsl(38_45%_48%/0.15)]">
              {step !== 'qualification' ? (
                <PremiumButton variant="back" onClick={handleBack} />
              ) : (
                <div />
              )}
              {step === 'info' ? (
                <PremiumButton
                  variant="submit"
                  onClick={handleNext}
                  loading={isSubmitting}
                  disabled={isSubmitting || !isInfoValid}
                >
                  {isAchat ? 'Recevoir ma sélection' : 'Recevoir ma shortlist'}
                </PremiumButton>
              ) : (
                <PremiumButton
                  variant="next"
                  onClick={handleNext}
                  disabled={
                    (step === 'qualification' && !isQualificationValid) ||
                    (step === 'garant' && aGarant === '')
                  }
                >
                  Continuer
                </PremiumButton>
              )}
            </div>
          </PremiumFormCard>

          <p className="text-xs text-center text-[hsl(40_20%_35%)] mt-4">
            🔒 Tes données sont protégées et ne seront jamais partagées.{' '}
            <a href="/politique-confidentialite" className="underline hover:text-[hsl(40_20%_55%)] transition-colors">
              Politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
