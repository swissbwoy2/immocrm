import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumEmptyState } from '@/components/premium';
import { PremiumVisiteVenteCard } from '@/components/premium/PremiumVisiteVenteCard';
import { Users, Filter, Calendar, Eye, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisiteVente {
  id: string;
  acheteur_nom: string | null;
  acheteur_email: string | null;
  acheteur_telephone: string | null;
  date_visite: string;
  statut: string;
  notes_visite: string | null;
  feedback_acheteur: string | null;
  note_interet: number | null;
  interet_acheteur_id: string | null;
}

interface VisitesVenteSectionProps {
  immeubleId: string;
}

export function VisitesVenteSection({ immeubleId }: VisitesVenteSectionProps) {
  const [visites, setVisites] = useState<VisiteVente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadVisites();
  }, [immeubleId]);

  const loadVisites = async () => {
    try {
      const { data, error } = await supabase
        .from('visites_vente')
        .select('*')
        .eq('immeuble_id', immeubleId)
        .order('date_visite', { ascending: false });

      if (error) throw error;
      setVisites(data || []);
    } catch (error) {
      console.error('Error loading visites:', error);
      toast.error('Erreur lors du chargement des visites');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatut = async (visiteId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('visites_vente')
        .update({ statut: newStatut })
        .eq('id', visiteId);

      if (error) throw error;
      toast.success('Statut mis à jour');
      loadVisites();
    } catch (error) {
      console.error('Error updating visite status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredVisites = visites.filter(visite => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return new Date(visite.date_visite) >= new Date() && !['annulee', 'no_show'].includes(visite.statut);
    }
    if (filter === 'past') {
      return new Date(visite.date_visite) < new Date() || visite.statut === 'effectuee';
    }
    return visite.statut === filter;
  });

  const stats = {
    total: visites.length,
    planifiees: visites.filter(v => v.statut === 'planifiee' || v.statut === 'confirmee').length,
    effectuees: visites.filter(v => v.statut === 'effectuee').length,
    interetMoyen: visites.filter(v => v.note_interet).length > 0
      ? (visites.filter(v => v.note_interet).reduce((sum, v) => sum + (v.note_interet || 0), 0) / visites.filter(v => v.note_interet).length).toFixed(1)
      : '-',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total visites</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">À venir</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.planifiees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Effectuées</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.effectuees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Intérêt moyen</p>
            </div>
            <p className="text-2xl font-bold">{stats.interetMoyen}/5</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les visites</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="past">Passées</SelectItem>
            <SelectItem value="effectuee">Effectuées</SelectItem>
            <SelectItem value="annulee">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des visites */}
      {filteredVisites.length === 0 ? (
        <PremiumEmptyState
          icon={Users}
          title="Aucune visite"
          description={filter === 'all' 
            ? "Les visites de votre bien apparaîtront ici."
            : "Aucune visite correspondant à ce filtre."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredVisites.map((visite) => (
            <PremiumVisiteVenteCard
              key={visite.id}
              visite={visite}
              onUpdateStatut={handleUpdateStatut}
            />
          ))}
        </div>
      )}
    </div>
  );
}
