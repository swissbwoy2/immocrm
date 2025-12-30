import { useState, useEffect } from 'react';
import { Heart, Search, Loader2, Calendar, MessageSquare, Eye, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumTable, PremiumTableHeader, PremiumTableRow, TableBody, TableCell, TableHead, TableRow } from '@/components/premium';
import { useNavigate } from 'react-router-dom';

interface InteretAcheteur {
  id: string;
  created_at: string;
  type_interet: string;
  statut: string;
  client_id: string;
  immeuble_id: string;
  client_name?: string;
  client_email?: string;
  client_telephone?: string;
  immeuble_nom?: string;
  immeuble_ville?: string;
  immeuble_prix?: number;
}

export default function AdminInteretsAcheteurs() {
  const navigate = useNavigate();
  const [interets, setInterets] = useState<InteretAcheteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('interets_acheteur')
        .select('id, created_at, type_interet, statut, client_id, immeuble_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterets((data as InteretAcheteur[]) || []);
    } catch (error) {
      console.error('Error loading interets:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (interetId: string, newStatut: string) => {
    try {
      const { error } = await supabase.from('interets_acheteur').update({ statut: newStatut }).eq('id', interetId);
      if (error) throw error;
      setInterets(prev => prev.map(i => i.id === interetId ? { ...i, statut: newStatut } : i));
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating statut:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { interet_general: 'Intérêt', demande_visite: 'Demande visite', demande_info: 'Demande info' };
    return labels[type] || type;
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { nouveau: 'destructive', contacte: 'secondary', visite_planifiee: 'default', traite: 'outline' };
    const labels: Record<string, string> = { nouveau: 'Nouveau', contacte: 'Contacté', visite_planifiee: 'Visite planifiée', traite: 'Traité' };
    return { variant: variants[statut] || 'outline', label: labels[statut] || statut };
  };

  const filteredInterets = interets.filter(i => {
    const matchesStatut = statutFilter === 'all' || i.statut === statutFilter;
    return matchesStatut;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10"><Heart className="h-6 w-6 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Intérêts acheteurs</h1><p className="text-muted-foreground">Gérez les demandes des acheteurs potentiels</p></div>
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
            <SelectItem value="nouveau">Nouveau</SelectItem>
            <SelectItem value="contacte">Contacté</SelectItem>
            <SelectItem value="visite_planifiee">Visite planifiée</SelectItem>
            <SelectItem value="traite">Traité</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{interets.length}</p></div>
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Nouveaux</p><p className="text-2xl font-bold text-destructive">{interets.filter(i => i.statut === 'nouveau').length}</p></div>
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Demandes visites</p><p className="text-2xl font-bold text-primary">{interets.filter(i => i.type_interet === 'demande_visite').length}</p></div>
        <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-border/50"><p className="text-sm text-muted-foreground">Traités</p><p className="text-2xl font-bold text-green-500">{interets.filter(i => i.statut === 'traite').length}</p></div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {!loading && filteredInterets.length === 0 && (
        <div className="text-center py-12"><Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold">Aucun intérêt</h3></div>
      )}

      {!loading && filteredInterets.length > 0 && (
        <PremiumTable>
          <PremiumTableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></PremiumTableHeader>
          <TableBody>
            {filteredInterets.map((interet) => {
              const statutInfo = getStatutBadge(interet.statut);
              return (
                <PremiumTableRow key={interet.id}>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(interet.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                  <TableCell><span className="text-sm">{getTypeLabel(interet.type_interet)}</span></TableCell>
                  <TableCell>
                    <Select value={interet.statut} onValueChange={(value) => updateStatut(interet.id, value)}>
                      <SelectTrigger className="w-36"><Badge variant={statutInfo.variant}>{statutInfo.label}</Badge></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="contacte">Contacté</SelectItem>
                        <SelectItem value="visite_planifiee">Visite planifiée</SelectItem>
                        <SelectItem value="traite">Traité</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></TableCell>
                </PremiumTableRow>
              );
            })}
          </TableBody>
        </PremiumTable>
      )}
    </div>
  );
}
