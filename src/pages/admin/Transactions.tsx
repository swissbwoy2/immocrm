import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar as CalendarIcon, Trash2, CheckCircle2, Clock, Building2, Target, Wallet, RefreshCw, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateDaysElapsed } from "@/utils/calculations";
import { AgencyProjectionSection } from "@/components/admin/AgencyProjectionSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const Transactions = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [clientAgents, setClientAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<Date>(new Date());

  // Acomptes state
  const [acomptes, setAcomptes] = useState<any[]>([]);
  const [ristourneDialogOpen, setRistourneDialogOpen] = useState<string | null>(null);
  const [selectedRistourneDate, setSelectedRistourneDate] = useState<Date>(new Date());
  const [acquisDialogOpen, setAcquisDialogOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadTransactions();
    loadClientsAndAgents();
    loadAcomptes();
  }, [user?.id, userRole]);

  const loadAcomptes = async () => {
    try {
      const { data, error } = await supabase
        .from('acomptes')
        .select('*, clients!acomptes_client_id_fkey(user_id, demande_mandat_id), agents!acomptes_agent_id_fkey(user_id)')
        .order('date_paiement', { ascending: false });

      if (error) {
        console.error('Erreur acomptes:', error);
        return;
      }

      // Fetch profiles for client/agent names
      const userIds = new Set<string>();
      (data || []).forEach((a: any) => {
        if (a.clients?.user_id) userIds.add(a.clients.user_id);
        if (a.agents?.user_id) userIds.add(a.agents.user_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', Array.from(userIds));

        if (profilesData) {
          const pMap = new Map(profilesData.map(p => [p.id, p]));
          // Also fetch demande_mandat names as fallback
          const demandeIds = (data || [])
            .map((a: any) => a.demande_mandat_id)
            .filter(Boolean);

          let demandesMap = new Map();
          if (demandeIds.length > 0) {
            const { data: demandesData } = await supabase
              .from('demandes_mandat')
              .select('id, prenom, nom')
              .in('id', demandeIds);
            if (demandesData) {
              demandesMap = new Map(demandesData.map(d => [d.id, d]));
            }
          }

          const enriched = (data || []).map((a: any) => {
            const clientProfile = a.clients?.user_id ? pMap.get(a.clients.user_id) : null;
            const demande = a.demande_mandat_id ? demandesMap.get(a.demande_mandat_id) : null;
            const agentProfile = a.agents?.user_id ? pMap.get(a.agents.user_id) : null;
            return {
              ...a,
              client_name: clientProfile 
                ? `${clientProfile.prenom || ''} ${clientProfile.nom || ''}`.trim()
                : demande 
                  ? `${demande.prenom || ''} ${demande.nom || ''}`.trim()
                  : 'Client inconnu',
              agent_name: agentProfile 
                ? `${agentProfile.prenom || ''} ${agentProfile.nom || ''}`.trim()
                : 'Non assigné',
            };
          });
          setAcomptes(enriched);
          return;
        }
      }

      setAcomptes(data || []);
    } catch (error) {
      console.error('Erreur chargement acomptes:', error);
    }
  };

  const handleRistourne = async (acompteId: string, date: Date) => {
    try {
      const { error } = await supabase
        .from('acomptes')
        .update({ statut: 'ristourne', date_ristourne: date.toISOString() })
        .eq('id', acompteId);

      if (error) throw error;
      toast.success('Acompte ristourné avec succès');
      setRistourneDialogOpen(null);
      loadAcomptes();
    } catch (error) {
      console.error('Erreur ristourne:', error);
      toast.error('Erreur lors de la ristourne');
    }
  };

  const handleMarquerAcquis = async (acompteId: string) => {
    try {
      const { error } = await supabase
        .from('acomptes')
        .update({ statut: 'acquis' })
        .eq('id', acompteId);

      if (error) throw error;
      toast.success('Acompte marqué comme acquis');
      setAcquisDialogOpen(null);
      loadAcomptes();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*, clients!fk_transactions_client(user_id), agents!fk_transactions_agent(user_id)')
        .order('date_transaction', { ascending: false });
      
      if (transError) {
        console.error('Erreur transactions:', transError);
      }
      
      setTransactions(transactionsData || []);

      if (transactionsData && transactionsData.length > 0) {
        const userIds = new Set<string>();
        transactionsData.forEach((t: any) => {
          if (t.clients?.user_id) userIds.add(t.clients.user_id);
          if (t.agents?.user_id) userIds.add(t.agents.user_id);
        });

        if (userIds.size > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, prenom, nom')
            .in('id', Array.from(userIds));
          
          if (profilesData) {
            const profilesMap = new Map(profilesData.map(p => [p.id, p]));
            setProfiles(profilesMap);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientsAndAgents = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, user_id, demande_mandat_id, budget_max, statut, agent_id, commission_split, date_ajout, created_at');

      if (clientsError) {
        console.error('Erreur chargement clients:', clientsError);
      }

      const clientUserIds = (clientsData || []).map(c => c.user_id).filter(Boolean);
      const { data: clientProfiles, error: clientProfilesError } = clientUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, prenom, nom')
            .in('id', clientUserIds)
        : { data: [], error: null };

      if (clientProfilesError) {
        console.warn('Impossible de charger les profils clients (RLS / permissions):', clientProfilesError);
      }

      const demandeIds = (clientsData || [])
        .map(c => c.demande_mandat_id)
        .filter(Boolean) as string[];

      const { data: demandesData, error: demandesError } = demandeIds.length > 0
        ? await supabase
            .from('demandes_mandat')
            .select('id, prenom, nom')
            .in('id', demandeIds)
        : { data: [], error: null };

      if (demandesError) {
        console.warn('Impossible de charger les demandes de mandat (fallback noms):', demandesError);
      }

      const profilesMap = new Map((clientProfiles || []).map(p => [p.id, p]));
      const demandesMap = new Map((demandesData || []).map(d => [d.id, d]));

      const clientsWithNames = (clientsData || []).map(client => {
        const profile = profilesMap.get(client.user_id);
        const demande = client.demande_mandat_id ? demandesMap.get(client.demande_mandat_id) : undefined;

        return {
          ...client,
          prenom: profile?.prenom || demande?.prenom || '',
          nom: profile?.nom || demande?.nom || '',
        };
      });

      setClients(clientsWithNames);

      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, user_id');
      
      if (agentsData && agentsData.length > 0) {
        const agentUserIds = agentsData.map(a => a.user_id);
        const { data: agentProfiles } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', agentUserIds);
        
        const agentsWithProfiles = agentsData.map(agent => {
          const profile = agentProfiles?.find(p => p.id === agent.user_id);
          return {
            ...agent,
            prenom: profile?.prenom || '',
            nom: profile?.nom || '',
          };
        });
        setAgents(agentsWithProfiles);
      }

      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id, agent_id, commission_split, is_primary');
      
      setClientAgents(clientAgentsData || []);
    } catch (error) {
      console.error('Erreur chargement clients/agents:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);
      
      if (error) throw error;
      
      toast.success('Transaction supprimée avec succès');
      loadTransactions();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleMarkCommissionPaid = async (transactionId: string, paymentDate: Date) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          commission_payee: true, 
          date_paiement_commission: paymentDate.toISOString() 
        })
        .eq('id', transactionId);
      
      if (error) throw error;
      
      toast.success('Commission marquée comme payée');
      setPaymentDialogOpen(null);
      loadTransactions();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getClientName = (transaction: any) => {
    const profile = transaction.clients?.user_id ? profiles.get(transaction.clients.user_id) : null;
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getAgentName = (transaction: any) => {
    const profile = transaction.agents?.user_id ? profiles.get(transaction.agents.user_id) : null;
    return profile ? `${profile.prenom} ${profile.nom}` : "Agent inconnu";
  };

  const transactionsConclues = transactions.filter(t => t.statut === 'conclue');
  const transactionsEnCours = transactions.filter(t => t.statut === 'en_cours');
  const transactionsPayees = transactions.filter(t => t.statut === 'conclue' && t.commission_payee);
  const transactionsEnAttente = transactions.filter(t => t.statut === 'conclue' && !t.commission_payee);
  const totalCommissions = transactionsConclues.reduce((sum, t) => sum + (t.commission_totale || 0), 0);
  const totalCommissionsEnCours = transactionsEnCours.reduce((sum, t) => sum + (t.commission_totale || 0), 0);
  const totalCommissionsPayees = transactionsPayees.reduce((sum, t) => sum + (t.commission_totale || 0), 0);
  const totalAgentPart = transactionsConclues.reduce((sum, t) => sum + (t.part_agent || 0), 0);
  const totalAgencyPart = transactionsConclues.reduce((sum, t) => sum + (t.part_agence || 0), 0);

  // Acomptes KPIs
  const acomptesPayes = acomptes.filter(a => a.statut === 'paye');
  const acomptesAcquis = acomptes.filter(a => a.statut === 'acquis');
  const acomptesRistournes = acomptes.filter(a => a.statut === 'ristourne');
  const totalAcomptesEncaisses = acomptes.reduce((sum, a) => sum + (a.montant || 0), 0);
  const totalAcomptesAcquis = acomptesAcquis.reduce((sum, a) => sum + (a.montant || 0), 0);
  const totalRistournes = acomptesRistournes.reduce((sum, a) => sum + (a.montant || 0), 0);

  // Calcul de la projection financière de l'agence (clients actifs non relogés)
  const clientsActifsPourProjection = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return c.statut !== 'reloge' && calculateDaysElapsed(dateAjout) <= 90;
  });

  const agencyProjections = clientsActifsPourProjection.map(client => {
    const clientAgent = clientAgents.find(ca => ca.client_id === client.id && ca.is_primary);
    const splitAgent = clientAgent?.commission_split || client.commission_split || 45;
    const budgetMax = client.budget_max || 0;
    const partAgence = Math.round(budgetMax * ((100 - splitAgent) / 100));
    
    const agent = agents.find(a => a.id === client.agent_id);
    const agentName = agent ? `${agent.prenom} ${agent.nom}` : 'Non assigné';
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client';
    
    return {
      clientId: client.id,
      clientName,
      agentName,
      budgetMax,
      commissionSplit: splitAgent,
      partAgence,
    };
  });

  const totalCommissionAgence = agencyProjections.reduce((sum, p) => sum + p.partAgence, 0);
  const tauxConversion = totalCommissionAgence > 0 
    ? Math.round((totalAgencyPart / totalCommissionAgence) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">
              Suivi des commissions et transactions — {transactionsConclues.length} conclue{transactionsConclues.length > 1 ? 's' : ''}
              {transactionsEnCours.length > 0 && ` · ${transactionsEnCours.length} en cours`}
              {acomptes.length > 0 && ` · ${acomptes.length} acompte${acomptes.length > 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="card-interactive p-4 md:p-6 animate-fade-in group" style={{ animationDelay: '0ms' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Commissions réalisées</p>
                  <p className="text-lg md:text-2xl font-bold group-hover:scale-105 transition-transform origin-left">CHF {totalCommissions.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="card-interactive p-4 md:p-6 animate-fade-in group" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-emerald-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Payées</p>
                  <p className="text-lg md:text-2xl font-bold text-emerald-600 group-hover:scale-105 transition-transform origin-left">CHF {totalCommissionsPayees.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{transactionsPayees.length} transaction{transactionsPayees.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </Card>
            <Card className="card-interactive p-4 md:p-6 animate-fade-in group" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-orange-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">En attente</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-600 group-hover:scale-105 transition-transform origin-left">CHF {(totalCommissions - totalCommissionsPayees).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{transactionsEnAttente.length} transaction{transactionsEnAttente.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </Card>
            <Card className="card-interactive p-4 md:p-6 animate-fade-in group" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Potentiel agence</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-600 group-hover:scale-105 transition-transform origin-left">CHF {totalCommissionAgence.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{clientsActifsPourProjection.length} mandat{clientsActifsPourProjection.length > 1 ? 's' : ''} actif{clientsActifsPourProjection.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </Card>
            <Card className="card-interactive p-4 md:p-6 animate-fade-in group" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-violet-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Taux conversion</p>
                  <p className="text-lg md:text-2xl font-bold text-violet-600 group-hover:scale-105 transition-transform origin-left">{tauxConversion}%</p>
                  <p className="text-xs text-muted-foreground">réalisé / potentiel</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Section Projection détaillée */}
          <div className="mb-8">
            <AgencyProjectionSection 
              projections={agencyProjections}
              totalCommissionAgence={totalCommissionAgence}
            />
          </div>

          {/* Tabs: Transactions / Acomptes */}
          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="transactions">
                Transactions ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="acomptes">
                Acomptes ({acomptes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <div className="grid gap-4">
                {transactions.length === 0 ? (
                  <Card className="card-interactive p-12 animate-fade-in" style={{ animationDelay: '150ms' }}>
                    <div className="text-center text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Aucune transaction enregistrée</p>
                      <p className="text-sm mt-1">Les transactions apparaîtront ici une fois conclues</p>
                    </div>
                  </Card>
                ) : (
                  transactions.map((transaction, index) => {
                    return (
                      <Card key={transaction.id} className="card-interactive p-6 animate-fade-in" style={{ animationDelay: `${150 + index * 40}ms`, animationFillMode: 'backwards' }}>
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">{getClientName(transaction)}</h3>
                              <p className="text-sm text-muted-foreground">
                                Agent: {getAgentName(transaction)}
                              </p>
                              {transaction.adresse && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {transaction.adresse}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                transaction.statut === 'conclue' ? 'default' : 
                                transaction.statut === 'en_cours' ? 'secondary' : 
                                'destructive'
                              }>
                                {transaction.statut === 'conclue' ? 'Conclue' : 
                                 transaction.statut === 'en_cours' ? 'En cours' : 
                                 'Annulée'}
                              </Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. La transaction de <strong>{getClientName(transaction)}</strong> 
                                      {transaction.adresse && <> ({transaction.adresse})</>} pour un montant de <strong>CHF {transaction.commission_totale?.toLocaleString()}</strong> sera définitivement supprimée.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteTransaction(transaction.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4 border-t">
                            <div>
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant total (annuel)</p>
                              <p className="text-base md:text-lg font-semibold">CHF {transaction.montant_total.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Commission totale</p>
                              <p className="text-base md:text-lg font-semibold text-primary">CHF {transaction.commission_totale.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Part agent</p>
                              <p className="text-lg md:text-xl font-bold text-success">CHF {transaction.part_agent.toLocaleString()}</p>
                            </div>
                            <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Part agence</p>
                              <p className="text-lg md:text-xl font-bold">CHF {transaction.part_agence.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              Conclue le {new Date(transaction.date_transaction).toLocaleDateString('fr-CH')}
                            </div>
                            
                            {transaction.commission_payee ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Payée le {new Date(transaction.date_paiement_commission).toLocaleDateString('fr-CH')}</span>
                              </div>
                            ) : (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={() => {
                                    setSelectedPaymentDate(new Date());
                                    setPaymentDialogOpen(transaction.id);
                                  }}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Marquer payée
                                </Button>
                                
                                <Dialog 
                                  open={paymentDialogOpen === transaction.id} 
                                  onOpenChange={(open) => {
                                    if (!open) setPaymentDialogOpen(null);
                                  }}
                                >
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Confirmer le paiement</DialogTitle>
                                      <DialogDescription>
                                        Marquer la commission de <strong>CHF {transaction.commission_totale?.toLocaleString()}</strong> comme payée.
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">Date du paiement</label>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {format(selectedPaymentDate, "dd MMMM yyyy", { locale: fr })}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={selectedPaymentDate}
                                              onSelect={(date) => date && setSelectedPaymentDate(date)}
                                              disabled={(date) => date > new Date()}
                                              locale={fr}
                                              initialFocus
                                            />
                                          </PopoverContent>
                                        </Popover>
                                        <p className="text-xs text-muted-foreground">
                                          Sélectionnez la date exacte à laquelle le paiement a été effectué
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setPaymentDialogOpen(null)}>
                                        Annuler
                                      </Button>
                                      <Button 
                                        onClick={() => handleMarkCommissionPaid(transaction.id, selectedPaymentDate)}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Confirmer
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="acomptes">
              {/* Acomptes KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
                <Card className="p-4 md:p-6 animate-fade-in group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                      <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Acomptes encaissés</p>
                      <p className="text-lg md:text-2xl font-bold">CHF {totalAcomptesEncaisses.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{acomptes.length} acompte{acomptes.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 md:p-6 animate-fade-in group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Acomptes acquis</p>
                      <p className="text-lg md:text-2xl font-bold text-emerald-600">CHF {totalAcomptesAcquis.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{acomptesAcquis.length} acquis</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 md:p-6 animate-fade-in group">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-orange-500/10 rounded-lg">
                      <ArrowDownLeft className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Ristournes</p>
                      <p className="text-lg md:text-2xl font-bold text-orange-600">CHF {totalRistournes.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{acomptesRistournes.length} ristourné{acomptesRistournes.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Acomptes list */}
              <div className="grid gap-4">
                {acomptes.length === 0 ? (
                  <Card className="p-12">
                    <div className="text-center text-muted-foreground">
                      <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Aucun acompte enregistré</p>
                      <p className="text-sm mt-1">Les acomptes apparaîtront ici une fois payés par les clients</p>
                    </div>
                  </Card>
                ) : (
                  acomptes.map((acompte, index) => (
                    <Card key={acompte.id} className="card-interactive p-4 md:p-6 animate-fade-in" style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{acompte.client_name || 'Client inconnu'}</h3>
                            <Badge variant={
                              acompte.statut === 'acquis' ? 'default' :
                              acompte.statut === 'ristourne' ? 'destructive' :
                              'secondary'
                            }>
                              {acompte.statut === 'paye' ? 'Payé' :
                               acompte.statut === 'acquis' ? 'Acquis' :
                               'Ristourné'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Agent: {acompte.agent_name || 'Non assigné'}
                          </p>
                          {acompte.date_paiement && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              Payé le {new Date(acompte.date_paiement).toLocaleDateString('fr-CH')}
                            </p>
                          )}
                          {acompte.statut === 'ristourne' && acompte.date_ristourne && (
                            <p className="text-sm text-orange-600 flex items-center gap-1">
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              Ristourné le {new Date(acompte.date_ristourne).toLocaleDateString('fr-CH')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold">CHF {(acompte.montant || 300).toLocaleString()}</p>
                          
                          {acompte.statut === 'paye' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => setAcquisDialogOpen(acompte.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Acquis
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                onClick={() => {
                                  setSelectedRistourneDate(new Date());
                                  setRistourneDialogOpen(acompte.id);
                                }}
                              >
                                <ArrowDownLeft className="h-4 w-4 mr-1" />
                                Ristourner
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Acquis confirmation dialog */}
                      <AlertDialog 
                        open={acquisDialogOpen === acompte.id}
                        onOpenChange={(open) => { if (!open) setAcquisDialogOpen(null); }}
                      >
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Marquer l'acompte comme acquis ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              L'acompte de <strong>CHF {acompte.montant}</strong> de <strong>{acompte.client_name}</strong> sera considéré comme revenu acquis (client ayant arrêté sa recherche).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleMarquerAcquis(acompte.id)}>
                              Confirmer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Ristourne dialog */}
                      <Dialog
                        open={ristourneDialogOpen === acompte.id}
                        onOpenChange={(open) => { if (!open) setRistourneDialogOpen(null); }}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ristourner l'acompte</DialogTitle>
                            <DialogDescription>
                              Rembourser l'acompte de <strong>CHF {acompte.montant}</strong> à <strong>{acompte.client_name}</strong>.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Date de la ristourne</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(selectedRistourneDate, "dd MMMM yyyy", { locale: fr })}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={selectedRistourneDate}
                                    onSelect={(date) => date && setSelectedRistourneDate(date)}
                                    disabled={(date) => date > new Date()}
                                    locale={fr}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setRistourneDialogOpen(null)}>
                              Annuler
                            </Button>
                            <Button
                              onClick={() => handleRistourne(acompte.id, selectedRistourneDate)}
                              className="bg-orange-600 text-white hover:bg-orange-700"
                            >
                              <ArrowDownLeft className="h-4 w-4 mr-2" />
                              Confirmer la ristourne
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  };
  
  export default Transactions;
