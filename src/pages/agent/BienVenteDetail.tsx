import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumPageHeader, PremiumCard, PremiumPhotoGallery } from '@/components/premium';
import { EstimationModule } from '@/components/biens-vente/EstimationModule';
import { MarketAnalysisModule } from '@/components/biens-vente/MarketAnalysisModule';
import { GenerateDocumentsSection } from '@/components/biens-vente/GenerateDocumentsSection';
import { EditBienVenteDialog } from '@/components/biens-vente/EditBienVenteDialog';
import { 
  ArrowLeft, Building2, MapPin, Ruler, Thermometer, Banknote, 
  FileText, Eye, EyeOff, Loader2, Edit, Camera, Files, 
  TrendingUp, Calculator, BarChart3, Handshake
} from 'lucide-react';

interface Immeuble {
  id: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  canton: string;
  type_bien: string;
  sous_type_bien: string;
  surface_totale: number;
  nombre_pieces: number;
  nb_chambres: number;
  nb_wc: number;
  nb_salles_eau: number;
  nb_garages: number;
  nb_places_int: number;
  nb_places_ext: number;
  etage: number;
  nb_etages_batiment: number;
  annee_construction: number;
  annee_renovation: number;
  type_chauffage: string;
  combustible: string;
  prix_vente_demande: number;
  estimation_agent: number;
  description_commerciale: string;
  points_forts: string[];
  statut_vente: string;
  publier_espace_acheteur: boolean;
  proprietaire_id: string;
  mode_exploitation: string;
  no_rf_base: string;
  no_rf_feuillet: string;
  lots_rf: string;
  zone_construction: string;
  no_eca: string;
  volume_eca: number;
  valeur_eca: number;
  administrateur_ppe: string;
  charges_ppe: number;
  charges_chauffage_ec: number;
  fonds_renovation: number;
  est_loue: boolean;
  locataire_actuel: string;
  loyer_actuel: number;
  // Estimation fields
  estimation_valeur_basse: number;
  estimation_valeur_haute: number;
  estimation_valeur_recommandee: number;
  estimation_prix_m2: number;
  estimation_date: string;
  estimation_methode: string;
  estimation_notes: string;
  facteurs_positifs: string[];
  facteurs_negatifs: string[];
  potentiel_developpement: string;
  score_sous_exploitation: number;
  recommandation_commercialisation: string;
  strategie_vente: string;
  // Energy fields
  classe_energetique: string;
  indice_energetique: number;
  niveau_bruit_jour: number;
  niveau_bruit_nuit: number;
  // Market fields
  prix_m2_secteur: number;
  duree_publication_moyenne: number;
  tendance_marche: string;
  created_at: string;
}

interface Photo {
  id: string;
  url: string;
  legende?: string;
  type_photo?: string;
  ordre: number;
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

export default function AgentBienVenteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [immeuble, setImmeuble] = useState<Immeuble | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [proprietaire, setProprietaire] = useState<Proprietaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadData();
    }
  }, [id, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!agentData) {
        toast.error('Agent non trouvé');
        navigate('/agent/biens-vente');
        return;
      }

      // Load immeuble - verify agent has access
      const { data: immeubleData, error } = await supabase
        .from('immeubles')
        .select('*')
        .eq('id', id)
        .eq('agent_responsable_id', agentData.id)
        .single();

      if (error || !immeubleData) {
        toast.error('Bien non trouvé ou accès non autorisé');
        navigate('/agent/biens-vente');
        return;
      }

      setImmeuble(immeubleData as unknown as Immeuble);

      // Load photos
      const { data: photosData } = await supabase
        .from('photos_immeuble')
        .select('*')
        .eq('immeuble_id', id)
        .order('ordre', { ascending: true });

      if (photosData) {
        setPhotos(photosData as Photo[]);
      }

      // Load proprietaire if exists
      if (immeubleData?.proprietaire_id) {
        const { data: propData } = await supabase
          .from('proprietaires')
          .select('id, user_id, profiles:user_id(prenom, nom, email)')
          .eq('id', immeubleData.proprietaire_id)
          .single();

        if (propData) {
          setProprietaire(propData as unknown as Proprietaire);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!immeuble) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({ statut_vente: status })
        .eq('id', immeuble.id);

      if (error) throw error;

      setImmeuble(prev => prev ? { ...prev, statut_vente: status } : null);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublication = async () => {
    if (!immeuble) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({ publier_espace_acheteur: !immeuble.publier_espace_acheteur })
        .eq('id', immeuble.id);

      if (error) throw error;

      setImmeuble(prev => prev ? { ...prev, publier_espace_acheteur: !prev.publier_espace_acheteur } : null);
      toast.success(immeuble.publier_espace_acheteur ? 'Bien dépublié' : 'Bien publié');
    } catch (error) {
      console.error('Error toggling publication:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number | null) => 
    price ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(price) : '-';

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      brouillon: { label: 'Brouillon', variant: 'outline' },
      publie: { label: 'Publié', variant: 'default' },
      sous_offre: { label: 'Sous offre', variant: 'destructive' },
      offre_acceptee: { label: 'Offre acceptée', variant: 'default' },
      notaire_planifie: { label: 'Notaire planifié', variant: 'secondary' },
      acte_signe: { label: 'Acte signé', variant: 'default' },
      vendu: { label: 'Vendu', variant: 'default' }
    };
    return labels[statut] || { label: statut, variant: 'outline' as const };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!immeuble) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Bien non trouvé</p>
        <Button variant="outline" onClick={() => navigate('/agent/biens-vente')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  const statut = getStatutLabel(immeuble.statut_vente);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agent/biens-vente')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PremiumPageHeader
            icon={Building2}
            title={immeuble.nom}
            subtitle={`${immeuble.adresse}, ${immeuble.ville}`}
            badge={immeuble.type_bien}
          />
        </div>
        <Button onClick={() => setShowEditDialog(true)}>
          <Edit className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>

      {/* Quick Info */}
      <div className="flex flex-wrap gap-3 items-center">
        <Badge variant={statut.variant}>{statut.label}</Badge>
        {immeuble.publier_espace_acheteur ? (
          <Badge variant="default" className="bg-green-500">
            <Eye className="h-3 w-3 mr-1" />
            Publié
          </Badge>
        ) : (
          <Badge variant="outline">
            <EyeOff className="h-3 w-3 mr-1" />
            Non publié
          </Badge>
        )}
        <span className="text-lg font-semibold text-primary">
          {formatPrice(immeuble.prix_vente_demande)}
        </span>
      </div>

      <Tabs defaultValue="fiche" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 h-auto gap-1">
          <TabsTrigger value="fiche" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fiche</span>
          </TabsTrigger>
          <TabsTrigger value="estimation" className="flex items-center gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Estimation</span>
          </TabsTrigger>
          <TabsTrigger value="marche" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Marché</span>
          </TabsTrigger>
          <TabsTrigger value="commercial" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Commercial</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-1.5 text-xs">
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs">
            <Files className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="offres" className="flex items-center gap-1.5 text-xs">
            <Handshake className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Offres</span>
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </TabsTrigger>
        </TabsList>

        {/* Fiche Technique */}
        <TabsContent value="fiche" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PremiumCard title="Identification" icon={MapPin}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Adresse:</span> <span className="font-medium">{immeuble.adresse}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Code postal:</span> <span className="font-medium">{immeuble.code_postal}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ville:</span> <span className="font-medium">{immeuble.ville}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Canton:</span> <span className="font-medium">{immeuble.canton}</span></div>
              </div>
            </PremiumCard>

            <PremiumCard title="Description" icon={Ruler}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span className="font-medium">{immeuble.type_bien}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Surface:</span> <span className="font-medium">{immeuble.surface_totale} m²</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pièces:</span> <span className="font-medium">{immeuble.nombre_pieces || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chambres:</span> <span className="font-medium">{immeuble.nb_chambres || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SDB:</span> <span className="font-medium">{immeuble.nb_salles_eau || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WC:</span> <span className="font-medium">{immeuble.nb_wc || '-'}</span></div>
              </div>
            </PremiumCard>

            <PremiumCard title="Technique" icon={Thermometer}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Construction:</span> <span className="font-medium">{immeuble.annee_construction || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rénovation:</span> <span className="font-medium">{immeuble.annee_renovation || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chauffage:</span> <span className="font-medium">{immeuble.type_chauffage || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Combustible:</span> <span className="font-medium">{immeuble.combustible || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Étage:</span> <span className="font-medium">{immeuble.etage ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Nb étages:</span> <span className="font-medium">{immeuble.nb_etages_batiment || '-'}</span></div>
              </div>
            </PremiumCard>

            <PremiumCard title="Cadastre" icon={FileText}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">RF Base:</span> <span className="font-medium">{immeuble.no_rf_base || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">RF Feuillet:</span> <span className="font-medium">{immeuble.no_rf_feuillet || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Zone:</span> <span className="font-medium">{immeuble.zone_construction || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">N° ECA:</span> <span className="font-medium">{immeuble.no_eca || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Volume ECA:</span> <span className="font-medium">{immeuble.volume_eca ? `${immeuble.volume_eca} m³` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valeur ECA:</span> <span className="font-medium">{immeuble.valeur_eca ? formatPrice(immeuble.valeur_eca) : '-'}</span></div>
              </div>
            </PremiumCard>

            <PremiumCard title="Stationnement" icon={Building2}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Garages:</span> <span className="font-medium">{immeuble.nb_garages || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Places int.:</span> <span className="font-medium">{immeuble.nb_places_int || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Places ext.:</span> <span className="font-medium">{immeuble.nb_places_ext || 0}</span></div>
              </div>
            </PremiumCard>

            <PremiumCard title="Charges PPE" icon={Banknote}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Admin PPE:</span> <span className="font-medium">{immeuble.administrateur_ppe || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Charges:</span> <span className="font-medium">{immeuble.charges_ppe ? `${immeuble.charges_ppe} CHF/mois` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chauffage/EC:</span> <span className="font-medium">{immeuble.charges_chauffage_ec ? `${immeuble.charges_chauffage_ec} CHF/mois` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fonds rénov.:</span> <span className="font-medium">{immeuble.fonds_renovation ? formatPrice(immeuble.fonds_renovation) : '-'}</span></div>
              </div>
            </PremiumCard>
          </div>

          {/* Propriétaire */}
          {proprietaire && (
            <PremiumCard title="Propriétaire" icon={Building2}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nom:</span> <span className="font-medium">{proprietaire.profiles?.prenom} {proprietaire.profiles?.nom}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span className="font-medium">{proprietaire.profiles?.email || '-'}</span></div>
              </div>
            </PremiumCard>
          )}
        </TabsContent>

        {/* Estimation */}
        <TabsContent value="estimation">
          <EstimationModule immeuble={immeuble} onUpdate={loadData} />
        </TabsContent>

        {/* Analyse Marché */}
        <TabsContent value="marche">
          <MarketAnalysisModule immeuble={immeuble} onUpdate={loadData} />
        </TabsContent>

        {/* Commercialisation */}
        <TabsContent value="commercial" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Prix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Prix demandé</Label>
                  <p className="text-2xl font-bold text-primary">{formatPrice(immeuble.prix_vente_demande)}</p>
                </div>
                {immeuble.estimation_valeur_recommandee && (
                  <div>
                    <Label className="text-muted-foreground">Estimation recommandée</Label>
                    <p className="text-lg font-medium">{formatPrice(immeuble.estimation_valeur_recommandee)}</p>
                  </div>
                )}
                {immeuble.estimation_prix_m2 && (
                  <div>
                    <Label className="text-muted-foreground">Prix au m²</Label>
                    <p className="text-lg font-medium">{formatPrice(immeuble.estimation_prix_m2)}/m²</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Publication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Visible espace acheteur</Label>
                  <Switch 
                    checked={immeuble.publier_espace_acheteur} 
                    onCheckedChange={handleTogglePublication}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut de vente</Label>
                  <Select value={immeuble.statut_vente} onValueChange={handleUpdateStatus} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brouillon">Brouillon</SelectItem>
                      <SelectItem value="publie">Publié</SelectItem>
                      <SelectItem value="sous_offre">Sous offre</SelectItem>
                      <SelectItem value="offre_acceptee">Offre acceptée</SelectItem>
                      <SelectItem value="notaire_planifie">Notaire planifié</SelectItem>
                      <SelectItem value="acte_signe">Acte signé</SelectItem>
                      <SelectItem value="vendu">Vendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description commerciale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{immeuble.description_commerciale || 'Aucune description'}</p>
                </div>
                {immeuble.points_forts && Array.isArray(immeuble.points_forts) && immeuble.points_forts.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Points forts</Label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {immeuble.points_forts.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Galerie photos ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img 
                        src={photo.url} 
                        alt={photo.legende || 'Photo'} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-white text-xs truncate">{photo.type_photo || 'Photo'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aucune photo</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents / Génération PDF */}
        <TabsContent value="documents">
          <GenerateDocumentsSection immeuble={immeuble} />
        </TabsContent>

        {/* Offres */}
        <TabsContent value="offres">
          <Card>
            <CardHeader>
              <CardTitle>Offres d'achat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Aucune offre pour le moment</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Generation */}
        <TabsContent value="pdf">
          <GenerateDocumentsSection immeuble={immeuble} />
        </TabsContent>
      </Tabs>

      <EditBienVenteDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        immeuble={immeuble}
        onSuccess={loadData}
      />
    </div>
  );
}
