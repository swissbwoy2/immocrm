import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wrench, Plus, Search, Filter, Building2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumTicketTechniqueCard } from '@/components/premium/PremiumTicketTechniqueCard';
import { CreateTicketDialog } from '@/components/proprietaire/CreateTicketDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Tickets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [immeubleFilter, setImmeubleFilter] = useState<string>('all');
  const [prioriteFilter, setPrioriteFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('ouverts');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get proprietaire
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!proprio) {
        setLoading(false);
        return;
      }

      // Load immeubles
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id);

      setImmeubles(immeublesData || []);

      // Load tickets
      const immeublesIds = (immeublesData || []).map(i => i.id);
      if (immeublesIds.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      const { data: ticketsData, error } = await supabase
        .from('tickets_techniques')
        .select('*')
        .in('immeuble_id', immeublesIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with immeuble names
      const enrichedTickets = (ticketsData || []).map(t => ({
        ...t,
        immeuble_nom: immeublesData?.find(i => i.id === t.immeuble_id)?.nom
      }));

      setTickets(enrichedTickets);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter tickets
  const getFilteredTickets = (tab: string) => {
    let filtered = tickets;

    // Tab filter
    if (tab === 'ouverts') {
      filtered = filtered.filter(t => !['clos', 'annule', 'resolu'].includes(t.statut || ''));
    } else if (tab === 'resolus') {
      filtered = filtered.filter(t => t.statut === 'resolu');
    } else if (tab === 'clos') {
      filtered = filtered.filter(t => ['clos', 'annule'].includes(t.statut || ''));
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.numero_ticket && t.numero_ticket.includes(searchTerm))
      );
    }

    // Immeuble filter
    if (immeubleFilter !== 'all') {
      filtered = filtered.filter(t => t.immeuble_id === immeubleFilter);
    }

    // Priorite filter
    if (prioriteFilter !== 'all') {
      filtered = filtered.filter(t => t.priorite === prioriteFilter);
    }

    return filtered;
  };

  // Stats
  const ticketsOuverts = tickets.filter(t => !['clos', 'annule', 'resolu'].includes(t.statut || '')).length;
  const ticketsUrgents = tickets.filter(t => t.priorite === 'urgente' && !['clos', 'annule', 'resolu'].includes(t.statut || '')).length;
  const ticketsResolus = tickets.filter(t => t.statut === 'resolu').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Tickets techniques"
        subtitle="Gestion des demandes d'intervention"
        icon={Wrench}
        action={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau ticket
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className={ticketsUrgents > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${ticketsUrgents > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${ticketsUrgents > 0 ? 'text-destructive' : ''}`}>{ticketsUrgents}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Urgents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold">{ticketsOuverts}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold">{ticketsResolus}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Résolus</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, description, numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={immeubleFilter} onValueChange={setImmeubleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Immeuble" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les immeubles</SelectItem>
                {immeubles.map(imm => (
                  <SelectItem key={imm.id} value={imm.id}>{imm.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={prioriteFilter} onValueChange={setPrioriteFilter}>
              <SelectTrigger className="w-full md:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="basse">Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="ouverts" className="gap-2">
            En cours
            {ticketsOuverts > 0 && <Badge variant="secondary">{ticketsOuverts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resolus">Résolus</TabsTrigger>
          <TabsTrigger value="clos">Clos</TabsTrigger>
          <TabsTrigger value="tous">Tous</TabsTrigger>
        </TabsList>

        {['ouverts', 'resolus', 'clos', 'tous'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {getFilteredTickets(tab).length === 0 ? (
              <PremiumEmptyState
                icon={Wrench}
                title="Aucun ticket"
                description={
                  tab === 'ouverts' 
                    ? "Aucun ticket en cours. Tout est en ordre !" 
                    : "Aucun ticket dans cette catégorie."
                }
                action={tab === 'ouverts' ? (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un ticket
                  </Button>
                ) : undefined}
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {getFilteredTickets(tab).map((ticket) => (
                  <PremiumTicketTechniqueCard
                    key={ticket.id}
                    ticket={ticket}
                    immeubleName={ticket.immeuble_nom}
                    onClick={() => navigate(`/proprietaire/tickets/${ticket.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadData}
      />
    </div>
  );
}
