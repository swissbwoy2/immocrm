import { useState, useEffect } from 'react';
import { Search, Eye, Loader2, Building2, MapPin, Banknote, CheckCircle, Clock, Plus, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumTable, PremiumTableHeader, PremiumTableRow, TableBody, TableCell, TableHead, TableRow, PremiumKPICard, PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { useNavigate } from 'react-router-dom';
import { AddBienVenteDialog } from '@/components/AddBienVenteDialog';

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
  agent_responsable_id?: string;
  agent?: {
    id: string;
    profiles: {
      prenom: string;
      nom: string;
    };
  };
}

export default function AdminBiensEnVente() {
  const navigate = useNavigate();
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [piecesFilter, setPiecesFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('immeubles')
        .select(`
          id, nom, adresse, ville, canton, type_bien, surface_totale, nombre_pieces, 
          prix_vente_demande, statut_vente, publier_espace_acheteur, mode_exploitation, 
          proprietaire_id, agent_responsable_id,
          agent:agent_responsable_id(id, profiles:user_id(prenom, nom))
        `)
        .in('mode_exploitation', ['vente', 'les_deux'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImmeubles((data as unknown as Immeuble[]) || []);
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
    const matchesPieces = piecesFilter === 'all' ? true : piecesFilter === '5+' ? i.nombre_pieces >= 5 : i.nombre_pieces === Number(piecesFilter);
    return matchesSearch && matchesStatut && matchesPieces;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PremiumPageHeader
        icon={Building2}
        title="Biens en vente"
        subtitle="Gérez tous les biens immobiliers en vente"
        badge="Commercialisation"
        action={
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau bien
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
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
        <Select value={piecesFilter} onValueChange={setPiecesFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pièces" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les pièces</SelectItem>
            <SelectItem value="1">1 pièce</SelectItem>
            <SelectItem value="1.5">1.5 pièces</SelectItem>
            <SelectItem value="2">2 pièces</SelectItem>
            <SelectItem value="2.5">2.5 pièces</SelectItem>
            <SelectItem value="3">3 pièces</SelectItem>
            <SelectItem value="3.5">3.5 pièces</SelectItem>
            <SelectItem value="4">4 pièces</SelectItem>
            <SelectItem value="4.5">4.5 pièces</SelectItem>
            <SelectItem value="5">5 pièces</SelectItem>
            <SelectItem value="5+">5+ pièces</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumKPICard
          title="Total biens"
          value={immeubles.length}
          icon={Building2}
          delay={0}
        />
        <PremiumKPICard
          title="Publiés"
          value={immeubles.filter(i => i.publier_espace_acheteur).length}
          icon={Eye}
          variant="success"
          delay={50}
        />
        <PremiumKPICard
          title="Sous offre"
          value={immeubles.filter(i => i.statut_vente === 'sous_offre').length}
          icon={Clock}
          variant="warning"
          delay={100}
        />
        <PremiumKPICard
          title="Vendus"
          value={immeubles.filter(i => i.statut_vente === 'vendu').length}
          icon={CheckCircle}
          variant="success"
          delay={150}
        />
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {!loading && filteredImmeubles.length === 0 && (
        <PremiumEmptyState
          icon={Building2}
          title="Aucun bien en vente"
          description="Les biens immobiliers en vente apparaîtront ici"
          action={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un bien
            </Button>
          }
        />
      )}

      {!loading && filteredImmeubles.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <PremiumTable>
            <PremiumTableHeader>
              <TableRow>
                <TableHead>Bien</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </PremiumTableHeader>
            <TableBody>
              {filteredImmeubles.map((immeuble) => {
                const statut = getStatutLabel(immeuble.statut_vente);
                return (
                  <PremiumTableRow key={immeuble.id}>
                    <TableCell>
                      <p className="font-medium">{immeuble.nom}</p>
                      <p className="text-sm text-muted-foreground capitalize">{immeuble.type_bien} • {immeuble.surface_totale} m²</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {immeuble.ville}, {immeuble.canton}
                      </div>
                    </TableCell>
                    <TableCell>
                      {immeuble.agent ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <UserCircle className="h-3.5 w-3.5 text-primary" />
                          {immeuble.agent.profiles?.prenom} {immeuble.agent.profiles?.nom}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-primary" />
                        {formatPrice(immeuble.prix_vente_demande)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={statut.variant}>{statut.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/biens-vente/${immeuble.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </PremiumTableRow>
                );
              })}
            </TableBody>
          </PremiumTable>
        </div>
      )}

      <AddBienVenteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => { loadData(); setShowAddDialog(false); }}
        isAdmin={true}
      />
    </div>
  );
}
