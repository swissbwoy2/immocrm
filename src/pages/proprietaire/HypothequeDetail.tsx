import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Landmark, Calendar, Percent, TrendingDown, Edit, Plus, FileText, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AddCeduleDialog } from '@/components/proprietaire/AddCeduleDialog';
import { UploadDocumentDialog } from '@/components/proprietaire/UploadDocumentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatCurrency = (value: number | null) => {
  if (!value) return 'CHF 0';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

const getTypeTauxLabel = (type: string | null) => {
  switch (type) {
    case 'fixe': return 'Taux fixe';
    case 'variable': return 'Taux variable';
    case 'saron': return 'SARON';
    default: return type || '-';
  }
};

const getTypeAmortLabel = (type: string | null) => {
  switch (type) {
    case 'direct': return 'Amortissement direct';
    case 'indirect': return 'Amortissement indirect (3a)';
    case 'aucun': return 'Pas d\'amortissement';
    default: return type || '-';
  }
};

export default function HypothequeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hypotheque, setHypotheque] = useState<any>(null);
  const [cedules, setCedules] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showAddCedule, setShowAddCedule] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (id && user) loadData();
  }, [id, user]);

  const loadData = async () => {
    try {
      const { data: hypData, error: hypError } = await supabase
        .from('hypotheques')
        .select(`
          *,
          immeuble:immeubles(id, nom, adresse, valeur_estimee)
        `)
        .eq('id', id)
        .single();

      if (hypError) throw hypError;
      setHypotheque(hypData);

      const { data: cedulesData } = await supabase
        .from('cedules_hypothecaires')
        .select('*')
        .eq('hypotheque_id', id)
        .order('rang');
      setCedules(cedulesData || []);
    } catch (error) {
      console.error('Error loading hypotheque:', error);
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

  if (!hypotheque) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate('/proprietaire/hypotheques')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Hypothèque non trouvée</div>
      </div>
    );
  }

  const montantRembourse = (hypotheque.montant_initial || 0) - (hypotheque.montant_actuel || hypotheque.montant_initial || 0);
  const progressPercent = hypotheque.montant_initial > 0 
    ? (montantRembourse / hypotheque.montant_initial) * 100 
    : 0;

  const daysUntilEnd = hypotheque.date_fin ? differenceInDays(new Date(hypotheque.date_fin), new Date()) : null;
  const ltv = hypotheque.immeuble?.valeur_estimee 
    ? ((hypotheque.montant_actuel || hypotheque.montant_initial) / hypotheque.immeuble.valeur_estimee) * 100 
    : null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proprietaire/hypotheques')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">{hypotheque.creancier}</h1>
              <Badge variant="outline">{getTypeTauxLabel(hypotheque.type_taux)}</Badge>
            </div>
            <p className="text-muted-foreground">
              {hypotheque.immeuble?.nom} • {hypotheque.numero_pret && `N° ${hypotheque.numero_pret}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Montant initial</p>
            <p className="text-2xl font-bold">{formatCurrency(hypotheque.montant_initial)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Montant actuel</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(hypotheque.montant_actuel || hypotheque.montant_initial)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Taux d'intérêt</p>
            </div>
            <p className="text-2xl font-bold">{hypotheque.taux_interet?.toFixed(2) || '-'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Échéance</p>
            <p className="text-2xl font-bold">
              {hypotheque.date_fin ? format(new Date(hypotheque.date_fin), 'dd.MM.yyyy') : '-'}
            </p>
            {daysUntilEnd !== null && daysUntilEnd <= 365 && daysUntilEnd > 0 && (
              <p className="text-xs text-amber-600">Dans {daysUntilEnd} jours</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progression du remboursement</span>
            <span className="text-sm font-medium">{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Remboursé: {formatCurrency(montantRembourse)}</span>
            <span>Restant: {formatCurrency(hypotheque.montant_actuel || hypotheque.montant_initial)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="informations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="cedules">Cédules ({cedules.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="informations">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" /> Taux & Intérêts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type de taux</p>
                    <p className="font-medium">{getTypeTauxLabel(hypotheque.type_taux)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taux d'intérêt</p>
                    <p className="font-medium">{hypotheque.taux_interet?.toFixed(2) || '-'}%</p>
                  </div>
                </div>
                {hypotheque.type_taux === 'saron' && hypotheque.marge_saron && (
                  <div>
                    <p className="text-sm text-muted-foreground">Marge SARON</p>
                    <p className="font-medium">{hypotheque.marge_saron}%</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">
                      {hypotheque.date_debut ? format(new Date(hypotheque.date_debut), 'dd MMMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de fin</p>
                    <p className="font-medium">
                      {hypotheque.date_fin ? format(new Date(hypotheque.date_fin), 'dd MMMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" /> Amortissement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type d'amortissement</p>
                  <p className="font-medium">{getTypeAmortLabel(hypotheque.type_amortissement)}</p>
                </div>
                {hypotheque.montant_amortissement && (
                  <div>
                    <p className="text-sm text-muted-foreground">Montant annuel</p>
                    <p className="font-medium">{formatCurrency(hypotheque.montant_amortissement)}</p>
                  </div>
                )}
                {hypotheque.type_amortissement === 'indirect' && hypotheque.compte_3a && (
                  <div>
                    <p className="text-sm text-muted-foreground">Compte 3a</p>
                    <p className="font-medium">{hypotheque.compte_3a}</p>
                  </div>
                )}
                {ltv !== null && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Loan-to-Value (LTV)</p>
                    <p className={`text-xl font-bold ${ltv > 80 ? 'text-destructive' : ltv > 65 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {ltv.toFixed(1)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Créancier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Établissement</p>
                  <p className="font-medium">{hypotheque.creancier}</p>
                </div>
                {hypotheque.numero_pret && (
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro de prêt</p>
                    <p className="font-medium">{hypotheque.numero_pret}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Rang</p>
                  <p className="font-medium">{hypotheque.rang ? `${hypotheque.rang}er rang` : '-'}</p>
                </div>
              </CardContent>
            </Card>

            {hypotheque.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{hypotheque.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cedules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cédules hypothécaires</CardTitle>
              <Button size="sm" onClick={() => setShowAddCedule(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {cedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune cédule enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cedules.map((cedule) => (
                    <div key={cedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cedule.rang ? `${cedule.rang}e rang` : '-'}</Badge>
                          <span className="font-medium">{cedule.numero_cedule || 'Sans numéro'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cedule.type_cedule === 'registre' ? 'Cédule de registre' : 'Cédule papier'}
                          {cedule.lieu_depot && ` • ${cedule.lieu_depot}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(cedule.montant)}</p>
                        {cedule.date_creation && (
                          <p className="text-xs text-muted-foreground">
                            Créée le {format(new Date(cedule.date_creation), 'dd.MM.yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <AddCeduleDialog 
            open={showAddCedule} 
            onClose={() => setShowAddCedule(false)} 
            onSuccess={loadData}
            preselectedImmeubleId={hypotheque.immeuble?.id}
            preselectedHypothequeId={hypotheque.id}
          />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document pour le moment</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        immeubleId={hypotheque?.immeuble?.id}
        onSuccess={loadData}
      />
    </div>
  );
}
