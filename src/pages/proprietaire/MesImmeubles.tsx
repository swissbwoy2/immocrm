import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Filter, Grid3X3, List } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumImmeubleCard } from '@/components/premium/PremiumImmeubleCard';
import { AddImmeubleDialog } from '@/components/proprietaire/AddImmeubleDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function MesImmeubles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Stats per immeuble
  const [immeublesStats, setImmeublesStats] = useState<Record<string, { lots: number; locataires: number; tickets: number }>>({});

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get proprietaire
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!proprio) {
        setLoading(false);
        return;
      }

      setProprietaireId(proprio.id);

      // Load immeubles
      const { data: immeublesData, error } = await supabase
        .from('immeubles')
        .select('*')
        .eq('proprietaire_id', proprio.id)
        .order('nom', { ascending: true });

      if (error) throw error;

      setImmeubles(immeublesData || []);

      // Load stats for each immeuble
      const statsMap: Record<string, { lots: number; locataires: number; tickets: number }> = {};
      
      for (const immeuble of immeublesData || []) {
        // Count lots
        const { count: lotsCount } = await supabase
          .from('lots')
          .select('*', { count: 'exact', head: true })
          .eq('immeuble_id', immeuble.id);

        // Count active locataires
        const { data: lots } = await supabase
          .from('lots')
          .select('id')
          .eq('immeuble_id', immeuble.id);

        let locatairesCount = 0;
        if (lots) {
          for (const lot of lots) {
            const { count } = await supabase
              .from('locataires_immeuble')
              .select('*', { count: 'exact', head: true })
              .eq('lot_id', lot.id)
              .eq('statut', 'actif');
            locatairesCount += count || 0;
          }
        }

        // Count open tickets
        const { count: ticketsCount } = await supabase
          .from('tickets_techniques')
          .select('*', { count: 'exact', head: true })
          .eq('immeuble_id', immeuble.id)
          .not('statut', 'in', '("clos","annule","resolu")');

        statsMap[immeuble.id] = {
          lots: lotsCount || 0,
          locataires: locatairesCount,
          tickets: ticketsCount || 0
        };
      }

      setImmeublesStats(statsMap);

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

  // Filter immeubles
  const filteredImmeubles = immeubles.filter(immeuble => {
    const matchesSearch = 
      immeuble.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      immeuble.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (immeuble.ville && immeuble.ville.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatut = statutFilter === 'all' || immeuble.statut === statutFilter;
    
    return matchesSearch && matchesStatut;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <PremiumPageHeader
        title="Mes biens"
        subtitle={`${immeubles.length} bien${immeubles.length > 1 ? 's' : ''} dans votre patrimoine`}
        icon={Building2}
        action={
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un bien
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, adresse, ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="gere">Géré</SelectItem>
                <SelectItem value="en_vente">En vente</SelectItem>
                <SelectItem value="en_location">En location</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredImmeubles.length === 0 ? (
        <PremiumEmptyState
          icon={Building2}
          title={searchTerm || statutFilter !== 'all' ? "Aucun résultat" : "Aucun bien enregistré"}
          description={
            searchTerm || statutFilter !== 'all'
              ? "Aucun bien ne correspond à vos critères de recherche."
              : "Vous souhaitez vendre ou louer ? Complétez les informations de votre propriété pour démarrer."
          }
          action={
            !searchTerm && statutFilter === 'all' ? (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter mon bien
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        }>
          {filteredImmeubles.map((immeuble) => (
            <PremiumImmeubleCard
              key={immeuble.id}
              immeuble={immeuble}
              lotsCount={immeublesStats[immeuble.id]?.lots || 0}
              locatairesCount={immeublesStats[immeuble.id]?.locataires || 0}
              ticketsCount={immeublesStats[immeuble.id]?.tickets || 0}
              onView={() => navigate(`/proprietaire/immeubles/${immeuble.id}`)}
              onEdit={() => navigate(`/proprietaire/immeubles/${immeuble.id}/edit`)}
            />
          ))}
        </div>
      )}

      {/* Stats summary */}
      {filteredImmeubles.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total lots:</span>
                <span className="ml-2 font-semibold">
                  {Object.values(immeublesStats).reduce((acc, s) => acc + s.lots, 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total locataires:</span>
                <span className="ml-2 font-semibold">
                  {Object.values(immeublesStats).reduce((acc, s) => acc + s.locataires, 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">État locatif annuel:</span>
                <span className="ml-2 font-semibold text-primary">
                  {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
                    .format(filteredImmeubles.reduce((acc, i) => acc + (i.etat_locatif_annuel || 0), 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog pour ajouter un bien */}
      {proprietaireId && (
        <AddImmeubleDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          proprietaireId={proprietaireId}
          onSuccess={() => {
            setShowAddDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
