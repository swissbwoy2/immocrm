import { useState, useEffect } from 'react';
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
  XCircle, 
  Clock, 
  Building2,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface AnnoncePublique {
  id: string;
  titre: string;
  adresse: string;
  ville: string;
  code_postal: string;
  prix: number;
  type_transaction: string;
  nombre_pieces: number | null;
  surface_habitable: number | null;
  statut: string;
  created_at: string;
  date_soumission: string | null;
  nb_vues: number;
  nb_favoris: number;
  annonceur_id: string;
  annonceur?: {
    nom: string;
    prenom: string | null;
    email: string;
    type_annonceur: string;
  };
}

const AnnoncesPubliques = () => {
  const [annonces, setAnnonces] = useState<AnnoncePublique[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [selectedAnnonce, setSelectedAnnonce] = useState<AnnoncePublique | null>(null);
  const [showRefusDialog, setShowRefusDialog] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const [processing, setProcessing] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    enAttente: 0,
    publiees: 0,
    refusees: 0
  });

  useEffect(() => {
    loadAnnonces();
  }, [statutFilter]);

  const loadAnnonces = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceur:annonceurs(nom, prenom, email, type_annonceur)
        `)
        .order('created_at', { ascending: false });

      if (statutFilter !== 'all') {
        query = query.eq('statut', statutFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAnnonces(data || []);
      
      const allAnnonces = data || [];
      setStats({
        total: allAnnonces.length,
        enAttente: allAnnonces.filter(a => a.statut === 'en_attente').length,
        publiees: allAnnonces.filter(a => a.statut === 'publiee').length,
        refusees: allAnnonces.filter(a => a.statut === 'refusee').length
      });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des annonces');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprouver = async (annonce: AnnoncePublique) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('annonces_publiques')
        .update({
          statut: 'publiee',
          date_publication: new Date().toISOString(),
          date_moderation: new Date().toISOString()
        })
        .eq('id', annonce.id);

      if (error) throw error;

      toast.success('Annonce approuvée et publiée');
      loadAnnonces();
    } catch (error: any) {
      toast.error('Erreur lors de l\'approbation');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRefuser = async () => {
    if (!selectedAnnonce || !motifRefus.trim()) {
      toast.error('Veuillez indiquer un motif de refus');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('annonces_publiques')
        .update({
          statut: 'refusee',
          motif_refus: motifRefus,
          date_moderation: new Date().toISOString()
        })
        .eq('id', selectedAnnonce.id);

      if (error) throw error;

      toast.success('Annonce refusée');
      setShowRefusDialog(false);
      setMotifRefus('');
      setSelectedAnnonce(null);
      loadAnnonces();
    } catch (error: any) {
      toast.error('Erreur lors du refus');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'publiee':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Publiée</Badge>;
      case 'en_attente':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">En attente</Badge>;
      case 'refusee':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Refusée</Badge>;
      case 'brouillon':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Brouillon</Badge>;
      case 'expiree':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Expirée</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const filteredAnnonces = annonces.filter(annonce => {
    const matchesSearch = 
      annonce.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      annonce.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      annonce.annonceur?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      annonce.annonceur?.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-8 p-4 md:p-6">
      <PremiumPageHeader
        title="Modération des Annonces"
        subtitle="Gérez et modérez les annonces publiques soumises par les annonceurs"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PremiumKPICard
          title="Total Annonces"
          value={stats.total}
          icon={Building2}
          variant="default"
          delay={0}
        />
        <PremiumKPICard
          title="En Attente"
          value={stats.enAttente}
          icon={Clock}
          variant="warning"
          delay={1}
        />
        <PremiumKPICard
          title="Publiées"
          value={stats.publiees}
          icon={CheckCircle}
          variant="success"
          delay={2}
        />
        <PremiumKPICard
          title="Refusées"
          value={stats.refusees}
          icon={XCircle}
          variant="danger"
          delay={3}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, ville, annonceur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="publiee">Publiées</SelectItem>
            <SelectItem value="refusee">Refusées</SelectItem>
            <SelectItem value="brouillon">Brouillons</SelectItem>
            <SelectItem value="expiree">Expirées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAnnonces.length === 0 ? (
        <PremiumEmptyState
          icon={FileText}
          title="Aucune annonce"
          description={searchTerm || statutFilter !== 'all' 
            ? "Aucune annonce ne correspond à vos critères de recherche" 
            : "Aucune annonce n'a été soumise pour le moment"
          }
        />
      ) : (
        <PremiumTable>
          <PremiumTableHeader>
            <TableRow>
              <TableHead>Annonce</TableHead>
              <TableHead>Annonceur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </PremiumTableHeader>
          <TableBody>
            {filteredAnnonces.map((annonce) => (
              <PremiumTableRow 
                key={annonce.id}
                onClick={() => window.open(`/annonces/${annonce.id}`, '_blank')}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground line-clamp-1">{annonce.titre}</p>
                    <p className="text-sm text-muted-foreground">{annonce.ville}, {annonce.code_postal}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">
                      {annonce.annonceur?.prenom} {annonce.annonceur?.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">{annonce.annonceur?.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {annonce.type_transaction}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-primary">
                    CHF {annonce.prix.toLocaleString('fr-CH')}
                    {annonce.type_transaction === 'location' && '/mois'}
                  </span>
                </TableCell>
                <TableCell>
                  {getStatutBadge(annonce.statut || 'brouillon')}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {format(new Date(annonce.date_soumission || annonce.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/annonces/${annonce.id}`, '_blank');
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {annonce.statut === 'en_attente' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprouver(annonce);
                          }}
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnnonce(annonce);
                            setShowRefusDialog(true);
                          }}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </PremiumTableRow>
            ))}
          </TableBody>
        </PremiumTable>
      )}

      {/* Refus Dialog */}
      <Dialog open={showRefusDialog} onOpenChange={setShowRefusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Refuser l'annonce
            </DialogTitle>
            <DialogDescription>
              Indiquez le motif du refus. L'annonceur sera notifié par email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="font-medium mb-2">{selectedAnnonce?.titre}</p>
            <Textarea
              placeholder="Motif du refus..."
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRefusDialog(false);
                setMotifRefus('');
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRefuser}
              disabled={processing || !motifRefus.trim()}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnoncesPubliques;
