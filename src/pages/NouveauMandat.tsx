import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Send, Loader2, Sparkles, Check } from 'lucide-react';
import logoImmorama from '@/assets/logo-immo-rama-new.png';
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
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

const STORAGE_KEY = 'mandat_form_data';
const STEPS = [
  { title: 'Informations personnelles', component: MandatFormStep1, icon: '👤' },
  { title: 'Situation actuelle', component: MandatFormStep2, icon: '🏠' },
  { title: 'Situation financière', component: MandatFormStep3, icon: '💼' },
  { title: 'Candidats', component: MandatFormStep5, icon: '👥' },
  { title: 'Critères de recherche', component: MandatFormStep4, icon: '🔍' },
  { title: 'Documents', component: MandatFormStep6, icon: '📄' },
  { title: 'Signature', component: MandatFormStep7, icon: '✍️' },
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
        // Made optional: adresse, nationalite, etat_civil (Apple requirement 5.1.1)
        return !!(formData.email && formData.prenom && formData.nom && formData.telephone &&
          formData.date_naissance && formData.type_permis);
      case 1:
        return !!(formData.gerance_actuelle && formData.contact_gerance &&
          formData.loyer_actuel >= 0 && formData.depuis_le && formData.pieces_actuel > 0 &&
          formData.motif_changement);
      case 2:
        // Made optional: profession, employeur, revenus_mensuels (Apple requirement 5.1.1)
        return true;
      case 3:
        return true; // Candidats optionnels
      case 4: {
        const baseValid = !!(formData.decouverte_agence && formData.type_bien &&
          formData.region_recherche && formData.budget_max > 0);
        if (formData.type_bien === 'Local commercial') {
          return baseValid && !!(formData.surface_souhaitee && formData.surface_souhaitee > 0 &&
            formData.affectation_commerciale && formData.etage_souhaite);
        }
        return baseValid && !!formData.pieces_recherche;
      }
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

      const montantAcompte = formData.type_recherche === 'Acheter' ? 2500 : 300;

      // ÉTAPE 1: Créer le client AbaNinja AVANT l'insert
      let abaninjaClientUuid: string | null = null;
      let abaninjaAddressUuid: string | null = null;
      try {
        const { data: clientResponse, error: clientError } = await supabase.functions.invoke('create-abaninja-client', {
          body: {
            prenom: formData.prenom,
            nom: formData.nom,
            email: formData.email,
            telephone: formData.telephone,
            adresse: formData.adresse
          }
        });

        if (clientError) {
          console.error('Error creating AbaNinja client:', clientError);
        } else if (clientResponse?.client_uuid) {
          abaninjaClientUuid = clientResponse.client_uuid;
          abaninjaAddressUuid = clientResponse.address_uuid;
          console.log('AbaNinja client created:', abaninjaClientUuid, 'Address:', abaninjaAddressUuid);
        }
      } catch (abaNinjaClientError) {
        console.error('AbaNinja client creation failed:', abaNinjaClientError);
      }

      // ÉTAPE 2: Créer la facture AbaNinja (si client et adresse créés)
      let abaninjaInvoiceId: string | null = null;
      let abaninjaInvoiceRef: string | null = null;
      
      if (abaninjaClientUuid && abaninjaAddressUuid) {
        try {
          const { data: invoiceResponse, error: invoiceError } = await supabase.functions.invoke('create-abaninja-invoice', {
            body: {
              client_uuid: abaninjaClientUuid,
              address_uuid: abaninjaAddressUuid,
              type_recherche: formData.type_recherche,
              prenom: formData.prenom,
              nom: formData.nom,
              email: formData.email,
              demande_id: null
            }
          });

          if (invoiceError) {
            console.error('Error creating AbaNinja invoice:', invoiceError);
          } else if (invoiceResponse) {
            abaninjaInvoiceId = invoiceResponse.invoice_id;
            abaninjaInvoiceRef = invoiceResponse.invoice_number;
            console.log('AbaNinja invoice created:', abaninjaInvoiceRef);
          }
        } catch (abaNinjaInvoiceError) {
          console.error('AbaNinja invoice creation failed:', abaNinjaInvoiceError);
        }
      }

      // ÉTAPE 3: INSERT UNIQUE avec toutes les données
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
        montant_acompte: montantAcompte,
        abaninja_client_uuid: abaninjaClientUuid,
        abaninja_invoice_id: abaninjaInvoiceId,
        abaninja_invoice_ref: abaninjaInvoiceRef,
      };

      const { error: insertError } = await supabase
        .from('demandes_mandat')
        .insert(insertData as any);

      if (insertError) throw insertError;

      // Créer notification pour les admins (utilise l'email au lieu de l'ID)
      try {
        await supabase.rpc('create_notification', {
          p_user_id: '4c2ee841-a48b-4d7d-8ed6-3eac9ea124e8',
          p_type: 'nouvelle_demande_mandat',
          p_title: 'Nouvelle demande de mandat',
          p_message: `${formData.prenom} ${formData.nom} a soumis une demande de mandat`,
          p_link: '/admin/demandes-activation',
          p_metadata: { email: formData.email }
        });
        console.log('Admin notification created');
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Envoyer le mandat signé en PDF par email
      try {
        await supabase.functions.invoke('send-mandat-pdf', {
          body: {
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
            date_engagement: formData.date_engagement,
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
            candidats: formData.candidats,
            signature_data: formData.signature_data,
            code_promo: formData.code_promo
          }
        });
        console.log('Mandat PDF email sent');
      } catch (emailError) {
        console.error('Error sending mandat PDF email:', emailError);
      }

      // ÉTAPE 4: Créer automatiquement le compte client
      try {
        console.log('Creating client account...');
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-client', {
          body: {
            email: formData.email,
            prenom: formData.prenom,
            nom: formData.nom,
            telephone: formData.telephone,
            demandeMandat: {
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
              date_engagement: formData.date_engagement,
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
              documents_uploades: formData.documents_uploades,
              candidats: formData.candidats,
            }
          }
        });

        if (inviteError) {
          console.error('Error creating client account:', inviteError);
        } else {
          console.log('Client account created:', inviteData);
        }
      } catch (accountError) {
        console.error('Error creating client account:', accountError);
      }

      // Nettoyer le localStorage
      localStorage.removeItem(STORAGE_KEY);

      const invoiceMessage = abaninjaInvoiceRef 
        ? ` La facture n°${abaninjaInvoiceRef} vous a été envoyée.`
        : '';
      
      toast.success(
        `Demande envoyée avec succès ! Vous allez recevoir par email votre mandat signé en PDF ainsi qu'un lien pour créer votre mot de passe et accéder à votre espace client.${invoiceMessage}`,
        { duration: 8000 }
      );

      // Meta Pixel Lead conversion -- fired on successful mandate submission
      if ((window as any).fbq) {
        (window as any).fbq('track', 'Lead');
        console.log('[Meta Pixel] Lead fired on successful mandate submission');
      }
      
      navigate('/inscription-validee');

    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEPS[currentStep].component;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleAddCoBuyer = () => {
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
      <div className="fixed inset-0 opacity-30">
        <FloatingParticles />
      </div>
      
      {/* Ambient Light Effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Premium Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
              <img 
                src={logoImmorama} 
                alt="Immo-Rama" 
                className="h-16 mx-auto relative z-10 drop-shadow-lg transition-transform hover:scale-105" 
              />
            </div>
            <div className="relative">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Mandat de recherche
              </h1>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 blur-lg opacity-50" />
            </div>
            <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              {currentStep < 4 
                ? 'Étape par étape vers votre nouveau logement'
                : formData.type_recherche === 'Acheter' 
                  ? 'Pour un bien immobilier à acheter' 
                  : 'Pour un logement à louer'}
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </p>
          </div>

          {/* Premium Progress Bar */}
          <div className="mb-8">
            {/* Step indicators */}
            <div className="flex justify-between items-center mb-4">
              {STEPS.map((step, index) => (
                <div 
                  key={index}
                  className={`flex flex-col items-center transition-all duration-500 ${
                    index <= currentStep ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-all duration-500 transform
                    ${index < currentStep 
                      ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30 scale-100' 
                      : index === currentStep 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 scale-110 ring-4 ring-primary/20' 
                        : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {index < currentStep ? (
                      <Check className="h-5 w-5 animate-scale-in" />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                    {index === currentStep && (
                      <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center max-w-[80px] hidden sm:block ${
                    index === currentStep ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-accent transition-all duration-700 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
              {/* Glow effect */}
              <div 
                className="absolute inset-y-0 left-0 bg-primary/30 blur-md transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Step info */}
            <div className="flex justify-between text-sm mt-3">
              <span className="text-muted-foreground">
                Étape <span className="text-primary font-bold">{currentStep + 1}</span> sur {STEPS.length}
              </span>
              <span className="text-primary font-medium flex items-center gap-1">
                {STEPS[currentStep].icon} {STEPS[currentStep].title}
              </span>
            </div>
          </div>

          {/* Premium Form Card */}
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Card shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            <CardContent className="pt-6 relative z-10">
              <div className="animate-fade-in">
                {currentStep === 4 ? (
                  <MandatFormStep4 data={formData} onChange={handleChange} onAddCoBuyer={handleAddCoBuyer} />
                ) : (
                  <StepComponent data={formData} onChange={handleChange} />
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-between gap-4 border-t border-border/50 pt-6 relative z-10 bg-muted/20">
              <Button
                variant="outline"
                onClick={currentStep === 0 ? () => navigate('/login') : handlePrevious}
                className="gap-2 group backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                {currentStep === 0 ? 'Retour' : 'Précédent'}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button 
                  onClick={handleNext} 
                  className="gap-2 group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                >
                  Suivant
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.cgv_acceptees || !formData.signature_data}
                  className="gap-2 group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      Envoyer la demande
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Info */}
          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3 text-primary/50" />
            Vos recherches seront activées dès réception de l'acompte.
            <Sparkles className="h-3 w-3 text-primary/50" />
          </p>
        </div>
      </div>
    </div>
  );
}
