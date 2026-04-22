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
  Phone, Mail, MapPin, Home, Hammer, RefreshCw, Trash2, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';

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

interface Projet {
  id: string;
  type_projet: string;
  statut: string;
  adresse: string | null;
  commune: string | null;
  budget_previsionnel: number | null;
  created_at: string;
}

export default function ProprietaireDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proprietaire, setProprietaire] = useState<Proprietaire | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesAdmin, setNotesAdmin] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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

      // Fetch agent name if assigned
      if (proprietaireData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', proprietaireData.agent_id)
          .single();

        if (agentData) {
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('prenom, nom')
            .eq('id', agentData.user_id)
            .single();

          if (agentProfile) {
            setAgentName(`${agentProfile.prenom} ${agentProfile.nom}`);
          }
        }
      }

      // Fetch immeubles with lots count
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom, adresse, code_postal, ville, type_bien, statut_vente')
        .eq('proprietaire_id', id);

      if (immeublesData) {
        // Get lots count for each immeuble
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
      }

      // Fetch projets developpement
      const { data: projetsData } = await supabase
        .from('projets_developpement')
        .select('id, type_projet, statut, adresse, commune, budget_previsionnel, created_at')
        .eq('proprietaire_id', id)
        .order('created_at', { ascending: false });

      setProjets(projetsData || []);

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

  const deleteProprietaire = async () => {
    if (!proprietaire) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce propriétaire ?")) return;

    try {
      const { error } = await supabase.functions.invoke('delete-proprietaire', {
        body: { userId: proprietaire.user_id }
      });

      if (error) throw error;
      toast.success('Propriétaire supprimé');
      navigate('/admin/proprietaires');
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    actif: { label: 'Actif', variant: 'default' },
    en_attente: { label: 'En attente', variant: 'secondary' },
    inactif: { label: 'Inactif', variant: 'outline' },
  };

  const projetStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    demande_recue: { label: 'Demande reçue', variant: 'secondary' },
    analyse_en_cours: { label: 'Analyse', variant: 'outline' },
    etude_faisabilite_rendue: { label: 'Étude rendue', variant: 'default' },
    planification_permis: { label: 'Planification', variant: 'outline' },
    devis_transmis: { label: 'Devis transmis', variant: 'default' },
    permis_en_preparation: { label: 'Permis en prep.', variant: 'outline' },
    permis_depose: { label: 'Permis déposé', variant: 'default' },
    attente_reponse_cantonale: { label: 'Attente canton', variant: 'secondary' },
    projet_valide: { label: 'Validé', variant: 'default' },
    projet_refuse: { label: 'Refusé', variant: 'destructive' },
    termine: { label: 'Terminé', variant: 'default' },
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
        <Button onClick={() => navigate('/admin/proprietaires')} className="mt-4">
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/proprietaires')} className="hover:bg-background/50">
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
              {agentName && (
                <p className="text-sm text-muted-foreground mt-1">Agent assigné: {agentName}</p>
              )}
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
            <Button variant="destructive" size="sm" onClick={deleteProprietaire}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Stats avec PremiumKPICard */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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
          title="Projets"
          value={projets.length}
          icon={Hammer}
          delay={100}
        />
        <PremiumKPICard
          title="Inscrit le"
          value={format(new Date(proprietaire.created_at), 'dd/MM/yyyy', { locale: fr })}
          icon={Calendar}
          delay={150}
        />
      </div>

      <Tabs defaultValue="info" className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="banque">Données bancaires</TabsTrigger>
          <TabsTrigger value="immeubles">Immeubles ({immeubles.length})</TabsTrigger>
          <TabsTrigger value="projets">Projets ({projets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
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
                  <label className="text-sm text-muted-foreground">Téléphone principal</label>
                  <p className="font-medium">{proprietaire.telephone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Téléphone secondaire</label>
                  <p className="font-medium">{proprietaire.telephone_secondaire || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Adresse</label>
                  <p className="font-medium">{proprietaire.adresse || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Ville</label>
                  <p className="font-medium">
                    {proprietaire.code_postal} {proprietaire.ville} {proprietaire.canton ? `(${proprietaire.canton})` : ''}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Inscrit le</label>
                <p className="font-medium">
                  {format(new Date(proprietaire.created_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </CardContent>
          </Card>

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

        <TabsContent value="banque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informations bancaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">IBAN</label>
                  <p className="font-medium font-mono">{proprietaire.iban || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Banque</label>
                  <p className="font-medium">{proprietaire.nom_banque || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Titulaire du compte</label>
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/projets-developpement`)}
                    >
                      <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
                        <p className="font-medium">{immeuble.nom || immeuble.adresse}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {immeuble.code_postal} {immeuble.ville}
                          </span>
                          <span className="flex items-center gap-1">
                            <Home className="h-3.5 w-3.5" />
                            {immeuble.lots_count} lot{immeuble.lots_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {immeuble.type_bien && (
                          <Badge variant="outline">{immeuble.type_bien}</Badge>
                        )}
                        {immeuble.statut_vente === 'publie' && (
                          <Badge variant="default">En vente</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-5 w-5" />
                Projets de développement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projets.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun projet</p>
              ) : (
                <div className="space-y-3">
                  {projets.map((projet) => (
                    <div 
                      key={projet.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/projets-developpement/${projet.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{projet.type_projet}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                          {(projet.adresse || projet.commune) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {projet.adresse || projet.commune}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(projet.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={projetStatusConfig[projet.statut]?.variant || 'secondary'}>
                          {projetStatusConfig[projet.statut]?.label || projet.statut}
                        </Badge>
                        {projet.budget_previsionnel && (
                          <span className="text-sm font-medium">
                            CHF {projet.budget_previsionnel.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
