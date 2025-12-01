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
  { title: 'Candidats', component: MandatFormStep5 },
  { title: 'Critères de recherche', component: MandatFormStep4 },
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
        return true; // Candidats optionnels
      case 4:
        return !!(formData.decouverte_agence && formData.type_bien && formData.pieces_recherche &&
          formData.region_recherche && formData.budget_max > 0);
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
              demande_id: null // Pas encore d'ID de demande
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

      // ÉTAPE 3: INSERT UNIQUE avec toutes les données (y compris AbaNinja)
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
        // Inclure les données AbaNinja directement
        abaninja_client_uuid: abaninjaClientUuid,
        abaninja_invoice_id: abaninjaInvoiceId,
        abaninja_invoice_ref: abaninjaInvoiceRef,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('demandes_mandat')
        .insert(insertData as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const demandeId = insertedData.id;

      // Créer notification pour les admins via la fonction RPC (bypass RLS)
      try {
        // L'admin user_id est connu: 4c2ee841-a48b-4d7d-8ed6-3eac9ea124e8
        // On utilise la fonction RPC create_notification qui a SECURITY DEFINER
        await supabase.rpc('create_notification', {
          p_user_id: '4c2ee841-a48b-4d7d-8ed6-3eac9ea124e8',
          p_type: 'nouvelle_demande_mandat',
          p_title: 'Nouvelle demande de mandat',
          p_message: `${formData.prenom} ${formData.nom} a soumis une demande de mandat`,
          p_link: '/admin/demandes-activation',
          p_metadata: { email: formData.email, demande_id: demandeId }
        });
        console.log('Admin notification created');
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Ne pas bloquer le flux
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
        // Don't block the flow if email fails
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
        // Ne pas bloquer le flux si la création de compte échoue
      }

      // Nettoyer le localStorage
      localStorage.removeItem(STORAGE_KEY);

      // Message de confirmation avec détails
      const invoiceMessage = abaninjaInvoiceRef 
        ? ` La facture n°${abaninjaInvoiceRef} vous a été envoyée.`
        : '';
      
      toast.success(
        `Demande envoyée avec succès ! Vous allez recevoir par email votre mandat signé en PDF ainsi qu'un lien pour créer votre mot de passe et accéder à votre espace client.${invoiceMessage}`,
        { duration: 8000 }
      );
      
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

  // Callback to jump to candidats step (step 4 = index 3)
  const handleAddCoBuyer = () => {
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoImmorama} alt="Immo-Rama" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Mandat de recherche</h1>
          <p className="text-muted-foreground">
            {currentStep < 4 
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
            {currentStep === 4 ? (
              <MandatFormStep4 data={formData} onChange={handleChange} onAddCoBuyer={handleAddCoBuyer} />
            ) : (
              <StepComponent data={formData} onChange={handleChange} />
            )}
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
