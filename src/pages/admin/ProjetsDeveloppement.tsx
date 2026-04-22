import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Filter, Hammer, Users, DollarSign, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  PremiumEmptyState,
  PremiumTable,
  PremiumTableHeader,
  PremiumTableRow,
  PremiumTableSkeleton
} from '@/components/premium';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statutLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  demande_recue: { label: 'Demande reçue', variant: 'secondary' },
  analyse_en_cours: { label: 'Analyse en cours', variant: 'default' },
  etude_faisabilite_rendue: { label: 'Étude rendue', variant: 'default' },
  planification_permis: { label: 'Planification permis', variant: 'default' },
  devis_transmis: { label: 'Devis transmis', variant: 'default' },
  permis_en_preparation: { label: 'Permis en préparation', variant: 'default' },
  permis_depose: { label: 'Permis déposé', variant: 'default' },
  attente_reponse_cantonale: { label: 'Attente réponse', variant: 'secondary' },
  projet_valide: { label: 'Validé', variant: 'default' },
  projet_refuse: { label: 'Refusé', variant: 'destructive' },
  termine: { label: 'Terminé', variant: 'outline' }
};

const typeLabels: Record<string, string> = {
  construction_neuve: 'Construction neuve',
  renovation: 'Rénovation',
  extension: 'Extension',
  division_parcelle: 'Division parcelle',
  changement_affectation: 'Changement affectation',
  demolition_reconstruction: 'Démolition/Reconstruction',
  mise_en_vente: 'Mise en vente'
};

export default function AdminProjetsDeveloppement() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projets, setProjets] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      // Load projects with proprietaire info
      const { data: projetsData, error: projetsError } = await supabase
        .from('projets_developpement')
        .select(`
          *,
          proprietaire:proprietaires(
            id,
            user_id,
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
        .order('created_at', { ascending: false });

      if (projetsError) throw projetsError;
      setProjets(projetsData || []);

      // Load agents for filter
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          user_id,
          profiles:user_id(nom, prenom)
        `);

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjets = projets.filter(p => {
    const matchStatut = filterStatut === 'all' || p.statut === filterStatut;
    const matchType = filterType === 'all' || p.type_projet === filterType;
    const matchAgent = filterAgent === 'all' || p.agent_id === filterAgent || p.architecte_id === filterAgent;
    
    const proprietaireProfile = p.proprietaire?.profiles;
    const proprietaireName = proprietaireProfile 
      ? `${proprietaireProfile.prenom || ''} ${proprietaireProfile.nom || ''}`.toLowerCase()
      : '';
    const matchSearch = searchTerm === '' || 
      proprietaireName.includes(searchTerm.toLowerCase()) ||
      (p.adresse || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.commune || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchStatut && matchType && matchAgent && matchSearch;
  });

  const stats = {
    total: projets.length,
    enCours: projets.filter(p => !['projet_valide', 'projet_refuse', 'termine'].includes(p.statut)).length,
    nonAssignes: projets.filter(p => !p.agent_id).length,
    budgetTotal: projets.reduce((sum, p) => sum + (p.budget_previsionnel || 0), 0)
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="relative p-4 md:p-8 space-y-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
        <PremiumPageHeader
          title="Projets de développement"
          subtitle="Gestion administrative des projets"
          icon={Hammer}
        />
        <PremiumTable>
          <PremiumTableSkeleton rows={8} columns={6} />
        </PremiumTable>
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
          subtitle="Gestion administrative des projets fonciers et immobiliers"
          icon={Hammer}
          badge="Admin"
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
            title="Non assignés"
            value={stats.nonAssignes}
            icon={Users}
            variant={stats.nonAssignes > 0 ? 'danger' : 'success'}
            delay={100}
          />
          <PremiumKPICard
            title="Budget total"
            value={formatCurrency(stats.budgetTotal)}
            icon={DollarSign}
            delay={150}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher propriétaire, adresse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(statutLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(typeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.profiles?.prenom} {agent.profiles?.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredProjets.length === 0 ? (
          <PremiumEmptyState
            icon={Hammer}
            title={projets.length === 0 ? "Aucun projet" : "Aucun résultat"}
            description={
              projets.length === 0
                ? "Aucun projet de développement n'a été soumis."
                : "Aucun projet ne correspond aux filtres sélectionnés."
            }
          />
        ) : (
          <PremiumTable className="animate-fade-in">
            <PremiumTableHeader>
              <TableRow>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </PremiumTableHeader>
            <TableBody>
              {filteredProjets.map((projet) => {
                const proprietaireProfile = projet.proprietaire?.profiles;
                const agentProfile = projet.agent?.profiles;
                const statutInfo = statutLabels[projet.statut] || { label: projet.statut, variant: 'outline' as const };

                return (
                  <PremiumTableRow
                    key={projet.id}
                    onClick={() => navigate(`/admin/projets-developpement/${projet.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {proprietaireProfile?.prenom} {proprietaireProfile?.nom}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {proprietaireProfile?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[projet.type_projet] || projet.type_projet}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {projet.adresse || '-'}
                        {projet.commune && (
                          <div className="text-xs text-muted-foreground">{projet.commune}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statutInfo.variant}>
                        {statutInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agentProfile ? (
                        <span className="text-sm">
                          {agentProfile.prenom} {agentProfile.nom}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {projet.budget_previsionnel ? (
                        <span className="font-medium">{formatCurrency(projet.budget_previsionnel)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(projet.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/projets-developpement/${projet.id}`);
                        }}
                      >
                        Voir
                      </Button>
                    </TableCell>
                  </PremiumTableRow>
                );
              })}
            </TableBody>
          </PremiumTable>
        )}
      </div>
    </PullToRefresh>
  );
}
