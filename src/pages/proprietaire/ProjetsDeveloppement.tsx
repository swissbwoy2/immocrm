import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Filter, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { 
  PremiumPageHeader, 
  PremiumKPICard, 
  PremiumEmptyState 
} from '@/components/premium';
import { PremiumProjetCard } from '@/components/premium/PremiumProjetCard';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { CreateProjetDeveloppementDialog } from '@/components/proprietaire/CreateProjetDeveloppementDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function ProjetsDeveloppement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projets, setProjets] = useState<any[]>([]);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get proprietaire
      const { data: proprioData, error: proprioError } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (proprioError) throw proprioError;
      if (!proprioData) {
        setLoading(false);
        return;
      }

      setProprietaireId(proprioData.id);

      // Load projects
      const { data: projetsData, error: projetsError } = await supabase
        .from('projets_developpement')
        .select('*')
        .eq('proprietaire_id', proprioData.id)
        .order('created_at', { ascending: false });

      if (projetsError) throw projetsError;
      setProjets(projetsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjets = filterStatut === 'all'
    ? projets
    : projets.filter(p => p.statut === filterStatut);

  const stats = {
    total: projets.length,
    enCours: projets.filter(p => !['projet_valide', 'projet_refuse', 'termine'].includes(p.statut)).length,
    valides: projets.filter(p => p.statut === 'projet_valide').length,
    avecBudget: projets.filter(p => p.budget_previsionnel).length
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

  return (
    <PullToRefresh onRefresh={loadData} className="flex-1 overflow-y-auto relative">
      <FloatingParticles count={10} className="fixed inset-0 pointer-events-none z-0 opacity-20" />

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        {/* Header */}
        <PremiumPageHeader
          title="Projets de développement"
          subtitle="Gérez vos projets de construction, rénovation ou vente"
          icon={Hammer}
          action={
            proprietaireId && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau projet
              </Button>
            )
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <PremiumKPICard
            title="Total projets"
            value={stats.total}
            icon={Building2}
            delay={0}
          />
          <PremiumKPICard
            title="En cours"
            value={stats.enCours}
            icon={Hammer}
            variant="warning"
            delay={50}
          />
          <PremiumKPICard
            title="Validés"
            value={stats.valides}
            icon={Building2}
            variant="success"
            delay={100}
          />
          <PremiumKPICard
            title="Avec budget"
            value={stats.avecBudget}
            icon={Building2}
            delay={150}
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="demande_recue">Demande reçue</SelectItem>
              <SelectItem value="analyse_en_cours">Analyse en cours</SelectItem>
              <SelectItem value="etude_faisabilite_rendue">Étude rendue</SelectItem>
              <SelectItem value="planification_permis">Planification permis</SelectItem>
              <SelectItem value="devis_transmis">Devis transmis</SelectItem>
              <SelectItem value="permis_en_preparation">Permis en préparation</SelectItem>
              <SelectItem value="permis_depose">Permis déposé</SelectItem>
              <SelectItem value="attente_reponse_cantonale">Attente réponse</SelectItem>
              <SelectItem value="projet_valide">Projet validé</SelectItem>
              <SelectItem value="projet_refuse">Projet refusé</SelectItem>
              <SelectItem value="termine">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects list */}
        {filteredProjets.length === 0 ? (
          <PremiumEmptyState
            icon={Hammer}
            title={projets.length === 0 ? "Aucun projet" : "Aucun résultat"}
            description={
              projets.length === 0
                ? "Vous n'avez pas encore de projet de développement."
                : "Aucun projet ne correspond à ce filtre."
            }
            action={
              projets.length === 0 && proprietaireId && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer mon premier projet
                </Button>
              )
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjets.map((projet, index) => (
              <PremiumProjetCard
                key={projet.id}
                projet={projet}
                onView={() => navigate(`/proprietaire/projets-developpement/${projet.id}`)}
                delay={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {proprietaireId && (
        <CreateProjetDeveloppementDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          proprietaireId={proprietaireId}
          onSuccess={loadData}
        />
      )}
    </PullToRefresh>
  );
}
