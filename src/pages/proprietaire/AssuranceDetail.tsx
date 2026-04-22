import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Calendar, AlertTriangle, Edit, FileText, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UploadDocumentDialog } from '@/components/proprietaire/UploadDocumentDialog';

const formatCurrency = (value: number | null) => {
  if (!value) return 'CHF 0';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

const getTypeAssuranceLabel = (type: string | null) => {
  switch (type) {
    case 'RC immeuble': return { label: 'RC Immeuble', color: 'bg-blue-500' };
    case 'Incendie': return { label: 'Incendie', color: 'bg-orange-500' };
    case 'Dégâts naturels': return { label: 'Dégâts naturels', color: 'bg-emerald-500' };
    case 'Dégâts d\'eau': return { label: 'Dégâts d\'eau', color: 'bg-cyan-500' };
    case 'Bris de glace': return { label: 'Bris de glace', color: 'bg-purple-500' };
    case 'Perte de loyer': return { label: 'Perte de loyer', color: 'bg-amber-500' };
    case 'Multirisque': return { label: 'Multirisque', color: 'bg-primary' };
    default: return { label: type || 'Autre', color: 'bg-gray-500' };
  }
};

const getPeriodiciteLabel = (periodicite: string | null) => {
  switch (periodicite) {
    case 'mensuelle': return 'Mensuelle';
    case 'trimestrielle': return 'Trimestrielle';
    case 'semestrielle': return 'Semestrielle';
    case 'annuelle': return 'Annuelle';
    default: return periodicite || '-';
  }
};

export default function AssuranceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assurance, setAssurance] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (id && user) loadAssurance();
  }, [id, user]);

  const loadAssurance = async () => {
    try {
      const { data, error } = await supabase
        .from('assurances_immeuble')
        .select(`
          *,
          immeuble:immeubles(id, nom, adresse)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setAssurance(data);
    } catch (error) {
      console.error('Error loading assurance:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assurance) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate('/proprietaire/assurances')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Assurance non trouvée</div>
      </div>
    );
  }

  const typeConfig = getTypeAssuranceLabel(assurance.type_assurance);
  const daysUntilRenewal = assurance.date_prochaine_echeance 
    ? differenceInDays(new Date(assurance.date_prochaine_echeance), new Date())
    : null;
  const isRenewingSoon = daysUntilRenewal !== null && daysUntilRenewal > 0 && daysUntilRenewal <= 60;

  const risquesCouverts = assurance.risques_couverts as string[] | null;

  return (
    <div className="p-4 md:p-8 space-y-6 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proprietaire/assurances')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">{assurance.assureur}</h1>
              <Badge className={`${typeConfig.color} text-white`}>{typeConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              {assurance.immeuble?.nom} • Police N° {assurance.numero_police || '-'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
        </div>
      </div>

      {/* Warning if renewing soon */}
      {isRenewingSoon && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Renouvellement proche</p>
              <p className="text-sm text-amber-600">Échéance dans {daysUntilRenewal} jours</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Prime annuelle</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(assurance.prime_annuelle)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Franchise</p>
            <p className="text-2xl font-bold">{formatCurrency(assurance.franchise)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valeur assurée</p>
            <p className="text-2xl font-bold">{formatCurrency(assurance.valeur_assuree)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Prochaine échéance</p>
            <p className="text-2xl font-bold">
              {assurance.date_prochaine_echeance 
                ? format(new Date(assurance.date_prochaine_echeance), 'dd.MM.yyyy') 
                : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Assureur</p>
                <p className="font-medium">{assurance.assureur}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">N° de police</p>
                <p className="font-medium">{assurance.numero_police || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{typeConfig.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Périodicité</p>
                <p className="font-medium">{getPeriodiciteLabel(assurance.periodicite_paiement)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date de début</p>
                <p className="font-medium">
                  {assurance.date_debut ? format(new Date(assurance.date_debut), 'dd MMMM yyyy', { locale: fr }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de fin</p>
                <p className="font-medium">
                  {assurance.date_fin ? format(new Date(assurance.date_fin), 'dd MMMM yyyy', { locale: fr }) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Risques couverts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risquesCouverts && risquesCouverts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {risquesCouverts.map((risque, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {risque}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun risque spécifié</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Conditions de résiliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Délai de résiliation</p>
                <p className="font-medium">{assurance.delai_resiliation_mois || '-'} mois</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mois de résiliation</p>
                <p className="font-medium">
                  {assurance.mois_resiliation 
                    ? format(new Date(2024, assurance.mois_resiliation - 1, 1), 'MMMM', { locale: fr })
                    : '-'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prochaine échéance</p>
              <p className="font-medium">
                {assurance.date_prochaine_echeance 
                  ? format(new Date(assurance.date_prochaine_echeance), 'dd MMMM yyyy', { locale: fr }) 
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {assurance.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{assurance.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assurance.document_url ? (
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Police d'assurance</p>
                  <a 
                    href={assurance.document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Télécharger le document
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun document pour le moment</p>
                <Button className="mt-4" variant="outline" onClick={() => setShowUploadDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Ajouter un document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        immeubleId={assurance?.immeuble?.id}
        onSuccess={loadAssurance}
      />
    </div>
  );
}
