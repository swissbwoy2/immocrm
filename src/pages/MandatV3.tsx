import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

const STEPS = [
  { label: 'Identité', number: 1 },
  { label: 'Recherche', number: 2 },
  { label: 'Tiers', number: 3 },
  { label: 'Documents', number: 4 },
  { label: 'Finances', number: 5 },
  { label: 'Juridique', number: 6 },
  { label: 'Signature', number: 7 },
];

export default function MandatV3() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MandatV3FormData>(initialMandatV3Data);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateForm = (partial: Partial<MandatV3FormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  // Save/create mandate in DB when leaving step 1
  const saveMandateToDB = async () => {
    if (mandateId) {
      // Update existing
      await supabase.from('mandates' as any).update({
        email: formData.email,
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone,
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
      } as any).eq('id', mandateId);
      return mandateId;
    }

    // Create new
    const { data, error } = await supabase.from('mandates' as any).insert({
      email: formData.email,
      prenom: formData.prenom,
      nom: formData.nom,
      telephone: formData.telephone,
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
    } as any).select('id').single();

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
      return null;
    }

    const newId = (data as any)?.id;
    setMandateId(newId);
    await logMandateEvent(newId, 'mandate_created', 'Mandat créé', true);
    return newId;
  };

  // Save related parties
  const saveRelatedParties = async (mId: string) => {
    for (const party of formData.related_parties) {
      await supabase.from('mandate_related_parties' as any).insert({
        mandate_id: mId,
        role: party.role,
        prenom: party.prenom,
        nom: party.nom,
        email: party.email,
        telephone: party.telephone,
        date_naissance: party.date_naissance,
        nationalite: party.nationalite,
        type_permis: party.type_permis,
        profession: party.profession,
        employeur: party.employeur,
        revenus_mensuels: party.revenus_mensuels,
        lien_avec_mandant: party.lien_avec_mandant,
      } as any);
    }
  };

  // Update legal checkboxes in DB
  const saveLegalCheckboxes = async (mId: string) => {
    const legalData: Record<string, boolean> = {};
    LEGAL_CHECKBOXES.forEach((cb) => {
      legalData[cb.key] = formData[cb.key as keyof MandatV3FormData] as boolean;
    });
    await supabase.from('mandates' as any).update(legalData as any).eq('id', mId);
  };

  const handleNext = async () => {
    // Validate step 1
    if (step === 1) {
      if (!formData.email || !formData.prenom || !formData.nom || !formData.telephone) {
        toast.error('Veuillez remplir les champs obligatoires');
        return;
      }
      const mId = await saveMandateToDB();
      if (!mId) return;
    }

    // Save search criteria on step 2
    if (step === 2 && mandateId) {
      await saveMandateToDB();
    }

    // Save related parties on step 3
    if (step === 3 && mandateId) {
      await saveRelatedParties(mandateId);
    }

    // Save legal checkboxes on step 6
    if (step === 6 && mandateId) {
      await saveLegalCheckboxes(mandateId);
    }

    setStep((s) => Math.min(s + 1, 7));
  };

  const handleSubmitSignature = async () => {
    if (!mandateId || !formData.signature_data) return;

    setIsSubmitting(true);
    try {
      // Save legal checkboxes first
      await saveLegalCheckboxes(mandateId);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mandate-submit-signature`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mandate_id: mandateId,
            signature_data: formData.signature_data,
            email: formData.email,
          }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la signature');
        return;
      }

      setIsSubmitted(true);
      toast.success('Mandat signé avec succès !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mandat de recherche</h1>
          <p className="text-muted-foreground mt-2">ImmoRésidence Sàrl</p>
        </div>

        {/* Stepper */}
        {!isSubmitted && (
          <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
            {STEPS.map((s) => (
              <div key={s.number} className="flex items-center">
                <button
                  onClick={() => s.number <= step && setStep(s.number)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    s.number === step
                      ? 'bg-primary text-primary-foreground'
                      : s.number < step
                      ? 'bg-primary/20 text-primary cursor-pointer'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.number < step ? <Check className="h-3 w-3" /> : <span>{s.number}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {s.number < 7 && <div className={`w-4 h-0.5 ${s.number < step ? 'bg-primary/40' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step content */}
        <div className="bg-card rounded-2xl border shadow-sm p-6 md:p-8">
          {step === 1 && <MandatV3Step1Identity data={formData} onChange={updateForm} />}
          {step === 2 && <MandatV3Step2Search data={formData} onChange={updateForm} />}
          {step === 3 && <MandatV3Step3RelatedParties data={formData} onChange={updateForm} />}
          {step === 4 && <MandatV3Step4Documents data={formData} mandateId={mandateId} onChange={updateForm} />}
          {step === 5 && <MandatV3Step5Financial />}
          {step === 6 && <MandatV3Step6Legal data={formData} mandateId={mandateId} onChange={updateForm} />}
          {step === 7 && (
            <MandatV3Step7Signature
              data={formData}
              mandateId={mandateId}
              onChange={updateForm}
              onSubmitSignature={handleSubmitSignature}
              isSubmitting={isSubmitting}
              isSubmitted={isSubmitted}
            />
          )}
        </div>

        {/* Navigation */}
        {!isSubmitted && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(s - 1, 1))}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Précédent
            </Button>
            {step < 7 && (
              <Button onClick={handleNext} className="gap-2">
                Suivant <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
