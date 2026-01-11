import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Save, Send, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Import form steps
import { StepTypeBien } from '@/components/annonceur/steps/StepTypeBien';
import { StepLocalisation } from '@/components/annonceur/steps/StepLocalisation';
import { StepCaracteristiques } from '@/components/annonceur/steps/StepCaracteristiques';
import { StepPrix } from '@/components/annonceur/steps/StepPrix';
import { StepEquipements } from '@/components/annonceur/steps/StepEquipements';
import { StepEnergie } from '@/components/annonceur/steps/StepEnergie';
import { StepDescription } from '@/components/annonceur/steps/StepDescription';
import { StepPhotos } from '@/components/annonceur/steps/StepPhotos';
import { StepContact } from '@/components/annonceur/steps/StepContact';
import { StepConditions } from '@/components/annonceur/steps/StepConditions';
import { StepRecapitulatif } from '@/components/annonceur/steps/StepRecapitulatif';

export interface AnnonceFormData {
  // Type de bien
  type_transaction: 'location' | 'vente';
  sous_type: string;
  
  // Localisation
  adresse: string;
  adresse_complementaire: string;
  code_postal: string;
  ville: string;
  canton: string;
  latitude: number | null;
  longitude: number | null;
  afficher_adresse_exacte: boolean;
  
  // Caractéristiques
  surface_habitable: number | null;
  surface_terrain: number | null;
  nombre_pieces: number | null;
  nb_chambres: number | null;
  nb_salles_bain: number | null;
  nb_wc: number | null;
  etage: number | null;
  nb_etages_immeuble: number | null;
  annee_construction: number | null;
  annee_renovation: number | null;
  etat_bien: string;
  
  // Prix
  prix: number | null;
  charges_mensuelles: number | null;
  charges_comprises: boolean;
  depot_garantie: number | null;
  nb_mois_garantie: number | null;
  
  // Équipements
  balcon: boolean;
  terrasse: boolean;
  jardin: boolean;
  piscine: boolean;
  parking_inclus: boolean;
  nb_places_parking: number | null;
  type_parking: string;
  acces_pmr: boolean;
  equipements: Record<string, boolean>;
  
  // Énergie
  classe_energetique: string;
  indice_energetique: number | null;
  emissions_co2: number | null;
  type_chauffage: string;
  source_energie: string;
  
  // Description
  titre: string;
  description_courte: string;
  description: string;
  points_forts: string[];
  mots_cles: string[];
  
  // Photos
  photos: Array<{ url: string; est_principale: boolean }>;
  
  // Contact
  nom_contact: string;
  telephone_contact: string;
  email_contact: string;
  whatsapp_contact: string;
  horaires_contact: string;
  
  // Conditions
  disponible_immediatement: boolean;
  disponible_des: string;
  animaux_autorises: boolean;
  fumeurs_acceptes: boolean;
  duree_bail_min: number | null;
}

const initialFormData: AnnonceFormData = {
  type_transaction: 'location',
  sous_type: 'appartement',
  adresse: '',
  adresse_complementaire: '',
  code_postal: '',
  ville: '',
  canton: '',
  latitude: null,
  longitude: null,
  afficher_adresse_exacte: true,
  surface_habitable: null,
  surface_terrain: null,
  nombre_pieces: null,
  nb_chambres: null,
  nb_salles_bain: null,
  nb_wc: null,
  etage: null,
  nb_etages_immeuble: null,
  annee_construction: null,
  annee_renovation: null,
  etat_bien: '',
  prix: null,
  charges_mensuelles: null,
  charges_comprises: false,
  depot_garantie: null,
  nb_mois_garantie: 3,
  balcon: false,
  terrasse: false,
  jardin: false,
  piscine: false,
  parking_inclus: false,
  nb_places_parking: null,
  type_parking: '',
  acces_pmr: false,
  equipements: {},
  classe_energetique: '',
  indice_energetique: null,
  emissions_co2: null,
  type_chauffage: '',
  source_energie: '',
  titre: '',
  description_courte: '',
  description: '',
  points_forts: [],
  mots_cles: [],
  photos: [],
  nom_contact: '',
  telephone_contact: '',
  email_contact: '',
  whatsapp_contact: '',
  horaires_contact: '',
  disponible_immediatement: true,
  disponible_des: '',
  animaux_autorises: false,
  fumeurs_acceptes: false,
  duree_bail_min: null,
};

const steps = [
  { id: 1, title: 'Type de bien', component: StepTypeBien },
  { id: 2, title: 'Localisation', component: StepLocalisation },
  { id: 3, title: 'Caractéristiques', component: StepCaracteristiques },
  { id: 4, title: 'Prix', component: StepPrix },
  { id: 5, title: 'Équipements', component: StepEquipements },
  { id: 6, title: 'Énergie', component: StepEnergie },
  { id: 7, title: 'Description', component: StepDescription },
  { id: 8, title: 'Photos', component: StepPhotos },
  { id: 9, title: 'Contact', component: StepContact },
  { id: 10, title: 'Conditions', component: StepConditions },
  { id: 11, title: 'Récapitulatif', component: StepRecapitulatif },
];

export default function NouvelleAnnonce() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { id: annonceId } = useParams();
  const isEditMode = !!annonceId;
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AnnonceFormData>(initialFormData);

  // Fetch annonceur
  const { data: annonceur, isLoading: annonceurLoading, error: annonceurError } = useQuery({
    queryKey: ['annonceur', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch categories to map sous_type to categorie_id
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-annonces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories_annonces')
        .select('id, slug');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing annonce in edit mode
  const { data: existingAnnonce, isLoading: loadingAnnonce } = useQuery({
    queryKey: ['annonce-edit', annonceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select('*, photos_annonces_publiques(*)')
        .eq('id', annonceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!annonceId,
  });

  // Pre-fill form with existing annonce data or annonceur contact info
  useEffect(() => {
    if (existingAnnonce) {
      setFormData({
        type_transaction: existingAnnonce.type_transaction as 'location' | 'vente' || 'location',
        sous_type: existingAnnonce.sous_type || 'appartement',
        adresse: existingAnnonce.adresse || '',
        adresse_complementaire: existingAnnonce.adresse_complementaire || '',
        code_postal: existingAnnonce.code_postal || '',
        ville: existingAnnonce.ville || '',
        canton: existingAnnonce.canton || '',
        latitude: existingAnnonce.latitude,
        longitude: existingAnnonce.longitude,
        afficher_adresse_exacte: existingAnnonce.afficher_adresse_exacte ?? true,
        surface_habitable: existingAnnonce.surface_habitable,
        surface_terrain: existingAnnonce.surface_terrain,
        nombre_pieces: existingAnnonce.nombre_pieces,
        nb_chambres: existingAnnonce.nb_chambres,
        nb_salles_bain: existingAnnonce.nb_salles_bain,
        nb_wc: existingAnnonce.nb_wc,
        etage: existingAnnonce.etage,
        nb_etages_immeuble: existingAnnonce.nb_etages_immeuble,
        annee_construction: existingAnnonce.annee_construction,
        annee_renovation: existingAnnonce.annee_renovation,
        etat_bien: existingAnnonce.etat_bien || '',
        prix: existingAnnonce.prix,
        charges_mensuelles: existingAnnonce.charges_mensuelles,
        charges_comprises: existingAnnonce.charges_comprises ?? false,
        depot_garantie: existingAnnonce.depot_garantie,
        nb_mois_garantie: existingAnnonce.nb_mois_garantie || 3,
        balcon: existingAnnonce.balcon ?? false,
        terrasse: existingAnnonce.terrasse ?? false,
        jardin: existingAnnonce.jardin ?? false,
        piscine: existingAnnonce.piscine ?? false,
        parking_inclus: existingAnnonce.parking_inclus ?? false,
        nb_places_parking: existingAnnonce.nb_places_parking,
        type_parking: existingAnnonce.type_parking || '',
        acces_pmr: existingAnnonce.acces_pmr ?? false,
        equipements: (existingAnnonce.equipements as Record<string, boolean>) || {},
        classe_energetique: existingAnnonce.classe_energetique || '',
        indice_energetique: existingAnnonce.indice_energetique,
        emissions_co2: existingAnnonce.emissions_co2,
        type_chauffage: existingAnnonce.type_chauffage || '',
        source_energie: existingAnnonce.source_energie || '',
        titre: existingAnnonce.titre || '',
        description_courte: existingAnnonce.description_courte || '',
        description: existingAnnonce.description || '',
        points_forts: (existingAnnonce.points_forts as string[]) || [],
        mots_cles: (existingAnnonce.mots_cles as string[]) || [],
        photos: (existingAnnonce.photos_annonces_publiques || []).map((p: any) => ({
          url: p.url,
          est_principale: p.est_principale,
        })),
        nom_contact: existingAnnonce.nom_contact || '',
        telephone_contact: existingAnnonce.telephone_contact || '',
        email_contact: existingAnnonce.email_contact || '',
        whatsapp_contact: existingAnnonce.whatsapp_contact || '',
        horaires_contact: existingAnnonce.horaires_contact || '',
        disponible_immediatement: existingAnnonce.disponible_immediatement ?? true,
        disponible_des: existingAnnonce.disponible_des || '',
        animaux_autorises: existingAnnonce.animaux_autorises ?? false,
        fumeurs_acceptes: existingAnnonce.fumeurs_acceptes ?? false,
        duree_bail_min: existingAnnonce.duree_bail_min,
      });
    } else if (annonceur && !isEditMode) {
      // Pre-fill contact info for new annonce
      setFormData(prev => ({
        ...prev,
        nom_contact: `${annonceur.prenom || ''} ${annonceur.nom}`.trim(),
        telephone_contact: annonceur.telephone || '',
        email_contact: annonceur.email,
      }));
    }
  }, [existingAnnonce, annonceur, isEditMode]);

  // Generate slug from title
  const generateSlug = (titre: string) => {
    return titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);
  };

  // Save mutation - MUST be before any conditional returns
  const saveMutation = useMutation({
    mutationFn: async (status: 'brouillon' | 'en_attente') => {
      // Critical validation - ensure session is valid
      if (!session || !user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      // Critical validation - ensure annonceur exists
      if (!annonceur?.id) {
        throw new Error('Profil annonceur non trouvé');
      }

      // Map sous_type to categorie_id
      const matchingCategory = categories.find(c => c.slug === formData.sous_type);

      const annonceData = {
        type_transaction: formData.type_transaction,
        sous_type: formData.sous_type || null,
        categorie_id: matchingCategory?.id || null,
        adresse: formData.adresse,
        adresse_complementaire: formData.adresse_complementaire,
        code_postal: formData.code_postal,
        ville: formData.ville,
        canton: formData.canton,
        latitude: formData.latitude,
        longitude: formData.longitude,
        afficher_adresse_exacte: formData.afficher_adresse_exacte,
        surface_habitable: formData.surface_habitable,
        surface_terrain: formData.surface_terrain,
        nombre_pieces: formData.nombre_pieces,
        nb_chambres: formData.nb_chambres,
        nb_salles_bain: formData.nb_salles_bain,
        nb_wc: formData.nb_wc,
        etage: formData.etage,
        nb_etages_immeuble: formData.nb_etages_immeuble,
        annee_construction: formData.annee_construction,
        annee_renovation: formData.annee_renovation,
        etat_bien: formData.etat_bien || null,
        prix: formData.prix,
        charges_mensuelles: formData.charges_mensuelles,
        charges_comprises: formData.charges_comprises,
        depot_garantie: formData.depot_garantie,
        nb_mois_garantie: formData.nb_mois_garantie,
        balcon: formData.balcon,
        terrasse: formData.terrasse,
        jardin: formData.jardin,
        piscine: formData.piscine,
        parking_inclus: formData.parking_inclus,
        nb_places_parking: formData.nb_places_parking,
        type_parking: formData.type_parking || null,
        acces_pmr: formData.acces_pmr,
        equipements: formData.equipements,
        classe_energetique: formData.classe_energetique || null,
        indice_energetique: formData.indice_energetique,
        emissions_co2: formData.emissions_co2,
        type_chauffage: formData.type_chauffage,
        source_energie: formData.source_energie,
        titre: formData.titre,
        description_courte: formData.description_courte,
        description: formData.description,
        points_forts: formData.points_forts,
        mots_cles: formData.mots_cles,
        nom_contact: formData.nom_contact,
        telephone_contact: formData.telephone_contact,
        email_contact: formData.email_contact,
        whatsapp_contact: formData.whatsapp_contact,
        horaires_contact: formData.horaires_contact,
        disponible_immediatement: formData.disponible_immediatement,
        disponible_des: formData.disponible_des || null,
        animaux_autorises: formData.animaux_autorises,
        fumeurs_acceptes: formData.fumeurs_acceptes,
        duree_bail_min: formData.duree_bail_min,
      };

      let annonce;
      
      if (isEditMode && annonceId) {
        // Update existing annonce
        const { data, error: updateError } = await supabase
          .from('annonces_publiques')
          .update({
            ...annonceData,
            statut: status,
            date_soumission: status === 'en_attente' ? new Date().toISOString() : existingAnnonce?.date_soumission,
          })
          .eq('id', annonceId)
          .select()
          .single();

        if (updateError) throw updateError;
        annonce = data;

        // Update photos - delete old ones and insert new
        await supabase
          .from('photos_annonces_publiques')
          .delete()
          .eq('annonce_id', annonceId);

        if (formData.photos.length > 0) {
          const photosToInsert = formData.photos.map((photo, index) => ({
            annonce_id: annonceId,
            url: photo.url,
            est_principale: photo.est_principale,
            ordre: index,
          }));

          const { error: photosError } = await supabase
            .from('photos_annonces_publiques')
            .insert(photosToInsert);

          if (photosError) throw photosError;
        }
      } else {
        // Create new annonce
        const slug = generateSlug(formData.titre);
        const reference = `REF-${Date.now().toString(36).toUpperCase()}`;

        const { data, error: insertError } = await supabase
          .from('annonces_publiques')
          .insert({
            ...annonceData,
            annonceur_id: annonceur.id,
            statut: status,
            slug,
            reference,
            date_soumission: status === 'en_attente' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        annonce = data;

        // Save photos
        if (formData.photos.length > 0) {
          const photosToInsert = formData.photos.map((photo, index) => ({
            annonce_id: annonce.id,
            url: photo.url,
            est_principale: photo.est_principale,
            ordre: index,
          }));

          const { error: photosError } = await supabase
            .from('photos_annonces_publiques')
            .insert(photosToInsert);

          if (photosError) throw photosError;
        }
      }

      return annonce;
    },
    onSuccess: (_, status) => {
      if (status === 'brouillon') {
        toast.success(isEditMode ? 'Annonce mise à jour en brouillon' : 'Annonce enregistrée en brouillon');
      } else {
        toast.success(isEditMode ? 'Annonce mise à jour et soumise' : 'Annonce soumise pour modération');
      }
      navigate('/espace-annonceur/mes-annonces');
    },
    onError: (error: Error) => {
      console.error('Error saving annonce:', error);
      if (error.message.includes('Session expirée')) {
        toast.error(error.message);
        navigate('/connexion-annonceur');
      } else {
        toast.error(error.message || 'Erreur lors de l\'enregistrement');
      }
    },
  });

  // Show loader while fetching annonceur or annonce
  if (annonceurLoading || loadingAnnonce) {
    return (
      <AnnonceurLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Chargement...</span>
        </div>
      </AnnonceurLayout>
    );
  }

  // Show error if annonceur not found
  if (annonceurError || !annonceur) {
    return (
      <AnnonceurLayout>
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Profil annonceur introuvable</h2>
          <p className="text-muted-foreground mb-4">
            Impossible de créer une annonce sans profil annonceur valide.
          </p>
          <Button onClick={() => navigate('/espace-annonceur')}>
            Retour au tableau de bord
          </Button>
        </div>
      </AnnonceurLayout>
    );
  }

  const updateFormData = (updates: Partial<AnnonceFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const progress = (currentStep / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep - 1].component;

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return formData.type_transaction && formData.sous_type;
      case 2:
        return formData.adresse && formData.code_postal && formData.ville;
      case 3:
        return formData.surface_habitable && formData.nombre_pieces;
      case 4:
        return formData.prix;
      case 7:
        return formData.titre && formData.description;
      case 9:
        return formData.nom_contact && formData.email_contact;
      default:
        return true;
    }
  };

  return (
    <AnnonceurLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h1>
          <p className="text-muted-foreground">
            Étape {currentStep} sur {steps.length} : {steps[currentStep - 1].title}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground overflow-x-auto">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                className={`px-1 whitespace-nowrap ${
                  step.id === currentStep 
                    ? 'text-primary font-medium' 
                    : step.id < currentStep 
                      ? 'text-primary/70 cursor-pointer hover:underline' 
                      : ''
                }`}
                disabled={step.id > currentStep}
              >
                {step.id}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CurrentStepComponent
                  formData={formData}
                  updateFormData={updateFormData}
                />
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate('brouillon')}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer brouillon
            </Button>

            {currentStep < steps.length ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canGoNext()}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => saveMutation.mutate('en_attente')}
                disabled={saveMutation.isPending || !formData.titre || !formData.prix}
              >
                <Send className="h-4 w-4 mr-2" />
                Soumettre l'annonce
              </Button>
            )}
          </div>
        </div>
      </div>
    </AnnonceurLayout>
  );
}
