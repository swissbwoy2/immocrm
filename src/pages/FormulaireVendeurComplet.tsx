import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Send, Home, MapPinned, Ruler, Banknote, User,
  Mail, Phone, Loader2, CheckCircle, Building2, Calendar,
  Bed, Bath, Car, Trees, Sun, Mountain, Landmark, Map, Zap,
  DollarSign, Percent, Store, Factory, Camera, Upload, X, Image,
  ChevronLeft, ChevronRight, FileText, Lock, KeyRound
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PremiumFormShell } from '@/components/forms-premium/PremiumFormShell';
import { PremiumStepIndicator } from '@/components/forms-premium/PremiumStepIndicator';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumButton } from '@/components/forms-premium/PremiumButton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

// Stepper steps definition
const STEPS = [
  { id: 1, title: 'Bien', icon: Home, description: 'Type et localisation' },
  { id: 2, title: 'Détails', icon: FileText, description: 'Caractéristiques' },
  { id: 3, title: 'Photos', icon: Camera, description: 'Images du bien' },
  { id: 4, title: 'Contact', icon: User, description: 'Vos coordonnées' },
  { id: 5, title: 'Compte', icon: Lock, description: 'Création de compte' },
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
      <div className="theme-luxury min-h-screen bg-background">
        <VendeurFloatingNav />
        <main className="pt-32 pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-6">
                Votre bien a été soumis !
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Notre équipe analyse votre bien et vous contactera sous 24h 
                avec le nombre d'acheteurs potentiels correspondants à votre profil.
              </p>
              <div className="space-y-4">
                <Button onClick={() => navigate('/vendre-mon-bien')} size="lg">
                  Retour à la page vendeur
                </Button>
              </div>
            </div>
          </div>
        </main>
        <VendeurFooter />
      </div>
    );
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 rounded-2xl bg-card border border-border/50"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Informations principales
            </h2>
            
            <div className="space-y-4">
              {/* Type de bien */}
              <div className="space-y-2">
                <Label>Type de bien *</Label>
                <Select 
                  value={watch('type_bien')} 
                  onValueChange={(value) => setValue('type_bien', value)}
                >
                  <SelectTrigger className={errors.type_bien ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="villa">Villa / Maison</SelectItem>
                    <SelectItem value="immeuble">Immeuble de rapport</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                    <SelectItem value="commercial">Local commercial</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Villa sub-question */}
              <AnimatePresence mode="wait">
                {typeBien === 'villa' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border/30"
                  >
                    <Label className="text-base">Votre bien comprend-il plusieurs logements séparés ?</Label>
                    <RadioGroup
                      value={watch('est_multi_logements') || 'non'}
                      onValueChange={(value: 'non' | 'oui_2' | 'oui_3plus') => setValue('est_multi_logements', value)}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="non" id="non" />
                        <Label htmlFor="non" className="cursor-pointer">Non, maison individuelle</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="oui_2" id="oui_2" />
                        <Label htmlFor="oui_2" className="cursor-pointer">Oui, 2 logements</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="oui_3plus" id="oui_3plus" />
                        <Label htmlFor="oui_3plus" className="cursor-pointer">Oui, 3+ logements</Label>
                      </div>
                    </RadioGroup>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Adresse */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPinned className="w-4 h-4 text-muted-foreground" />
                  Adresse du bien *
                </Label>
                <GoogleAddressAutocomplete
                  value={watch('adresse')}
                  onChange={handleAddressChange}
                  onInputChange={(val) => setValue('adresse', val)}
                  placeholder="Entrez l'adresse complète"
                  className={errors.adresse ? 'border-destructive' : ''}
                  restrictToSwitzerland
                />
                {errors.adresse && <p className="text-sm text-destructive">{errors.adresse.message}</p>}
              </div>

              {/* NPA / Ville (auto-filled) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NPA</Label>
                  <Input {...register('npa')} placeholder="Auto" readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input {...register('ville')} placeholder="Auto" readOnly className="bg-muted/50" />
                </div>
              </div>

              {/* Surface & Prix */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    {typeBien === 'terrain' ? 'Surface du terrain (m²) *' : 'Surface habitable (m²) *'}
                  </Label>
                  <Input 
                    {...register('surface')}
                    placeholder={typeBien === 'terrain' ? 'Ex: 800' : 'Ex: 120'}
                    className={errors.surface ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    Prix souhaité (CHF) *
                  </Label>
                  <Input 
                    {...register('prix_souhaite')}
                    placeholder={typeBien === 'terrain' ? "Ex: 500'000" : "Ex: 800'000"}
                    className={errors.prix_souhaite ? 'border-destructive' : ''}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Details based on property type */}
            {typeBien && typeBien !== 'autre' && (
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                {/* TERRAIN Section */}
                {typeBien === 'terrain' && (
                  <>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Map className="w-5 h-5 text-primary" />
                      Caractéristiques du terrain
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Zone d'affectation</Label>
                        <Select onValueChange={(value) => setValue('zone_affectation', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="habitation">Zone d'habitation</SelectItem>
                            <SelectItem value="mixte">Zone mixte</SelectItem>
                            <SelectItem value="agricole">Zone agricole</SelectItem>
                            <SelectItem value="industrielle">Zone industrielle</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Constructibilité (COS/CUS)</Label>
                        <Input {...register('constructibilite')} placeholder="Ex: 0.4 / 1.2" />
                      </div>
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
                        <Checkbox
                          id="terrain_viabilise"
                          checked={watch('terrain_viabilise')}
                          onCheckedChange={(checked) => setValue('terrain_viabilise', checked as boolean)}
                        />
                        <Label htmlFor="terrain_viabilise" className="flex items-center gap-2 cursor-pointer">
                          <Zap className="w-4 h-4 text-muted-foreground" />
                          Terrain viabilisé (eau, électricité, égouts)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
                        <Checkbox
                          id="acces_route"
                          checked={watch('acces_route')}
                          onCheckedChange={(checked) => setValue('acces_route', checked as boolean)}
                        />
                        <Label htmlFor="acces_route" className="flex items-center gap-2 cursor-pointer">
                          <Car className="w-4 h-4 text-muted-foreground" />
                          Accès route direct
                        </Label>
                      </div>
                    </div>
                  </>
                )}

                {/* IMMEUBLE / MULTI-LOGEMENTS Section */}
                {showRendementFields && (
                  <>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-primary" />
                      Données de rendement
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          Nombre de logements
                        </Label>
                        <Input {...register('nb_logements')} placeholder="Ex: 6" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          Revenus locatifs annuels (CHF)
                        </Label>
                        <Input {...register('revenus_locatifs')} placeholder="Ex: 120'000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-muted-foreground" />
                          Charges annuelles (CHF)
                        </Label>
                        <Input {...register('charges_annuelles')} placeholder="Ex: 15'000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-muted-foreground" />
                          Taux d'occupation (%)
                        </Label>
                        <Input {...register('taux_occupation')} placeholder="Ex: 95" />
                      </div>
                      <div className="space-y-2">
                        <Label>État général</Label>
                        <Select onValueChange={(value) => setValue('etat_general', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="neuf">Neuf / Rénové récemment</SelectItem>
                            <SelectItem value="bon">Bon état</SelectItem>
                            <SelectItem value="moyen">État moyen</SelectItem>
                            <SelectItem value="a_renover">À rénover</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          Année construction
                        </Label>
                        <Input {...register('annee_construction')} placeholder="Ex: 1985" />
                      </div>
                    </div>
                  </>
                )}

                {/* COMMERCIAL Section */}
                {typeBien === 'commercial' && (
                  <>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" />
                      Détails du local
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Usage actuel</Label>
                        <Select onValueChange={(value) => setValue('usage_actuel', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="commerce">Commerce / Boutique</SelectItem>
                            <SelectItem value="bureau">Bureau</SelectItem>
                            <SelectItem value="atelier">Atelier / Dépôt</SelectItem>
                            <SelectItem value="restaurant">Restaurant / Café</SelectItem>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          Loyer actuel (CHF/mois)
                        </Label>
                        <Input {...register('loyer_actuel')} placeholder="Ex: 3'500" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          Année construction
                        </Label>
                        <Input {...register('annee_construction')} placeholder="Ex: 2000" />
                      </div>
                    </div>
                  </>
                )}

                {/* APPARTEMENT / VILLA SIMPLE Section */}
                {(typeBien === 'appartement' || (typeBien === 'villa' && !showRendementFields)) && (
                  <>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Détails du bien
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          Nombre de pièces
                        </Label>
                        <Input {...register('nombre_pieces')} placeholder="Ex: 4.5" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-muted-foreground" />
                          Chambres
                        </Label>
                        <Input {...register('nombre_chambres')} placeholder="Ex: 3" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Bath className="w-4 h-4 text-muted-foreground" />
                          Salles de bain
                        </Label>
                        <Input {...register('nombre_sdb')} placeholder="Ex: 2" />
                      </div>
                      {typeBien === 'appartement' && (
                        <div className="space-y-2">
                          <Label>Étage</Label>
                          <Input {...register('etage')} placeholder="Ex: 3ème" />
                        </div>
                      )}
                      {typeBien === 'villa' && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Trees className="w-4 h-4 text-muted-foreground" />
                            Surface terrain (m²)
                          </Label>
                          <Input {...register('surface_terrain')} placeholder="Ex: 500" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          Année construction
                        </Label>
                        <Input {...register('annee_construction')} placeholder="Ex: 2010" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Équipements */}
            {typeBien && typeBien !== 'terrain' && typeBien !== 'autre' && getEquipmentItems().length > 0 && (
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Équipements</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getEquipmentItems().map((item) => (
                    <div key={item.key} className="flex items-center space-x-3">
                      <Checkbox
                        id={item.key}
                        checked={watch(item.key as keyof FormData) as boolean}
                        onCheckedChange={(checked) => 
                          setValue(item.key as keyof FormData, checked as boolean)
                        }
                      />
                      <Label htmlFor={item.key} className="flex items-center gap-2 cursor-pointer">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motivations */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold mb-6">Vos motivations</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Délai de vente souhaité</Label>
                    <Select onValueChange={(value) => setValue('delai_vente', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent (- de 3 mois)</SelectItem>
                        <SelectItem value="3-6mois">3 à 6 mois</SelectItem>
                        <SelectItem value="6-12mois">6 à 12 mois</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motif de vente</Label>
                    <Select onValueChange={(value) => setValue('motif_vente', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demenagement">Déménagement</SelectItem>
                        <SelectItem value="succession">Succession</SelectItem>
                        <SelectItem value="investissement">Réinvestissement</SelectItem>
                        <SelectItem value="changement">Changement de vie</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description libre (optionnel)</Label>
                  <Textarea 
                    {...register('description')}
                    placeholder="Points forts de votre bien, travaux récents, particularités..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 rounded-2xl bg-card border border-border/50"
          >
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Photos du bien
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Ajoutez jusqu'à 5 photos pour enrichir votre dossier (optionnel)
            </p>

            {/* Native camera buttons */}
            {isNative && (
              <div className="flex gap-3 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleNativePhoto(true)}
                  disabled={cameraLoading || uploading || photos.length >= 5}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Prendre une photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleNativePhoto(false)}
                  disabled={cameraLoading || uploading || photos.length >= 5}
                  className="flex-1"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Galerie
                </Button>
              </div>
            )}

            {/* Drag and drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragOver 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              } ${photos.length >= 5 ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Upload en cours...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-foreground font-medium mb-1">
                    Glissez vos photos ici
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou cliquez pour sélectionner (max 5 photos, 10 MB chacune)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    disabled={photos.length >= 5}
                  />
                  <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                    Parcourir
                  </Button>
                </>
              )}
            </div>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-xs py-1 text-center">
                        Principale
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              💡 Conseil : Prenez des photos lumineuses de chaque pièce, de l'extérieur et des points forts du bien.
            </p>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 rounded-2xl bg-card border border-border/50"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Vos coordonnées
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input 
                  {...register('nom')}
                  placeholder="Prénom Nom"
                  className={errors.nom ? 'border-destructive' : ''}
                />
                {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email *
                  </Label>
                  <Input 
                    {...register('email')}
                    type="email"
                    placeholder="votre@email.ch"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Téléphone *
                  </Label>
                  <Input 
                    {...register('telephone')}
                    type="tel"
                    placeholder="079 xxx xx xx"
                    className={errors.telephone ? 'border-destructive' : ''}
                  />
                  {errors.telephone && <p className="text-sm text-destructive">{errors.telephone.message}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 rounded-2xl bg-card border border-border/50"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Création de votre compte
            </h2>

            <p className="text-sm text-muted-foreground mb-4">
              Créez un mot de passe pour accéder à votre espace client et suivre votre dossier de vente.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  Mot de passe *
                </Label>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="8 caractères minimum"
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                Un email de confirmation vous sera envoyé à <strong>{watch('email')}</strong>.
                Après validation, vous accéderez à votre espace personnel.
              </div>

              <div className="text-center pt-2">
                <ForgotPasswordLink defaultEmail={watch('email')} />
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const premiumSteps = STEPS.map(s => ({ title: s.title, icon: '●' }));

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
