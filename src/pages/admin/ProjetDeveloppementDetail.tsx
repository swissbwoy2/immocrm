import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hammer, User, MapPin, Calendar, DollarSign, 
  FileText, MessageSquare, Users, Save, Send, Upload, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PremiumPageHeader, PremiumCard } from '@/components/premium';
import { PremiumProjetTimeline } from '@/components/premium/PremiumProjetTimeline';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statutOptions = [
  { value: 'demande_recue', label: 'Demande reçue' },
  { value: 'analyse_en_cours', label: 'Analyse en cours' },
  { value: 'etude_faisabilite_rendue', label: 'Étude de faisabilité rendue' },
  { value: 'planification_permis', label: 'Planification permis' },
  { value: 'devis_transmis', label: 'Devis transmis' },
  { value: 'permis_en_preparation', label: 'Permis en préparation' },
  { value: 'permis_depose', label: 'Permis déposé' },
  { value: 'attente_reponse_cantonale', label: 'Attente réponse cantonale' },
  { value: 'projet_valide', label: 'Projet validé' },
  { value: 'projet_refuse', label: 'Projet refusé' },
  { value: 'termine', label: 'Terminé' }
];

const typeLabels: Record<string, string> = {
  construction_neuve: 'Construction neuve',
  renovation: 'Rénovation',
  extension: 'Extension',
  division_parcelle: 'Division parcelle',
  changement_affectation: 'Changement affectation',
  demolition_reconstruction: 'Démolition/Reconstruction',
  mise_en_vente: 'Mise en vente'
};

export default function AdminProjetDeveloppementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projet, setProjet] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [commentaires, setCommentaires] = useState<any[]>([]);

  // Editable fields
  const [statut, setStatut] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [architecteId, setArchitecteId] = useState<string | null>(null);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetPrevisionnel, setBudgetPrevisionnel] = useState('');
  const [notesInternes, setNotesInternes] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      // Load project with relations
      const { data: projetData, error: projetError } = await supabase
        .from('projets_developpement')
        .select(`
          *,
          proprietaire:proprietaires(
            id,
            user_id,
            telephone,
            adresse,
            profiles:user_id(nom, prenom, email)
          ),
          agent:agents!projets_developpement_agent_id_fkey(
            id,
            user_id,
            profiles:user_id(nom, prenom)
          ),
          architecte:agents!projets_developpement_architecte_id_fkey(
            id,
            user_id,
            profiles:user_id(nom, prenom)
          )
        `)
        .eq('id', id)
        .single();

      if (projetError) throw projetError;
      if (!projetData) {
        toast.error('Projet non trouvé');
        navigate('/admin/projets-developpement');
        return;
      }

      setProjet(projetData);
      setStatut(projetData.statut || 'demande_recue');
      setAgentId(projetData.agent_id);
      setArchitecteId(projetData.architecte_id);
      setBudgetMin(projetData.budget_min?.toString() || '');
      setBudgetMax(projetData.budget_max?.toString() || '');
      setBudgetPrevisionnel(projetData.budget_previsionnel?.toString() || '');
      setNotesInternes(projetData.notes_internes || '');

      // Load agents
      const { data: agentsData } = await supabase
        .from('agents')
        .select(`id, user_id, profiles:user_id(nom, prenom)`);
      setAgents(agentsData || []);

      // Load documents
      const { data: docsData } = await supabase
        .from('documents_developpement')
        .select('*')
        .eq('projet_id', id)
        .order('created_at', { ascending: false });
      setDocuments(docsData || []);

      // Load comments
      const { data: commentsData } = await supabase
        .from('commentaires_developpement')
        .select(`
          *,
          auteur:profiles!commentaires_developpement_auteur_id_fkey(nom, prenom)
        `)
        .eq('projet_id', id)
        .order('created_at', { ascending: false });
      setCommentaires(commentsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('projets_developpement')
        .update({
          statut,
          agent_id: agentId || null,
          architecte_id: architecteId || null,
          budget_min: budgetMin ? parseFloat(budgetMin) : null,
          budget_max: budgetMax ? parseFloat(budgetMax) : null,
          budget_previsionnel: budgetPrevisionnel ? parseFloat(budgetPrevisionnel) : null,
          notes_internes: notesInternes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Projet mis à jour');
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('commentaires_developpement')
        .insert({
          projet_id: id,
          auteur_id: user.id,
          contenu: newComment.trim(),
          est_interne: isInternalComment
        });

      if (error) throw error;
      
      setNewComment('');
      setIsInternalComment(false);
      toast.success('Commentaire ajouté');
      loadData();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('commentaires_developpement')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Commentaire supprimé');
      loadData();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  if (!projet) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Projet non trouvé</p>
        <Button onClick={() => navigate('/admin/projets-developpement')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const proprietaireProfile = projet.proprietaire?.profiles;

  return (
    <div className="flex-1 overflow-y-auto relative">
      <FloatingParticles count={8} className="fixed inset-0 pointer-events-none z-0 opacity-20" />

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/projets-developpement')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PremiumPageHeader
            title={`Projet ${typeLabels[projet.type_projet] || projet.type_projet}`}
            subtitle={projet.adresse || projet.commune || 'Adresse non définie'}
            icon={Hammer}
            badge="Admin"
            className="flex-1 mb-0"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Propriétaire Info */}
            <PremiumCard delay={0}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Propriétaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nom</p>
                    <p className="font-medium">{proprietaireProfile?.prenom || ''} {proprietaireProfile?.nom || ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{proprietaireProfile?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{projet.proprietaire?.telephone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="font-medium">{projet.proprietaire?.adresse || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            {/* Project Details */}
            <PremiumCard delay={100}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Détails du projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{typeLabels[projet.type_projet] || projet.type_projet}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="font-medium">{projet.adresse || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commune</p>
                    <p className="font-medium">{projet.commune || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Parcelle</p>
                    <p className="font-medium">{projet.parcelle_numero || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Zone</p>
                    <p className="font-medium">{projet.zone_affectation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Surface terrain</p>
                    <p className="font-medium">{projet.surface_terrain ? `${projet.surface_terrain} m²` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">COS</p>
                    <p className="font-medium">{projet.cos?.toString() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IBUS</p>
                    <p className="font-medium">{projet.ibus?.toString() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bâtiment existant</p>
                    <p className="font-medium">{projet.batiment_existant ? 'Oui' : 'Non'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre unités</p>
                    <p className="font-medium">{projet.nombre_unites?.toString() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Délai souhaité</p>
                    <p className="font-medium">{projet.delai_realisation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date soumission</p>
                    <p className="font-medium">{format(new Date(projet.created_at), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                </div>
                {projet.objectifs && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Objectifs</Label>
                    <p className="text-sm mt-1">{projet.objectifs}</p>
                  </div>
                )}
              </CardContent>
            </PremiumCard>

            {/* Timeline */}
            <PremiumCard delay={200}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Avancement du projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PremiumProjetTimeline currentStatut={statut} />
              </CardContent>
            </PremiumCard>

            {/* Comments */}
            <PremiumCard delay={300}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Commentaires ({commentaires.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add comment */}
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <Textarea
                    placeholder="Ajouter un commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="internal"
                        checked={isInternalComment}
                        onCheckedChange={setIsInternalComment}
                      />
                      <Label htmlFor="internal" className="text-sm">
                        Commentaire interne (non visible par le propriétaire)
                      </Label>
                    </div>
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Comments list */}
                {commentaires.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucun commentaire</p>
                ) : (
                  <div className="space-y-3">
                    {commentaires.map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`p-3 rounded-lg ${comment.est_interne ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-muted/30'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {comment.auteur?.prenom} {comment.auteur?.nom}
                              </span>
                              {comment.est_interne && (
                                <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-600 border-orange-500/30">
                                  Interne
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm mt-2">{comment.contenu}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </PremiumCard>
          </div>

          {/* Right Column - Admin Actions */}
          <div className="space-y-6">
            {/* Status & Assignment */}
            <PremiumCard delay={50}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Gestion
                </CardTitle>
                <CardDescription>Statut et assignation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={statut} onValueChange={setStatut}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statutOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Agent responsable</Label>
                  <Select value={agentId || 'none'} onValueChange={(v) => setAgentId(v === 'none' ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Non assigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.profiles?.prenom} {agent.profiles?.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Architecte</Label>
                  <Select value={architecteId || 'none'} onValueChange={(v) => setArchitecteId(v === 'none' ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Non assigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.profiles?.prenom} {agent.profiles?.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </PremiumCard>

            {/* Budget */}
            <PremiumCard delay={150}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Budget minimum (CHF)</Label>
                  <Input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget maximum (CHF)</Label>
                  <Input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget prévisionnel (CHF)</Label>
                  <Input
                    type="number"
                    value={budgetPrevisionnel}
                    onChange={(e) => setBudgetPrevisionnel(e.target.value)}
                    placeholder="Estimation"
                  />
                </div>
              </CardContent>
            </PremiumCard>

            {/* Internal Notes */}
            <PremiumCard delay={250}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Notes internes
                </CardTitle>
                <CardDescription>Visible uniquement par l'équipe</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notesInternes}
                  onChange={(e) => setNotesInternes(e.target.value)}
                  placeholder="Notes internes sur ce projet..."
                  rows={5}
                />
              </CardContent>
            </PremiumCard>

            {/* Documents */}
            <PremiumCard delay={350}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun document
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{doc.nom_fichier}</span>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {doc.visibilite === 'prive' ? 'Privé' : 'Partagé'}
                        </Badge>
                      </div>
                    ))}
                    {documents.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{documents.length - 5} autres documents
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </PremiumCard>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
