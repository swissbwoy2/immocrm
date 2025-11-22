import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, FileText, User, Home, Building2, Briefcase, AlertCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateDaysElapsed } from '@/utils/calculations';

interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  autres_credits?: boolean;
  apport_personnel?: number;
  commission_split?: number;
  secteur_activite?: string;
  etat_avancement?: string;
  priorite?: string;
  note_agent?: string;
  statut?: string;
  nationalite?: string;
  type_permis?: string;
  residence?: string;
  garanties?: string;
  region_recherche?: string;
  situation_familiale?: string;
  situation_financiere?: string;
  profession?: string;
  type_bien?: string;
  source_revenus?: string;
  anciennete_mois?: number;
  created_at?: string;
  date_ajout?: string;
  date_naissance?: string;
  adresse?: string;
  etat_civil?: string;
  gerance_actuelle?: string;
  contact_gerance?: string;
  loyer_actuel?: number;
  depuis_le?: string;
  pieces_actuel?: number;
  motif_changement?: string;
  employeur?: string;
  date_engagement?: string;
  charges_extraordinaires?: boolean;
  montant_charges_extra?: number;
  poursuites?: boolean;
  curatelle?: boolean;
  souhaits_particuliers?: string;
  nombre_occupants?: number;
  utilisation_logement?: string;
  animaux?: boolean;
  instrument_musique?: boolean;
  vehicules?: boolean;
  numero_plaques?: string;
  decouverte_agence?: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

interface Agent {
  id: string;
  profile: Profile;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (clientData.agent_id) {
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id, user_id, profiles!inner(*)')
          .eq('id', clientData.agent_id)
          .single();

        if (agentError) {
          console.error('Error loading agent:', agentError);
        } else {
          setAgent({
            id: agentData.id,
            profile: agentData.profiles as unknown as Profile,
          });
        }
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditFormData({
      ...client,
      nom: profile?.nom,
      prenom: profile?.prenom,
      email: profile?.email,
      telephone: profile?.telephone,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const { nom, prenom, email, telephone, ...clientFields } = editFormData;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nom, prenom, email, telephone })
        .eq('id', client?.user_id);

      if (profileError) throw profileError;

      const { error: clientError } = await supabase
        .from('clients')
        .update(clientFields)
        .eq('id', id);

      if (clientError) throw clientError;

      toast({
        title: 'Succès',
        description: 'Les informations ont été mises à jour',
      });

      setEditDialogOpen(false);
      loadClientData();
    } catch (error) {
      console.error('Error updating data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les informations',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Client non trouvé</h2>
          <Button onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux clients
          </Button>
        </div>
      </div>
    );
  }

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = 90 - daysElapsed;
  const progressPercentage = (daysElapsed / 90) * 100;
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  const calculateAnciennete = (dateEngagement?: string) => {
    if (!dateEngagement) return null;
    const now = new Date();
    const engagement = new Date(dateEngagement);
    const months = (now.getFullYear() - engagement.getFullYear()) * 12 + (now.getMonth() - engagement.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return years > 0 ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${remainingMonths} mois`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                {profile.prenom} {profile.nom}
              </h1>
              <Badge variant="outline">{client.nationalite || 'N/A'}</Badge>
              <Badge variant="secondary">Permis {client.type_permis || 'N/A'}</Badge>
            </div>

            {/* Progress bar */}
            <div className="mt-4 max-w-2xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Progression du mandat</p>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  daysElapsed < 60 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : daysElapsed < 90 
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {Math.floor(daysRemaining)}j {Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)}h
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-right mb-2">
                {Math.floor(daysElapsed)} / 90 jours
              </p>
              <Progress 
                value={progressPercentage} 
                className="h-3" 
                indicatorClassName={
                  daysElapsed < 60 ? 'bg-green-500' :
                  daysElapsed < 90 ? 'bg-orange-500' :
                  'bg-red-500'
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleEditClick}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier les informations</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prénom</Label>
                      <Input
                        value={editFormData.prenom || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input
                        value={editFormData.nom || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input
                        value={editFormData.telephone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={editFormData.adresse || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Budget maximum (CHF)</Label>
                      <Input
                        type="number"
                        value={editFormData.budget_max || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, budget_max: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Revenus mensuels (CHF)</Label>
                      <Input
                        type="number"
                        value={editFormData.revenus_mensuels || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, revenus_mensuels: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pièces souhaitées</Label>
                      <Input
                        type="number"
                        value={editFormData.pieces || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, pieces: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Région de recherche</Label>
                    <Input
                      value={editFormData.region_recherche || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, region_recherche: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes de l'agent</Label>
                    <Textarea
                      value={editFormData.note_agent || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, note_agent: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleEditSave}>
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate('/admin/clients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Situation financière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Situation financière
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Revenus mensuels</p>
                    <p className="text-2xl font-bold">
                      CHF {client.revenus_mensuels?.toLocaleString() || '0'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Budget maximum</p>
                    <p className="text-2xl font-bold text-primary">
                      CHF {client.budget_max?.toLocaleString() || '0'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Budget recommandé</p>
                    <p className="text-2xl font-bold text-green-600">
                      CHF {budgetRecommande.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Separator />
              <div className="space-y-2">
                {client.charges_extraordinaires && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <span className="text-sm font-medium">Charges extraordinaires</span>
                    <span className="text-sm">
                      {client.montant_charges_extra ? `CHF ${client.montant_charges_extra.toLocaleString()}` : 'Oui'}
                    </span>
                  </div>
                )}
                {(client.poursuites || client.curatelle) && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div className="flex-1 text-sm font-medium text-red-600">
                      {client.poursuites && 'Poursuites en cours'}
                      {client.poursuites && client.curatelle && ' • '}
                      {client.curatelle && 'Sous curatelle'}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.telephone || 'Non renseigné'}</span>
                </div>
                {client.date_naissance && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(client.date_naissance).toLocaleDateString('fr-CH')}</span>
                  </div>
                )}
                {client.adresse && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{client.adresse}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">État civil</p>
                  <p className="font-medium">{client.etat_civil || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationalité</p>
                  <p className="font-medium">{client.nationalite || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de permis</p>
                  <p className="font-medium">{client.type_permis || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Situation actuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Situation actuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gérance actuelle</p>
                  <p className="font-medium">{client.gerance_actuelle || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact gérance</p>
                  <p className="font-medium">{client.contact_gerance || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Loyer brut actuel</p>
                  <p className="font-medium text-lg">
                    {client.loyer_actuel ? `CHF ${client.loyer_actuel.toLocaleString()}` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Depuis le</p>
                  <p className="font-medium">
                    {client.depuis_le ? new Date(client.depuis_le).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pièces actuel</p>
                  <p className="font-medium">{client.pieces_actuel || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Motif du changement</p>
                  <p className="font-medium text-sm">{client.motif_changement || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Situation professionnelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Situation professionnelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Profession</p>
                  <p className="font-medium">{client.profession || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employeur</p>
                  <p className="font-medium">{client.employeur || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus mensuels nets</p>
                  <p className="font-medium text-lg">
                    CHF {client.revenus_mensuels?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'engagement</p>
                  <p className="font-medium">
                    {client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
              </div>
              {calculateAnciennete(client.date_engagement) && (
                <div>
                  <p className="text-sm text-muted-foreground">Ancienneté</p>
                  <p className="font-medium">{calculateAnciennete(client.date_engagement)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critères de recherche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Critères de recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type de bien</p>
                  <p className="font-medium">{client.type_bien || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre de pièces</p>
                  <p className="font-medium">{client.pieces || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Région de recherche</p>
                <p className="font-medium">{client.region_recherche || 'Non renseigné'}</p>
              </div>
              {client.nombre_occupants && (
                <div>
                  <p className="text-sm text-muted-foreground">Nombre d'occupants</p>
                  <p className="font-medium">{client.nombre_occupants}</p>
                </div>
              )}
              {client.souhaits_particuliers && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Souhaits particuliers</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{client.souhaits_particuliers}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Autres informations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Autres informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.utilisation_logement && (
                <div>
                  <p className="text-sm text-muted-foreground">Utilisation du logement</p>
                  <p className="font-medium">{client.utilisation_logement}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${client.animaux ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Animaux</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${client.instrument_musique ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Instrument de musique</span>
                </div>
              </div>
              {client.vehicules && (
                <div>
                  <p className="text-sm text-muted-foreground">Véhicules</p>
                  <p className="font-medium">{client.numero_plaques || 'Oui'}</p>
                </div>
              )}
              {client.decouverte_agence && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Comment a découvert l'agence</p>
                    <p className="font-medium">{client.decouverte_agence}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Suivi */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Suivi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agent ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Agent assigné</p>
                    <p className="font-medium">
                      {agent.profile.prenom} {agent.profile.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">{agent.profile.email}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">Aucun agent assigné</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/assignations')}
                    >
                      Assigner un agent
                    </Button>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Commission split</p>
                  <p className="font-medium">{client.commission_split || 50}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'ajout</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}
                    </span>
                  </div>
                </div>
              </div>
              {client.note_agent && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes de l'agent</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{client.note_agent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
