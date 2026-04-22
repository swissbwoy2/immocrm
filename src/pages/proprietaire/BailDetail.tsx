import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Calendar, Wallet, AlertTriangle, Edit, Download, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GenerateBailDialog } from '@/components/proprietaire/GenerateBailDialog';
import { UploadDocumentDialog } from '@/components/proprietaire/UploadDocumentDialog';

const getStatutConfig = (statut: string | null) => {
  switch (statut) {
    case 'actif': return { label: 'Actif', color: 'bg-emerald-500' };
    case 'resilie': return { label: 'Résilié', color: 'bg-red-500' };
    case 'en_attente': return { label: 'En attente', color: 'bg-amber-500' };
    default: return { label: statut || 'Inconnu', color: 'bg-gray-500' };
  }
};

const formatCurrency = (value: number | null) => {
  if (!value) return 'CHF 0';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

export default function BailDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bail, setBail] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (id && user) loadBail();
  }, [id, user]);

  const loadBail = async () => {
    try {
      const { data, error } = await supabase
        .from('baux')
        .select(`
          *,
          lot:lots(id, reference, designation, immeuble_id, immeuble:immeubles(id, nom, adresse)),
          locataire:locataires_immeuble(id, nom, prenom, email, telephone, civilite)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setBail(data);

      // Load documents linked to this lot
      if (data?.lot?.id) {
        const { data: docs } = await supabase
          .from('documents_immeuble')
          .select('*')
          .eq('lot_id', data.lot.id)
          .order('created_at', { ascending: false });
        setDocuments(docs || []);
      }
    } catch (error) {
      console.error('Error loading bail:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      const { error } = await supabase
        .from('documents_immeuble')
        .delete()
        .eq('id', docId);
      if (error) throw error;
      toast.success('Document supprimé');
      loadBail();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!bail) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate('/proprietaire/baux')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Bail non trouvé</div>
      </div>
    );
  }

  const statutConfig = getStatutConfig(bail.statut);
  const daysUntilEnd = bail.date_fin ? differenceInDays(new Date(bail.date_fin), new Date()) : null;
  const isExpiringSoon = daysUntilEnd !== null && daysUntilEnd > 0 && daysUntilEnd <= 90;

  return (
    <div className="p-4 md:p-8 space-y-6 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proprietaire/baux')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">
                Bail - {bail.lot?.reference}
              </h1>
              <Badge className={`${statutConfig.color} text-white`}>{statutConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              {bail.lot?.immeuble?.nom} • {bail.lot?.designation || bail.lot?.reference}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGenerateDialog(true)}>
            <Download className="w-4 h-4 mr-2" /> Générer contrat
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
        </div>
      </div>

      {/* Warning if expiring soon */}
      {isExpiringSoon && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Bail expirant bientôt</p>
              <p className="text-sm text-amber-600">Expire dans {daysUntilEnd} jours</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Loyer mensuel</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(bail.loyer_actuel)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total mensuel</p>
            <p className="text-2xl font-bold">{formatCurrency(bail.total_mensuel)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Garantie</p>
            <p className="text-2xl font-bold">{formatCurrency(bail.montant_garantie)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Date de fin</p>
            <p className="text-2xl font-bold">
              {bail.date_fin ? format(new Date(bail.date_fin), 'dd.MM.yyyy') : 'Indéterminée'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="informations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="locataire">Locataire</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="informations">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Durée & Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">{format(new Date(bail.date_debut), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de fin</p>
                    <p className="font-medium">
                      {bail.date_fin ? format(new Date(bail.date_fin), 'dd MMMM yyyy', { locale: fr }) : 'Indéterminée'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Durée initiale</p>
                    <p className="font-medium">{bail.duree_initiale || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Préavis</p>
                    <p className="font-medium">{bail.preavis_mois || 3} mois</p>
                  </div>
                </div>
                {bail.date_signature && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date de signature</p>
                    <p className="font-medium">{format(new Date(bail.date_signature), 'dd MMMM yyyy', { locale: fr })}</p>
                    {bail.lieu_signature && <p className="text-sm text-muted-foreground">à {bail.lieu_signature}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" /> Montants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Loyer initial</p>
                    <p className="font-medium">{formatCurrency(bail.loyer_initial)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loyer actuel</p>
                    <p className="font-medium text-primary">{formatCurrency(bail.loyer_actuel)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Provisions chauffage</p>
                    <p className="font-medium">{formatCurrency(bail.provisions_chauffage)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provisions eau</p>
                    <p className="font-medium">{formatCurrency(bail.provisions_eau)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Autres charges</p>
                    <p className="font-medium">{formatCurrency(bail.autres_charges)}</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-2">
                    <p className="text-sm text-muted-foreground">Total mensuel</p>
                    <p className="font-bold text-primary">{formatCurrency(bail.total_mensuel)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Garantie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="font-medium">{formatCurrency(bail.montant_garantie)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{bail.type_garantie?.replace('_', ' ') || '-'}</p>
                  </div>
                </div>
                {bail.date_versement_garantie && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date de versement</p>
                    <p className="font-medium">{format(new Date(bail.date_versement_garantie), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {bail.clauses_particulieres && (
              <Card>
                <CardHeader>
                  <CardTitle>Clauses particulières</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{bail.clauses_particulieres}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="locataire">
          {bail.locataire ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" /> Locataire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nom complet</p>
                    <p className="font-medium text-lg">
                      {bail.locataire.civilite} {bail.locataire.prenom} {bail.locataire.nom}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{bail.locataire.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{bail.locataire.telephone || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun locataire associé à ce bail</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun document pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.nom}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type_document} • {formatFileSize(doc.taille)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GenerateBailDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        bail={bail}
        onSuccess={loadBail}
      />
      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        immeubleId={bail?.lot?.immeuble_id}
        onSuccess={loadBail}
      />
    </div>
  );
}
