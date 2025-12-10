import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { 
  Mail, MapPin, Calendar, Eye, Send, Trash2, Search, Filter, 
  TrendingUp, CheckCircle, XCircle, ExternalLink, Home, Sparkles,
  Building2, User, ArrowRight, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ResendOfferDialog } from '@/components/ResendOfferDialog';
import { PremiumAgentOffreDetailsDialog } from '@/components/PremiumAgentOffreDetailsDialog';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { cn } from '@/lib/utils';

// Animated counter component
const AnimatedValue = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString('fr-CH')}{suffix}</span>;
};

// Premium skeleton loader
const OffreSkeletonCard = ({ index }: { index: number }) => (
  <Card 
    className="overflow-hidden animate-fade-in border-border/50 bg-card/50 backdrop-blur-sm"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  </Card>
);

const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ElementType;
  step: number;
}> = {
  envoyee: { 
    label: 'Envoyée', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-500/10', 
    borderColor: 'border-blue-500/30',
    icon: Send,
    step: 1
  },
  vue: { 
    label: 'Vue', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-500/10', 
    borderColor: 'border-purple-500/30',
    icon: Eye,
    step: 2
  },
  interesse: { 
    label: 'Intéressé', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-500/10', 
    borderColor: 'border-amber-500/30',
    icon: TrendingUp,
    step: 3
  },
  visite_planifiee: { 
    label: 'Visite planifiée', 
    color: 'text-cyan-600 dark:text-cyan-400', 
    bgColor: 'bg-cyan-500/10', 
    borderColor: 'border-cyan-500/30',
    icon: Calendar,
    step: 4
  },
  visite_effectuee: { 
    label: 'Visite effectuée', 
    color: 'text-teal-600 dark:text-teal-400', 
    bgColor: 'bg-teal-500/10', 
    borderColor: 'border-teal-500/30',
    icon: CheckCircle,
    step: 5
  },
  demande_postulation: { 
    label: 'Demande en attente', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-500/10', 
    borderColor: 'border-orange-500/30',
    icon: Clock,
    step: 5.5
  },
  candidature_deposee: {
    label: 'Candidature déposée', 
    color: 'text-indigo-600 dark:text-indigo-400', 
    bgColor: 'bg-indigo-500/10', 
    borderColor: 'border-indigo-500/30',
    icon: Mail,
    step: 6
  },
  acceptee: { 
    label: 'Acceptée', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-500/10', 
    borderColor: 'border-green-500/30',
    icon: CheckCircle,
    step: 7
  },
  refusee: { 
    label: 'Refusée', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-500/10', 
    borderColor: 'border-red-500/30',
    icon: XCircle,
    step: 0
  },
};

const TIMELINE_STEPS = [
  { step: 1, label: 'Envoyée' },
  { step: 2, label: 'Vue' },
  { step: 3, label: 'Intéressé' },
  { step: 4, label: 'Visite' },
  { step: 5, label: 'Candidature' },
  { step: 6, label: 'Acceptée' },
];

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
  const [pendingPostulations, setPendingPostulations] = useState<any[]>([]);

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

      // Charger les candidatures en demande de postulation pour cet agent
      const { data: pendingCandidatures } = await supabase
        .from('candidatures')
        .select(`
          id, 
          statut, 
          created_at, 
          offre_id,
          client_id,
          offres!inner(id, adresse, prix, type_bien, agent_id),
          clients!inner(id, user_id, profiles!clients_user_id_fkey(nom, prenom))
        `)
        .eq('statut', 'demande_postulation')
        .eq('offres.agent_id', agentData.id)
        .order('created_at', { ascending: false });

      setPendingPostulations(pendingCandidatures || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Statuts que l'agent ne peut pas définir manuellement (uniquement via workflow)
  const PROTECTED_STATUTS = ['candidature_deposee'];

  const handleStatutChange = async (offreId: string, newStatut: string) => {
    // Empêcher le changement manuel vers les statuts protégés
    if (PROTECTED_STATUTS.includes(newStatut)) {
      toast.error('Ce statut ne peut être atteint qu\'en déposant le dossier via "Déposer une candidature"');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

      setOffres(offres.map(o => 
        o.id === offreId ? { ...o, statut: newStatut } : o
      ));
      
      toast.success(`Statut changé en "${STATUS_CONFIG[newStatut]?.label || newStatut}"`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Impossible de mettre à jour le statut');
    }
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;

    try {
      await supabase.from('visites').delete().eq('offre_id', offerToDelete.id);
      await supabase.from('candidatures').delete().eq('offre_id', offerToDelete.id);
      await supabase.from('documents').delete().eq('offre_id', offerToDelete.id);

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
    demandesEnAttente: pendingPostulations.length,
    enCours: offres.filter(o => ['interesse', 'visite_planifiee', 'visite_effectuee', 'candidature_deposee', 'demande_postulation'].includes(o.statut)).length,
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
      
      await supabase.from('visites').delete().in('offre_id', offerIds);
      await supabase.from('candidatures').delete().in('offre_id', offerIds);
      await supabase.from('documents').delete().in('offre_id', offerIds);
      
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

  const getCurrentStep = (statut: string) => {
    return STATUS_CONFIG[statut]?.step || 0;
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
        <div className="p-4 md:p-8 space-y-6">
          {/* Skeleton Header */}
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          {/* Skeleton Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <OffreSkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-4 md:p-8 space-y-6">
        {/* Premium Header */}
        <PremiumPageHeader
          title="Offres envoyées"
          subtitle="Gérez et suivez toutes vos offres envoyées aux clients"
          badge="Suivi"
          icon={Send}
          action={
            <Button 
              onClick={() => navigate('/agent/envoyer-offre')} 
              className="gap-2 shadow-lg hover:shadow-primary/25 transition-all duration-300"
            >
              <Send className="h-4 w-4" />
              Nouvelle offre
            </Button>
          }
        />

        {/* Premium Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              icon: Mail, 
              value: stats.total, 
              label: 'Total envoyées', 
              gradient: 'from-blue-500/20 to-blue-600/10',
              iconBg: 'bg-blue-500/20',
              iconColor: 'text-blue-600 dark:text-blue-400'
            },
            { 
              icon: TrendingUp, 
              value: stats.enCours, 
              label: 'En cours', 
              gradient: 'from-amber-500/20 to-amber-600/10',
              iconBg: 'bg-amber-500/20',
              iconColor: 'text-amber-600 dark:text-amber-400'
            },
            { 
              icon: CheckCircle, 
              value: stats.acceptees, 
              label: 'Acceptées', 
              gradient: 'from-green-500/20 to-green-600/10',
              iconBg: 'bg-green-500/20',
              iconColor: 'text-green-600 dark:text-green-400'
            },
            { 
              icon: XCircle, 
              value: stats.refusees, 
              label: 'Refusées', 
              gradient: 'from-red-500/20 to-red-600/10',
              iconBg: 'bg-red-500/20',
              iconColor: 'text-red-600 dark:text-red-400'
            },
          ].map((stat, index) => (
            <Card 
              key={index} 
              className={cn(
                "group relative overflow-hidden border-border/50 bg-gradient-to-br",
                stat.gradient,
                "hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
              )}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              <CardContent className="pt-6 relative">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-xl", stat.iconBg)}>
                    <stat.icon className={cn("h-6 w-6", stat.iconColor)} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      <AnimatedValue value={stat.value} />
                    </div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section Demandes de postulation en attente */}
        {pendingPostulations.length > 0 && (
          <Card className="border-orange-500/30 bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    Demandes de postulation en attente
                  </h3>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
                    {pendingPostulations.length} client(s) souhaitent que vous déposiez leur dossier
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {pendingPostulations.map((candidature) => (
                  <div 
                    key={candidature.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card/80 backdrop-blur-sm rounded-xl border border-orange-200/50 dark:border-orange-800/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {candidature.clients?.profiles?.prenom} {candidature.clients?.profiles?.nom}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {candidature.offres?.adresse}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Demandé le {new Date(candidature.created_at).toLocaleDateString('fr-CH', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/agent/deposer-candidature?offre_id=${candidature.offre_id}&client_id=${candidature.client_id}`)}
                      className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <Send className="h-4 w-4" />
                      Déposer le dossier
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par adresse ou client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Selection Bar */}
        {filteredOffres.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
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
                    className="shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer ({selectedOffers.size})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des offres */}
        {filteredOffres.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOffres.map((offre, index) => {
              const statusConfig = STATUS_CONFIG[offre.statut] || STATUS_CONFIG.envoyee;
              const StatusIcon = statusConfig.icon;
              const currentStep = getCurrentStep(offre.statut);
              const isNewOffer = offre.statut === 'envoyee';

              return (
                <Card 
                  key={offre.id} 
                  className={cn(
                    "group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm",
                    "hover:shadow-xl hover:shadow-primary/10 transition-all duration-500",
                    "animate-fade-in",
                    selectedOffers.has(offre.id) && "ring-2 ring-primary"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Colored status bar */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    statusConfig.bgColor
                  )} />

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  {/* New badge */}
                  {isNewOffer && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-primary/90 text-primary-foreground animate-pulse">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Nouveau
                      </Badge>
                    </div>
                  )}

                  <div className="p-5 space-y-4 relative">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedOffers.has(offre.id)}
                        onCheckedChange={() => toggleOfferSelection(offre.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {offre.adresse}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{getClientName(offre)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <Badge 
                        className={cn(
                          "font-medium transition-all",
                          statusConfig.bgColor,
                          statusConfig.color,
                          statusConfig.borderColor,
                          "border"
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                        {statusConfig.label}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    {offre.statut !== 'refusee' && (
                      <div className="flex items-center gap-1 py-2">
                        {TIMELINE_STEPS.map((step, i) => (
                          <div key={step.step} className="flex items-center flex-1">
                            <div 
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition-all duration-500",
                                currentStep >= step.step 
                                  ? "bg-primary" 
                                  : "bg-muted"
                              )}
                            />
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div className="w-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                        <span className="text-sm font-bold text-primary">
                          {Number(offre.prix).toLocaleString('fr-CH')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">CHF/mois</span>
                      </div>
                      <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/50 border border-border/50">
                        <span className="text-sm font-semibold">{offre.surface || '-'}</span>
                        <span className="text-[10px] text-muted-foreground">m²</span>
                      </div>
                      <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/50 border border-border/50">
                        <span className="text-sm font-semibold">{offre.pieces || '-'}</span>
                        <span className="text-[10px] text-muted-foreground">pièces</span>
                      </div>
                    </div>

                    {/* Link to announcement */}
                    {offre.lien_annonce && offre.lien_annonce.trim() && (
                      <a 
                        href={offre.lien_annonce} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline group/link"
                      >
                        <ExternalLink className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                        Voir l'annonce
                      </a>
                    )}

                    {/* Status Change */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium shrink-0 text-muted-foreground">Statut:</span>
                      <Select 
                        value={offre.statut} 
                        onValueChange={(value) => handleStatutChange(offre.id, value)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1 bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG)
                            .filter(([key]) => !PROTECTED_STATUTS.includes(key) || offre.statut === key)
                            .map(([key, config]) => (
                              <SelectItem key={key} value={key} disabled={PROTECTED_STATUTS.includes(key)}>
                                {config.label}
                                {PROTECTED_STATUTS.includes(key) && ' (via dépôt dossier)'}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-xs bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
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
                        className="flex-1 h-9 text-xs bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
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
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive transition-all duration-300"
                        onClick={() => {
                          setOfferToDelete(offre);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-20 text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {searchQuery || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucune offre envoyée'}
              </h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Modifiez vos filtres pour voir plus de résultats'
                  : 'Commencez par envoyer votre première offre à un client'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button 
                  onClick={() => navigate('/agent/envoyer-offre')}
                  className="shadow-lg hover:shadow-primary/25 transition-all duration-300"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer une offre
                  <ArrowRight className="h-4 w-4 ml-2" />
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
      <PremiumAgentOffreDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        offre={offreToView}
        onResend={() => {
          setSelectedOffer(offreToView);
          setDetailsDialogOpen(false);
          setResendDialogOpen(true);
        }}
      />
    </main>
  );
}
