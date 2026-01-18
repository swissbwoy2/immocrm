import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, User, CreditCard, Building2, FileText, Calendar, 
  Phone, Mail, MapPin, Home, Hammer, RefreshCw, Save, Plus, Eye,
  FileSignature, Landmark, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';
import { AddBailDialog } from '@/components/proprietaire/AddBailDialog';
import { AddHypothequeDialog } from '@/components/proprietaire/AddHypothequeDialog';
import { AddAssuranceDialog } from '@/components/proprietaire/AddAssuranceDialog';
import { GenerateBailDialog } from '@/components/proprietaire/GenerateBailDialog';

interface Proprietaire {
  id: string;
  user_id: string;
  civilite: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  canton: string | null;
  telephone: string | null;
  telephone_secondaire: string | null;
  iban: string | null;
  nom_banque: string | null;
  titulaire_compte: string | null;
  notes_admin: string | null;
  statut: string;
  agent_id: string | null;
  created_at: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  avatar_url: string | null;
}

interface Immeuble {
  id: string;
  nom: string;
  adresse: string;
  code_postal: string | null;
  ville: string | null;
  type_bien: string | null;
  statut_vente: string | null;
  lots_count: number;
}

interface Bail {
  id: string;
  date_debut: string;
  date_fin: string | null;
  loyer_actuel: number | null;
  statut: string | null;
  lot: {
    reference: string;
    immeuble: { nom: string; adresse: string };
  };
}

interface Hypotheque {
  id: string;
  creancier: string;
  montant_initial: number;
  taux_interet: number | null;
  type_taux: string | null;
  immeuble: { nom: string; adresse: string };
}

interface Assurance {
  id: string;
  assureur: string;
  type_assurance: string | null;
  prime_annuelle: number | null;
  immeuble: { nom: string; adresse: string };
}

export default function AgentProprietaireDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proprietaire, setProprietaire] = useState<Proprietaire | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [baux, setBaux] = useState<Bail[]>([]);
  const [hypotheques, setHypotheques] = useState<Hypotheque[]>([]);
  const [assurances, setAssurances] = useState<Assurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesAdmin, setNotesAdmin] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  const [showAddBailDialog, setShowAddBailDialog] = useState(false);
  const [showAddHypothequeDialog, setShowAddHypothequeDialog] = useState(false);
  const [showAddAssuranceDialog, setShowAddAssuranceDialog] = useState(false);
  const [selectedBailId, setSelectedBailId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      // Fetch proprietaire
      const { data: proprietaireData, error: proprietaireError } = await supabase
        .from('proprietaires')
        .select('*')
        .eq('id', id)
        .single();

      if (proprietaireError) throw proprietaireError;
      setProprietaire(proprietaireData);
      setNotesAdmin(proprietaireData.notes_admin || '');

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, prenom, email, actif, avatar_url')
        .eq('id', proprietaireData.user_id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch immeubles with lots count
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom, adresse, code_postal, ville, type_bien, statut_vente')
        .eq('proprietaire_id', id);

      if (immeublesData) {
        const immeublesWithLots = await Promise.all(
          immeublesData.map(async (immeuble) => {
            const { count } = await supabase
              .from('lots')
              .select('*', { count: 'exact', head: true })
              .eq('immeuble_id', immeuble.id);

            return {
              ...immeuble,
              lots_count: count || 0
            };
          })
        );
        setImmeubles(immeublesWithLots);

        // Fetch baux for these immeubles
        const immeublesIds = immeublesData.map(i => i.id);
        if (immeublesIds.length > 0) {
          const { data: lotsData } = await supabase
            .from('lots')
            .select('id')
            .in('immeuble_id', immeublesIds);
          
          if (lotsData && lotsData.length > 0) {
            const lotIds = lotsData.map(l => l.id);
            const { data: bauxData } = await supabase
              .from('baux')
              .select(`
                id, date_debut, date_fin, loyer_actuel, statut,
                lot:lots!inner(reference, immeuble:immeubles!inner(nom, adresse))
              `)
              .in('lot_id', lotIds)
              .order('date_debut', { ascending: false });
            
            setBaux(bauxData || []);
          }

          // Fetch hypotheques
          const { data: hypothequesData } = await supabase
            .from('hypotheques')
            .select(`
              id, creancier, montant_initial, taux_interet, type_taux,
              immeuble:immeubles!inner(nom, adresse)
            `)
            .in('immeuble_id', immeublesIds);
          
          setHypotheques((hypothequesData as unknown as Hypotheque[]) || []);

          // Fetch assurances
          const { data: assurancesData } = await supabase
            .from('assurances_immeuble')
            .select(`
              id, assureur, type_assurance, prime_annuelle,
              immeuble:immeubles!inner(nom, adresse)
            `)
            .in('immeuble_id', immeublesIds);
          
          setAssurances(assurancesData || []);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!proprietaire) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('proprietaires')
        .update({ notes_admin: notesAdmin })
        .eq('id', proprietaire.id);

      if (error) throw error;
      toast.success('Notes sauvegardées');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingNotes(false);
    }
  };

  const resendInvitation = async () => {
    if (!proprietaire || !profile) return;
    try {
      const { error } = await supabase.functions.invoke('resend-proprietaire-invitation', {
        body: { userId: proprietaire.user_id, email: profile.email }
      });
      
      if (error) throw error;
      toast.success(`Invitation renvoyée à ${profile.email}`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du renvoi de l'invitation");
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    actif: { label: 'Actif', variant: 'default' },
    en_attente: { label: 'En attente', variant: 'secondary' },
    inactif: { label: 'Inactif', variant: 'outline' },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(value);
  };

  const totalLots = immeubles.reduce((sum, i) => sum + i.lots_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!proprietaire || !profile) {
    return (
      <div className="text-center py-12">
        <p>Propriétaire non trouvé</p>
        <Button onClick={() => navigate('/agent/proprietaires')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header premium avec gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 animate-fade-in">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-4 left-20 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/agent/proprietaires')} className="hover:bg-background/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-5 h-5 text-primary animate-pulse-soft" />
                <span className="text-sm font-medium text-primary/80 uppercase tracking-wider">Propriétaire</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                {proprietaire.civilite} {profile.prenom} {profile.nom}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </span>
                {proprietaire.telephone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {proprietaire.telephone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusConfig[proprietaire.statut]?.variant || 'secondary'} className="text-sm px-3 py-1">
              {statusConfig[proprietaire.statut]?.label || proprietaire.statut}
            </Badge>
            {proprietaire.statut === 'en_attente' && (
              <Button variant="outline" size="sm" onClick={resendInvitation}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Renvoyer invitation
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats avec PremiumKPICard */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <PremiumKPICard
          title="Immeubles"
          value={immeubles.length}
          icon={Building2}
          delay={0}
        />
        <PremiumKPICard
          title="Lots"
          value={totalLots}
          icon={Home}
          delay={50}
        />
        <PremiumKPICard
          title="Baux"
          value={baux.length}
          icon={FileSignature}
          delay={100}
        />
        <PremiumKPICard
          title="Hypothèques"
          value={hypotheques.length}
          icon={Landmark}
          delay={150}
        />
        <PremiumKPICard
          title="Assurances"
          value={assurances.length}
          icon={Shield}
          delay={200}
        />
      </div>

      <Tabs defaultValue="info" className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="immeubles">Immeubles ({immeubles.length})</TabsTrigger>
          <TabsTrigger value="baux">Baux ({baux.length})</TabsTrigger>
          <TabsTrigger value="hypotheques">Hypothèques ({hypotheques.length})</TabsTrigger>
          <TabsTrigger value="assurances">Assurances ({assurances.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">Civilité</label>
                    <p className="font-medium">{proprietaire.civilite || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Téléphone</label>
                    <p className="font-medium">{proprietaire.telephone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Inscrit le</label>
                    <p className="font-medium">
                      {format(new Date(proprietaire.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{proprietaire.adresse || '-'}</p>
                <p className="text-muted-foreground">
                  {proprietaire.code_postal} {proprietaire.ville} {proprietaire.canton && `(${proprietaire.canton})`}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informations bancaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-muted-foreground">IBAN</label>
                  <p className="font-medium font-mono">{proprietaire.iban || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Banque</label>
                  <p className="font-medium">{proprietaire.nom_banque || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Titulaire</label>
                  <p className="font-medium">{proprietaire.titulaire_compte || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="immeubles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Immeubles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {immeubles.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun immeuble</p>
              ) : (
                <div className="space-y-3">
                  {immeubles.map((immeuble) => (
                    <div 
                      key={immeuble.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{immeuble.nom}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {immeuble.adresse}, {immeuble.code_postal} {immeuble.ville}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{immeuble.type_bien || 'Immeuble'}</Badge>
                        <span className="text-sm text-muted-foreground">{immeuble.lots_count} lot(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="baux" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Baux
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddBailDialog(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nouveau bail
              </Button>
            </CardHeader>
            <CardContent>
              {baux.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun bail</p>
              ) : (
                <div className="space-y-3">
                  {baux.map((bail) => (
                    <div 
                      key={bail.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{bail.lot.immeuble.nom} - {bail.lot.reference}</h4>
                        <p className="text-sm text-muted-foreground">
                          Du {format(new Date(bail.date_debut), 'dd/MM/yyyy', { locale: fr })}
                          {bail.date_fin && ` au ${format(new Date(bail.date_fin), 'dd/MM/yyyy', { locale: fr })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {bail.loyer_actuel && (
                          <span className="font-semibold">{formatCurrency(bail.loyer_actuel)}/mois</span>
                        )}
                        <Badge variant={bail.statut === 'actif' ? 'default' : 'secondary'}>
                          {bail.statut || 'Actif'}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setSelectedBailId(bail.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Générer PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hypotheques" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Hypothèques
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddHypothequeDialog(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nouvelle hypothèque
              </Button>
            </CardHeader>
            <CardContent>
              {hypotheques.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucune hypothèque</p>
              ) : (
                <div className="space-y-3">
                  {hypotheques.map((hypo) => (
                    <div 
                      key={hypo.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/agent/proprietaires/${id}/hypotheques/${hypo.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{hypo.creancier}</h4>
                        <p className="text-sm text-muted-foreground">
                          {hypo.immeuble.nom} - {hypo.immeuble.adresse}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(hypo.montant_initial)}</span>
                        {hypo.taux_interet && (
                          <Badge variant="outline">{hypo.taux_interet}% {hypo.type_taux}</Badge>
                        )}
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assurances" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Assurances
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddAssuranceDialog(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nouvelle assurance
              </Button>
            </CardHeader>
            <CardContent>
              {assurances.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucune assurance</p>
              ) : (
                <div className="space-y-3">
                  {assurances.map((assurance) => (
                    <div 
                      key={assurance.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/agent/proprietaires/${id}/assurances/${assurance.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{assurance.assureur}</h4>
                        <p className="text-sm text-muted-foreground">
                          {assurance.immeuble.nom} - {assurance.type_assurance || 'Assurance'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {assurance.prime_annuelle && (
                          <span className="font-semibold">{formatCurrency(assurance.prime_annuelle)}/an</span>
                        )}
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes administratives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notesAdmin}
                onChange={(e) => setNotesAdmin(e.target.value)}
                placeholder="Ajouter des notes..."
                className="min-h-[120px]"
              />
              <Button onClick={saveNotes} disabled={savingNotes} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                {savingNotes ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showAddBailDialog && (
        <AddBailDialog
          open={showAddBailDialog}
          onClose={() => setShowAddBailDialog(false)}
          onSuccess={() => {
            loadData();
            setShowAddBailDialog(false);
          }}
        />
      )}

      {showAddHypothequeDialog && (
        <AddHypothequeDialog
          open={showAddHypothequeDialog}
          onClose={() => setShowAddHypothequeDialog(false)}
          onSuccess={() => {
            loadData();
            setShowAddHypothequeDialog(false);
          }}
        />
      )}

      {showAddAssuranceDialog && (
        <AddAssuranceDialog
          open={showAddAssuranceDialog}
          onClose={() => setShowAddAssuranceDialog(false)}
          onSuccess={() => {
            loadData();
            setShowAddAssuranceDialog(false);
          }}
        />
      )}

      {selectedBailId && baux.find(b => b.id === selectedBailId) && (
        <GenerateBailDialog
          open={!!selectedBailId}
          onOpenChange={(open) => !open && setSelectedBailId(null)}
          bail={baux.find(b => b.id === selectedBailId)!}
        />
      )}
    </div>
  );
}
