import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumLocataireImmeuble } from '@/components/premium/PremiumLocataireImmeuble';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LocataireWithLot {
  id: string;
  civilite?: string;
  prenom?: string;
  nom: string;
  email?: string;
  telephone?: string;
  date_entree?: string;
  loyer?: number;
  charges?: number;
  total_mensuel?: number;
  solde_locataire?: number;
  statut?: string;
  lot_reference?: string;
  immeuble_nom?: string;
  immeuble_id?: string;
}

export default function Locataires() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [locataires, setLocataires] = useState<LocataireWithLot[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [immeubleFilter, setImmeubleFilter] = useState<string>('all');

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

      // Load immeubles
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id);

      setImmeubles(immeublesData || []);

      // Load all locataires with their lot and immeuble info
      const allLocataires: LocataireWithLot[] = [];

      for (const immeuble of immeublesData || []) {
        const { data: lots } = await supabase
          .from('lots')
          .select('id, reference, immeuble_id')
          .eq('immeuble_id', immeuble.id);

        for (const lot of lots || []) {
          const { data: locsData } = await supabase
            .from('locataires_immeuble')
            .select('*')
            .eq('lot_id', lot.id);

          for (const loc of locsData || []) {
            allLocataires.push({
              ...loc,
              lot_reference: lot.reference,
              immeuble_nom: immeuble.nom,
              immeuble_id: immeuble.id
            });
          }
        }
      }

      // Sort by name
      allLocataires.sort((a, b) => a.nom.localeCompare(b.nom));
      setLocataires(allLocataires);

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

  // Filter locataires
  const filteredLocataires = locataires.filter(loc => {
    const fullName = `${loc.prenom || ''} ${loc.nom}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      (loc.email && loc.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (loc.telephone && loc.telephone.includes(searchTerm));
    
    const matchesStatut = statutFilter === 'all' || loc.statut === statutFilter;
    const matchesImmeuble = immeubleFilter === 'all' || loc.immeuble_id === immeubleFilter;
    
    return matchesSearch && matchesStatut && matchesImmeuble;
  });

  // Stats
  const statsActive = locataires.filter(l => l.statut === 'actif').length;
  const statsPreavis = locataires.filter(l => l.statut === 'preavis').length;
  const totalSolde = locataires.reduce((acc, l) => acc + (l.solde_locataire || 0), 0);

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
        title="Locataires"
        subtitle={`${locataires.length} locataire${locataires.length > 1 ? 's' : ''} dans vos immeubles`}
        icon={Users}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{statsActive}</div>
            <div className="text-xs text-muted-foreground">Actifs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{statsPreavis}</div>
            <div className="text-xs text-muted-foreground">En préavis</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
                .format(locataires.reduce((acc, l) => acc + (l.total_mensuel || 0), 0))}
            </div>
            <div className="text-xs text-muted-foreground">Loyers mensuels</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${totalSolde > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
                .format(Math.abs(totalSolde))}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalSolde > 0 ? 'Impayés' : 'Solde OK'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="preavis">En préavis</SelectItem>
                <SelectItem value="sorti">Sorti</SelectItem>
                <SelectItem value="litige">Litige</SelectItem>
              </SelectContent>
            </Select>

            <Select value={immeubleFilter} onValueChange={setImmeubleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Immeuble" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les immeubles</SelectItem>
                {immeubles.filter(imm => imm.id).map(imm => (
                  <SelectItem key={imm.id} value={imm.id}>{imm.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredLocataires.length === 0 ? (
        <PremiumEmptyState
          icon={Users}
          title={searchTerm || statutFilter !== 'all' || immeubleFilter !== 'all' ? "Aucun résultat" : "Aucun locataire"}
          description={
            searchTerm || statutFilter !== 'all' || immeubleFilter !== 'all'
              ? "Aucun locataire ne correspond à vos critères."
              : "Vos immeubles n'ont pas encore de locataires enregistrés."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredLocataires.map((loc) => (
            <PremiumLocataireImmeuble
              key={loc.id}
              locataire={loc}
              lotReference={`${loc.immeuble_nom} - ${loc.lot_reference || 'N/A'}`}
              onClick={() => navigate(`/proprietaire/locataires/${loc.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
