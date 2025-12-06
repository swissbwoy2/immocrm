import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Plus, Eye, Users, DollarSign, UserCheck, UserX, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  PremiumPageHeader, 
  PremiumKPICard, 
  PremiumTable, 
  PremiumTableHeader, 
  PremiumTableRow,
  PremiumEmptyState,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@/components/premium';

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
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary/30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        {/* Premium Header */}
        <PremiumPageHeader
          title="Apporteurs d'affaires"
          subtitle="Gérez les apporteurs d'affaires partenaires"
          badge="Partenaires"
          icon={Handshake}
          action={
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
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
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <PremiumKPICard
            title="Total Apporteurs"
            value={stats.total}
            icon={Users}
            delay={0}
          />
          <PremiumKPICard
            title="Actifs"
            value={stats.actifs}
            icon={UserCheck}
            variant="success"
            delay={50}
          />
          <PremiumKPICard
            title="Total Referrals"
            value={stats.totalReferrals}
            icon={Users}
            delay={100}
          />
          <PremiumKPICard
            title="Commissions versées"
            value={stats.totalCommissions}
            icon={DollarSign}
            variant="success"
            subtitle="CHF"
            delay={150}
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {filteredApporteurs.length === 0 ? (
          <PremiumEmptyState
            icon={Handshake}
            title="Aucun apporteur trouvé"
            description={search ? "Essayez une autre recherche" : "Commencez par ajouter un apporteur"}
            action={
              !search && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un apporteur
                </Button>
              )
            }
          />
        ) : (
          <PremiumTable>
            <PremiumTableHeader>
              <TableRow>
                <TableHead>Apporteur</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </PremiumTableHeader>
            <TableBody>
              {filteredApporteurs.map((apporteur) => (
                <PremiumTableRow key={apporteur.id}>
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
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">Signé</Badge>
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
                          <UserCheck className="h-4 w-4 text-success" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </PremiumTableRow>
              ))}
            </TableBody>
          </PremiumTable>
        )}
      </div>
    </div>
  );
}
