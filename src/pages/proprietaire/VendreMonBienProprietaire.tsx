import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Building2, Eye, Calendar, HandCoins, MessageSquare, ArrowRight, Plus, Phone, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { VenteWorkflowTimeline } from '@/components/proprietaire/VenteWorkflowTimeline';
import { AddImmeubleDialog } from '@/components/proprietaire/AddImmeubleDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function VendreMonBienProprietaire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [proprietaire, setProprietaire] = useState<any>(null);
  const [biensEnVente, setBiensEnVente] = useState<any[]>([]);
  const [agent, setAgent] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get proprietaire
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!proprio) {
        setLoading(false);
        return;
      }

      setProprietaire(proprio);

      // Load agent
      if (proprio.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select(`
            *,
            profile:profiles!agents_user_id_fkey(
              prenom, nom, email, telephone
            )
          `)
          .eq('id', proprio.agent_id)
          .maybeSingle();

        if (agentData?.profile) {
          setAgent({
            ...agentData,
            ...agentData.profile
          });
        }
      }

      // Load biens en vente ou les deux
      const { data: biens, error } = await supabase
        .from('immeubles')
        .select('*')
        .eq('proprietaire_id', proprio.id)
        .in('mode_exploitation', ['vente', 'les_deux'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBiensEnVente(biens || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'dossier_en_cours': { label: 'Dossier en cours', variant: 'outline' },
      'estimation': { label: 'Estimation', variant: 'secondary' },
      'publication': { label: 'En ligne', variant: 'default' },
      'en_negociation': { label: 'Négociation', variant: 'default' },
      'offre_acceptee': { label: 'Offre acceptée', variant: 'default' },
      'chez_notaire': { label: 'Chez notaire', variant: 'default' },
      'vendu': { label: 'Vendu', variant: 'default' },
    };
    const config = statusConfig[statut] || { label: statut, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Vendre mon bien"
        subtitle="Suivez l'avancement de la vente de votre propriété"
        icon={Tag}
      />

      {biensEnVente.length === 0 ? (
        <div className="max-w-2xl mx-auto mt-8">
          <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Tag className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Vous souhaitez vendre votre bien ?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Commencez par ajouter votre propriété et notre équipe vous accompagnera tout au long du processus de vente.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8 text-left max-w-lg mx-auto">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Estimation gratuite</p>
                    <p className="text-xs text-muted-foreground">Par un expert local</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">0% commission</p>
                    <p className="text-xs text-muted-foreground">L'acheteur paie</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Suivi complet</p>
                    <p className="text-xs text-muted-foreground">Jusqu'à la vente</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter mon bien
                </Button>
                {agent && (
                  <Button variant="outline" size="lg" onClick={() => navigate('/proprietaire/messagerie')}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contacter mon agent
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Card */}
          {agent && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Votre conseiller dédié
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {agent.prenom?.[0]}{agent.nom?.[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{agent.prenom} {agent.nom}</p>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                    {agent.telephone && (
                      <p className="text-sm text-muted-foreground">{agent.telephone}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/proprietaire/messagerie')}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {biensEnVente.map((bien) => (
            <Card key={bien.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {bien.nom || bien.adresse}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {bien.ville} {bien.code_postal}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(bien.statut_vente || 'dossier_en_cours')}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/proprietaire/immeubles/${bien.id}`)}
                    >
                      Voir détails
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Timeline */}
                <VenteWorkflowTimeline
                  currentStep={bien.statut_vente || 'dossier'}
                  dossierComplet={bien.dossier_complet}
                  estimationValidee={bien.estimation_validee}
                  estPublie={bien.est_publie}
                  nbVisites={bien.nb_visites || 0}
                  nbOffres={bien.nb_offres || 0}
                  offreAcceptee={bien.offre_acceptee}
                  notairePlanifie={bien.notaire_planifie}
                  signatureEffectuee={bien.signature_effectuee}
                  entreeFaite={bien.entree_faite}
                />

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Prix demandé</span>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {bien.prix_commercial ? formatCurrency(bien.prix_commercial) : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs">Visites</span>
                    </div>
                    <p className="text-lg font-bold">{bien.nb_visites || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <HandCoins className="w-4 h-4" />
                      <span className="text-xs">Offres</span>
                    </div>
                    <p className="text-lg font-bold">{bien.nb_offres || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">En vente depuis</span>
                    </div>
                    <p className="text-lg font-bold">
                      {bien.date_mise_en_vente 
                        ? Math.ceil((Date.now() - new Date(bien.date_mise_en_vente).getTime()) / (1000 * 60 * 60 * 24)) + 'j'
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog pour ajouter un bien */}
      {proprietaire && (
        <AddImmeubleDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          proprietaireId={proprietaire.id}
          onSuccess={() => {
            setShowAddDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
