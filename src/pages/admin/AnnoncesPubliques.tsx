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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  AlertTriangle,
  FileText,
  Star
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
  date_expiration?: string | null;
  duree_publication?: number | null;
  motif_refus?: string | null;
  slug?: string | null;
  est_mise_en_avant?: boolean | null;
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
  const [statutFilter, setStatutFilter] = useState<string>('en_attente');
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
  }, []);

  const loadAnnonces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceur:annonceurs(nom, prenom, email, type_annonceur)
        `)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;

      setAnnonces(data || []);

      const allAnnonces = data || [];
      setStats({
        total: allAnnonces.length,
        enAttente: allAnnonces.filter(a => a.statut === 'en_attente').length,
        publiees: allAnnonces.filter(a => a.statut === 'publie').length,
        refusees: allAnnonces.filter(a => a.statut === 'refuse').length
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
      const { data: { user } } = await supabase.auth.getUser();
      const days = annonce.duree_publication || 60;
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + days);

      const { error } = await supabase
        .from('annonces_publiques')
        .update({
          statut: 'publie',
          date_publication: new Date().toISOString(),
          date_moderation: new Date().toISOString(),
          date_expiration: expiration.toISOString(),
          motif_refus: null,
          modere_par: user?.id ?? null,
        })
        .eq('id', annonce.id);

      if (error) throw error;

      supabase.functions.invoke('annonce-moderation-notify', {
        body: { annonce_id: annonce.id, action: 'approved' },
      }).catch((e) => console.error('Notification annonceur échouée', e));

      toast.success('Annonce approuvée et publiée');
      loadAnnonces();
    } catch (error: any) {
      toast.error('Erreur lors de l\'approbation');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleMiseEnAvant = async (annonce: AnnoncePublique) => {
    const next = !annonce.est_mise_en_avant;
    const now = new Date();
    const fin = new Date();
    fin.setDate(fin.getDate() + 30);

    const { error } = await supabase
      .from('annonces_publiques')
      .update({
        est_mise_en_avant: next,
        date_mise_en_avant_debut: next ? now.toISOString() : null,
        date_mise_en_avant_fin: next ? fin.toISOString() : null,
      })
      .eq('id', annonce.id);

    if (error) {
      toast.error('Erreur lors de la mise en avant');
      return;
    }
    toast.success(next ? 'Annonce mise en avant (30 jours)' : 'Mise en avant retirée');
    loadAnnonces();
  };

  const handleRefuser = async () => {
    if (!selectedAnnonce || !motifRefus.trim()) {
      toast.error('Veuillez indiquer un motif de refus');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('annonces_publiques')
        .update({
          statut: 'refuse',
          motif_refus: motifRefus,
          date_moderation: new Date().toISOString(),
          modere_par: user?.id ?? null,
        })
        .eq('id', selectedAnnonce.id);

      if (error) throw error;

      supabase.functions.invoke('annonce-moderation-notify', {
        body: { annonce_id: selectedAnnonce.id, action: 'refused', motif_refus: motifRefus },
      }).catch((e) => console.error('Notification annonceur échouée', e));

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
      case 'publie':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Publiée</Badge>;
      case 'en_attente':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">En attente</Badge>;
      case 'refuse':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Refusée</Badge>;
      case 'brouillon':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Brouillon</Badge>;
      case 'expire':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Expirée</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const isExpired = (a: AnnoncePublique) =>
    a.statut === 'expire' ||
    (a.statut === 'publie' && !!a.date_expiration && new Date(a.date_expiration) < new Date());

  const matchesTab = (a: AnnoncePublique) => {
    switch (statutFilter) {
      case 'en_attente':
        return a.statut === 'en_attente';
      case 'publie':
        return a.statut === 'publie' && !isExpired(a);
      case 'refuse':
        return a.statut === 'refuse';
      case 'expire':
        return isExpired(a);
      default:
        return true;
    }
  };

  const tabCounts = {
    en_attente: annonces.filter(a => a.statut === 'en_attente').length,
    publie: annonces.filter(a => a.statut === 'publie' && !isExpired(a)).length,
    refuse: annonces.filter(a => a.statut === 'refuse').length,
    expire: annonces.filter(isExpired).length,
    all: annonces.length,
  };

  const filteredAnnonces = annonces.filter(annonce => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      annonce.titre.toLowerCase().includes(term) ||
      annonce.ville.toLowerCase().includes(term) ||
      annonce.annonceur?.nom.toLowerCase().includes(term) ||
      annonce.annonceur?.email.toLowerCase().includes(term);

    return matchesSearch && matchesTab(annonce);
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
      <div className="space-y-4">
        <Tabs value={statutFilter} onValueChange={setStatutFilter}>
          <TabsList className="w-full flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="en_attente">À modérer ({tabCounts.en_attente})</TabsTrigger>
            <TabsTrigger value="publie">Publiées ({tabCounts.publie})</TabsTrigger>
            <TabsTrigger value="refuse">Refusées ({tabCounts.refuse})</TabsTrigger>
            <TabsTrigger value="expire">Expirées ({tabCounts.expire})</TabsTrigger>
            <TabsTrigger value="all">Toutes ({tabCounts.all})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, ville, annonceur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
            {filteredAnnonces.map((annonce) => {
              const publicHref = `/annonces/${annonce.slug || annonce.id}`;
              return (
              <PremiumTableRow 
                key={annonce.id}
                onClick={() => window.open(publicHref, '_blank')}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground line-clamp-1">{annonce.titre}</p>
                    <p className="text-sm text-muted-foreground">{annonce.ville}, {annonce.code_postal}</p>
                    {annonce.statut === 'refuse' && annonce.motif_refus && (
                      <p className="text-xs text-destructive line-clamp-1 mt-1">Motif : {annonce.motif_refus}</p>
                    )}
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
                  <div className="flex items-center gap-2">
                    {getStatutBadge(isExpired(annonce) ? 'expire' : (annonce.statut || 'brouillon'))}
                    {annonce.est_mise_en_avant && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="w-3 h-3 fill-current" /> En avant
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground text-sm">
                    <p>{format(new Date(annonce.date_soumission || annonce.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                    {annonce.date_expiration && (
                      <p className="text-xs">
                        Expire le {format(new Date(annonce.date_expiration), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(publicHref, '_blank');
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {(annonce.statut === 'en_attente' || annonce.statut === 'refuse' || isExpired(annonce)) && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprouver(annonce);
                        }}
                        disabled={processing}
                        title={annonce.statut === 'en_attente' ? 'Approuver' : 'Republier'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {annonce.statut !== 'refuse' && (
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
                        title="Refuser"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {annonce.statut === 'publie' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={annonce.est_mise_en_avant ? 'text-primary' : 'text-muted-foreground'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMiseEnAvant(annonce);
                        }}
                        disabled={processing}
                        title="Mettre en avant"
                      >
                        <Star className={`w-4 h-4 ${annonce.est_mise_en_avant ? 'fill-current' : ''}`} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </PremiumTableRow>
            );})}
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
