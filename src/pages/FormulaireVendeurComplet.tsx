import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2, CheckCircle, Building2, Calendar,
  Car, Trees, Sun, Mountain, Zap,
  Camera, Upload, X, Image,
} from 'lucide-react';
import { PremiumFormShell } from '@/components/forms-premium/PremiumFormShell';
import { PremiumStepIndicator } from '@/components/forms-premium/PremiumStepIndicator';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumButton } from '@/components/forms-premium/PremiumButton';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumTextarea } from '@/components/forms-premium/PremiumTextarea';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { PremiumCheckbox } from '@/components/forms-premium/PremiumCheckbox';
import { PremiumRadioGroup } from '@/components/forms-premium/PremiumRadioGroup';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconHome, IconDocument, IconCamera, IconUser, IconLock, IconMail, IconPhone, IconWallet, IconBuilding } from '@/components/forms-premium/icons/LuxuryIcons';
import { VendeurFloatingNav } from '@/components/landing/vendeur/VendeurFloatingNav';
import { VendeurFooter } from '@/components/landing/vendeur/VendeurFooter';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { ForgotPasswordLink } from '@/components/auth/ForgotPasswordLink';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNativeCamera } from '@/hooks/useNativeCamera';
import { useUTMParams } from '@/hooks/useUTMParams';

const formSchema = z.object({
  // Infos bien (pré-remplies)
  type_bien: z.string().min(1, 'Sélectionnez un type de bien'),
  adresse: z.string().min(2, 'Indiquez l\'adresse'),
  npa: z.string().optional(),
  ville: z.string().optional(),
  surface: z.string().min(1, 'Indiquez la surface'),
  prix_souhaite: z.string().min(1, 'Indiquez le prix souhaité'),
  
  // Détails appartement/villa standard
  nombre_pieces: z.string().optional(),
  nombre_chambres: z.string().optional(),
  nombre_sdb: z.string().optional(),
  etage: z.string().optional(),
  annee_construction: z.string().optional(),
  
  // Villa: question multi-logements
  est_multi_logements: z.enum(['non', 'oui_2', 'oui_3plus']).optional(),
  surface_terrain: z.string().optional(),
  
  // Immeuble / Multi-logements
  nb_logements: z.string().optional(),
  revenus_locatifs: z.string().optional(),
  charges_annuelles: z.string().optional(),
  taux_occupation: z.string().optional(),
  etat_general: z.string().optional(),
  
  // Terrain
  zone_affectation: z.string().optional(),
  terrain_viabilise: z.boolean().optional(),
  constructibilite: z.string().optional(),
  acces_route: z.boolean().optional(),
  
  // Commercial
  usage_actuel: z.string().optional(),
  loyer_actuel: z.string().optional(),
  
  // Équipements
  balcon: z.boolean().optional(),
  terrasse: z.boolean().optional(),
  jardin: z.boolean().optional(),
  garage: z.boolean().optional(),
  parking: z.boolean().optional(),
  cave: z.boolean().optional(),
  ascenseur: z.boolean().optional(),
  vue_degagee: z.boolean().optional(),
  piscine: z.boolean().optional(),
  
  // Motivations
  delai_vente: z.string().optional(),
  motif_vente: z.string().optional(),
  description: z.string().optional(),
  
  // Coordonnées (pré-remplies)
  nom: z.string().min(2, 'Indiquez votre nom'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Numéro invalide'),

  // Compte
  password: z.string().min(8, 'Au moins 8 caractères'),
});

type FormData = z.infer<typeof formSchema>;

interface LocationState {
  type_bien?: string;
  adresse?: string;
  npa?: string;
  ville?: string;
  surface?: string;
  prix_souhaite?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

interface PhotoData {
  url: string;
  file?: File;
}

const STEPS = [
  { id: 1, title: 'Bien', icon: '🏠' },
  { id: 2, title: 'Détails', icon: '📄' },
  { id: 3, title: 'Photos', icon: '📷' },
  { id: 4, title: 'Contact', icon: '👤' },
  { id: 5, title: 'Compte', icon: '🔑' },
];

export default function FormulaireVendeurComplet() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utmParams = useUTMParams();
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Photo upload states
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const { takePhoto, pickFromGallery, isNative, loading: cameraLoading } = useNativeCamera();
  
  const prefilledData = (location.state as LocationState) || {};
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type_bien: prefilledData.type_bien || '',
      adresse: prefilledData.adresse || '',
      npa: prefilledData.npa || '',
      ville: prefilledData.ville || '',
      surface: prefilledData.surface || '',
      prix_souhaite: prefilledData.prix_souhaite || '',
      nom: prefilledData.nom || '',
      email: prefilledData.email || '',
      telephone: prefilledData.telephone || '',
      balcon: false,
      terrasse: false,
      jardin: false,
      garage: false,
      parking: false,
      cave: false,
      ascenseur: false,
      vue_degagee: false,
      piscine: false,
      terrain_viabilise: false,
      acces_route: false,
      est_multi_logements: 'non',
    },
  });

  const typeBien = watch('type_bien');
  const estMultiLogements = watch('est_multi_logements');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Reset type-specific fields when type changes
  useEffect(() => {
    if (typeBien !== 'villa') {
      setValue('est_multi_logements', 'non');
    }
  }, [typeBien, setValue]);

  const handleAddressChange = (components: AddressComponents | null) => {
    if (components) {
      setValue('adresse', components.fullAddress);
      setValue('npa', components.postalCode || '');
      setValue('ville', components.city || '');
    }
  };

  // Photo upload functions
  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `leads/vendeurs/${fileName}`;

      const { error } = await supabase.storage
        .from('public-files')
        .upload(filePath, file, { contentType: file.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('public-files')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      toast.error('Maximum 5 photos autorisées');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image valide`);
          return null;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 10 MB`);
          return null;
        }
        const url = await uploadPhoto(file);
        return url ? { url, file } : null;
      });

      const results = await Promise.all(uploadPromises);
      const validPhotos = results.filter((p): p is { url: string; file: File } => p !== null);
      
      if (validPhotos.length > 0) {
        setPhotos(prev => [...prev, ...validPhotos]);
        toast.success(`${validPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleNativePhoto = async (fromCamera: boolean) => {
    try {
      const file = fromCamera ? await takePhoto() : await pickFromGallery();
      if (file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        await handleFileUpload(dataTransfer.files);
      }
    } catch (error) {
      console.error('Native photo error:', error);
      toast.error('Erreur lors de la capture');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Step validation
  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        return await trigger(['type_bien', 'adresse', 'surface', 'prix_souhaite']);
      case 2:
        return true; // Details are optional
      case 3:
        return true; // Photos are optional
      case 4:
        return await trigger(['nom', 'email', 'telephone']);
      case 5:
        return await trigger(['password']);
      default:
        return true;
    }
  };

  const goToNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // 1) Create user account first
      const firstName = data.nom.split(' ')[0] || data.nom;
      const lastName = data.nom.split(' ').slice(1).join(' ') || '';
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: data.telephone,
            user_type: 'proprietaire_vendeur',
          },
        },
      });
      if (authError) throw authError;

      // Create profile + assign 'client' role server-side (RLS-safe)
      if (signUpData?.user?.id) {
        const { error: provisionError } = await supabase.functions.invoke('create-public-user', {
          body: {
            user_id: signUpData.user.id,
            email: data.email,
            first_name: firstName,
            last_name: lastName,
            phone: data.telephone,
            source: 'formulaire_vendeur_complet',
            parcours: 'vente',
          },
        });
        if (provisionError) console.warn('create-public-user warning:', provisionError);
      }

      // Build equipment list
      const equipements = [];
      if (data.balcon) equipements.push('Balcon');
      if (data.terrasse) equipements.push('Terrasse');
      if (data.jardin) equipements.push('Jardin');
      if (data.garage) equipements.push('Garage');
      if (data.parking) equipements.push('Parking');
      if (data.cave) equipements.push('Cave');
      if (data.ascenseur) equipements.push('Ascenseur');
      if (data.vue_degagee) equipements.push('Vue dégagée');
      if (data.piscine) equipements.push('Piscine');

      // Build detailed notes based on property type
      const notes: string[] = [
        `Type: ${data.type_bien}`,
        `Surface: ${data.surface}m²`,
        `Prix souhaité: ${data.prix_souhaite} CHF`,
      ];

      // Standard details (appartement, villa simple)
      if (['appartement', 'villa'].includes(data.type_bien) && data.est_multi_logements !== 'oui_3plus') {
        if (data.nombre_pieces) notes.push(`Pièces: ${data.nombre_pieces}`);
        if (data.nombre_chambres) notes.push(`Chambres: ${data.nombre_chambres}`);
        if (data.nombre_sdb) notes.push(`Salles de bain: ${data.nombre_sdb}`);
        if (data.etage) notes.push(`Étage: ${data.etage}`);
        if (data.annee_construction) notes.push(`Année: ${data.annee_construction}`);
      }

      // Villa specific
      if (data.type_bien === 'villa') {
        if (data.surface_terrain) notes.push(`Terrain: ${data.surface_terrain}m²`);
        if (data.est_multi_logements === 'oui_2') notes.push('Type: 2 logements');
        if (data.est_multi_logements === 'oui_3plus') notes.push('Type: 3+ logements');
      }

      // Immeuble / Multi-logements
      const showRendementFields = data.type_bien === 'immeuble' || data.est_multi_logements === 'oui_3plus';
      if (showRendementFields) {
        if (data.nb_logements) notes.push(`Logements: ${data.nb_logements}`);
        if (data.revenus_locatifs) notes.push(`Revenus locatifs: ${data.revenus_locatifs} CHF/an`);
        if (data.charges_annuelles) notes.push(`Charges: ${data.charges_annuelles} CHF/an`);
        if (data.taux_occupation) notes.push(`Occupation: ${data.taux_occupation}%`);
        if (data.etat_general) notes.push(`État: ${data.etat_general}`);
        if (data.annee_construction) notes.push(`Année: ${data.annee_construction}`);
      }

      // Terrain
      if (data.type_bien === 'terrain') {
        if (data.zone_affectation) notes.push(`Zone: ${data.zone_affectation}`);
        if (data.terrain_viabilise) notes.push('Viabilisé: Oui');
        if (data.constructibilite) notes.push(`Constructibilité: ${data.constructibilite}`);
        if (data.acces_route) notes.push('Accès route: Oui');
      }

      // Commercial
      if (data.type_bien === 'commercial') {
        if (data.usage_actuel) notes.push(`Usage: ${data.usage_actuel}`);
        if (data.loyer_actuel) notes.push(`Loyer actuel: ${data.loyer_actuel} CHF/mois`);
        if (data.annee_construction) notes.push(`Année: ${data.annee_construction}`);
      }

      // Equipment & general
      if (equipements.length > 0) notes.push(`Équipements: ${equipements.join(', ')}`);
      if (data.delai_vente) notes.push(`Délai souhaité: ${data.delai_vente}`);
      if (data.motif_vente) notes.push(`Motif: ${data.motif_vente}`);
      if (data.description) notes.push(`Description: ${data.description}`);
      
      // Add photos URLs
      if (photos.length > 0) {
        notes.push(`Photos: ${photos.map(p => p.url).join(', ')}`);
      }

      const { error } = await supabase.from('leads').insert({
        email: data.email,
        prenom: data.nom.split(' ')[0] || data.nom,
        nom: data.nom.split(' ').slice(1).join(' ') || '',
        telephone: data.telephone,
        localite: data.ville || data.adresse,
        budget: data.prix_souhaite,
        source: 'formulaire_vendeur_complet',
        notes: notes.join(' | '),
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        utm_term: utmParams.utm_term,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success('Votre bien a été soumis avec succès !');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Equipment items based on property type
  const getEquipmentItems = () => {
    if (typeBien === 'terrain') {
      return []; // No equipment for land
    }

    if (typeBien === 'commercial') {
      return [
        { key: 'parking', label: 'Places de parking', icon: Car },
        { key: 'ascenseur', label: 'Ascenseur', icon: Building2 },
      ];
    }

    if (typeBien === 'immeuble') {
      return [
        { key: 'parking', label: 'Parking commun', icon: Car },
        { key: 'cave', label: 'Caves', icon: Building2 },
        { key: 'ascenseur', label: 'Ascenseur', icon: Building2 },
        { key: 'jardin', label: 'Espaces verts', icon: Trees },
      ];
    }

    if (typeBien === 'villa') {
      return [
        { key: 'terrasse', label: 'Terrasse', icon: Sun },
        { key: 'jardin', label: 'Jardin', icon: Trees },
        { key: 'garage', label: 'Garage', icon: Car },
        { key: 'parking', label: 'Parking', icon: Car },
        { key: 'piscine', label: 'Piscine', icon: Sun },
        { key: 'cave', label: 'Cave', icon: Building2 },
        { key: 'vue_degagee', label: 'Vue dégagée', icon: Mountain },
      ];
    }

    // Appartement
    return [
      { key: 'balcon', label: 'Balcon', icon: Sun },
      { key: 'terrasse', label: 'Terrasse', icon: Sun },
      { key: 'garage', label: 'Garage', icon: Car },
      { key: 'parking', label: 'Parking', icon: Car },
      { key: 'cave', label: 'Cave', icon: Building2 },
      { key: 'ascenseur', label: 'Ascenseur', icon: Building2 },
      { key: 'vue_degagee', label: 'Vue dégagée', icon: Mountain },
    ];
  };

  // Check if should show rendement fields
  const showRendementFields = typeBien === 'immeuble' || estMultiLogements === 'oui_3plus';

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[hsl(30_15%_8%)]">
        <VendeurFloatingNav />
        <main className="pt-32 pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-[hsl(40_20%_88%)]">
                Votre bien a été soumis !
              </h1>
              <p className="text-lg text-[hsl(40_20%_55%)] mb-8">
                Notre équipe analyse votre bien et vous contactera sous 24h
                avec le nombre d'acheteurs potentiels correspondants à votre profil.
              </p>
              <button
                onClick={() => navigate('/vendre-mon-bien')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] text-[hsl(30_15%_8%)] font-semibold shadow-[0_4px_20px_hsl(38_45%_48%/0.3)] hover:shadow-[0_6px_30px_hsl(38_45%_48%/0.45)] transition-all duration-300 cursor-pointer"
              >
                Retour à la page vendeur
              </button>
            </div>
          </div>
        </main>
        <VendeurFooter />
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <LuxuryIconBadge size="sm"><IconHome size={16} /></LuxuryIconBadge>
              <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Informations principales</h2>
            </div>

            <PremiumSelect
              label="Type de bien"
              required
              value={watch('type_bien') || ''}
              onValueChange={(value) => setValue('type_bien', value)}
              options={[
                { value: 'appartement', label: 'Appartement' },
                { value: 'villa', label: 'Villa / Maison' },
                { value: 'immeuble', label: 'Immeuble de rapport' },
                { value: 'terrain', label: 'Terrain' },
                { value: 'commercial', label: 'Local commercial' },
                { value: 'autre', label: 'Autre' },
              ]}
              placeholder="Sélectionnez..."
              error={errors.type_bien?.message}
            />

            {/* Villa sub-question */}
            <AnimatePresence mode="wait">
              {typeBien === 'villa' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PremiumRadioGroup
                    label="Votre bien comprend-il plusieurs logements séparés ?"
                    value={watch('est_multi_logements') || 'non'}
                    onChange={(value) => setValue('est_multi_logements', value as 'non' | 'oui_2' | 'oui_3plus')}
                    options={[
                      { value: 'non', label: 'Non, maison individuelle' },
                      { value: 'oui_2', label: 'Oui, 2 logements' },
                      { value: 'oui_3plus', label: 'Oui, 3+ logements' },
                    ]}
                    columns={3}
                  />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Adresse */}
              <div>
                <p className="text-sm font-medium text-[hsl(40_20%_60%)] mb-1.5">Adresse du bien <span className="text-red-400">*</span></p>
                <GoogleAddressAutocomplete
                  value={watch('adresse')}
                  onChange={handleAddressChange}
                  onInputChange={(val) => setValue('adresse', val)}
                  placeholder="Entrez l'adresse complète"
                  restrictToSwitzerland
                />
                {errors.adresse && <p className="text-xs text-red-400 mt-1">{errors.adresse.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PremiumInput label="NPA" {...register('npa')} value={watch('npa') || ''} placeholder="Auto" readOnly />
                <PremiumInput label="Ville" {...register('ville')} value={watch('ville') || ''} placeholder="Auto" readOnly />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PremiumInput
                  label={typeBien === 'terrain' ? 'Surface du terrain (m²)' : 'Surface habitable (m²)'}
                  required
                  {...register('surface')}
                  value={watch('surface') || ''}
                  placeholder={typeBien === 'terrain' ? 'Ex: 800' : 'Ex: 120'}
                  error={errors.surface?.message}
                />
                <PremiumInput
                  label="Prix souhaité (CHF)"
                  required
                  {...register('prix_souhaite')}
                  value={watch('prix_souhaite') || ''}
                  placeholder={typeBien === 'terrain' ? "Ex: 500'000" : "Ex: 800'000"}
                  icon={<IconWallet size={16} />}
                  error={errors.prix_souhaite?.message}
                />
              </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <LuxuryIconBadge size="sm"><IconDocument size={16} /></LuxuryIconBadge>
              <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Caractéristiques du bien</h2>
            </div>

            {typeBien === 'terrain' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <PremiumSelect label="Zone d'affectation" value={watch('zone_affectation') || ''} onValueChange={(v) => setValue('zone_affectation', v)} options={[{value:'habitation',label:"Zone d'habitation"},{value:'mixte',label:'Zone mixte'},{value:'agricole',label:'Zone agricole'},{value:'industrielle',label:'Zone industrielle'},{value:'autre',label:'Autre'}]} placeholder="Sélectionnez..." />
                  <PremiumInput label="Constructibilité (COS/CUS)" {...register('constructibilite')} value={watch('constructibilite') || ''} placeholder="Ex: 0.4 / 1.2" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PremiumCheckbox id="terrain_viabilise" checked={watch('terrain_viabilise') || false} onCheckedChange={(c) => setValue('terrain_viabilise', c as boolean)} label="Terrain viabilisé (eau, électricité, égouts)" />
                  <PremiumCheckbox id="acces_route" checked={watch('acces_route') || false} onCheckedChange={(c) => setValue('acces_route', c as boolean)} label="Accès route direct" />
                </div>
              </div>
            )}

            {showRendementFields && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <PremiumInput label="Nombre de logements" {...register('nb_logements')} value={watch('nb_logements') || ''} placeholder="Ex: 6" icon={<IconBuilding size={16} />} />
                  <PremiumInput label="Revenus locatifs annuels (CHF)" {...register('revenus_locatifs')} value={watch('revenus_locatifs') || ''} placeholder="Ex: 120'000" icon={<IconWallet size={16} />} />
                  <PremiumInput label="Charges annuelles (CHF)" {...register('charges_annuelles')} value={watch('charges_annuelles') || ''} placeholder="Ex: 15'000" />
                  <PremiumInput label="Taux d'occupation (%)" {...register('taux_occupation')} value={watch('taux_occupation') || ''} placeholder="Ex: 95" />
                  <PremiumSelect label="État général" value={watch('etat_general') || ''} onValueChange={(v) => setValue('etat_general', v)} options={[{value:'neuf',label:'Neuf / Rénové récemment'},{value:'bon',label:'Bon état'},{value:'moyen',label:'État moyen'},{value:'a_renover',label:'À rénover'}]} placeholder="Sélectionnez..." />
                  <PremiumInput label="Année construction" {...register('annee_construction')} value={watch('annee_construction') || ''} placeholder="Ex: 1985" icon={<Calendar className="h-4 w-4" />} />
                </div>
              </div>
            )}

            {typeBien === 'commercial' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <PremiumSelect label="Usage actuel" value={watch('usage_actuel') || ''} onValueChange={(v) => setValue('usage_actuel', v)} options={[{value:'commerce',label:'Commerce / Boutique'},{value:'bureau',label:'Bureau'},{value:'atelier',label:'Atelier / Dépôt'},{value:'restaurant',label:'Restaurant / Café'},{value:'vacant',label:'Vacant'},{value:'autre',label:'Autre'}]} placeholder="Sélectionnez..." />
                <PremiumInput label="Loyer actuel (CHF/mois)" {...register('loyer_actuel')} value={watch('loyer_actuel') || ''} placeholder="Ex: 3'500" icon={<IconWallet size={16} />} />
                <PremiumInput label="Année construction" {...register('annee_construction')} value={watch('annee_construction') || ''} placeholder="Ex: 2000" />
              </div>
            )}

            {(typeBien === 'appartement' || (typeBien === 'villa' && !showRendementFields)) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <PremiumInput label="Nombre de pièces" {...register('nombre_pieces')} value={watch('nombre_pieces') || ''} placeholder="Ex: 4.5" />
                <PremiumInput label="Chambres" {...register('nombre_chambres')} value={watch('nombre_chambres') || ''} placeholder="Ex: 3" />
                <PremiumInput label="Salles de bain" {...register('nombre_sdb')} value={watch('nombre_sdb') || ''} placeholder="Ex: 2" />
                {typeBien === 'appartement' && <PremiumInput label="Étage" {...register('etage')} value={watch('etage') || ''} placeholder="Ex: 3ème" />}
                {typeBien === 'villa' && <PremiumInput label="Surface terrain (m²)" {...register('surface_terrain')} value={watch('surface_terrain') || ''} placeholder="Ex: 500" />}
                <PremiumInput label="Année construction" {...register('annee_construction')} value={watch('annee_construction') || ''} placeholder="Ex: 2010" />
              </div>
            )}

            {typeBien && typeBien !== 'terrain' && typeBien !== 'autre' && getEquipmentItems().length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[hsl(40_20%_60%)]">Équipements</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {getEquipmentItems().map((item) => (
                    <PremiumCheckbox
                      key={item.key}
                      id={item.key}
                      checked={watch(item.key as keyof FormData) as boolean || false}
                      onCheckedChange={(checked) => setValue(item.key as keyof FormData, checked as boolean)}
                      label={item.label}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2 border-t border-[hsl(38_45%_48%/0.12)]">
              <p className="text-sm font-medium text-[hsl(40_20%_60%)]">Vos motivations</p>
              <div className="grid grid-cols-2 gap-4">
                <PremiumSelect label="Délai de vente souhaité" value={watch('delai_vente') || ''} onValueChange={(v) => setValue('delai_vente', v)} options={[{value:'urgent',label:'Urgent (- de 3 mois)'},{value:'3-6mois',label:'3 à 6 mois'},{value:'6-12mois',label:'6 à 12 mois'},{value:'flexible',label:'Flexible'}]} placeholder="Sélectionnez..." />
                <PremiumSelect label="Motif de vente" value={watch('motif_vente') || ''} onValueChange={(v) => setValue('motif_vente', v)} options={[{value:'demenagement',label:'Déménagement'},{value:'succession',label:'Succession'},{value:'investissement',label:'Réinvestissement'},{value:'changement',label:'Changement de vie'},{value:'autre',label:'Autre'}]} placeholder="Sélectionnez..." />
              </div>
              <PremiumTextarea label="Description libre" optional {...register('description')} value={watch('description') || ''} placeholder="Points forts de votre bien, travaux récents, particularités..." rows={4} />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <LuxuryIconBadge size="sm"><IconCamera size={16} /></LuxuryIconBadge>
              <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Photos du bien</h2>
            </div>
            <p className="text-sm text-[hsl(40_20%_50%)]">Ajoutez jusqu'à 5 photos pour enrichir votre dossier (optionnel)</p>

            {isNative && (
              <div className="flex gap-3">
                <button type="button" onClick={() => handleNativePhoto(true)} disabled={cameraLoading || uploading || photos.length >= 5} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(38_45%_48%/0.25)] text-[hsl(40_20%_60%)] text-sm hover:border-[hsl(38_45%_48%/0.45)] transition-colors cursor-pointer disabled:opacity-50">
                  <Camera className="w-4 h-4" /> Prendre une photo
                </button>
                <button type="button" onClick={() => handleNativePhoto(false)} disabled={cameraLoading || uploading || photos.length >= 5} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(38_45%_48%/0.25)] text-[hsl(40_20%_60%)] text-sm hover:border-[hsl(38_45%_48%/0.45)] transition-colors cursor-pointer disabled:opacity-50">
                  <Image className="w-4 h-4" /> Galerie
                </button>
              </div>
            )}

            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragOver ? 'border-[hsl(38_55%_65%/0.6)] bg-[hsl(38_45%_48%/0.06)]' : 'border-[hsl(38_45%_48%/0.25)] hover:border-[hsl(38_55%_65%/0.4)] bg-[hsl(38_45%_48%/0.03)]'
              } ${photos.length >= 5 ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(38_55%_65%)]" />
                  <p className="text-sm text-[hsl(40_20%_50%)]">Upload en cours...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-3 text-[hsl(38_45%_48%)]" />
                  <p className="font-medium mb-1 text-[hsl(40_20%_75%)]">Glissez vos photos ici</p>
                  <p className="text-sm text-[hsl(40_20%_45%)] mb-4">ou cliquez pour sélectionner (max 5 photos, 10 MB chacune)</p>
                  <input type="file" accept="image/*" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e.target.files)} disabled={photos.length >= 5} aria-label="Sélectionner des photos" />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[hsl(38_45%_48%/0.3)] text-[hsl(40_20%_60%)] text-sm pointer-events-none">Parcourir</span>
                </>
              )}
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-[hsl(38_45%_48%/0.2)]">
                    <img src={photo.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(index)} aria-label={`Supprimer photo ${index + 1}`} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[hsl(30_15%_8%/0.8)] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && <div className="absolute bottom-0 left-0 right-0 bg-[hsl(38_45%_48%/0.9)] text-[hsl(30_15%_8%)] text-xs py-1 text-center font-medium">Principale</div>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[hsl(40_20%_38%)]">Conseil : Prenez des photos lumineuses de chaque pièce, de l'extérieur et des points forts du bien.</p>
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <LuxuryIconBadge size="sm"><IconUser size={16} /></LuxuryIconBadge>
              <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Vos coordonnées</h2>
            </div>
            <PremiumInput label="Nom complet" required {...register('nom')} value={watch('nom') || ''} placeholder="Prénom Nom" error={errors.nom?.message} />
            <div className="grid grid-cols-2 gap-4">
              <PremiumInput label="Email" required type="email" {...register('email')} value={watch('email') || ''} placeholder="votre@email.ch" icon={<IconMail size={16} />} error={errors.email?.message} />
              <PremiumInput label="Téléphone" required type="tel" {...register('telephone')} value={watch('telephone') || ''} placeholder="079 xxx xx xx" icon={<IconPhone size={16} />} error={errors.telephone?.message} />
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <LuxuryIconBadge size="sm"><IconLock size={16} /></LuxuryIconBadge>
              <h2 className="text-lg font-serif font-semibold text-[hsl(40_20%_85%)]">Création de votre compte</h2>
            </div>
            <p className="text-sm text-[hsl(40_20%_50%)]">Créez un mot de passe pour accéder à votre espace client et suivre votre dossier de vente.</p>
            <PremiumInput label="Mot de passe" required type="password" {...register('password')} value={watch('password') || ''} placeholder="8 caractères minimum" icon={<IconLock size={16} />} error={errors.password?.message} hint="Minimum 8 caractères" />
            <div className="rounded-xl p-4 bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.2)] flex items-start gap-3">
              <IconLock size={16} className="text-[hsl(38_55%_65%)] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[hsl(40_20%_50%)] leading-relaxed">Un email de confirmation vous sera envoyé à <strong className="text-[hsl(40_20%_70%)]">{watch('email')}</strong>. Après validation, vous accéderez à votre espace personnel.</p>
            </div>
            <div className="text-center">
              <ForgotPasswordLink defaultEmail={watch('email')} />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <PremiumFormShell currentStep={currentStep - 1} totalSteps={STEPS.length}>
      <VendeurFloatingNav />
      <PremiumStepIndicator steps={premiumSteps} currentStep={currentStep - 1} />

      <div className="container mx-auto px-4 max-w-3xl pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-[hsl(40_20%_88%)] mb-2">
            Complétez les informations de votre bien
          </h1>
          <p className="text-[hsl(40_20%_48%)] text-sm">
            Plus vous nous donnez de détails, plus notre matching sera précis.
          </p>
        </div>

        <PremiumFormCard>
            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-[hsl(38_45%_48%/0.15)] gap-4">
                <PremiumButton
                  type="button"
                  variant="back"
                  onClick={goToPrevStep}
                  disabled={currentStep === 1}
                >
                  Précédent
                </PremiumButton>

                {currentStep < 5 ? (
                  <PremiumButton type="button" variant="next" onClick={goToNextStep}>
                    Suivant
                  </PremiumButton>
                ) : (
                  <PremiumButton type="submit" variant="submit" loading={isSubmitting} disabled={isSubmitting}>
                    Soumettre mon bien
                  </PremiumButton>
                )}
              </div>

              <p className="text-xs text-center text-[hsl(40_20%_35%)] mt-6">
                En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe.
                Aucune donnée n'est partagée avec des tiers.
              </p>
            </form>
        </PremiumFormCard>
      </div>

      <VendeurFooter />
    </PremiumFormShell>
  );
}
