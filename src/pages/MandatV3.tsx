import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { MandatV3FormData, initialMandatV3Data, LEGAL_CHECKBOXES } from '@/components/mandat-v3/types';
import { logMandateEvent } from '@/components/mandat-v3/useMandateAudit';
import MandatV3Step1Identity from '@/components/mandat-v3/MandatV3Step1Identity';
import MandatV3Step2Search from '@/components/mandat-v3/MandatV3Step2Search';
import MandatV3Step3RelatedParties from '@/components/mandat-v3/MandatV3Step3RelatedParties';
import MandatV3Step4Documents from '@/components/mandat-v3/MandatV3Step4Documents';
import MandatV3Step5Financial from '@/components/mandat-v3/MandatV3Step5Financial';
import MandatV3Step6Legal from '@/components/mandat-v3/MandatV3Step6Legal';
import MandatV3Step7Signature from '@/components/mandat-v3/MandatV3Step7Signature';
import logoImmorama from '@/assets/logo-immo-rama-new.png';
import { PremiumGuaranteeBanner } from '@/components/forms-premium/PremiumGuaranteeBanner';
import { PremiumProgressBlock } from '@/components/forms-premium/PremiumProgressBlock';
import { PremiumStepIndicator } from '@/components/forms-premium/PremiumStepIndicator';

const LuxuryFormBackground = lazy(() =>
  import('@/components/forms-premium/backgrounds/LuxuryFormBackground').then((m) => ({ default: m.LuxuryFormBackground }))
);

const STEPS = [
  { label: 'Identité', number: 1, icon: '👤' },
  { label: 'Recherche', number: 2, icon: '🔍' },
  { label: 'Tiers', number: 3, icon: '🤝' },
  { label: 'Documents', number: 4, icon: '📄' },
  { label: 'Finances', number: 5, icon: '💰' },
  { label: 'Juridique', number: 6, icon: '⚖️' },
  { label: 'Signature', number: 7, icon: '✍️' },
];

const SESSION_KEY = 'mandat_v3_session';

function getEdgeFunctionUrl(name: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/${name}`;
}

export default function MandatV3() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MandatV3FormData>(initialMandatV3Data);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { mandateId: mId, accessToken: at } = JSON.parse(saved);
        if (mId && at) {
          setMandateId(mId);
          setAccessToken(at);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveSession = (mId: string, at: string) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ mandateId: mId, accessToken: at }));
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };

  const updateForm = (partial: Partial<MandatV3FormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const callUpdateDraft = async (action: string, data: Record<string, unknown>) => {
    const response = await fetch(getEdgeFunctionUrl('mandate-update-draft'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mandate_id: mandateId, access_token: accessToken, action, data }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erreur mise à jour');
    }
    return result;
  };

  const createMandate = async () => {
    const response = await fetch(getEdgeFunctionUrl('mandate-create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email, prenom: formData.prenom, nom: formData.nom,
        telephone: formData.telephone, date_naissance: formData.date_naissance,
        nationalite: formData.nationalite, adresse: formData.adresse,
        npa: formData.npa, ville: formData.ville, type_permis: formData.type_permis,
        etat_civil: formData.etat_civil, profession: formData.profession,
        employeur: formData.employeur, revenus_mensuels: formData.revenus_mensuels,
        nombre_enfants: formData.nombre_enfants, animaux: formData.animaux,
        notes_personnelles: formData.notes_personnelles,
        type_recherche: formData.type_recherche, type_bien: formData.type_bien,
        zone_recherche: formData.zone_recherche, pieces_min: formData.pieces_min,
        budget_max: formData.budget_max, date_entree_souhaitee: formData.date_entree_souhaitee,
        criteres_obligatoires: formData.criteres_obligatoires,
        criteres_souhaites: formData.criteres_souhaites,
      }),
    });
    const result = await response.json();
    if (!result.success) { toast.error(result.error || 'Erreur lors de la création'); return null; }
    setMandateId(result.mandate_id);
    setAccessToken(result.access_token);
    saveSession(result.mandate_id, result.access_token);
    await logMandateEvent(result.mandate_id, 'mandate_created', 'Mandat créé', true);
    return result.mandate_id;
  };

  const saveIdentity = async () => {
    await callUpdateDraft('update_identity', {
      email: formData.email, prenom: formData.prenom, nom: formData.nom,
      telephone: formData.telephone, date_naissance: formData.date_naissance,
      nationalite: formData.nationalite, adresse: formData.adresse,
      npa: formData.npa, ville: formData.ville, type_permis: formData.type_permis,
      etat_civil: formData.etat_civil, profession: formData.profession,
      employeur: formData.employeur, revenus_mensuels: formData.revenus_mensuels,
      nombre_enfants: formData.nombre_enfants, animaux: formData.animaux,
      notes_personnelles: formData.notes_personnelles,
    });
  };

  const saveSearch = async () => {
    await callUpdateDraft('update_search', {
      type_recherche: formData.type_recherche, type_bien: formData.type_bien,
      zone_recherche: formData.zone_recherche, pieces_min: formData.pieces_min,
      budget_max: formData.budget_max, date_entree_souhaitee: formData.date_entree_souhaitee,
      criteres_obligatoires: formData.criteres_obligatoires,
      criteres_souhaites: formData.criteres_souhaites,
    });
  };

  const saveRelatedParties = async () => {
    for (const party of formData.related_parties) {
      await callUpdateDraft('add_related_party', {
        role: party.role, prenom: party.prenom, nom: party.nom,
        email: party.email, telephone: party.telephone,
        date_naissance: party.date_naissance, nationalite: party.nationalite,
        type_permis: party.type_permis, profession: party.profession,
        employeur: party.employeur, revenus_mensuels: party.revenus_mensuels,
        lien_avec_mandant: party.lien_avec_mandant,
      });
    }
  };

  const saveLegalCheckboxes = async () => {
    const legalData: Record<string, boolean> = {};
    LEGAL_CHECKBOXES.forEach((cb) => {
      legalData[cb.key] = formData[cb.key as keyof MandatV3FormData] as boolean;
    });
    await callUpdateDraft('update_legal_checkboxes', legalData);
  };

  const handleNext = async () => {
    try {
      if (step === 1) {
        if (!formData.email || !formData.prenom || !formData.nom || !formData.telephone) {
          toast.error('Veuillez remplir les champs obligatoires');
          return;
        }
        if (!mandateId) { const mId = await createMandate(); if (!mId) return; }
        else { await saveIdentity(); }
      }
      if (step === 2 && mandateId) { await saveSearch(); }
      if (step === 3 && mandateId) { await saveRelatedParties(); }
      if (step === 6 && mandateId) { await saveLegalCheckboxes(); }
      setStep((s) => Math.min(s + 1, 7));
    } catch (err: any) {
      console.error('Step save error:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleSubmitSignature = async () => {
    if (!mandateId || !accessToken || !formData.signature_data) return;
    setIsSubmitting(true);
    try {
      await saveLegalCheckboxes();
      const response = await fetch(getEdgeFunctionUrl('mandate-submit-signature'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandate_id: mandateId, access_token: accessToken,
          signature_data: formData.signature_data, email: formData.email,
        }),
      });
      const result = await response.json();
      if (!result.success) { toast.error(result.error || 'Erreur lors de la signature'); return; }
      clearSession();
      setIsSubmitted(true);
      toast.success('Mandat signé avec succès !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressValue = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[hsl(30_15%_8%)] relative overflow-x-hidden"
    >
      <Suspense fallback={null}>
        <LuxuryFormBackground />
      </Suspense>

      <div className="relative z-10 max-w-3xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        {/* Header décoratif retiré — logo et compteur sont gérés par PremiumGuaranteeBanner + ProgressBlock */}

        {/* Hero garantie 90 jours + Bloc progression + Stepper Lucide */}
        {!isSubmitted && (
          <motion.div
            className="mb-6 sm:mb-8 -mx-3 sm:-mx-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <PremiumGuaranteeBanner />
            <PremiumProgressBlock
              currentStep={step - 1}
              totalSteps={STEPS.length}
              stepTitle={STEPS.find((s) => s.number === step)?.label ?? ''}
            />
            <PremiumStepIndicator
              steps={STEPS.map((s) => ({ title: s.label, icon: s.icon }))}
              currentStep={step - 1}
            />
          </motion.div>
        )}

        {/* Step content card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.85)] backdrop-blur-sm shadow-[0_8px_40px_hsl(30_15%_4%/0.6)] p-4 sm:p-6 md:p-8"
            style={{
              background: 'linear-gradient(145deg, hsl(30 12% 11% / 0.9) 0%, hsl(30 10% 9% / 0.95) 100%)',
            }}
          >
            {/* Gold corner accent */}
            <div className="absolute top-0 left-0 w-24 h-24 rounded-tl-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[hsl(38_45%_48%/0.06)] to-transparent" />
            </div>

            {/* Step header interne retiré — progression gérée par ProgressBlock + StepIndicator au-dessus */}

            {/* Step components — zero changes to their internals */}
            {step === 1 && <MandatV3Step1Identity data={formData} onChange={updateForm} />}
            {step === 2 && <MandatV3Step2Search data={formData} onChange={updateForm} />}
            {step === 3 && <MandatV3Step3RelatedParties data={formData} onChange={updateForm} />}
            {step === 4 && <MandatV3Step4Documents data={formData} mandateId={mandateId} accessToken={accessToken} onChange={updateForm} />}
            {step === 5 && <MandatV3Step5Financial />}
            {step === 6 && <MandatV3Step6Legal data={formData} mandateId={mandateId} onChange={updateForm} />}
            {step === 7 && (
              <MandatV3Step7Signature
                data={formData} mandateId={mandateId} onChange={updateForm}
                onSubmitSignature={handleSubmitSignature}
                isSubmitting={isSubmitting} isSubmitted={isSubmitted}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!isSubmitted && (
          <motion.div
            className="flex justify-between mt-4 sm:mt-5 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <motion.button
              type="button"
              whileHover={step === 1 ? {} : { scale: 1.02 }}
              whileTap={step === 1 ? {} : { scale: 0.98 }}
              onClick={() => setStep((s) => Math.max(s - 1, 1))}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium min-h-[48px] flex-1 sm:flex-none justify-center transition-all duration-200 border ${
                step === 1
                  ? 'opacity-30 cursor-not-allowed border-[hsl(30_10%_20%)] text-[hsl(40_20%_35%)] bg-transparent'
                  : 'border-[hsl(38_45%_48%/0.3)] text-[hsl(40_20%_65%)] bg-[hsl(38_45%_48%/0.06)] hover:bg-[hsl(38_45%_48%/0.12)] hover:border-[hsl(38_45%_48%/0.5)]'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Précédent</span>
            </motion.button>

            {step < 7 && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, boxShadow: '0 0 28px hsl(38 45% 48% / 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className="relative flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold min-h-[48px] flex-1 sm:flex-none justify-center overflow-hidden bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] text-[hsl(30_15%_8%)] shadow-[0_4px_16px_hsl(38_45%_48%/0.2)] transition-shadow duration-200"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                />
                <span className="relative z-10 hidden xs:inline">Suivant</span>
                <ArrowRight className="relative z-10 h-4 w-4" />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Trust footer */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-6 text-[10px] text-[hsl(40_20%_32%)] tracking-wider uppercase">
            <span>🔒 SSL sécurisé</span>
            <span className="w-px h-3 bg-[hsl(40_20%_25%)]" />
            <span>🇨🇭 Données en Suisse</span>
            <span className="w-px h-3 bg-[hsl(40_20%_25%)]" />
            <span>🛡️ RGPD conforme</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
