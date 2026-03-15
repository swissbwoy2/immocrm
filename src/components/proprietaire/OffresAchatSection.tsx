import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumEmptyState } from '@/components/premium';
import { PremiumOffreAchatCard } from '@/components/premium/PremiumOffreAchatCard';
import { Handshake, Filter, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OffreAchatData {
  id: string;
  immeuble_id: string;
  acheteur_nom: string | null;
  montant_offre: number;
  date_offre: string;
  date_validite: string | null;
  statut: string;
  conditions: string | null;
  notes?: string | null;
  created_at: string;
  client?: {
    user_id: string;
    profile?: {
      nom: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
    };
  } | null;
}

interface OffresAchatSectionProps {
  immeubleId: string;
  prixDemande?: number | null;
  prixVendeur?: number | null;
  prixCommercial?: number | null;
  isAgent?: boolean;
}

const STATUT_CONFIG = {
  nouvelle: { label: 'Nouvelle', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  en_negociation: { label: 'En négociation', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  contre_offre: { label: 'Contre-offre', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  acceptee: { label: 'Acceptée', color: 'bg-green-500/10 text-green-600 border-green-200' },
  refusee: { label: 'Refusée', color: 'bg-red-500/10 text-red-600 border-red-200' },
  expiree: { label: 'Expirée', color: 'bg-gray-500/10 text-gray-600 border-gray-200' },
};

export function OffresAchatSection({ 
  immeubleId, 
  prixDemande, 
  prixVendeur, 
  prixCommercial,
  isAgent = false 
}: OffresAchatSectionProps) {
  const [offres, setOffres] = useState<OffreAchatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadOffres();
  }, [immeubleId]);

  const loadOffres = async () => {
    try {
      const { data, error } = await supabase
        .from('offres_achat')
        .select(`
          *,
          client:clients(
            user_id,
            profile:profiles(nom, prenom, email, telephone)
          )
        `)
        .eq('immeuble_id', immeubleId)
        .order('created_at', { ascending: false })
        .limit(15000);

      if (error) throw error;
      setOffres(data || []);
    } catch (error) {
      console.error('Error loading offres:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatut = async (offreId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('offres_achat')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;
      toast.success('Statut mis à jour');
      loadOffres();
    } catch (error) {
      console.error('Error updating offre status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredOffres = offres.filter(offre => {
    if (filter === 'all') return true;
    return offre.statut === filter;
  });

  const stats = {
    total: offres.length,
    nouvelles: offres.filter(o => o.statut === 'nouvelle').length,
    enNegociation: offres.filter(o => o.statut === 'en_negociation').length,
    offreMax: offres.length > 0 ? Math.max(...offres.map(o => o.montant_offre)) : 0,
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
            <p className="text-sm text-muted-foreground">Total offres</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Nouvelles</p>
            <p className="text-2xl font-bold text-blue-600">{stats.nouvelles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">En négociation</p>
            <p className="text-2xl font-bold text-amber-600">{stats.enNegociation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Offre max</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(stats.offreMax)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les offres</SelectItem>
            {Object.entries(STATUT_CONFIG).map(([key, value]) => (
              <SelectItem key={key} value={key}>{value.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des offres */}
      {filteredOffres.length === 0 ? (
        <PremiumEmptyState
          icon={Handshake}
          title="Aucune offre reçue"
          description={filter === 'all' 
            ? "Les offres d'achat apparaîtront ici dès qu'un acheteur sera intéressé."
            : "Aucune offre avec ce statut."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredOffres.map((offre) => (
            <PremiumOffreAchatCard
              key={offre.id}
              offre={offre}
              prixDemande={prixDemande}
              prixVendeur={prixVendeur}
              prixCommercial={prixCommercial}
              onUpdateStatut={handleUpdateStatut}
              isAgent={isAgent}
              isProprietaire={!isAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
