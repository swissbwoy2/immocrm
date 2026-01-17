import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { 
  Building2, ArrowLeft, Plus, MapPin, Calendar, Users, 
  Wrench, FileText, Home, DoorOpen, AlertTriangle, Edit,
  Tag, UserPlus, Image, Eye, EyeOff, Download, Heart, Handshake, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumLotCard } from '@/components/premium/PremiumLotCard';
import { PremiumLocataireImmeuble } from '@/components/premium/PremiumLocataireImmeuble';
import { PremiumTicketTechniqueCard } from '@/components/premium/PremiumTicketTechniqueCard';
import { PremiumDocumentCard } from '@/components/premium/PremiumDocumentCard';
import { PremiumCoProprietaireCard } from '@/components/premium/PremiumCoProprietaireCard';
import { PremiumPhotoGallery } from '@/components/premium/PremiumPhotoGallery';
import { PremiumInteretAcheteurCard } from '@/components/premium/PremiumInteretAcheteurCard';
import { AddLotDialog } from '@/components/proprietaire/AddLotDialog';
import { AddLocataireDialog } from '@/components/proprietaire/AddLocataireDialog';
import { CreateTicketDialog } from '@/components/proprietaire/CreateTicketDialog';
import { UploadDocumentDialog } from '@/components/proprietaire/UploadDocumentDialog';
import { AddCoProprietaireDialog } from '@/components/proprietaire/AddCoProprietaireDialog';
import { UploadPhotoDialog } from '@/components/proprietaire/UploadPhotoDialog';
import { VenteWorkflowTimeline } from '@/components/proprietaire/VenteWorkflowTimeline';
import { EstimationProprietaireView } from '@/components/proprietaire/EstimationProprietaireView';
import { OffresAchatSection } from '@/components/proprietaire/OffresAchatSection';
import { VisitesVenteSection } from '@/components/proprietaire/VisitesVenteSection';
import { NotaireSection } from '@/components/proprietaire/NotaireSection';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Immeuble {
  id: string;
  nom: string;
  adresse: string;
  code_postal: string | null;
  ville: string | null;
  canton: string | null;
  type_bien: string | null;
  nb_unites: number | null;
  surface_totale: number | null;
  surface_habitable: number | null;
  annee_construction: number | null;
  valeur_estimee: number | null;
  valeur_fiscale: number | null;
  etat_locatif_annuel: number | null;
  taux_vacance: number | null;
  statut: string | null;
  numero_parcelle: string | null;
  commune_rf: string | null;
  // Vente fields
  mode_exploitation: string | null;
  nombre_pieces: number | null;
  prix_vente_demande: number | null;
  prix_vente_estime: number | null;
  statut_vente: string | null;
  description_commerciale: string | null;
  points_forts: string[] | null;
  publier_espace_acheteur: boolean | null;
  accord_proprietaire_publication: boolean | null;
  date_mise_en_vente: string | null;
  // Estimation fields (from DB)
  estimation_valeur_basse: number | null;
  estimation_valeur_haute: number | null;
  estimation_valeur_recommandee: number | null;
  prix_m2_secteur: number | null;
  facteurs_positifs: string[] | null;
  facteurs_negatifs: string[] | null;
  potentiel_developpement: string | null;
}

interface Lot {
  id: string;
  reference: string | null;
  designation: string | null;
  type_lot: string | null;
  etage: string | null;
  nb_pieces: number | null;
  surface: number | null;
  loyer_actuel: number | null;
  charges_actuelles: number | null;
  statut: string | null;
  locataire?: {
    id: string;
    nom: string;
    prenom: string | null;
    statut: string | null;
  } | null;
}

interface Locataire {
  id: string;
  lot_id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  loyer: number | null;
  charges: number | null;
  date_entree: string | null;
  solde_locataire: number | null;
  statut: string | null;
  lot?: {
    reference: string | null;
    designation: string | null;
  };
}

interface Ticket {
  id: string;
  titre: string;
  description: string | null;
  categorie: string | null;
  priorite: string | null;
  statut: string | null;
  created_at: string | null;
  lot?: {
    reference: string | null;
  };
}

interface Document {
  id: string;
  nom: string;
  type_document: string;
  url: string;
  date_document: string | null;
  taille: number | null;
}

interface CoProprietaire {
  id: string;
  nom: string;
  prenom: string;
  civilite: string | null;
  email: string | null;
  telephone: string | null;
  type_lien: string;
  quote_part: number | null;
  signature_requise: boolean | null;
  signature_obtenue: boolean | null;
  regime_matrimonial: string | null;
  etat_civil: string | null;
  date_signature: string | null;
}

interface Photo {
  id: string;
  url: string;
  legende: string | null;
  ordre: number | null;
  est_principale: boolean | null;
  type_photo: string | null;
}

interface InteretAcheteur {
  id: string;
  client_id: string;
  type_interet: string;
  statut: string | null;
  message: string | null;
  date_visite: string | null;
  created_at: string | null;
  client?: {
    user_id: string;
    profile?: {
      nom: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
    };
  };
}

const STATUT_VENTE_CONFIG = {
  analyse: { label: 'En analyse', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  estimation: { label: 'Estimation en cours', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  pret: { label: 'Prêt à publier', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  publie: { label: 'Publié', color: 'bg-green-500/10 text-green-600 border-green-200' },
  sous_offre: { label: 'Sous offre', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  vendu: { label: 'Vendu', color: 'bg-gray-500/10 text-gray-600 border-gray-200' },
  retire: { label: 'Retiré', color: 'bg-red-500/10 text-red-600 border-red-200' }
};

export default function ImmeubleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [immeuble, setImmeuble] = useState<Immeuble | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [coProprietaires, setCoProprietaires] = useState<CoProprietaire[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [interets, setInterets] = useState<InteretAcheteur[]>([]);
  
  const [showAddLotDialog, setShowAddLotDialog] = useState(false);
  const [showAddLocataireDialog, setShowAddLocataireDialog] = useState(false);
  const [showCreateTicketDialog, setShowCreateTicketDialog] = useState(false);
  const [showUploadDocumentDialog, setShowUploadDocumentDialog] = useState(false);
  const [showAddCoProprietaireDialog, setShowAddCoProprietaireDialog] = useState(false);
  const [showUploadPhotoDialog, setShowUploadPhotoDialog] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [updatingPublication, setUpdatingPublication] = useState(false);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
  };

  const loadData = useCallback(async () => {
    if (!id || !user) return;

    try {
      // Load immeuble
      const { data: immeubleData, error: immeubleError } = await supabase
        .from('immeubles')
        .select('*')
        .eq('id', id)
        .single();

      if (immeubleError) throw immeubleError;
      setImmeuble(immeubleData as unknown as Immeuble);

      // Load lots with locataires
      const { data: lotsData, error: lotsError } = await supabase
        .from('lots')
        .select('*')
        .eq('immeuble_id', id)
        .order('reference', { ascending: true });

      if (lotsError) throw lotsError;

      // For each lot, get active locataire
      const lotsWithLocataires = await Promise.all(
        (lotsData || []).map(async (lot) => {
          const { data: locataireData } = await supabase
            .from('locataires_immeuble')
            .select('id, nom, prenom, statut')
            .eq('lot_id', lot.id)
            .eq('statut', 'actif')
            .maybeSingle();

          return {
            ...lot,
            locataire: locataireData
          };
        })
      );

      setLots(lotsWithLocataires);

      // Load all locataires for this immeuble
      const lotIds = (lotsData || []).map(l => l.id);
      if (lotIds.length > 0) {
        const { data: locatairesData } = await supabase
          .from('locataires_immeuble')
          .select('*, lot:lots(reference, designation)')
          .in('lot_id', lotIds)
          .order('nom', { ascending: true });

        setLocataires(locatairesData || []);
      }

      // Load tickets
      const { data: ticketsData } = await supabase
        .from('tickets_techniques')
        .select('*, lot:lots(reference)')
        .eq('immeuble_id', id)
        .order('created_at', { ascending: false });

      setTickets(ticketsData || []);

      // Load documents
      const { data: documentsData } = await supabase
        .from('documents_immeuble')
        .select('*')
        .eq('immeuble_id', id)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);

      // Load co-proprietaires
      const { data: coPropsData } = await supabase
        .from('co_proprietaires')
        .select('*')
        .eq('immeuble_id', id)
        .order('created_at', { ascending: true });

      setCoProprietaires(coPropsData || []);

      // Load photos
      const { data: photosData } = await supabase
        .from('photos_immeuble')
        .select('*')
        .eq('immeuble_id', id)
        .order('ordre', { ascending: true });

      setPhotos(photosData || []);

      // Load interets acheteurs
      const { data: interetsData } = await supabase
        .from('interets_acheteur')
        .select(`
          *,
          client:clients(
            user_id,
            profile:profiles(nom, prenom, email, telephone)
          )
        `)
        .eq('immeuble_id', id)
        .order('created_at', { ascending: false });

      setInterets(interetsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddLocataire = (lotId: string) => {
    setSelectedLotId(lotId);
    setShowAddLocataireDialog(true);
  };

  const handleTogglePublication = async (publish: boolean) => {
    if (!immeuble) return;

    // Check if owner has given consent
    if (publish && !immeuble.accord_proprietaire_publication) {
      toast.error("L'accord du propriétaire est nécessaire pour publier");
      return;
    }

    setUpdatingPublication(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({ 
          publier_espace_acheteur: publish,
          statut_vente: publish ? 'publie' : 'pret'
        })
        .eq('id', immeuble.id);

      if (error) throw error;

      setImmeuble(prev => prev ? { 
        ...prev, 
        publier_espace_acheteur: publish,
        statut_vente: publish ? 'publie' : 'pret'
      } : null);
      
      toast.success(publish ? 'Bien publié dans l\'espace acheteurs' : 'Bien retiré de l\'espace acheteurs');
    } catch (error) {
      console.error('Error updating publication status:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingPublication(false);
    }
  };

  const handleSetPrimaryPhoto = async (photoId: string) => {
    try {
      // First, unset all photos as primary
      await supabase
        .from('photos_immeuble')
        .update({ est_principale: false })
        .eq('immeuble_id', id);

      // Then set the selected one as primary
      await supabase
        .from('photos_immeuble')
        .update({ est_principale: true })
        .eq('id', photoId);

      toast.success('Photo principale mise à jour');
      loadData();
    } catch (error) {
      console.error('Error setting primary photo:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('photos_immeuble')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      toast.success('Photo supprimée');
      loadData();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteCoProprietaire = async (copropId: string) => {
    try {
      const { error } = await supabase
        .from('co_proprietaires')
        .delete()
        .eq('id', copropId);

      if (error) throw error;

      toast.success('Co-propriétaire supprimé');
      loadData();
    } catch (error) {
      console.error('Error deleting co-proprietaire:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUpdateInteretStatut = async (interetId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('interets_acheteur')
        .update({ statut: newStatut })
        .eq('id', interetId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      loadData();
    } catch (error) {
      console.error('Error updating interet status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatutBadge = (statut: string | null) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      gere: { label: 'Géré', variant: 'default' },
      en_vente: { label: 'En vente', variant: 'secondary' },
      en_location: { label: 'En location', variant: 'outline' },
      vacant: { label: 'Vacant', variant: 'destructive' }
    };
    const { label, variant } = config[statut || 'gere'] || config.gere;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatutVenteBadge = (statut: string | null) => {
    const config = STATUT_VENTE_CONFIG[statut as keyof typeof STATUT_VENTE_CONFIG] || STATUT_VENTE_CONFIG.analyse;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const isVenteMode = immeuble?.mode_exploitation === 'vente' || immeuble?.mode_exploitation === 'les_deux';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!immeuble) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate('/proprietaire/immeubles')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <PremiumEmptyState
          icon={Building2}
          title="Immeuble non trouvé"
          description="Cet immeuble n'existe pas ou vous n'y avez pas accès."
        />
      </div>
    );
  }

  const occupiedLots = lots.filter(l => l.locataire).length;
  const vacantLots = lots.length - occupiedLots;
  const activeLocataires = locataires.filter(l => l.statut === 'actif').length;
  const openTickets = tickets.filter(t => !['clos', 'annule', 'resolu'].includes(t.statut || '')).length;
  const pendingInterets = interets.filter(i => i.statut === 'nouveau').length;

  return (
    <div className="p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate('/proprietaire/immeubles')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour aux immeubles
      </Button>

      <PremiumPageHeader
        title={immeuble.nom}
        subtitle={`${immeuble.adresse}${immeuble.ville ? `, ${immeuble.ville}` : ''}`}
        icon={Building2}
        action={
          <div className="flex items-center gap-2">
            {isVenteMode && getStatutVenteBadge(immeuble.statut_vente)}
            {getStatutBadge(immeuble.statut)}
            <Button variant="outline" onClick={() => navigate(`/proprietaire/immeubles/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lots</p>
                <p className="text-2xl font-bold">{lots.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locataires</p>
                <p className="text-2xl font-bold">{activeLocataires}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DoorOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vacants</p>
                <p className="text-2xl font-bold">{vacantLots}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${openTickets > 0 ? 'bg-red-500/10' : 'bg-muted'}`}>
                <Wrench className={`w-5 h-5 ${openTickets > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                <p className="text-2xl font-bold">{openTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {immeuble.type_bien && (
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 font-medium capitalize">{immeuble.type_bien}</span>
              </div>
            )}
            {immeuble.annee_construction && (
              <div>
                <span className="text-muted-foreground">Année:</span>
                <span className="ml-2 font-medium">{immeuble.annee_construction}</span>
              </div>
            )}
            {immeuble.surface_totale && (
              <div>
                <span className="text-muted-foreground">Surface:</span>
                <span className="ml-2 font-medium">{immeuble.surface_totale} m²</span>
              </div>
            )}
            {immeuble.etat_locatif_annuel && (
              <div>
                <span className="text-muted-foreground">État locatif:</span>
                <span className="ml-2 font-medium text-primary">{formatCurrency(immeuble.etat_locatif_annuel)}/an</span>
              </div>
            )}
            {immeuble.valeur_estimee && (
              <div>
                <span className="text-muted-foreground">Valeur estimée:</span>
                <span className="ml-2 font-medium">{formatCurrency(immeuble.valeur_estimee)}</span>
              </div>
            )}
            {immeuble.numero_parcelle && (
              <div>
                <span className="text-muted-foreground">Parcelle RF:</span>
                <span className="ml-2 font-medium">{immeuble.numero_parcelle}</span>
              </div>
            )}
            {immeuble.nombre_pieces && (
              <div>
                <span className="text-muted-foreground">Pièces:</span>
                <span className="ml-2 font-medium">{immeuble.nombre_pieces}</span>
              </div>
            )}
            {immeuble.mode_exploitation && (
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <span className="ml-2 font-medium capitalize">{immeuble.mode_exploitation.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="lots" className="space-y-4">
        <TabsList className={`grid w-full ${isVenteMode ? 'grid-cols-7' : 'grid-cols-4'}`}>
          <TabsTrigger value="lots" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Lots</span>
            <Badge variant="secondary" className="ml-1">{lots.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="locataires" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Locataires</span>
            <Badge variant="secondary" className="ml-1">{locataires.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Tickets</span>
            {openTickets > 0 && <Badge variant="destructive" className="ml-1">{openTickets}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
            <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
          </TabsTrigger>
          {isVenteMode && (
            <>
              <TabsTrigger value="vente" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Vente</span>
                {pendingInterets > 0 && <Badge variant="default" className="ml-1">{pendingInterets}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="coproprietaires" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Co-prop</span>
                <Badge variant="secondary" className="ml-1">{coProprietaires.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Photos</span>
                <Badge variant="secondary" className="ml-1">{photos.length}</Badge>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Lots Tab */}
        <TabsContent value="lots" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddLotDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un lot
            </Button>
          </div>
          
          {lots.length === 0 ? (
            <PremiumEmptyState
              icon={Home}
              title="Aucun lot"
              description="Commencez par ajouter des lots à cet immeuble."
              action={
                <Button onClick={() => setShowAddLotDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un lot
                </Button>
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lots.map((lot) => (
                <PremiumLotCard
                  key={lot.id}
                  lot={lot}
                  locataire={lot.locataire}
                  onAddLocataire={() => handleAddLocataire(lot.id)}
                  onClick={() => navigate(`/proprietaire/lots/${lot.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Locataires Tab */}
        <TabsContent value="locataires" className="space-y-4">
          {locataires.length === 0 ? (
            <PremiumEmptyState
              icon={Users}
              title="Aucun locataire"
              description="Les locataires apparaîtront ici une fois ajoutés à un lot."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locataires.map((locataire) => (
                <PremiumLocataireImmeuble
                  key={locataire.id}
                  locataire={{
                    id: locataire.id,
                    nom: locataire.nom,
                    prenom: locataire.prenom,
                    email: locataire.email,
                    telephone: locataire.telephone,
                    loyer: locataire.loyer,
                    date_entree: locataire.date_entree,
                    solde_locataire: locataire.solde_locataire,
                    statut: locataire.statut
                  }}
                  lotReference={locataire.lot?.reference || locataire.lot?.designation}
                  onClick={() => navigate(`/proprietaire/locataires/${locataire.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateTicketDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau ticket
            </Button>
          </div>
          
          {tickets.length === 0 ? (
            <PremiumEmptyState
              icon={Wrench}
              title="Aucun ticket"
              description="Aucun ticket technique pour cet immeuble."
            />
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <PremiumTicketTechniqueCard
                  key={ticket.id}
                  ticket={{
                    id: ticket.id,
                    titre: ticket.titre,
                    description: ticket.description,
                    categorie: ticket.categorie,
                    priorite: ticket.priorite,
                    statut: ticket.statut,
                    created_at: ticket.created_at
                  }}
                  lotReference={ticket.lot?.reference}
                  onClick={() => navigate(`/proprietaire/tickets/${ticket.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowUploadDocumentDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          </div>
          
          {documents.length === 0 ? (
            <PremiumEmptyState
              icon={FileText}
              title="Aucun document"
              description="Aucun document associé à cet immeuble."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <PremiumDocumentCard
                  key={doc.id}
                  document={{
                    id: doc.id,
                    nom: doc.nom,
                    type: doc.type_document,
                    taille: doc.taille || 0,
                    date_upload: doc.date_document || new Date().toISOString(),
                    url: doc.url
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vente Tab */}
        {isVenteMode && (
          <TabsContent value="vente" className="space-y-6">
            {/* Timeline du workflow de vente */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="text-lg">Progression de la vente</CardTitle>
                <CardDescription>Suivez l'avancement de la transaction</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <VenteWorkflowTimeline
                  currentStep={immeuble.statut_vente || 'analyse'}
                  dossierComplet={!!immeuble.description_commerciale}
                  estimationValidee={immeuble.statut_vente === 'pret' || immeuble.statut_vente === 'publie'}
                  estPublie={immeuble.publier_espace_acheteur || false}
                  nbVisites={0}
                  nbOffres={0}
                  offreAcceptee={immeuble.statut_vente === 'sous_offre'}
                  notairePlanifie={false}
                  signatureEffectuee={immeuble.statut_vente === 'vendu'}
                  entreeFaite={false}
                />
              </CardContent>
            </Card>

            {/* Prix et statut */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations de vente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Statut</span>
                    {getStatutVenteBadge(immeuble.statut_vente)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Prix demandé</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(immeuble.prix_vente_demande)}
                    </span>
                  </div>
                  {immeuble.prix_vente_estime && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Estimation</span>
                      <span className="font-medium">{formatCurrency(immeuble.prix_vente_estime)}</span>
                    </div>
                  )}
                  {immeuble.date_mise_en_vente && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">En vente depuis</span>
                      <span className="font-medium">
                        {new Date(immeuble.date_mise_en_vente).toLocaleDateString('fr-CH')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Publication</CardTitle>
                  <CardDescription>
                    Publiez ce bien dans l'espace acheteurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label htmlFor="publish-toggle" className="font-medium">
                        {immeuble.publier_espace_acheteur ? (
                          <span className="flex items-center gap-2 text-green-600">
                            <Eye className="w-4 h-4" />
                            Visible aux acheteurs
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <EyeOff className="w-4 h-4" />
                            Non publié
                          </span>
                        )}
                      </Label>
                      {!immeuble.accord_proprietaire_publication && (
                        <p className="text-xs text-amber-600">
                          ⚠️ L'accord du propriétaire est requis
                        </p>
                      )}
                    </div>
                    <Switch
                      id="publish-toggle"
                      checked={immeuble.publier_espace_acheteur || false}
                      onCheckedChange={handleTogglePublication}
                      disabled={updatingPublication || !immeuble.accord_proprietaire_publication}
                    />
                  </div>

                  {immeuble.accord_proprietaire_publication && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Accord du propriétaire obtenu
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Estimation du propriétaire */}
            <EstimationProprietaireView
              immeubleId={immeuble.id}
              prixEstimeBas={immeuble.estimation_valeur_basse}
              prixEstimeHaut={immeuble.estimation_valeur_haute}
              prixRecommande={immeuble.estimation_valeur_recommandee}
              prixM2Secteur={immeuble.prix_m2_secteur}
              surfaceHabitable={immeuble.surface_habitable}
              statutEstimation={immeuble.statut_vente === 'estimation' ? 'proposee' : immeuble.statut_vente === 'pret' ? 'validee' : 'en_attente'}
              facteursPositifs={immeuble.facteurs_positifs || []}
              facteursNegatifs={immeuble.facteurs_negatifs || []}
              potentielDeveloppement={immeuble.potentiel_developpement}
              onUpdate={loadData}
            />

            {/* Description commerciale */}
            {immeuble.description_commerciale && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description commerciale</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {immeuble.description_commerciale}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Points forts */}
            {immeuble.points_forts && immeuble.points_forts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Points forts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {immeuble.points_forts.map((point, index) => (
                      <Badge key={index} variant="secondary">
                        {point}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Visites */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Visites programmées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VisitesVenteSection immeubleId={immeuble.id} />
              </CardContent>
            </Card>

            {/* Section Offres */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-primary" />
                  Offres d'achat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OffresAchatSection 
                  immeubleId={immeuble.id} 
                  prixDemande={immeuble.prix_vente_demande}
                />
              </CardContent>
            </Card>

            {/* Section Notaire - visible si sous offre ou vendu */}
            {(immeuble.statut_vente === 'sous_offre' || immeuble.statut_vente === 'vendu') && (
              <NotaireSection
                statut={immeuble.statut_vente === 'vendu' ? 'acte_signe' : 'en_attente'}
                prixVenteFinal={immeuble.prix_vente_demande}
                commissionAgence={immeuble.prix_vente_demande ? immeuble.prix_vente_demande * 0.01 : null}
                tauxCommission={1}
              />
            )}

            {/* Intérêts acheteurs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Intérêts reçus
                  {pendingInterets > 0 && (
                    <Badge variant="default">{pendingInterets} nouveau(x)</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interets.length === 0 ? (
                  <PremiumEmptyState
                    icon={Heart}
                    title="Aucun intérêt"
                    description="Les manifestations d'intérêt des acheteurs apparaîtront ici."
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {interets.map((interet) => (
                      <PremiumInteretAcheteurCard
                        key={interet.id}
                        interet={{
                          id: interet.id,
                          type_interet: interet.type_interet,
                          statut: interet.statut || 'nouveau',
                          message: interet.message,
                          date_visite: interet.date_visite,
                          notes_agent: null,
                          created_at: interet.created_at || new Date().toISOString(),
                          client: interet.client ? {
                            nom: interet.client.profile?.nom || null,
                            prenom: interet.client.profile?.prenom || null,
                            email: interet.client.profile?.email || null,
                            telephone: interet.client.profile?.telephone || null
                          } : undefined
                        }}
                        onUpdateStatut={(newStatut) => handleUpdateInteretStatut(interet.id, newStatut)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Co-propriétaires Tab */}
        {isVenteMode && (
          <TabsContent value="coproprietaires" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddCoProprietaireDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un co-propriétaire
              </Button>
            </div>

            {coProprietaires.length === 0 ? (
              <PremiumEmptyState
                icon={UserPlus}
                title="Aucun co-propriétaire"
                description="Ajoutez les co-propriétaires (conjoint, associé, héritier) si applicable."
                action={
                  <Button onClick={() => setShowAddCoProprietaireDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un co-propriétaire
                  </Button>
                }
              />
            ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coProprietaires.map((coprop) => (
                  <PremiumCoProprietaireCard
                    key={coprop.id}
                    coProprietaire={{
                      id: coprop.id,
                      civilite: coprop.civilite,
                      prenom: coprop.prenom,
                      nom: coprop.nom,
                      email: coprop.email,
                      telephone: coprop.telephone,
                      type_lien: coprop.type_lien,
                      quote_part: coprop.quote_part,
                      regime_matrimonial: coprop.regime_matrimonial,
                      etat_civil: coprop.etat_civil,
                      signature_requise: coprop.signature_requise ?? false,
                      signature_obtenue: coprop.signature_obtenue ?? false,
                      date_signature: coprop.date_signature
                    }}
                    onDelete={() => handleDeleteCoProprietaire(coprop.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Photos Tab */}
        {isVenteMode && (
          <TabsContent value="photos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowUploadPhotoDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter des photos
              </Button>
            </div>

            {photos.length === 0 ? (
              <PremiumEmptyState
                icon={Image}
                title="Aucune photo"
                description="Ajoutez des photos de qualité pour valoriser ce bien."
                action={
                  <Button onClick={() => setShowUploadPhotoDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter des photos
                  </Button>
                }
              />
            ) : (
              <PremiumPhotoGallery
                photos={photos.map(p => ({
                  id: p.id,
                  url: p.url,
                  legende: p.legende,
                  ordre: p.ordre,
                  est_principale: p.est_principale,
                  type_photo: p.type_photo
                }))}
                onSetPrimary={handleSetPrimaryPhoto}
                onDelete={handleDeletePhoto}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <AddLotDialog
        open={showAddLotDialog}
        onOpenChange={setShowAddLotDialog}
        immeubleId={id!}
        onSuccess={() => {
          setShowAddLotDialog(false);
          loadData();
        }}
      />

      <AddLocataireDialog
        open={showAddLocataireDialog}
        onOpenChange={setShowAddLocataireDialog}
        lotId={selectedLotId}
        onSuccess={() => {
          setShowAddLocataireDialog(false);
          setSelectedLotId(null);
          loadData();
        }}
      />

      <CreateTicketDialog
        open={showCreateTicketDialog}
        onOpenChange={setShowCreateTicketDialog}
        immeubleId={id}
        onSuccess={loadData}
      />

      <UploadDocumentDialog
        open={showUploadDocumentDialog}
        onOpenChange={setShowUploadDocumentDialog}
        immeubleId={id}
        onSuccess={loadData}
      />

      <AddCoProprietaireDialog
        open={showAddCoProprietaireDialog}
        onOpenChange={setShowAddCoProprietaireDialog}
        immeubleId={id!}
        onSuccess={loadData}
      />

      <UploadPhotoDialog
        open={showUploadPhotoDialog}
        onOpenChange={setShowUploadPhotoDialog}
        immeubleId={id!}
        onSuccess={loadData}
      />
    </div>
  );
}
