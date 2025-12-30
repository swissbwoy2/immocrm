import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  MapPin, 
  Building2, 
  Calendar,
  User,
  DollarSign,
  FileText,
  MessageSquare,
  Upload,
  Hammer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { 
  PremiumPageHeader, 
  PremiumAgentCard
} from '@/components/premium';
import { PremiumProjetTimeline } from '@/components/premium/PremiumProjetTimeline';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeProjetLabels: Record<string, string> = {
  vente_terrain: 'Vente terrain',
  construction: 'Construction',
  renovation_transformation: 'Rénovation / Transformation',
  demolition_reconstruction: 'Démolition / Reconstruction',
  etude_faisabilite: 'Étude de faisabilité'
};

const serviceLabels: Record<string, string> = {
  etude_faisabilite_gratuite: 'Étude de faisabilité gratuite',
  estimation_budgetaire: 'Estimation budgétaire complète',
  demande_permis: 'Demande de permis de construire',
  dossier_valorisation: 'Dossier complet de valorisation'
};

export default function ProjetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projet, setProjet] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [commentaires, setCommentaires] = useState<any[]>([]);
  const [architecte, setArchitecte] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !user) return;

    try {
      // Load project
      const { data: projetData, error: projetError } = await supabase
        .from('projets_developpement')
        .select('*')
        .eq('id', id)
        .single();

      if (projetError) throw projetError;
      setProjet(projetData);

      // Load documents
      const { data: docsData } = await supabase
        .from('documents_developpement')
        .select('*')
        .eq('projet_id', id)
        .order('created_at', { ascending: false });
      setDocuments(docsData || []);

      // Load comments (non-internal only for proprietaire)
      const { data: commentsData } = await supabase
        .from('commentaires_developpement')
        .select(`
          *,
          auteur:profiles!commentaires_developpement_auteur_id_fkey(prenom, nom, avatar_url)
        `)
        .eq('projet_id', id)
        .eq('est_interne', false)
        .order('created_at', { ascending: true });
      setCommentaires(commentsData || []);

      // Load architecte if assigned
      if (projetData.architecte_id) {
        const { data: archData } = await supabase
          .from('agents')
          .select(`
            *,
            profile:profiles!agents_user_id_fkey(prenom, nom, email, telephone, avatar_url)
          `)
          .eq('id', projetData.architecte_id)
          .maybeSingle();
        
        if (archData?.profile) {
          setArchitecte({
            ...archData,
            prenom: archData.profile.prenom,
            nom: archData.profile.nom,
            email: archData.profile.email,
            telephone: archData.profile.telephone,
            avatar_url: archData.profile.avatar_url
          });
        }
      }

      // Load agent if assigned
      if (projetData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select(`
            *,
            profile:profiles!agents_user_id_fkey(prenom, nom, email, telephone, avatar_url)
          `)
          .eq('id', projetData.agent_id)
          .maybeSingle();
        
        if (agentData?.profile) {
          setAgent({
            ...agentData,
            prenom: agentData.profile.prenom,
            nom: agentData.profile.nom,
            email: agentData.profile.email,
            telephone: agentData.profile.telephone,
            avatar_url: agentData.profile.avatar_url
          });
        }
      }

    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Erreur lors du chargement du projet');
      navigate('/proprietaire/projets-developpement');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !id) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('commentaires_developpement')
        .insert({
          projet_id: id,
          auteur_id: user.id,
          contenu: newComment.trim(),
          est_interne: false
        });

      if (error) throw error;

      setNewComment('');
      loadData();
      toast.success('Commentaire ajouté');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!projet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Projet non trouvé</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData} className="flex-1 overflow-y-auto relative">
      <FloatingParticles count={8} className="fixed inset-0 pointer-events-none z-0 opacity-20" />

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/proprietaire/projets-developpement')}
          className="mb-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour aux projets
        </Button>

        {/* Header */}
        <PremiumPageHeader
          title={typeProjetLabels[projet.type_projet] || projet.type_projet}
          subtitle={projet.commune ? `${projet.adresse || ''} ${projet.commune}` : 'Projet de développement'}
          icon={Hammer}
          badge={projet.statut === 'projet_valide' ? 'Validé' : undefined}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Suivi du projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PremiumProjetTimeline currentStatut={projet.statut} />
              </CardContent>
            </Card>

            {/* Budget if available */}
            {projet.budget_previsionnel && (
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Budget prévisionnel</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(projet.budget_previsionnel)}
                      </p>
                      {(projet.budget_min || projet.budget_max) && (
                        <p className="text-sm text-muted-foreground">
                          Fourchette : {projet.budget_min ? formatCurrency(projet.budget_min) : '?'} - {projet.budget_max ? formatCurrency(projet.budget_max) : '?'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project details */}
            <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Détails du projet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Type</span><p className="font-medium">{typeProjetLabels[projet.type_projet] || '-'}</p></div>
                  <div><span className="text-muted-foreground">Service</span><p className="font-medium">{serviceLabels[projet.service_souhaite] || '-'}</p></div>
                  <div><span className="text-muted-foreground">Commune</span><p className="font-medium">{projet.commune || '-'}</p></div>
                  <div><span className="text-muted-foreground">Parcelle</span><p className="font-medium">{projet.parcelle_numero || '-'}</p></div>
                  <div><span className="text-muted-foreground">Surface</span><p className="font-medium">{projet.surface_terrain ? `${projet.surface_terrain.toLocaleString()} m²` : '-'}</p></div>
                  <div><span className="text-muted-foreground">Bâtiment</span><p className="font-medium">{projet.batiment_existant ? 'Oui' : 'Non'}</p></div>
                  <div><span className="text-muted-foreground">Zone</span><p className="font-medium">{projet.zone_affectation || '-'}</p></div>
                <div><span className="text-muted-foreground">Soumis le</span><p className="font-medium">{projet.date_soumission ? format(new Date(projet.date_soumission), 'dd MMM yyyy', { locale: fr }) : '-'}</p></div>
                </div>

                {projet.objectifs && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Objectifs / Intentions</p>
                      <p className="text-sm whitespace-pre-wrap">{projet.objectifs}</p>
                    </div>
                  </>
                )}

                {/* Indices */}
                {(projet.cos || projet.ibus || projet.isus || projet.ocus) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Indices réglementaires</p>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">COS</p>
                          <p className="font-semibold">{projet.cos || '-'}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">IBUS</p>
                          <p className="font-semibold">{projet.ibus || '-'}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">ISUS</p>
                          <p className="font-semibold">{projet.isus || '-'}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">OCUS</p>
                          <p className="font-semibold">{projet.ocus || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documents
                  {documents.length > 0 && (
                    <Badge variant="secondary">{documents.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucun document pour le moment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fichier_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.nom_fichier}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Échanges
                  {commentaires.length > 0 && (
                    <Badge variant="secondary">{commentaires.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {commentaires.length > 0 && (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {commentaires.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {comment.auteur?.avatar_url ? (
                            <img
                              src={comment.auteur.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {comment.auteur?.prenom} {comment.auteur?.nom}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), 'dd MMM à HH:mm', { locale: fr })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.contenu}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    rows={3}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    size="sm"
                  >
                    Envoyer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned team */}
            {(architecte || agent) && (
              <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                {architecte && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Architecte
                    </h3>
                    <PremiumAgentCard
                      agent={architecte}
                      onMessage={() => navigate('/proprietaire/messagerie')}
                    />
                  </div>
                )}
                {agent && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Agent
                    </h3>
                    <PremiumAgentCard
                      agent={agent}
                      onMessage={() => navigate('/proprietaire/messagerie')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Quick info */}
            <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>{format(new Date(projet.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
                {projet.nombre_unites && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unités prévues</span>
                    <span>{projet.nombre_unites}</span>
                  </div>
                )}
                {projet.delai_realisation && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Délai souhaité</span>
                    <span>{projet.delai_realisation}</span>
                  </div>
                )}
                {projet.servitudes_connues && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Servitudes</p>
                    <p className="text-xs">{projet.servitudes_details || 'Oui (détails non précisés)'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
