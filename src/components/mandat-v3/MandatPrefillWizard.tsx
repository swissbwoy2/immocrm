import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Send, Loader2, ShieldAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData, initialMandatV3Data, LEGAL_CHECKBOXES } from '@/components/mandat-v3/types';
import MandatV3Step1Identity from '@/components/mandat-v3/MandatV3Step1Identity';
import MandatV3Step2Search from '@/components/mandat-v3/MandatV3Step2Search';
import MandatV3Step3RelatedParties from '@/components/mandat-v3/MandatV3Step3RelatedParties';
import MandatV3Step4Documents from '@/components/mandat-v3/MandatV3Step4Documents';
import MandatV3Step5Financial from '@/components/mandat-v3/MandatV3Step5Financial';
import MandatV3Step6Legal from '@/components/mandat-v3/MandatV3Step6Legal';

const STEPS = [
  { label: 'Identité', number: 1 },
  { label: 'Recherche', number: 2 },
  { label: 'Tiers', number: 3 },
  { label: 'Documents', number: 4 },
  { label: 'Finances', number: 5 },
  { label: 'Juridique', number: 6 },
];

function getEdgeFunctionUrl(name: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/${name}`;
}

interface Props {
  /** Optional: pre-fill identity from an existing client */
  initialData?: Partial<MandatV3FormData>;
  /** Called once the mandate has been sent to the client for signature */
  onSent?: (mandateId: string) => void;
  /** Optional client_id to link mandate to */
  clientId?: string;
}

export default function MandatPrefillWizard({ initialData, onSent, clientId }: Props) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MandatV3FormData>({ ...initialMandatV3Data, ...initialData });
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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
    if (!result.success) throw new Error(result.error || 'Erreur mise à jour');
    return result;
  };

  const createMandate = async () => {
    // Staff mode: minimal fallback values for required fields
    const payload = {
      email: formData.email || `prefill-${Date.now()}@placeholder.local`,
      prenom: formData.prenom || 'À compléter',
      nom: formData.nom || 'À compléter',
      telephone: formData.telephone || ' ',
      date_naissance: formData.date_naissance,
      nationalite: formData.nationalite,
      adresse: formData.adresse,
      npa: formData.npa,
      ville: formData.ville,
      type_permis: formData.type_permis,
      etat_civil: formData.etat_civil,
      profession: formData.profession,
      employeur: formData.employeur,
      revenus_mensuels: formData.revenus_mensuels,
      nombre_enfants: formData.nombre_enfants,
      animaux: formData.animaux,
      notes_personnelles: formData.notes_personnelles,
      type_recherche: formData.type_recherche,
      type_bien: formData.type_bien,
      zone_recherche: formData.zone_recherche,
      pieces_min: formData.pieces_min,
      budget_max: formData.budget_max,
      date_entree_souhaitee: formData.date_entree_souhaitee,
      criteres_obligatoires: formData.criteres_obligatoires,
      criteres_souhaites: formData.criteres_souhaites,
    };

    const response = await fetch(getEdgeFunctionUrl('mandate-create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.success) {
      toast.error(result.error || 'Erreur lors de la création');
      return null;
    }
    setMandateId(result.mandate_id);
    setAccessToken(result.access_token);
    return result.mandate_id;
  };

  const saveCurrentStep = async () => {
    if (!mandateId) return;
    if (step === 1) {
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
    } else if (step === 2) {
      await callUpdateDraft('update_search', {
        type_recherche: formData.type_recherche, type_bien: formData.type_bien,
        zone_recherche: formData.zone_recherche, pieces_min: formData.pieces_min,
        budget_max: formData.budget_max, date_entree_souhaitee: formData.date_entree_souhaitee,
        criteres_obligatoires: formData.criteres_obligatoires,
        criteres_souhaites: formData.criteres_souhaites,
      });
    } else if (step === 6) {
      const legalData: Record<string, boolean> = {};
      LEGAL_CHECKBOXES.forEach((cb) => {
        legalData[cb.key] = formData[cb.key as keyof MandatV3FormData] as boolean;
      });
      await callUpdateDraft('update_legal_checkboxes', legalData);
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (step === 1 && !mandateId) {
        const mId = await createMandate();
        if (!mId) return;
      } else {
        await saveCurrentStep();
      }
      setStep((s) => Math.min(s + 1, STEPS.length));
    } catch (err: any) {
      console.error('Step save error:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    if (!mandateId || !accessToken) {
      toast.error('Le mandat doit être créé d\'abord (étape 1)');
      return;
    }
    if (!formData.email) {
      toast.error('L\'email du client est obligatoire pour l\'envoi');
      return;
    }
    setSending(true);
    try {
      // Save current step before sending
      await saveCurrentStep();

      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      const response = await fetch(getEdgeFunctionUrl('staff-send-mandate-for-signature'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({
          mandate_id: mandateId,
          access_token: accessToken,
          client_id: clientId,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'envoi');
        return;
      }
      setSent(true);
      toast.success('Mandat envoyé au client pour signature');
      onSent?.(mandateId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const currentStepLabel = STEPS.find((s) => s.number === step)?.label || '';
  const progressValue = ((step - 1) / (STEPS.length - 1)) * 100;

  if (sent) {
    return (
      <div ref={containerRef} className="max-w-3xl mx-auto px-3 sm:px-4 py-10 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">Mandat envoyé au client</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Un email avec le lien de signature a été envoyé à <strong>{formData.email}</strong>.
          Le client pourra compléter et signer le mandat.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Staff banner */}
      <div className="mb-4 sm:mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Mode pré-remplissage par l'agence.</strong> Aucun champ n'est obligatoire.
          La signature sera demandée au client par email.
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-6">
        <div className="sm:hidden space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Étape {step}/{STEPS.length}</span>
            <span className="text-muted-foreground">{currentStepLabel}</span>
          </div>
          <Progress value={progressValue} className="h-2" />
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.number}
                onClick={() => mandateId && setStep(s.number)}
                className={`w-2 h-2 rounded-full transition-all ${
                  s.number === step ? 'w-6 bg-primary'
                    : s.number < step ? 'bg-primary/40 cursor-pointer'
                    : 'bg-muted-foreground/20 cursor-pointer'
                }`}
                aria-label={`Étape ${s.number}: ${s.label}`}
              />
            ))}
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <div key={s.number} className="flex items-center">
              <button
                onClick={() => mandateId && setStep(s.number)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  s.number === step ? 'bg-primary text-primary-foreground'
                    : s.number < step ? 'bg-primary/20 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground cursor-pointer'
                }`}
              >
                {s.number < step ? <Check className="h-3 w-3" /> : <span>{s.number}</span>}
                <span>{s.label}</span>
              </button>
              {s.number < STEPS.length && <div className={`w-4 h-0.5 ${s.number < step ? 'bg-primary/40' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-card rounded-2xl border shadow-sm p-4 sm:p-6 md:p-8">
        {step === 1 && <MandatV3Step1Identity data={formData} onChange={updateForm} />}
        {step === 2 && <MandatV3Step2Search data={formData} onChange={updateForm} />}
        {step === 3 && <MandatV3Step3RelatedParties data={formData} onChange={updateForm} />}
        {step === 4 && <MandatV3Step4Documents data={formData} mandateId={mandateId} accessToken={accessToken} onChange={updateForm} />}
        {step === 5 && <MandatV3Step5Financial />}
        {step === 6 && <MandatV3Step6Legal data={formData} mandateId={mandateId} onChange={updateForm} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4 sm:mt-6 gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(s - 1, 1))}
          disabled={step === 1}
          className="gap-2 min-h-[48px] flex-1 sm:flex-none"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Précédent</span>
        </Button>

        {step < STEPS.length ? (
          <Button onClick={handleNext} disabled={saving} className="gap-2 min-h-[48px] flex-1 sm:flex-none">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <span className="hidden xs:inline">Suivant</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSendToClient}
            disabled={sending || !mandateId}
            variant="success"
            className="gap-2 min-h-[48px] flex-1 sm:flex-none"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer au client pour signature
          </Button>
        )}
      </div>
    </div>
  );
}
