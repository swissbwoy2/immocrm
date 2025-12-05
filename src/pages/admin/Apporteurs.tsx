import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Plus, Eye, Users, DollarSign, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Apporteur {
  id: string;
  user_id: string;
  code_parrainage: string;
  statut: string;
  nombre_clients_referes: number;
  total_commissions_gagnees: number;
  date_expiration: string | null;
  contrat_signe: boolean;
  created_at: string;
  profile?: {
    nom: string;
    prenom: string;
    email: string;
  };
}

export default function AdminApporteurs() {
  const navigate = useNavigate();
  const [apporteurs, setApporteurs] = useState<Apporteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newApporteur, setNewApporteur] = useState({
    email: '',
    nom: '',
    prenom: '',
  });

  useEffect(() => {
    loadApporteurs();
  }, []);

  const loadApporteurs = async () => {
    try {
      const { data, error } = await supabase
        .from('apporteurs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load profiles for each apporteur
      const apporteursWithProfiles = await Promise.all(
        (data || []).map(async (apporteur) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nom, prenom, email')
            .eq('id', apporteur.user_id)
            .single();

          return { ...apporteur, profile };
        })
      );

      setApporteurs(apporteursWithProfiles);
    } catch (error) {
      console.error('Error loading apporteurs:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApporteur = async () => {
    if (!newApporteur.email || !newApporteur.nom || !newApporteur.prenom) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke('create-apporteur', {
        body: {
          email: newApporteur.email,
          nom: newApporteur.nom,
          prenom: newApporteur.prenom,
        },
      });

      if (error) throw error;

      toast.success('Apporteur créé avec succès !');
      setShowCreateDialog(false);
      setNewApporteur({ email: '', nom: '', prenom: '' });
      loadApporteurs();
    } catch (error: any) {
      console.error('Error creating apporteur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (apporteur: Apporteur) => {
    const newStatut = apporteur.statut === 'actif' ? 'suspendu' : 'actif';
    
    try {
      const { error } = await supabase
        .from('apporteurs')
        .update({ statut: newStatut })
        .eq('id', apporteur.id);

      if (error) throw error;

      toast.success(`Apporteur ${newStatut === 'actif' ? 'activé' : 'suspendu'}`);
      loadApporteurs();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredApporteurs = apporteurs.filter((a) => {
    const fullName = `${a.profile?.prenom} ${a.profile?.nom}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
           a.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
           a.code_parrainage?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: apporteurs.length,
    actifs: apporteurs.filter(a => a.statut === 'actif').length,
    totalCommissions: apporteurs.reduce((sum, a) => sum + (a.total_commissions_gagnees || 0), 0),
    totalReferrals: apporteurs.reduce((sum, a) => sum + (a.nombre_clients_referes || 0), 0),
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    actif: { label: 'Actif', variant: 'default' },
    en_attente: { label: 'En attente', variant: 'secondary' },
    suspendu: { label: 'Suspendu', variant: 'destructive' },
    expire: { label: 'Expiré', variant: 'outline' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Apporteurs d'affaires</h1>
          <p className="text-muted-foreground">
            Gérez les apporteurs d'affaires partenaires
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel apporteur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un apporteur d'affaires</DialogTitle>
              <DialogDescription>
                Un email d'invitation sera envoyé à l'apporteur
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={newApporteur.prenom}
                    onChange={(e) => setNewApporteur({ ...newApporteur, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={newApporteur.nom}
                    onChange={(e) => setNewApporteur({ ...newApporteur, nom: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newApporteur.email}
                  onChange={(e) => setNewApporteur({ ...newApporteur, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateApporteur} disabled={creating}>
                {creating ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Apporteurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actifs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commissions versées</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">CHF {stats.totalCommissions.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email ou code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apporteur</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApporteurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun apporteur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredApporteurs.map((apporteur) => (
                  <TableRow key={apporteur.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {apporteur.profile?.prenom} {apporteur.profile?.nom}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {apporteur.profile?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {apporteur.code_parrainage}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[apporteur.statut]?.variant || 'secondary'}>
                        {statusConfig[apporteur.statut]?.label || apporteur.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>{apporteur.nombre_clients_referes}</TableCell>
                    <TableCell>CHF {apporteur.total_commissions_gagnees?.toFixed(0) || 0}</TableCell>
                    <TableCell>
                      {apporteur.contrat_signe ? (
                        <Badge variant="outline" className="bg-green-50">Signé</Badge>
                      ) : (
                        <Badge variant="secondary">Non signé</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/apporteurs/${apporteur.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatus(apporteur)}
                        >
                          {apporteur.statut === 'actif' ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
