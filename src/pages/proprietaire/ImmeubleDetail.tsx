import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { 
  Building2, ArrowLeft, Plus, MapPin, Calendar, Users, 
  Wrench, FileText, Home, DoorOpen, AlertTriangle, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumLotCard } from '@/components/premium/PremiumLotCard';
import { PremiumLocataireImmeuble } from '@/components/premium/PremiumLocataireImmeuble';
import { PremiumTicketTechniqueCard } from '@/components/premium/PremiumTicketTechniqueCard';
import { PremiumDocumentCard } from '@/components/premium/PremiumDocumentCard';
import { AddLotDialog } from '@/components/proprietaire/AddLotDialog';
import { AddLocataireDialog } from '@/components/proprietaire/AddLocataireDialog';
import { CreateTicketDialog } from '@/components/proprietaire/CreateTicketDialog';
import { UploadDocumentDialog } from '@/components/proprietaire/UploadDocumentDialog';
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
  annee_construction: number | null;
  valeur_estimee: number | null;
  valeur_fiscale: number | null;
  etat_locatif_annuel: number | null;
  taux_vacance: number | null;
  statut: string | null;
  numero_parcelle: string | null;
  commune_rf: string | null;
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
  
  const [showAddLotDialog, setShowAddLotDialog] = useState(false);
  const [showAddLocataireDialog, setShowAddLocataireDialog] = useState(false);
  const [showCreateTicketDialog, setShowCreateTicketDialog] = useState(false);
  const [showUploadDocumentDialog, setShowUploadDocumentDialog] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

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
      setImmeuble(immeubleData);

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
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="lots" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
    </div>
  );
}
