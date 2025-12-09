import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Mail, MapPin, DollarSign, Maximize, Calendar, Eye, Send, Trash2, Search, Filter, Home, TrendingUp, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ResendOfferDialog } from '@/components/ResendOfferDialog';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AgentOffreDetailsDialog } from '@/components/AgentOffreDetailsDialog';

const getStatutBadgeVariant = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'secondary';
    case 'vue': return 'outline';
    case 'interesse': return 'default';
    case 'visite_planifiee': return 'default';
    case 'visite_effectuee': return 'default';
    case 'candidature_deposee': return 'default';
    case 'acceptee': return 'default';
    case 'refusee': return 'destructive';
    default: return 'secondary';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'Envoyée';
    case 'vue': return 'Vue';
    case 'interesse': return 'Intéressé';
    case 'visite_planifiee': return 'Visite planifiée';
    case 'visite_effectuee': return 'Visite effectuée';
    case 'candidature_deposee': return 'Candidature déposée';
    case 'acceptee': return 'Acceptée';
    case 'refusee': return 'Refusée';
    default: return statut;
  }
};

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'vue': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'interesse': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'visite_planifiee': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    case 'visite_effectuee': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    case 'candidature_deposee': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    case 'acceptee': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'refusee': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function OffresEnvoyees() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agent, setAgent] = useState<any>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [offreToView, setOffreToView] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;
      setAgent(agentData);

      const { data: offresData, error } = await supabase
        .from('offres')
        .select('*, clients(*, profiles!clients_user_id_fkey(nom, prenom, email))')
        .eq('agent_id', agentData.id)
        .order('date_envoi', { ascending: false });

      if (error) throw error;
      setOffres(offresData || []);
      
      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);

      const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

      const { data: clientsData } = clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('*, profiles!clients_user_id_fkey(nom, prenom, email)')
            .in('id', clientIds)
        : { data: [] };
      
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatutChange = async (offreId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

      setOffres(offres.map(o => 
        o.id === offreId ? { ...o, statut: newStatut } : o
      ));
      
      toast.success(`Statut changé en "${getStatutLabel(newStatut)}"`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Impossible de mettre à jour le statut');
    }
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;

    try {
      // Delete related visites first
      await supabase
        .from('visites')
        .delete()
        .eq('offre_id', offerToDelete.id);

      // Delete related candidatures
      await supabase
        .from('candidatures')
        .delete()
        .eq('offre_id', offerToDelete.id);

      // Delete related documents
      await supabase
        .from('documents')
        .delete()
        .eq('offre_id', offerToDelete.id);

      // Delete the offer
      const { error } = await supabase
        .from('offres')
        .delete()
        .eq('id', offerToDelete.id);

      if (error) throw error;

      setOffres(offres.filter(o => o.id !== offerToDelete.id));
      toast.success('Offre supprimée avec succès');
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Impossible de supprimer l\'offre');
    } finally {
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
    }
  };

  const getClientName = (offre: any) => {
    if (offre.clients?.profiles) {
      return `${offre.clients.profiles.prenom} ${offre.clients.profiles.nom}`;
    }
    return 'Client inconnu';
  };

  const filteredOffres = offres.filter(offre => {
    const matchesSearch = searchQuery === '' || 
      offre.adresse?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(offre).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || offre.statut === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: offres.length,
    enCours: offres.filter(o => ['interesse', 'visite_planifiee', 'visite_effectuee', 'candidature_deposee'].includes(o.statut)).length,
    acceptees: offres.filter(o => o.statut === 'acceptee').length,
    refusees: offres.filter(o => o.statut === 'refusee').length,
  };

  const toggleOfferSelection = (offerId: string) => {
    const newSelection = new Set(selectedOffers);
    if (newSelection.has(offerId)) {
      newSelection.delete(offerId);
    } else {
      newSelection.add(offerId);
    }
    setSelectedOffers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedOffers.size === filteredOffres.length) {
      setSelectedOffers(new Set());
    } else {
      setSelectedOffers(new Set(filteredOffres.map(o => o.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const offerIds = Array.from(selectedOffers);
      
      // Delete related data first
      await supabase.from('visites').delete().in('offre_id', offerIds);
      await supabase.from('candidatures').delete().in('offre_id', offerIds);
      await supabase.from('documents').delete().in('offre_id', offerIds);
      
      // Delete offers
      const { error } = await supabase.from('offres').delete().in('id', offerIds);
      if (error) throw error;

      setOffres(offres.filter(o => !selectedOffers.has(o.id)));
      setSelectedOffers(new Set());
      toast.success(`${offerIds.length} offre(s) supprimée(s)`);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Offres envoyées
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez et suivez toutes vos offres envoyées aux clients
            </p>
          </div>
          <Button onClick={() => navigate('/agent/envoyer-offre')} className="gap-2">
            <Send className="h-4 w-4" />
            Nouvelle offre
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total envoyées</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.enCours}</div>
                  <div className="text-xs text-muted-foreground">En cours</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.acceptees}</div>
                  <div className="text-xs text-muted-foreground">Acceptées</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.refusees}</div>
                  <div className="text-xs text-muted-foreground">Refusées</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Bulk Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par adresse ou client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="envoyee">Envoyée</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
              <SelectItem value="interesse">Intéressé</SelectItem>
              <SelectItem value="visite_planifiee">Visite planifiée</SelectItem>
              <SelectItem value="visite_effectuee">Visite effectuée</SelectItem>
              <SelectItem value="candidature_deposee">Candidature déposée</SelectItem>
              <SelectItem value="acceptee">Acceptée</SelectItem>
              <SelectItem value="refusee">Refusée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Selection Bar */}
        {filteredOffres.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedOffers.size === filteredOffres.length && filteredOffres.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedOffers.size > 0 
                  ? `${selectedOffers.size} sélectionnée(s)` 
                  : 'Tout sélectionner'}
              </span>
            </div>
            {selectedOffers.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer ({selectedOffers.size})
              </Button>
            )}
          </div>
        )}

        {/* Liste des offres */}
        {filteredOffres.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOffres.map((offre) => (
              <Card key={offre.id} className={`group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden ${selectedOffers.has(offre.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox 
                        checked={selectedOffers.has(offre.id)}
                        onCheckedChange={() => toggleOfferSelection(offre.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold line-clamp-1">
                          {offre.adresse}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <span className="truncate">Pour: {getClientName(offre)}</span>
                        </p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 ${getStatutColor(offre.statut)}`}>
                      {getStatutLabel(offre.statut)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Infos du bien */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-primary">
                        {Number(offre.prix).toLocaleString('fr-CH')}
                      </div>
                      <div className="text-xs text-muted-foreground">CHF/mois</div>
                    </div>
                    <div className="text-center border-x border-border">
                      <div className="text-sm font-semibold">{offre.surface || '-'}</div>
                      <div className="text-xs text-muted-foreground">m²</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold">{offre.pieces || '-'}</div>
                      <div className="text-xs text-muted-foreground">pièces</div>
                    </div>
                  </div>

                  {/* Date d'envoi */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}</span>
                  </div>

                  {/* Lien annonce */}
                  {offre.lien_annonce && offre.lien_annonce.trim() && (
                    <a 
                      href={offre.lien_annonce} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Voir l'annonce
                    </a>
                  )}

                  {/* Changement de statut */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium shrink-0">Statut:</span>
                    <Select 
                      value={offre.statut} 
                      onValueChange={(value) => handleStatutChange(offre.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="envoyee">Envoyée</SelectItem>
                        <SelectItem value="vue">Vue</SelectItem>
                        <SelectItem value="interesse">Intéressé</SelectItem>
                        <SelectItem value="visite_planifiee">Visite planifiée</SelectItem>
                        <SelectItem value="visite_effectuee">Visite effectuée</SelectItem>
                        <SelectItem value="candidature_deposee">Candidature déposée</SelectItem>
                        <SelectItem value="acceptee">Acceptée</SelectItem>
                        <SelectItem value="refusee">Refusée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => {
                        setOffreToView(offre);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => {
                        setSelectedOffer(offre);
                        setResendDialogOpen(true);
                      }}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Renvoyer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setOfferToDelete(offre);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucune offre envoyée'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Modifiez vos filtres pour voir plus de résultats'
                  : 'Commencez par envoyer votre première offre à un client'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => navigate('/agent/envoyer-offre')}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer une offre
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Resend Dialog */}
      {selectedOffer && (
        <ResendOfferDialog
          offer={selectedOffer}
          clients={clients}
          agentId={agent?.id || ''}
          open={resendDialogOpen}
          onOpenChange={setResendDialogOpen}
          onSuccess={loadData}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette offre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement l'offre pour "{offerToDelete?.adresse}" 
              ainsi que toutes les visites et candidatures associées.
              <br /><br />
              <span className="text-destructive font-medium">Cette action est irréversible.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOffer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedOffers.size} offre(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement les offres sélectionnées ainsi que toutes les visites et candidatures associées.
              <br /><br />
              <span className="text-destructive font-medium">Cette action est irréversible.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offer Details Dialog */}
      <AgentOffreDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        offre={offreToView}
      />
    </main>
  );
}
