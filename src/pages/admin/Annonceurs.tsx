import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  PremiumPageHeader, 
  PremiumKPICard, 
  PremiumEmptyState,
  PremiumTable,
  PremiumTableHeader,
  PremiumTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@/components/premium';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  Users, 
  Building,
  UserCheck,
  AlertTriangle,
  Shield,
  Ban
} from 'lucide-react';

interface Annonceur {
  id: string;
  nom: string;
  prenom: string | null;
  email: string;
  telephone: string | null;
  type_annonceur: string;
  nom_entreprise: string | null;
  statut: string;
  est_verifie: boolean;
  nb_annonces_actives: number;
  nb_annonces_publiees: number;
  created_at: string;
  derniere_connexion: string | null;
}

const Annonceurs = () => {
  const navigate = useNavigate();
  const [annonceurs, setAnnonceurs] = useState<Annonceur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [selectedAnnonceur, setSelectedAnnonceur] = useState<Annonceur | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [motifSuspension, setMotifSuspension] = useState('');
  const [processing, setProcessing] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    particuliers: 0,
    agences: 0,
    verifies: 0
  });

  useEffect(() => {
    loadAnnonceurs();
  }, [typeFilter, statutFilter]);

  const loadAnnonceurs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('annonceurs')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type_annonceur', typeFilter);
      }

      if (statutFilter !== 'all') {
        query = query.eq('statut', statutFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAnnonceurs(data || []);
      
      const { data: allData } = await supabase
        .from('annonceurs')
        .select('*');
      
      const all = allData || [];
      setStats({
        total: all.length,
        particuliers: all.filter(a => a.type_annonceur === 'particulier').length,
        agences: all.filter(a => a.type_annonceur === 'agence').length,
        verifies: all.filter(a => a.est_verifie).length
      });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des annonceurs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifier = async (annonceur: Annonceur) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('annonceurs')
        .update({
          est_verifie: true,
          date_verification: new Date().toISOString()
        })
        .eq('id', annonceur.id);

      if (error) throw error;

      toast.success('Annonceur vérifié avec succès');
      loadAnnonceurs();
    } catch (error: any) {
      toast.error('Erreur lors de la vérification');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspendre = async () => {
    if (!selectedAnnonceur) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('annonceurs')
        .update({
          statut: 'suspendu',
          motif_suspension: motifSuspension || null
        })
        .eq('id', selectedAnnonceur.id);

      if (error) throw error;

      toast.success('Annonceur suspendu');
      setShowSuspendDialog(false);
      setMotifSuspension('');
      setSelectedAnnonceur(null);
      loadAnnonceurs();
    } catch (error: any) {
      toast.error('Erreur lors de la suspension');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReactiver = async (annonceur: Annonceur) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('annonceurs')
        .update({
          statut: 'actif',
          motif_suspension: null
        })
        .eq('id', annonceur.id);

      if (error) throw error;

      toast.success('Annonceur réactivé');
      loadAnnonceurs();
    } catch (error: any) {
      toast.error('Erreur lors de la réactivation');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'particulier':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Particulier</Badge>;
      case 'agence':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Agence</Badge>;
      case 'promoteur':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Promoteur</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatutBadge = (statut: string, estVerifie: boolean) => {
    if (statut === 'suspendu') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Suspendu</Badge>;
    }
    if (estVerifie) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Vérifié</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Non vérifié</Badge>;
  };

  const filteredAnnonceurs = annonceurs.filter(annonceur => {
    const matchesSearch = 
      annonceur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (annonceur.prenom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      annonceur.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (annonceur.nom_entreprise?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-8 p-4 md:p-6">
      <PremiumPageHeader
        title="Gestion des Annonceurs"
        subtitle="Gérez les comptes des annonceurs du portail public"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PremiumKPICard
          title="Total Annonceurs"
          value={stats.total}
          icon={Users}
          variant="default"
          delay={0}
        />
        <PremiumKPICard
          title="Particuliers"
          value={stats.particuliers}
          icon={Users}
          variant="default"
          delay={1}
        />
        <PremiumKPICard
          title="Agences"
          value={stats.agences}
          icon={Building}
          variant="default"
          delay={2}
        />
        <PremiumKPICard
          title="Vérifiés"
          value={stats.verifies}
          icon={UserCheck}
          variant="success"
          delay={3}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Type d'annonceur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="particulier">Particuliers</SelectItem>
            <SelectItem value="agence">Agences</SelectItem>
            <SelectItem value="promoteur">Promoteurs</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="actif">Actifs</SelectItem>
            <SelectItem value="suspendu">Suspendus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAnnonceurs.length === 0 ? (
        <PremiumEmptyState
          icon={Users}
          title="Aucun annonceur"
          description={searchTerm || typeFilter !== 'all' || statutFilter !== 'all'
            ? "Aucun annonceur ne correspond à vos critères de recherche" 
            : "Aucun annonceur n'est encore inscrit"
          }
        />
      ) : (
        <PremiumTable>
          <PremiumTableHeader>
            <TableRow>
              <TableHead>Annonceur</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Annonces</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </PremiumTableHeader>
          <TableBody>
            {filteredAnnonceurs.map((annonceur) => (
              <PremiumTableRow 
                key={annonceur.id}
                onClick={() => navigate(`/admin/annonceurs/${annonceur.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">
                      {annonceur.prenom} {annonceur.nom}
                    </p>
                    {annonceur.nom_entreprise && (
                      <p className="text-sm text-muted-foreground">{annonceur.nom_entreprise}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-foreground">{annonceur.email}</p>
                    {annonceur.telephone && (
                      <p className="text-sm text-muted-foreground">{annonceur.telephone}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getTypeBadge(annonceur.type_annonceur)}
                </TableCell>
                <TableCell>
                  {getStatutBadge(annonceur.statut || 'actif', annonceur.est_verifie || false)}
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <span className="font-semibold text-primary">{annonceur.nb_annonces_actives || 0}</span>
                    <span className="text-muted-foreground"> / {annonceur.nb_annonces_publiees || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {format(new Date(annonceur.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/annonceurs/${annonceur.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!annonceur.est_verifie && annonceur.statut !== 'suspendu' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifier(annonceur);
                        }}
                        disabled={processing}
                        title="Vérifier"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    )}
                    {annonceur.statut !== 'suspendu' ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnonceur(annonceur);
                          setShowSuspendDialog(true);
                        }}
                        disabled={processing}
                        title="Suspendre"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactiver(annonceur);
                        }}
                        disabled={processing}
                        title="Réactiver"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </PremiumTableRow>
            ))}
          </TableBody>
        </PremiumTable>
      )}

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Suspendre l'annonceur
            </DialogTitle>
            <DialogDescription>
              Cet annonceur ne pourra plus publier d'annonces. Vous pouvez optionnellement indiquer un motif.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="font-medium mb-2">
              {selectedAnnonceur?.prenom} {selectedAnnonceur?.nom}
            </p>
            <p className="text-sm text-muted-foreground mb-4">{selectedAnnonceur?.email}</p>
            <Textarea
              placeholder="Motif de la suspension (optionnel)..."
              value={motifSuspension}
              onChange={(e) => setMotifSuspension(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSuspendDialog(false);
                setMotifSuspension('');
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleSuspendre}
              disabled={processing}
            >
              Confirmer la suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Annonceurs;
