import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUTMParams } from '@/hooks/useUTMParams';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MandatFormData, initialFormData } from '@/components/mandat/types';
import MandatFormStep0Journey from '@/components/mandat/MandatFormStep0Journey';
import MandatFormStep1 from '@/components/mandat/MandatFormStep1';
import MandatFormStep2 from '@/components/mandat/MandatFormStep2';
import MandatFormStep3 from '@/components/mandat/MandatFormStep3';
import MandatFormStep4 from '@/components/mandat/MandatFormStep4';
import MandatFormStep5 from '@/components/mandat/MandatFormStep5';
import MandatFormStep6 from '@/components/mandat/MandatFormStep6';
import MandatFormStep7 from '@/components/mandat/MandatFormStep7';
import { LEGAL_CHECKBOXES } from '@/components/mandat-v3/types';
import MandatAchatStepSignature from '@/components/mandat/achat/MandatAchatStepSignature';
import MandatAchatStepProject from '@/components/mandat/achat/MandatAchatStepProject';
import MandatAchatStepFinancing from '@/components/mandat/achat/MandatAchatStepFinancing';
import MandatAchatStepPersonal from '@/components/mandat/achat/MandatAchatStepPersonal';
import { LandingFormShell } from '@/components/forms-premium/LandingFormShell';
import { LandingStepIndicator } from '@/components/forms-premium/LandingStepIndicator';
import { LandingGuaranteeBanner } from '@/components/forms-premium/LandingGuaranteeBanner';
import { LandingProgressBlock } from '@/components/forms-premium/LandingProgressBlock';
import { LandingFormCard } from '@/components/forms-premium/LandingFormCard';
import { LandingButton } from '@/components/forms-premium/LandingButton';
import { PremiumStepTransition } from '@/components/forms-premium/PremiumStepTransition';

const normalizeDate = (val: string | null | undefined): string | null =>
  val && val.trim() !== '' ? val.trim() : null;

const todayISO = () => new Date().toISOString().split('T')[0];

const normalizeRequiredDate = (val: string | null | undefined): string =>
  val && val.trim() !== '' ? val.trim() : todayISO();

const STORAGE_KEY = 'mandat_form_data';

type StepDef = { key: string; title: string; component: any; icon: string };

const STEP_JOURNEY: StepDef = { key: 'journey', title: 'Projet immobilier', component: MandatFormStep0Journey, icon: '🧭' };

const RENTAL_STEPS: StepDef[] = [
  STEP_JOURNEY,
  { key: 'perso', title: 'Informations personnelles', component: MandatFormStep1, icon: '👤' },
  { key: 'situation', title: 'Situation actuelle', component: MandatFormStep2, icon: '🏠' },
  { key: 'finance', title: 'Situation financière', component: MandatFormStep3, icon: '💼' },
  { key: 'candidats', title: 'Candidats', component: MandatFormStep5, icon: '👥' },
  { key: 'criteres', title: 'Critères de recherche', component: MandatFormStep4, icon: '🔍' },
  { key: 'docs', title: 'Documents', component: MandatFormStep6, icon: '📄' },
  { key: 'signature', title: 'Signature', component: MandatFormStep7, icon: '✍️' },
];

const PURCHASE_STEPS: StepDef[] = [
  STEP_JOURNEY,
  { key: 'perso', title: 'Informations personnelles', component: MandatFormStep1, icon: '👤' },
  { key: 'projet', title: 'Projet d\'achat', component: MandatAchatStepProject, icon: '🏢' },
  { key: 'financement', title: 'Financement', component: MandatAchatStepFinancing, icon: '💰' },
  { key: 'situation_perso', title: 'Situation personnelle', component: MandatAchatStepPersonal, icon: '👤' },
  { key: 'co_acquereurs', title: 'Co-acquéreurs', component: MandatFormStep5, icon: '👥' },
  { key: 'docs', title: 'Documents', component: MandatFormStep6, icon: '📄' },
  { key: 'signature', title: 'Signature', component: MandatAchatStepSignature, icon: '✍️' },
];

export default function NouveauMandat() {
  const navigate = useNavigate();
  const utmParams = useUTMParams();
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

  const steps = formData.journey === 'purchase' ? PURCHASE_STEPS : RENTAL_STEPS;
  const currentStepDef = steps[currentStep] ?? steps[0];
  const allLegalAccepted = LEGAL_CHECKBOXES.every((cb) => (formData as any)[cb.key] === true);

  const validateStep = (step: number): boolean => {
    const def = steps[step];
    if (!def) return true;
    const isPurchase = formData.journey === 'purchase';

    switch (def.key) {
      case 'journey':
        return !!formData.journey;
      case 'perso':
        return !!(formData.email && formData.prenom && formData.nom && formData.telephone &&
          formData.date_naissance && formData.type_permis);
      case 'situation':
        return !!(formData.gerance_actuelle && formData.contact_gerance &&
          formData.loyer_actuel >= 0 && formData.depuis_le && formData.pieces_actuel > 0 &&
          formData.motif_changement);
      case 'finance':
        return true;
      case 'candidats':
      case 'co_acquereurs':
        return true;
      case 'criteres': {
        const baseValid = !!(formData.decouverte_agence && formData.type_bien && formData.budget_max > 0);
        if (formData.type_bien === 'Local commercial') {
          return baseValid && !!(formData.surface_souhaitee && formData.surface_souhaitee > 0 &&
            formData.affectation_commerciale && formData.etage_souhaite);
        }
        return baseValid && !!formData.pieces_recherche;
      }
      case 'projet':
        return !!(formData.decouverte_agence && formData.type_bien && formData.budget_max > 0 && formData.region_recherche);
      case 'financement':
        return !!(formData.revenus_mensuels > 0 &&
          (formData.apport_personnel + formData.achat_fonds_propres_3a + formData.achat_fonds_propres_lpp + formData.achat_montant_epl) > 0);
      case 'situation_perso':
        return true;
      case 'docs':
        // Documents entièrement facultatifs : jamais bloquants (location comme achat)
        return true;
      case 'signature':
        return !!(formData.signature_data && allLegalAccepted);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (currentStep < steps.length - 1) {
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

      const isPurchase = formData.journey === 'purchase' || formData.type_recherche === 'Acheter';
      // ⚠️ Acompte exact : CHF 2'499 pour achat, CHF 300 pour location.
      const montantAcompte = isPurchase ? 2499 : 300;

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
              type_recherche: isPurchase ? 'Acheter' : formData.type_recherche,
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
      // UUID généré côté client → pas de .select() après insert
      // (visiteur anon: aucune policy SELECT ne matche, ça déclenche un faux "RLS violation").
      const demandeMandatId = crypto.randomUUID();
      const insertData = {
        id: demandeMandatId,
        email: formData.email,
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone,
        adresse: formData.adresse,
        date_naissance: normalizeRequiredDate(formData.date_naissance),
        nationalite: formData.nationalite,
        type_permis: formData.type_permis,
        etat_civil: formData.etat_civil,
        gerance_actuelle: isPurchase ? (formData.gerance_actuelle || 'N/A — Parcours achat') : formData.gerance_actuelle,
        contact_gerance: isPurchase ? (formData.contact_gerance || 'N/A — Parcours achat') : formData.contact_gerance,
        loyer_actuel: formData.loyer_actuel,
        depuis_le: isPurchase
          ? normalizeRequiredDate(formData.depuis_le)
          : normalizeRequiredDate(formData.depuis_le),
        pieces_actuel: formData.pieces_actuel || 1,
        charges_extraordinaires: formData.charges_extraordinaires,
        montant_charges_extra: formData.montant_charges_extra,
        poursuites: formData.poursuites,
        curatelle: formData.curatelle,
        motif_changement: isPurchase ? (formData.motif_changement || 'Projet d’achat immobilier') : formData.motif_changement,
        profession: formData.profession,
        employeur: formData.employeur,
        revenus_mensuels: formData.revenus_mensuels,
        date_engagement: normalizeDate(formData.date_engagement),
        utilisation_logement: formData.utilisation_logement,
        animaux: formData.animaux,
        instrument_musique: formData.instrument_musique,
        vehicules: formData.vehicules,
        numero_plaques: formData.numero_plaques,
        decouverte_agence: formData.decouverte_agence,
        type_recherche: isPurchase ? 'Acheter' : formData.type_recherche,
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
        legal_consents: formData.legal_consents_at as any,
        code_promo: formData.code_promo,
        payment_method: formData.payment_method ?? 'qr_invoice',
        montant_acompte: montantAcompte,
        abaninja_client_uuid: abaninjaClientUuid,
        abaninja_invoice_id: abaninjaInvoiceId,
        abaninja_invoice_ref: abaninjaInvoiceRef,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        utm_term: utmParams.utm_term,
      };

      const { error: insertError } = await supabase
        .from('demandes_mandat')
        .insert(insertData as any);

      if (insertError) {
        // 🛡️ FILET DE SÉCURITÉ : on n'oublie JAMAIS un client, même si l'insert RLS casse
        try {
          await supabase.from('signup_attempts').insert({
            email: formData.email,
            first_name: formData.prenom,
            last_name: formData.nom,
            phone: formData.telephone,
            source: 'nouveau-mandat',
            parcours: formData.type_recherche || null,
            stage: 'demandes_mandat_insert_failed',
            error_message: `${insertError.message}${abaninjaInvoiceRef ? ` | AbaNinja invoice: ${abaninjaInvoiceRef}` : ''}`,
            user_agent: navigator.userAgent,
          });
          // Notifier l'admin pour rattrapage manuel
          await supabase.rpc('create_notification', {
            p_user_id: '4c2ee841-a48b-4d7d-8ed6-3eac9ea124e8',
            p_type: 'inscription_echouee',
            p_title: '⚠️ Inscription client échouée',
            p_message: `${formData.prenom} ${formData.nom} (${formData.email}) n'a pas pu finaliser /nouveau-mandat${abaninjaInvoiceRef ? ` — facture AbaNinja ${abaninjaInvoiceRef} déjà émise` : ''}. À rattraper manuellement.`,
            p_link: '/admin/inscriptions-echouees',
            p_metadata: { email: formData.email, abaninja_invoice_ref: abaninjaInvoiceRef, error: insertError.message },
          });
        } catch (logErr) {
          console.error('Failed to log signup attempt:', logErr);
        }
        throw insertError;
      }


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
            code_promo: formData.code_promo,
            payment_method: formData.payment_method ?? 'qr_invoice'
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
              id: demandeMandatId,
              adresse: formData.adresse,
              date_naissance: formData.date_naissance,
              nationalite: formData.nationalite,
              type_permis: formData.type_permis,
              etat_civil: formData.etat_civil,
              // Champs LOCATION : neutralisés en mode achat
              gerance_actuelle: isPurchase ? null : formData.gerance_actuelle,
              contact_gerance: isPurchase ? null : formData.contact_gerance,
              loyer_actuel: isPurchase ? null : formData.loyer_actuel,
              depuis_le: isPurchase ? null : formData.depuis_le,
              pieces_actuel: isPurchase ? null : formData.pieces_actuel,
              charges_extraordinaires: isPurchase ? null : formData.charges_extraordinaires,
              montant_charges_extra: isPurchase ? null : formData.montant_charges_extra,
              motif_changement: isPurchase ? null : formData.motif_changement,
              date_engagement: isPurchase ? null : formData.date_engagement,
              utilisation_logement: isPurchase ? null : formData.utilisation_logement,
              animaux: formData.animaux,
              instrument_musique: formData.instrument_musique,
              vehicules: formData.vehicules,
              numero_plaques: formData.numero_plaques,
              poursuites: formData.poursuites,
              curatelle: formData.curatelle,
              profession: formData.profession,
              employeur: formData.employeur,
              revenus_mensuels: formData.revenus_mensuels,
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
            },
            // 🆕 Bloc dédié achat : déclenche la création d'un purchase_project
            // en statut 'en_attente_activation' + financing_profile + 17 étapes.
            purchaseProfile: isPurchase ? {
              prix_cible: formData.budget_max,
              region: formData.region_recherche,
              type_bien: formData.type_bien,
              surface_min: formData.surface_souhaitee,
              horizon_mois: formData.achat_horizon_mois,
              usage: formData.achat_usage,
              etat_civil: formData.etat_civil,
              nombre_enfants: formData.achat_nombre_enfants,
              nationalite: formData.nationalite,
              type_permis: formData.type_permis,
              date_naissance: formData.date_naissance,
              financing: {
                revenu_annuel_retenu: formData.achat_revenu_annuel_retenu || (formData.revenus_mensuels || 0) * 12,
                bonus_3ans_moyenne: formData.achat_bonus_3ans,
                autres_revenus: formData.achat_autres_revenus,
                fonds_propres_cash: formData.apport_personnel,
                fonds_propres_3a: formData.achat_fonds_propres_3a,
                fonds_propres_lpp: formData.achat_fonds_propres_lpp,
                montant_epl_disponible: formData.achat_montant_epl,
                credit_prive_mensuel: formData.achat_credit_mensuel,
                leasing_mensuel: formData.achat_leasing_mensuel,
                cartes_credit_mensuel: formData.achat_cartes_credit_mensuel,
                pensions_versees: formData.achat_pensions_versees,
                poursuites: formData.poursuites,
                etat_civil: formData.etat_civil,
                nombre_enfants: formData.achat_nombre_enfants,
                nationalite: formData.nationalite,
                type_permis: formData.type_permis,
                prix_cible: formData.budget_max,
              },
            } : undefined,
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

  const StepComponent = currentStepDef.component;
  const isPurchaseJourney = formData.journey === 'purchase';

  const handleAddCoBuyer = () => {
    // Step "candidats" / "co_acquereurs" index in current flow
    const idx = steps.findIndex((s) => s.key === 'candidats' || s.key === 'co_acquereurs');
    if (idx >= 0) {
      setCurrentStep(idx);
      window.scrollTo(0, 0);
    }
  };

  return (
    <LandingFormShell>
      <div className="container mx-auto px-4 max-w-3xl pt-8 md:pt-12 pb-16 space-y-6">
        {/* Mini-hero aligné landing */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/40 rounded-full px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs md:text-sm font-semibold text-primary">
              {isPurchaseJourney ? 'Accompagnement à l\'achat' : 'Nouveau mandat de recherche'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {isPurchaseJourney
              ? <>Démarrons votre <span className="text-primary">projet d'achat</span></>
              : <>Démarrons votre <span className="text-primary">recherche</span></>}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isPurchaseJourney
              ? 'Acompte d\'activation CHF 2\'499.– · Mandat 6 mois à compter de l\'activation par votre conseiller.'
              : 'Quelques minutes suffisent. Garantie remboursement 90 jours, sans succès.'}
          </p>
        </div>

        <LandingGuaranteeBanner />
        <LandingProgressBlock
          currentStep={currentStep}
          totalSteps={steps.length}
          stepTitle={currentStepDef.title}
        />
        <LandingStepIndicator steps={steps} currentStep={currentStep} />

        <LandingFormCard>
          <PremiumStepTransition stepKey={currentStep} direction={1}>
            {currentStepDef.key === 'criteres' ? (
              <MandatFormStep4 data={formData} onChange={handleChange} onAddCoBuyer={handleAddCoBuyer} />
            ) : (
              <StepComponent data={formData} onChange={handleChange} />
            )}
          </PremiumStepTransition>

          <div className="flex justify-between items-center mt-10 pt-6 border-t border-border/50">
            <LandingButton
              variant="back"
              onClick={currentStep === 0 ? () => navigate('/login') : handlePrevious}
            >
              {currentStep === 0 ? <><ArrowLeft className="h-4 w-4" /> Retour</> : undefined}
            </LandingButton>

            {currentStep < steps.length - 1 ? (
              <LandingButton variant="next" onClick={handleNext} disabled={currentStepDef.key === 'journey' && !formData.journey}>
                Continuer
              </LandingButton>
            ) : (
              <LandingButton
                variant="submit"
                onClick={handleSubmit}
                loading={submitting}
                disabled={submitting || !allLegalAccepted || !formData.signature_data}
              >
                Envoyer la demande
              </LandingButton>
            )}
          </div>
        </LandingFormCard>

        <p className="text-center text-xs text-muted-foreground">
          Vos recherches seront activées dès réception de l'acompte.
        </p>
      </div>
    </LandingFormShell>
  );
}
