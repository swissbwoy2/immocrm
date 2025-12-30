import { useState, useEffect } from 'react';
import { Home, Search, Eye, FileText, Loader2, Building2, MapPin, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumTable, PremiumTableHeader, PremiumTableRow, TableBody, TableCell, TableHead, TableRow } from '@/components/premium';
import { useNavigate } from 'react-router-dom';

interface Immeuble {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  canton: string;
  type_bien: string;
  surface_totale: number;
  nombre_pieces: number;
  prix_vente_demande: number;
  statut_vente: string;
  publier_espace_acheteur: boolean;
  mode_exploitation: string;
  proprietaire_id: string;
  photo_principale?: string;
}

export default function AdminBiensEnVente() {
  const navigate = useNavigate();
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('immeubles')
        .select('id, nom, adresse, ville, canton, type_bien, surface_totale, nombre_pieces, prix_vente_demande, statut_vente, publier_espace_acheteur, mode_exploitation, proprietaire_id')
        .in('mode_exploitation', ['vente', 'les_deux'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImmeubles((data as Immeuble[]) || []);
    } catch (error) {
      console.error('Error loading biens:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      brouillon: { label: 'Brouillon', variant: 'outline' },
      publie: { label: 'Publié', variant: 'default' },
      sous_offre: { label: 'Sous offre', variant: 'destructive' },
      vendu: { label: 'Vendu', variant: 'default' }
    };
    return labels[statut] || { label: statut, variant: 'outline' as const };
  };

  const formatPrice = (price: number | null) => price ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(price) : '-';

  const filteredImmeubles = immeubles.filter(i => {
    const matchesSearch = searchTerm === '' || i.nom.toLowerCase().includes(searchTerm.toLowerCase()) || i.ville?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = statutFilter === 'all' || i.statut_vente === statutFilter;
    return matchesSearch && matchesStatut;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Biens en vente</h1><p className="text-muted-foreground">Gérez tous les biens immobiliers en vente</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="publie">Publié</SelectItem>
            <SelectItem value="sous_offre">Sous offre</SelectItem>
            <SelectItem value="vendu">Vendu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{immeubles.length}</p></div>
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Publiés</p><p className="text-2xl font-bold text-primary">{immeubles.filter(i => i.publier_espace_acheteur).length}</p></div>
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Sous offre</p><p className="text-2xl font-bold text-orange-500">{immeubles.filter(i => i.statut_vente === 'sous_offre').length}</p></div>
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Vendus</p><p className="text-2xl font-bold text-green-500">{immeubles.filter(i => i.statut_vente === 'vendu').length}</p></div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {!loading && filteredImmeubles.length === 0 && (
        <div className="text-center py-12"><Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold">Aucun bien en vente</h3></div>
      )}

      {!loading && filteredImmeubles.length > 0 && (
        <PremiumTable>
          <PremiumTableHeader><TableRow><TableHead>Bien</TableHead><TableHead>Localisation</TableHead><TableHead>Prix</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></PremiumTableHeader>
          <TableBody>
            {filteredImmeubles.map((immeuble) => {
              const statut = getStatutLabel(immeuble.statut_vente);
              return (
                <PremiumTableRow key={immeuble.id}>
                  <TableCell><p className="font-medium">{immeuble.nom}</p><p className="text-sm text-muted-foreground capitalize">{immeuble.type_bien} • {immeuble.surface_totale} m²</p></TableCell>
                  <TableCell><div className="flex items-center gap-1.5 text-sm"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{immeuble.ville}, {immeuble.canton}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-primary" />{formatPrice(immeuble.prix_vente_demande)}</div></TableCell>
                  <TableCell><Badge variant={statut.variant}>{statut.label}</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => navigate(`/proprietaire/immeubles/${immeuble.id}`)}><Eye className="h-4 w-4" /></Button></div></TableCell>
                </PremiumTableRow>
              );
            })}
          </TableBody>
        </PremiumTable>
      )}
    </div>
  );
}
