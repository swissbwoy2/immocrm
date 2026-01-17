import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Loader2, Camera, Building2, MapPin, Ruler, Home, Thermometer, 
  Banknote, Grid3X3, Navigation, FileText, ChevronLeft, ChevronRight,
  Check, User, Send
} from 'lucide-react';
import { CapturePhotosDialog } from './CapturePhotosDialog';
import { GoogleAddressAutocomplete } from './GoogleAddressAutocomplete';

interface CapturedPhoto {
  id: string;
  file: File;
  preview: string;
  type: string;
  legende: string;
  niveau_confidentialite: 'public' | 'interne' | 'confidentiel';
}

interface Proprietaire {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface Agent {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface FormData {
  // Type et mandant
  type_bien: string;
  sous_type_bien: string;
  agent_responsable_id: string;
  proprietaire_id: string;
  nouveau_proprietaire_email: string;
  nouveau_proprietaire_prenom: string;
  nouveau_proprietaire_nom: string;
  nouveau_proprietaire_telephone: string;
  frequence_rapport: string;
  est_apport_affaire: boolean;
  
  // Cadastre
  adresse: string;
  code_postal: string;
  ville: string;
  canton: string;
  no_rf_base: string;
  no_rf_feuillet: string;
  lots_rf: string;
  zone_construction: string;
  
  // Description
  nom: string;
  etage: number | null;
  nb_etages_batiment: number | null;
  nombre_pieces: number | null;
  nb_chambres: number | null;
  nb_wc: number | null;
  nb_salles_eau: number | null;
  nb_garages: number;
  nb_places_int: number;
  nb_places_ext: number;
  surface_totale: number | null;
  surface_ppe: number | null;
  surface_balcon: number | null;
  surface_terrasse: number | null;
  surface_jardin: number | null;
  hauteur_plafond: number | null;
  
  // Technique
  annee_construction: number | null;
  annee_renovation: number | null;
  type_chauffage: string;
  combustible: string;
  no_eca: string;
  volume_eca: number | null;
  valeur_eca: number | null;
  
  // Finances
  administrateur_ppe: string;
  charges_ppe: number | null;
  charges_chauffage_ec: number | null;
  fonds_renovation: number | null;
  est_loue: boolean;
  locataire_actuel: string;
  email_locataire: string;
  tel_locataire: string;
  loyer_actuel: number | null;
  charges_locataire: number | null;
  
  // Équipements
  equipements_exterieur: string[];
  equipements_interieur: string[];
  equipements_cuisine: string[];
  equipements_securite: string[];
  type_sol: string[];
  exposition: string[];
  caracteristiques_vue: string[];
  caracteristiques_entourage: string[];
  etat_bien: string[];
  
  // Distances
  distance_gare: number | null;
  distance_bus: number | null;
  distance_garderie: number | null;
  distance_ecole_primaire: number | null;
  distance_ecole_secondaire: number | null;
  distance_gymnase: number | null;
  distance_autoroute: number | null;
  distance_banque: number | null;
  distance_poste: number | null;
  distance_commerces: number | null;
  
  // Prix et publication - NOUVEAU: Double prix vendeur/commercial
  prix_vente_demande: number | null;
  estimation_agent: number | null;
  prix_vendeur: number | null;      // Prix net souhaité par vendeur (caché aux acheteurs)
  prix_commercial: number | null;    // Prix affiché aux acheteurs
  places_parc_incluses: boolean;     // Si places de parc incluses dans le prix
  description_commerciale: string;
  points_forts: string;
  publier_espace_acheteur: boolean;
}

const INITIAL_FORM_DATA: FormData = {
  type_bien: '',
  sous_type_bien: '',
  agent_responsable_id: '',
  proprietaire_id: '',
  nouveau_proprietaire_email: '',
  nouveau_proprietaire_prenom: '',
  nouveau_proprietaire_nom: '',
  nouveau_proprietaire_telephone: '',
  frequence_rapport: 'mensuel',
  est_apport_affaire: false,
  adresse: '',
  code_postal: '',
  ville: '',
  canton: '',
  no_rf_base: '',
  no_rf_feuillet: '',
  lots_rf: '',
  zone_construction: '',
  nom: '',
  etage: null,
  nb_etages_batiment: null,
  nombre_pieces: null,
  nb_chambres: null,
  nb_wc: null,
  nb_salles_eau: null,
  nb_garages: 0,
  nb_places_int: 0,
  nb_places_ext: 0,
  surface_totale: null,
  surface_ppe: null,
  surface_balcon: null,
  surface_terrasse: null,
  surface_jardin: null,
  hauteur_plafond: null,
  annee_construction: null,
  annee_renovation: null,
  type_chauffage: '',
  combustible: '',
  no_eca: '',
  volume_eca: null,
  valeur_eca: null,
  administrateur_ppe: '',
  charges_ppe: null,
  charges_chauffage_ec: null,
  prix_vendeur: null,
  prix_commercial: null,
  places_parc_incluses: true,
  fonds_renovation: null,
  est_loue: false,
  locataire_actuel: '',
  email_locataire: '',
  tel_locataire: '',
  loyer_actuel: null,
  charges_locataire: null,
  equipements_exterieur: [],
  equipements_interieur: [],
  equipements_cuisine: [],
  equipements_securite: [],
  type_sol: [],
  exposition: [],
  caracteristiques_vue: [],
  caracteristiques_entourage: [],
  etat_bien: [],
  distance_gare: null,
  distance_bus: null,
  distance_garderie: null,
  distance_ecole_primaire: null,
  distance_ecole_secondaire: null,
  distance_gymnase: null,
  distance_autoroute: null,
  distance_banque: null,
  distance_poste: null,
  distance_commerces: null,
  prix_vente_demande: null,
  estimation_agent: null,
  description_commerciale: '',
  points_forts: '',
  publier_espace_acheteur: false,
};

const STEPS = [
  { id: 0, title: 'Photos', icon: Camera },
  { id: 1, title: 'Type & Mandant', icon: User },
  { id: 2, title: 'Adresse', icon: MapPin },
  { id: 3, title: 'Description', icon: Ruler },
  { id: 4, title: 'Technique', icon: Thermometer },
  { id: 5, title: 'Finances', icon: Banknote },
  { id: 6, title: 'Équipements', icon: Grid3X3 },
  { id: 7, title: 'Distances', icon: Navigation },
  { id: 8, title: 'Publication', icon: FileText },
];

const EQUIPEMENTS_EXTERIEUR = [
  'balcon', 'terrasse', 'garage', 'places_parc', 'jardin', 'verdure', 
  'piscine', 'place_amarrage', 'pieds_dans_eau'
];

const EQUIPEMENTS_INTERIEUR = [
  'acces_handicapes', 'animaux_bienvenus', 'lumineux', 'dressing', 
  'salle_douche', 'salle_bains', 'jacuzzi', 'piscine', 'sauna', 'hammam', 
  'salle_jeux', 'veranda', 'jardin_hiver', 'poele_suedois', 'cheminee', 
  'adoucisseur_eau', 'climatisation', 'cave', 'carnotzet', 'cave_vin', 
  'grenier', 'local_velos', 'abris_pc'
];

const EQUIPEMENTS_CUISINE = [
  'cuisine_agencee', 'cuisine_habitable', 'lave_vaisselle', 
  'lave_linge', 'seche_linge', 'buanderie_commune'
];

const EQUIPEMENTS_SECURITE = [
  'telereseau', 'satellite', 'connexion_internet', 'video_phone', 
  'interphone', 'digicode', 'camera', 'alarme', 'concierge'
];

const TYPES_SOL = ['parquet', 'carrelage', 'moquette', 'stratifie', 'pierre', 'marbre'];
const EXPOSITIONS = ['nord', 'sud', 'est', 'ouest'];
const VUES = ['belle_vue', 'degagee', 'imprenable', 'panoramique', 'lac', 'champetre', 'jura', 'alpes'];
const ENTOURAGES = ['silencieux', 'verdoyant', 'enfants_bienvenus', 'aire_jeux', 'lac_port'];
const ETATS = ['neuf', 'comme_neuf', 'renove', 'en_construction', 'a_rafraichir', 'a_renover', 'bon', 'tres_bon', 'minergie'];

interface AddBienVenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isAdmin?: boolean;
}

export function AddBienVenteDialog({ open, onOpenChange, onSuccess, isAdmin = false }: AddBienVenteDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewProprietaire, setIsNewProprietaire] = useState(false);
  const [invitingProprietaire, setInvitingProprietaire] = useState(false);

  useEffect(() => {
    if (open) {
      loadProprietaires();
      if (isAdmin) {
        loadAgents();
      }
    }
  }, [open, isAdmin]);

  const loadProprietaires = async () => {
    const { data } = await supabase
      .from('proprietaires')
      .select('id, user_id, profiles:user_id(prenom, nom, email)')
      .order('created_at', { ascending: false });
    
    if (data) {
      setProprietaires(data as unknown as Proprietaire[]);
    }
  };

  const loadAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('id, user_id, profiles:user_id(prenom, nom)')
      .eq('statut', 'actif')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAgents(data as unknown as Agent[]);
    }
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayValue = (field: keyof FormData, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    updateFormData({ [field]: newArray });
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    // Validation des champs obligatoires
    if (!formData.nom || !formData.adresse) {
      toast.error('Veuillez remplir le nom et l\'adresse du bien');
      return;
    }

    // Validation propriétaire
    if (isNewProprietaire) {
      if (!formData.nouveau_proprietaire_email || !formData.nouveau_proprietaire_prenom || !formData.nouveau_proprietaire_nom) {
        toast.error('Email, prénom et nom du nouveau propriétaire sont requis');
        return;
      }
    } else {
      if (!formData.proprietaire_id) {
        toast.error('Veuillez sélectionner un propriétaire existant');
        return;
      }
    }

    // Validation agent pour admin
    if (isAdmin && !formData.agent_responsable_id) {
      toast.error('Veuillez sélectionner un agent responsable');
      return;
    }

    setLoading(true);
    try {
      // 1. Calculer l'agent responsable AVANT l'invitation
      let agentResponsableId: string | null = null;
      
      if (isAdmin && formData.agent_responsable_id) {
        agentResponsableId = formData.agent_responsable_id;
      } else {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user?.id)
          .single();
        agentResponsableId = agentData?.id || null;
      }

      // 2. Gérer le propriétaire
      let proprietaireId = formData.proprietaire_id;

      if (isNewProprietaire && formData.nouveau_proprietaire_email) {
        setInvitingProprietaire(true);
        
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-proprietaire', {
          body: {
            email: formData.nouveau_proprietaire_email,
            prenom: formData.nouveau_proprietaire_prenom,
            nom: formData.nouveau_proprietaire_nom,
            telephone: formData.nouveau_proprietaire_telephone,
            agent_id: agentResponsableId, // Passer l'agent pour la RLS
          }
        });

        setInvitingProprietaire(false);

        if (inviteError) {
          const errorMsg = inviteError.message || 'Erreur lors de l\'invitation du propriétaire';
          console.error('Invite error:', inviteError);
          toast.error(errorMsg);
          setLoading(false);
          return;
        }

        if (!inviteData?.proprietaireId) {
          toast.error('L\'invitation n\'a pas renvoyé d\'ID propriétaire');
          setLoading(false);
          return;
        }

        proprietaireId = inviteData.proprietaireId;
      }

      // 3. Mapper type_bien pour compatibilité DB (villa -> maison)
      const typeBienDB = formData.type_bien === 'villa' ? 'maison' : formData.type_bien;

      // 4. Créer l'immeuble avec les nouveaux champs de prix
      const prixVenteFinal = formData.prix_commercial || formData.prix_vente_demande;
      const commissionPrevue = formData.prix_vendeur && formData.prix_commercial 
        ? formData.prix_commercial - formData.prix_vendeur 
        : null;

      const immeubleData = {
        nom: formData.nom,
        adresse: formData.adresse,
        code_postal: formData.code_postal,
        ville: formData.ville,
        canton: formData.canton,
        type_bien: typeBienDB,
        mode_exploitation: 'vente',
        statut_vente: 'brouillon',
        proprietaire_id: proprietaireId,
        nombre_pieces: formData.nombre_pieces,
        surface_totale: formData.surface_totale,
        prix_vente_demande: prixVenteFinal,
        prix_vendeur: formData.prix_vendeur,
        prix_commercial: formData.prix_commercial,
        commission_agence_prevue: commissionPrevue,
        places_parc_incluses: formData.places_parc_incluses,
        annee_construction: formData.annee_construction,
        description_commerciale: formData.description_commerciale,
        points_forts: formData.points_forts
          ? formData.points_forts
              .split('\n')
              .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
              .filter(line => line !== '')
          : [],
        publier_espace_acheteur: formData.publier_espace_acheteur,
        sous_type_bien: formData.sous_type_bien,
        agent_responsable_id: agentResponsableId,
        etage: formData.etage,
        nb_etages_batiment: formData.nb_etages_batiment,
        nb_chambres: formData.nb_chambres,
        nb_wc: formData.nb_wc,
        nb_salles_eau: formData.nb_salles_eau,
        nb_garages: formData.nb_garages,
        nb_places_int: formData.nb_places_int,
        nb_places_ext: formData.nb_places_ext,
        surface_ppe: formData.surface_ppe,
        surface_balcon: formData.surface_balcon,
        surface_terrasse: formData.surface_terrasse,
        surface_jardin: formData.surface_jardin,
        hauteur_plafond: formData.hauteur_plafond,
        annee_renovation: formData.annee_renovation,
        type_chauffage: formData.type_chauffage,
        combustible: formData.combustible,
        no_rf_base: formData.no_rf_base,
        no_rf_feuillet: formData.no_rf_feuillet,
        lots_rf: formData.lots_rf,
        zone_construction: formData.zone_construction,
        no_eca: formData.no_eca,
        volume_eca: formData.volume_eca,
        valeur_eca: formData.valeur_eca,
        administrateur_ppe: formData.administrateur_ppe,
        charges_ppe: formData.charges_ppe,
        charges_chauffage_ec: formData.charges_chauffage_ec,
        fonds_renovation: formData.fonds_renovation,
        est_loue: formData.est_loue,
        locataire_actuel: formData.locataire_actuel,
        email_locataire: formData.email_locataire,
        tel_locataire: formData.tel_locataire,
        loyer_actuel: formData.loyer_actuel,
        charges_locataire: formData.charges_locataire,
        equipements_exterieur: formData.equipements_exterieur,
        equipements_interieur: formData.equipements_interieur,
        equipements_cuisine: formData.equipements_cuisine,
        equipements_securite: formData.equipements_securite,
        type_sol: formData.type_sol,
        exposition: formData.exposition,
        caracteristiques_vue: formData.caracteristiques_vue,
        caracteristiques_entourage: formData.caracteristiques_entourage,
        etat_bien: formData.etat_bien,
        distance_gare: formData.distance_gare,
        distance_bus: formData.distance_bus,
        distance_garderie: formData.distance_garderie,
        distance_ecole_primaire: formData.distance_ecole_primaire,
        distance_ecole_secondaire: formData.distance_ecole_secondaire,
        distance_gymnase: formData.distance_gymnase,
        distance_autoroute: formData.distance_autoroute,
        distance_banque: formData.distance_banque,
        distance_poste: formData.distance_poste,
        distance_commerces: formData.distance_commerces,
        frequence_rapport: formData.frequence_rapport,
        date_visite_initiale: new Date().toISOString().split('T')[0],
        est_apport_affaire: formData.est_apport_affaire,
      };

      const { data: immeuble, error: immeubleError } = await supabase
        .from('immeubles')
        .insert(immeubleData as any)
        .select()
        .single();

      if (immeubleError) {
        console.error('Insert error:', immeubleError);
        const errorDetail = (immeubleError as any).details || (immeubleError as any).hint || immeubleError.message;
        toast.error(`Erreur: ${errorDetail}`);
        setLoading(false);
        return;
      }

      // Upload photos if any
      if (photos.length > 0 && immeuble) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${immeuble.id}/${crypto.randomUUID()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('photos-immeubles')
            .upload(fileName, photo.file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('photos-immeubles')
              .getPublicUrl(fileName);

            await supabase.from('photos_immeuble').insert({
              immeuble_id: immeuble.id,
              url: publicUrl,
              legende: photo.legende || null,
              type_photo: photo.type || null,
              niveau_confidentialite: photo.niveau_confidentialite,
              est_principale: i === 0,
              ordre: i,
              uploaded_by: user?.id,
            });
          }
        }
      }

      toast.success('Bien créé avec succès');
      setFormData(INITIAL_FORM_DATA);
      setPhotos([]);
      setStep(0);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating bien:', error);
      const errorMsg = error?.message || error?.details || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMsg}`);
    } finally {
      setLoading(false);
      setInvitingProprietaire(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (step) {
      case 0: // Photos
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Capturez les photos du bien directement depuis votre appareil.
            </p>
            
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.slice(0, 8).map((photo, index) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                    <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {photos.length > 8 && (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-lg font-medium">+{photos.length - 8}</span>
                  </div>
                )}
              </div>
            ) : null}

            <Button
              type="button"
              variant={photos.length > 0 ? "outline" : "default"}
              className="w-full"
              onClick={() => setShowPhotosDialog(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              {photos.length > 0 ? `${photos.length} photo(s) - Modifier` : 'Capturer les photos'}
            </Button>
          </div>
        );

      case 1: // Type & Mandant
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de bien *</Label>
                <Select value={formData.type_bien} onValueChange={(v) => updateFormData({ type_bien: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="maison">Maison</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(formData.type_bien === 'villa' || formData.type_bien === 'maison') && (
                <div className="space-y-2">
                  <Label>Sous-type</Label>
                  <Select value={formData.sous_type_bien} onValueChange={(v) => updateFormData({ sous_type_bien: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individuelle">Individuelle</SelectItem>
                      <SelectItem value="jumelee">Jumelée</SelectItem>
                      <SelectItem value="contigue">Contiguë</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Agent responsable *</Label>
                <Select value={formData.agent_responsable_id} onValueChange={(v) => updateFormData({ agent_responsable_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.profiles?.prenom} {agent.profiles?.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Propriétaire</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isNewProprietaire ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNewProprietaire(false)}
                >
                  Existant
                </Button>
                <Button
                  type="button"
                  variant={isNewProprietaire ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNewProprietaire(true)}
                >
                  Nouveau
                </Button>
              </div>
            </div>

            {!isNewProprietaire ? (
              <div className="space-y-2">
                <Select value={formData.proprietaire_id} onValueChange={(v) => updateFormData({ proprietaire_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un propriétaire" /></SelectTrigger>
                  <SelectContent>
                    {proprietaires.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.profiles?.prenom} {p.profiles?.nom} - {p.profiles?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input 
                    value={formData.nouveau_proprietaire_prenom}
                    onChange={(e) => updateFormData({ nouveau_proprietaire_prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input 
                    value={formData.nouveau_proprietaire_nom}
                    onChange={(e) => updateFormData({ nouveau_proprietaire_nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={formData.nouveau_proprietaire_email}
                    onChange={(e) => updateFormData({ nouveau_proprietaire_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Téléphone</Label>
                  <Input 
                    value={formData.nouveau_proprietaire_telephone}
                    onChange={(e) => updateFormData({ nouveau_proprietaire_telephone: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fréquence rapport</Label>
                <Select value={formData.frequence_rapport} onValueChange={(v) => updateFormData({ frequence_rapport: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  checked={formData.est_apport_affaire}
                  onCheckedChange={(c) => updateFormData({ est_apport_affaire: c })}
                />
                <Label>Apport d'affaire</Label>
              </div>
            </div>
          </div>
        );

      case 2: // Adresse
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du bien *</Label>
              <Input 
                value={formData.nom}
                onChange={(e) => updateFormData({ nom: e.target.value })}
                placeholder="Ex: Villa Les Tilleuls"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Adresse *</Label>
              <GoogleAddressAutocomplete
                value={formData.adresse}
                onChange={(addressComponents) => {
                  updateFormData({
                    adresse: addressComponents.fullAddress,
                    code_postal: addressComponents.postalCode,
                    ville: addressComponents.city,
                    canton: addressComponents.canton,
                  });
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>NPA</Label>
                <Input 
                  value={formData.code_postal}
                  onChange={(e) => updateFormData({ code_postal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input 
                  value={formData.ville}
                  onChange={(e) => updateFormData({ ville: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Canton</Label>
                <Input 
                  value={formData.canton}
                  onChange={(e) => updateFormData({ canton: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>No RF Base</Label>
                <Input 
                  value={formData.no_rf_base}
                  onChange={(e) => updateFormData({ no_rf_base: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>No RF Feuillet</Label>
                <Input 
                  value={formData.no_rf_feuillet}
                  onChange={(e) => updateFormData({ no_rf_feuillet: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lot(s) RF</Label>
                <Input 
                  value={formData.lots_rf}
                  onChange={(e) => updateFormData({ lots_rf: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Zone construction</Label>
                <Input 
                  value={formData.zone_construction}
                  onChange={(e) => updateFormData({ zone_construction: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 3: // Description
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nb pièces</Label>
                <Input 
                  type="number"
                  step="0.5"
                  value={formData.nombre_pieces || ''}
                  onChange={(e) => updateFormData({ nombre_pieces: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nb chambres</Label>
                <Input 
                  type="number"
                  value={formData.nb_chambres || ''}
                  onChange={(e) => updateFormData({ nb_chambres: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Surface habitable (m²)</Label>
                <Input 
                  type="number"
                  value={formData.surface_totale || ''}
                  onChange={(e) => updateFormData({ surface_totale: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>

            {formData.type_bien === 'appartement' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Étage</Label>
                  <Input 
                    type="number"
                    value={formData.etage || ''}
                    onChange={(e) => updateFormData({ etage: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nb étages bâtiment</Label>
                  <Input 
                    type="number"
                    value={formData.nb_etages_batiment || ''}
                    onChange={(e) => updateFormData({ nb_etages_batiment: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>WC</Label>
                <Input 
                  type="number"
                  value={formData.nb_wc || ''}
                  onChange={(e) => updateFormData({ nb_wc: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Salles d'eau</Label>
                <Input 
                  type="number"
                  value={formData.nb_salles_eau || ''}
                  onChange={(e) => updateFormData({ nb_salles_eau: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Garages</Label>
                <Input 
                  type="number"
                  value={formData.nb_garages}
                  onChange={(e) => updateFormData({ nb_garages: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Places ext.</Label>
                <Input 
                  type="number"
                  value={formData.nb_places_ext}
                  onChange={(e) => updateFormData({ nb_places_ext: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Surface PPE</Label>
                <Input 
                  type="number"
                  value={formData.surface_ppe || ''}
                  onChange={(e) => updateFormData({ surface_ppe: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Balcon (m²)</Label>
                <Input 
                  type="number"
                  value={formData.surface_balcon || ''}
                  onChange={(e) => updateFormData({ surface_balcon: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Terrasse (m²)</Label>
                <Input 
                  type="number"
                  value={formData.surface_terrasse || ''}
                  onChange={(e) => updateFormData({ surface_terrasse: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Jardin (m²)</Label>
                <Input 
                  type="number"
                  value={formData.surface_jardin || ''}
                  onChange={(e) => updateFormData({ surface_jardin: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
          </div>
        );

      case 4: // Technique
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Année construction</Label>
                <Input 
                  type="number"
                  value={formData.annee_construction || ''}
                  onChange={(e) => updateFormData({ annee_construction: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Année rénovation</Label>
                <Input 
                  type="number"
                  value={formData.annee_renovation || ''}
                  onChange={(e) => updateFormData({ annee_renovation: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type chauffage</Label>
                <Select value={formData.type_chauffage} onValueChange={(v) => updateFormData({ type_chauffage: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="individuel">Individuel</SelectItem>
                    <SelectItem value="sol">Au sol</SelectItem>
                    <SelectItem value="radiateurs">Radiateurs</SelectItem>
                    <SelectItem value="pac">Pompe à chaleur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Combustible</Label>
                <Select value={formData.combustible} onValueChange={(v) => updateFormData({ combustible: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaz">Gaz</SelectItem>
                    <SelectItem value="mazout">Mazout</SelectItem>
                    <SelectItem value="electrique">Électrique</SelectItem>
                    <SelectItem value="pellets">Pellets</SelectItem>
                    <SelectItem value="bois">Bois</SelectItem>
                    <SelectItem value="solaire">Solaire</SelectItem>
                    <SelectItem value="geothermie">Géothermie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type_bien === 'villa' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Assurance ECA (Villa)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>No ECA</Label>
                    <Input 
                      value={formData.no_eca}
                      onChange={(e) => updateFormData({ no_eca: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Volume (m³)</Label>
                    <Input 
                      type="number"
                      value={formData.volume_eca || ''}
                      onChange={(e) => updateFormData({ volume_eca: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valeur (CHF)</Label>
                    <Input 
                      type="number"
                      value={formData.valeur_eca || ''}
                      onChange={(e) => updateFormData({ valeur_eca: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 5: // Finances
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">PPE / Charges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Administrateur PPE</Label>
                  <Input 
                    value={formData.administrateur_ppe}
                    onChange={(e) => updateFormData({ administrateur_ppe: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Charges PPE/mois</Label>
                    <Input 
                      type="number"
                      value={formData.charges_ppe || ''}
                      onChange={(e) => updateFormData({ charges_ppe: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chauffage+EC/mois</Label>
                    <Input 
                      type="number"
                      value={formData.charges_chauffage_ec || ''}
                      onChange={(e) => updateFormData({ charges_chauffage_ec: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonds rénovation</Label>
                    <Input 
                      type="number"
                      value={formData.fonds_renovation || ''}
                      onChange={(e) => updateFormData({ fonds_renovation: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Locataire actuel</CardTitle>
                  <Switch
                    checked={formData.est_loue}
                    onCheckedChange={(c) => updateFormData({ est_loue: c })}
                  />
                </div>
              </CardHeader>
              {formData.est_loue && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom du locataire</Label>
                    <Input 
                      value={formData.locataire_actuel}
                      onChange={(e) => updateFormData({ locataire_actuel: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={formData.email_locataire}
                        onChange={(e) => updateFormData({ email_locataire: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input 
                        value={formData.tel_locataire}
                        onChange={(e) => updateFormData({ tel_locataire: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loyer actuel</Label>
                      <Input 
                        type="number"
                        value={formData.loyer_actuel || ''}
                        onChange={(e) => updateFormData({ loyer_actuel: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Charges</Label>
                      <Input 
                        type="number"
                        value={formData.charges_locataire || ''}
                        onChange={(e) => updateFormData({ charges_locataire: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        );

      case 6: // Équipements
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Extérieur</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {EQUIPEMENTS_EXTERIEUR.map((eq) => (
                    <Badge
                      key={eq}
                      variant={formData.equipements_exterieur.includes(eq) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayValue('equipements_exterieur', eq)}
                    >
                      {eq.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Intérieur</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {EQUIPEMENTS_INTERIEUR.map((eq) => (
                    <Badge
                      key={eq}
                      variant={formData.equipements_interieur.includes(eq) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayValue('equipements_interieur', eq)}
                    >
                      {eq.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cuisine</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {EQUIPEMENTS_CUISINE.map((eq) => (
                    <Badge
                      key={eq}
                      variant={formData.equipements_cuisine.includes(eq) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayValue('equipements_cuisine', eq)}
                    >
                      {eq.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Sécurité & Connectivité</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {EQUIPEMENTS_SECURITE.map((eq) => (
                    <Badge
                      key={eq}
                      variant={formData.equipements_securite.includes(eq) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayValue('equipements_securite', eq)}
                    >
                      {eq.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Sol</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {TYPES_SOL.map((eq) => (
                      <Badge
                        key={eq}
                        variant={formData.type_sol.includes(eq) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleArrayValue('type_sol', eq)}
                      >
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Exposition</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {EXPOSITIONS.map((eq) => (
                      <Badge
                        key={eq}
                        variant={formData.exposition.includes(eq) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleArrayValue('exposition', eq)}
                      >
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Vue</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {VUES.map((eq) => (
                    <Badge
                      key={eq}
                      variant={formData.caracteristiques_vue.includes(eq) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayValue('caracteristiques_vue', eq)}
                    >
                      {eq.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">État du bien</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ETATS.map((eq) => (
                    <Badge
                      key={eq}
                      variant={formData.etat_bien.includes(eq) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayValue('etat_bien', eq)}
                    >
                      {eq.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 7: // Distances
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Distances aux commodités (en mètres)</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'distance_gare', label: 'Gare' },
                { key: 'distance_bus', label: 'Bus' },
                { key: 'distance_garderie', label: 'Garderie' },
                { key: 'distance_ecole_primaire', label: 'École primaire' },
                { key: 'distance_ecole_secondaire', label: 'École secondaire' },
                { key: 'distance_gymnase', label: 'Gymnase' },
                { key: 'distance_autoroute', label: 'Autoroute' },
                { key: 'distance_banque', label: 'Banque' },
                { key: 'distance_poste', label: 'Poste' },
                { key: 'distance_commerces', label: 'Commerces' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input 
                    type="number"
                    placeholder="m"
                    value={(formData as any)[key] || ''}
                    onChange={(e) => updateFormData({ [key]: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 8: // Publication
        const commissionPrevue = formData.prix_vendeur && formData.prix_commercial 
          ? formData.prix_commercial - formData.prix_vendeur 
          : null;
        const partAgent = commissionPrevue ? Math.round(commissionPrevue * 0.45) : null;
        const partAgence = commissionPrevue ? Math.round(commissionPrevue * 0.55) : null;
        const isValidCommission = !formData.prix_vendeur || !formData.prix_commercial || formData.prix_commercial >= formData.prix_vendeur;

        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Section Prix Vendeur / Commercial */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Stratégie de prix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Prix vendeur (CHF) *
                      <Badge variant="outline" className="text-xs">Caché</Badge>
                    </Label>
                    <Input 
                      type="number"
                      value={formData.prix_vendeur || ''}
                      onChange={(e) => updateFormData({ prix_vendeur: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="1'000'000"
                    />
                    <p className="text-xs text-muted-foreground">Net souhaité par le vendeur</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Prix commercial (CHF) *
                      <Badge variant="default" className="text-xs">Affiché</Badge>
                    </Label>
                    <Input 
                      type="number"
                      value={formData.prix_commercial || ''}
                      onChange={(e) => updateFormData({ prix_commercial: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="1'050'000"
                    />
                    <p className="text-xs text-muted-foreground">Prix visible par les acheteurs</p>
                  </div>
                </div>

                {/* Preview commission */}
                {formData.prix_vendeur && formData.prix_commercial && (
                  <div className={`p-4 rounded-lg border ${isValidCommission ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    {isValidCommission ? (
                      <>
                        <p className="text-sm font-medium text-emerald-700 mb-2">
                          Commission prévue: {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(commissionPrevue || 0)}
                        </p>
                        <div className="flex gap-4 text-xs text-emerald-600">
                          <span>Agent (45%): {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(partAgent || 0)}</span>
                          <span>Agence (55%): {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(partAgence || 0)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-red-700">
                        ⚠️ Le prix commercial doit être supérieur au prix vendeur
                      </p>
                    )}
                  </div>
                )}

                {/* Places de parc */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Places de parc incluses</p>
                    <p className="text-xs text-muted-foreground">Dans le prix commercial</p>
                  </div>
                  <Switch
                    checked={formData.places_parc_incluses}
                    onCheckedChange={(c) => updateFormData({ places_parc_incluses: c })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Prix de référence (ancien champ) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix de vente affiché (CHF)</Label>
                <Input 
                  type="number"
                  value={formData.prix_vente_demande || formData.prix_commercial || ''}
                  onChange={(e) => updateFormData({ prix_vente_demande: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Sera défini automatiquement"
                  disabled={!!formData.prix_commercial}
                />
              </div>
              <div className="space-y-2">
                <Label>Estimation agent (CHF)</Label>
                <Input 
                  type="number"
                  value={formData.estimation_agent || ''}
                  onChange={(e) => updateFormData({ estimation_agent: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description commerciale</Label>
              <Textarea 
                value={formData.description_commerciale}
                onChange={(e) => updateFormData({ description_commerciale: e.target.value })}
                placeholder="Description attrayante pour les acheteurs..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Points forts</Label>
              <Textarea 
                value={formData.points_forts}
                onChange={(e) => updateFormData({ points_forts: e.target.value })}
                placeholder="• Vue imprenable sur le lac&#10;• Rénovation récente&#10;• Proche des commodités"
                rows={4}
              />
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Publier sur l'espace acheteurs</h4>
                    <p className="text-sm text-muted-foreground">
                      Rendre visible aux acheteurs potentiels
                    </p>
                  </div>
                  <Switch
                    checked={formData.publier_espace_acheteur}
                    onCheckedChange={(c) => updateFormData({ publier_espace_acheteur: c })}
                  />
                </div>
              </CardContent>
            </Card>

            {isNewProprietaire && formData.nouveau_proprietaire_email && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Invitation propriétaire</h4>
                      <p className="text-sm text-muted-foreground">
                        Une invitation sera envoyée à {formData.nouveau_proprietaire_email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Nouveau bien en vente
            </DialogTitle>
          </DialogHeader>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{STEPS[step].title}</span>
              <span className="text-muted-foreground">Étape {step + 1}/{STEPS.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex flex-col items-center cursor-pointer ${
                    i <= step ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setStep(i)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    i < step ? 'bg-primary text-primary-foreground' :
                    i === step ? 'border-2 border-primary' : 'border border-muted-foreground/30'
                  }`}>
                    {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {renderStepContent()}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            {step === STEPS.length - 1 ? (
              <Button onClick={handleSubmit} disabled={loading || invitingProprietaire}>
                {(loading || invitingProprietaire) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {invitingProprietaire ? 'Invitation en cours...' : 'Créer le bien'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CapturePhotosDialog
        open={showPhotosDialog}
        onOpenChange={setShowPhotosDialog}
        onPhotosReady={setPhotos}
        initialPhotos={photos}
      />
    </>
  );
}
