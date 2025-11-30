import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import logoImmorama from '@/assets/logo-immorama-2023.png';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MandatFormData, initialFormData } from '@/components/mandat/types';
import MandatFormStep1 from '@/components/mandat/MandatFormStep1';
import MandatFormStep2 from '@/components/mandat/MandatFormStep2';
import MandatFormStep3 from '@/components/mandat/MandatFormStep3';
import MandatFormStep4 from '@/components/mandat/MandatFormStep4';
import MandatFormStep5 from '@/components/mandat/MandatFormStep5';
import MandatFormStep6 from '@/components/mandat/MandatFormStep6';
import MandatFormStep7 from '@/components/mandat/MandatFormStep7';

const STORAGE_KEY = 'mandat_form_data';
const STEPS = [
  { title: 'Informations personnelles', component: MandatFormStep1 },
  { title: 'Situation actuelle', component: MandatFormStep2 },
  { title: 'Situation financière', component: MandatFormStep3 },
  { title: 'Critères de recherche', component: MandatFormStep4 },
  { title: 'Candidats', component: MandatFormStep5 },
  { title: 'Documents', component: MandatFormStep6 },
  { title: 'Signature', component: MandatFormStep7 },
];

export default function NouveauMandat() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MandatFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Charger les données sauvegardées
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData({ ...initialFormData, ...parsed });
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }
  }, []);

  // Sauvegarder automatiquement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleChange = (data: Partial<MandatFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.email && formData.prenom && formData.nom && formData.telephone &&
          formData.adresse && formData.date_naissance && formData.nationalite &&
          formData.type_permis && formData.etat_civil);
      case 1:
        return !!(formData.gerance_actuelle && formData.contact_gerance &&
          formData.loyer_actuel >= 0 && formData.depuis_le && formData.pieces_actuel > 0 &&
          formData.motif_changement);
      case 2:
        return !!(formData.profession && formData.employeur && formData.revenus_mensuels > 0);
      case 3:
        return !!(formData.decouverte_agence && formData.type_bien && formData.pieces_recherche &&
          formData.region_recherche && formData.budget_max > 0);
      case 4:
        return true; // Candidats optionnels
      case 5:
        return formData.documents_uploades.length >= 5;
      case 6:
        return !!(formData.signature_data && formData.cgv_acceptees);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez remplir tous les champs obligatoires et signer le mandat');
      return;
    }

    setSubmitting(true);

    try {
      // Vérifier si l'email existe déjà
      const { data: existing } = await supabase
        .from('demandes_mandat')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existing) {
        toast.error('Une demande existe déjà avec cet email');
        setSubmitting(false);
        return;
      }

      // Insérer la demande
      const insertData = {
        email: formData.email,
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone,
        adresse: formData.adresse,
        date_naissance: formData.date_naissance,
        nationalite: formData.nationalite,
        type_permis: formData.type_permis,
        etat_civil: formData.etat_civil,
        gerance_actuelle: formData.gerance_actuelle,
        contact_gerance: formData.contact_gerance,
        loyer_actuel: formData.loyer_actuel,
        depuis_le: formData.depuis_le,
        pieces_actuel: formData.pieces_actuel,
        charges_extraordinaires: formData.charges_extraordinaires,
        montant_charges_extra: formData.montant_charges_extra,
        poursuites: formData.poursuites,
        curatelle: formData.curatelle,
        motif_changement: formData.motif_changement,
        profession: formData.profession,
        employeur: formData.employeur,
        revenus_mensuels: formData.revenus_mensuels,
        date_engagement: formData.date_engagement || null,
        utilisation_logement: formData.utilisation_logement,
        animaux: formData.animaux,
        instrument_musique: formData.instrument_musique,
        vehicules: formData.vehicules,
        numero_plaques: formData.numero_plaques,
        decouverte_agence: formData.decouverte_agence,
        type_recherche: formData.type_recherche,
        nombre_occupants: formData.nombre_occupants,
        type_bien: formData.type_bien,
        pieces_recherche: formData.pieces_recherche,
        region_recherche: formData.region_recherche,
        budget_max: formData.budget_max,
        apport_personnel: formData.apport_personnel,
        souhaits_particuliers: formData.souhaits_particuliers,
        candidats: formData.candidats as any,
        documents_uploades: formData.documents_uploades as any,
        signature_data: formData.signature_data,
        cgv_acceptees: formData.cgv_acceptees,
        cgv_acceptees_at: new Date().toISOString(),
        code_promo: formData.code_promo,
        montant_acompte: formData.type_recherche === 'Acheter' ? 2500 : 300,
      };

      const { error } = await supabase
        .from('demandes_mandat')
        .insert(insertData as any);

      if (error) throw error;

      // Créer notification pour les admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            type: 'nouvelle_demande_mandat',
            title: 'Nouvelle demande de mandat',
            message: `${formData.prenom} ${formData.nom} a soumis une demande de mandat`,
            link: '/admin/demandes-activation',
            metadata: { email: formData.email },
          });
        }
      }

      // Envoyer email de confirmation au client
      try {
        await supabase.functions.invoke('send-mandat-confirmation', {
          body: {
            email: formData.email,
            prenom: formData.prenom,
            nom: formData.nom,
            type_recherche: formData.type_recherche,
            montant_acompte: formData.type_recherche === 'Acheter' ? 2500 : 300,
            region_recherche: formData.region_recherche,
            type_bien: formData.type_bien,
            pieces_recherche: formData.pieces_recherche,
            budget_max: formData.budget_max
          }
        });
        console.log('Confirmation email sent');
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't block the flow if email fails
      }

      // Nettoyer le localStorage
      localStorage.removeItem(STORAGE_KEY);

      toast.success('Demande envoyée avec succès ! Un email de confirmation vous a été envoyé.');
      navigate('/login', { state: { mandatSubmitted: true } });

    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEPS[currentStep].component;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoImmorama} alt="Immo-Rama" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Mandat de recherche</h1>
          <p className="text-muted-foreground">
            {currentStep < 3 
              ? 'Étape par étape vers votre nouveau logement'
              : formData.type_recherche === 'Acheter' 
                ? 'Pour un bien immobilier à acheter' 
                : 'Pour un logement à louer'}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {currentStep + 1} sur {STEPS.length}</span>
            <span>{STEPS[currentStep].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <StepComponent data={formData} onChange={handleChange} />
          </CardContent>

          <CardFooter className="flex justify-between gap-4 border-t pt-6">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? () => navigate('/login') : handlePrevious}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 0 ? 'Retour' : 'Précédent'}
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext} className="gap-2">
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.cgv_acceptees || !formData.signature_data}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer la demande
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Vos recherches seront activées dès réception de l'acompte.
        </p>
      </div>
    </div>
  );
}
