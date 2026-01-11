import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Eye, 
  Heart, 
  MoreHorizontal, 
  Pencil, 
  Copy, 
  Trash2,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  publie: 'bg-green-500/20 text-green-700 border-green-500/30',
  en_attente: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
  brouillon: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  refuse: 'bg-red-500/20 text-red-700 border-red-500/30',
  expire: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

const statusLabels: Record<string, string> = {
  publie: 'Publiée',
  en_attente: 'En attente',
  brouillon: 'Brouillon',
  refuse: 'Refusée',
  expire: 'Expirée',
};

export default function MesAnnonces() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch annonceur profile
  const { data: annonceur } = useQuery({
    queryKey: ['annonceur', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch annonces
  const { data: annonces, isLoading } = useQuery({
    queryKey: ['mes-annonces', annonceur?.id, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('annonces_publiques')
        .select(`
          *,
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('annonceur_id', annonceur?.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('statut', statusFilter);
      }

      if (searchQuery) {
        query = query.ilike('titre', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!annonceur?.id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (annonceId: string) => {
      const { error } = await supabase
        .from('annonces_publiques')
        .delete()
        .eq('id', annonceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-annonces'] });
      toast.success('Annonce supprimée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (annonce: any) => {
      const { id, created_at, updated_at, date_publication, date_soumission, slug, reference, nb_vues, nb_favoris, nb_contacts, ...annonceData } = annonce;
      const { error } = await supabase
        .from('annonces_publiques')
        .insert({
          ...annonceData,
          titre: `${annonce.titre} (copie)`,
          statut: 'brouillon',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-annonces'] });
      toast.success('Annonce dupliquée en brouillon');
    },
    onError: () => {
      toast.error('Erreur lors de la duplication');
    },
  });

  const getMainPhoto = (photos: any[]) => {
    if (!photos || photos.length === 0) return null;
    const main = photos.find(p => p.est_principale);
    return main?.url || photos[0]?.url;
  };

  if (!annonceur) {
    return (
      <AnnonceurLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AnnonceurLayout>
    );
  }

  return (
    <AnnonceurLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Mes annonces</h1>
            <p className="text-muted-foreground">
              Gérez vos annonces immobilières
            </p>
          </div>
          <Button onClick={() => navigate('/espace-annonceur/nouvelle-annonce')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle annonce
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une annonce..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="publie">Publiées</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="brouillon">Brouillons</SelectItem>
              <SelectItem value="refuse">Refusées</SelectItem>
              <SelectItem value="expire">Expirées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-center">
                  <Eye className="h-4 w-4 inline" />
                </TableHead>
                <TableHead className="text-center">
                  <Heart className="h-4 w-4 inline" />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-12 w-16 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : annonces?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <p>Aucune annonce trouvée</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/espace-annonceur/nouvelle-annonce')}
                      >
                        Créer ma première annonce
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                annonces?.map((annonce) => {
                  const mainPhoto = getMainPhoto(annonce.photos_annonces_publiques as any[]);
                  return (
                    <TableRow key={annonce.id}>
                      <TableCell>
                        {mainPhoto ? (
                          <img
                            src={mainPhoto}
                            alt={annonce.titre}
                            className="h-12 w-16 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-16 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{annonce.titre}</p>
                          <p className="text-sm text-muted-foreground">
                            {annonce.ville}, {annonce.canton}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={statusColors[annonce.statut || 'brouillon']}
                        >
                          {statusLabels[annonce.statut || 'brouillon']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {annonce.prix?.toLocaleString('fr-CH')} CHF
                        {annonce.type_transaction === 'location' && '/mois'}
                      </TableCell>
                      <TableCell className="text-center">
                        {annonce.nb_vues || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {annonce.nb_favoris || 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(annonce.created_at || ''), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/espace-annonceur/mes-annonces/${annonce.id}`)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {annonce.statut === 'publie' && annonce.slug && (
                              <DropdownMenuItem 
                                onClick={() => window.open(`/annonces/${annonce.slug}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Voir l'annonce
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => duplicateMutation.mutate(annonce)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
                                  deleteMutation.mutate(annonce.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AnnonceurLayout>
  );
}
