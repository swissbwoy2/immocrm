import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar as CalendarIcon, Trash2, CheckCircle2, Clock, Building2, Target, Wallet, RefreshCw, ArrowDownLeft, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateDaysElapsed } from "@/utils/calculations";
import { AgencyProjectionSection } from "@/components/admin/AgencyProjectionSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { isClientActif, useUsersAvecCreditsMandat } from '@/lib/activeClients';
import { Calendar } from "@/components/ui/calendar";
import { DashPage, DashPageHeader, DashFilterPills, DashEmptyState, DashBadge, DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
import { FinanceStat, NextAction, DelaiPill, SearchField, ToggleDetails, Ligne, TableCard } from "@/components/admin/finances/FinanceParts";
import {
  chf, dateCH, joursDepuis, libelleJours, estCeMois, pluriel, dansPeriode, PERIODES,
  etapeTransaction, prochaineActionTransaction, etapeAcompte, prochaineActionAcompte, RETARD_COMMISSION_JOURS,
  type EtapeTransaction, type EtapeAcompte, type PeriodeKey,
} from "@/components/admin/finances/financeModel";
import { cn } from "@/lib/utils";

type VueTransactions = 'en_retard' | 'a_encaisser' | 'en_cours' | 'payees' | 'toutes' | 'acomptes';
type VueAcomptes = EtapeAcompte | 'tous';
type TriTransactions = 'urgence' | 'recent' | 'oldest' | 'montant';

const ORDRE_ETAPES: EtapeTransaction[] = ['en_retard', 'a_encaisser', 'en_cours', 'payees', 'annulees'];

const STATUT_TRANSACTION: Record<string, { label: string; tone: 'primary' | 'neutral' | 'danger' }> = {
  conclue: { label: 'Conclue', tone: 'primary' },
  en_cours: { label: 'En cours', tone: 'neutral' },
};

const STATUT_ACOMPTE: Record<string, { label: string; tone: 'neutral' | 'success' | 'danger' }> = {
  paye: { label: 'Payé', tone: 'neutral' },
  acquis: { label: 'Acquis', tone: 'success' },
  ristourne: { label: 'Ristourné', tone: 'danger' },
};

const Transactions = () => {
  const usersAvecCreditsMandat = useUsersAvecCreditsMandat();
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
  const clientsActifsPourProjection = clients.filter(c => isClientActif(c, usersAvecCreditsMandat));

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

  // ─── Affichage : file de travail par étape (calculs purement visuels) ───
  const [vue, setVue] = useState<VueTransactions>('a_encaisser');
  const [vueChoisie, setVueChoisie] = useState(false);
  const [vueAcomptes, setVueAcomptes] = useState<VueAcomptes>('a_decider');
  const [q, setQ] = useState('');
  const [tri, setTri] = useState<TriTransactions>('urgence');
  const [periode, setPeriode] = useState<PeriodeKey>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showProjection, setShowProjection] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadTransactions(), loadClientsAndAgents(), loadAcomptes()]);
    } finally {
      setRefreshing(false);
    }
  };

  const qn = q.trim().toLowerCase();
  const transactionsVisibles = useMemo(() => transactions.filter((t) => {
    if (!dansPeriode(t.date_transaction, periode)) return false;
    if (!qn) return true;
    return `${getClientName(t)} ${getAgentName(t)} ${t.adresse ?? ''}`.toLowerCase().includes(qn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [transactions, profiles, qn, periode]);

  const acomptesVisibles = useMemo(() => acomptes.filter((a) => {
    if (!dansPeriode(a.date_paiement, periode)) return false;
    if (!qn) return true;
    return `${a.client_name ?? ''} ${a.agent_name ?? ''}`.toLowerCase().includes(qn);
  }), [acomptes, qn, periode]);

  const parEtape = useMemo(() => {
    const m: Record<EtapeTransaction, any[]> = { en_retard: [], a_encaisser: [], en_cours: [], payees: [], annulees: [] };
    for (const t of transactionsVisibles) m[etapeTransaction(t)].push(t);
    return m;
  }, [transactionsVisibles]);

  const acomptesParEtape = useMemo(() => {
    const m: Record<EtapeAcompte, any[]> = { a_decider: [], acquis: [], ristournes: [] };
    for (const a of acomptesVisibles) m[etapeAcompte(a)].push(a);
    return m;
  }, [acomptesVisibles]);

  // Onglet par défaut : ce qui attend une action (en retard d'abord), choisi une seule fois après le chargement.
  useEffect(() => {
    if (loading || vueChoisie) return;
    setVue(parEtape.en_retard.length > 0 ? 'en_retard' : parEtape.a_encaisser.length > 0 ? 'a_encaisser' : acomptesParEtape.a_decider.length > 0 ? 'acomptes' : 'toutes');
    setVueChoisie(true);
  }, [loading, vueChoisie, parEtape, acomptesParEtape]);

  const listeTransactions = useMemo(() => {
    const arr = vue === 'toutes' ? [...transactionsVisibles] : vue === 'acomptes' ? [] : [...parEtape[vue]];
    const t = (x: any) => new Date(x.date_transaction || 0).getTime();
    if (tri === 'urgence') arr.sort((a, b) => ORDRE_ETAPES.indexOf(etapeTransaction(a)) - ORDRE_ETAPES.indexOf(etapeTransaction(b)) || t(a) - t(b));
    else if (tri === 'montant') arr.sort((a, b) => (b.commission_totale || 0) - (a.commission_totale || 0));
    else arr.sort((a, b) => (tri === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    return arr;
  }, [vue, transactionsVisibles, parEtape, tri]);

  const listeAcomptes = useMemo(() => {
    const arr = vueAcomptes === 'tous' ? [...acomptesVisibles] : [...acomptesParEtape[vueAcomptes]];
    const t = (x: any) => new Date(x.date_paiement || 0).getTime();
    if (tri === 'montant') arr.sort((a, b) => (b.montant || 0) - (a.montant || 0));
    else arr.sort((a, b) => (tri === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    return arr;
  }, [vueAcomptes, acomptesVisibles, acomptesParEtape, tri]);

  // Synthèse (sur toutes les données chargées)
  const payeesCeMois = transactionsPayees.filter((t) => estCeMois(t.date_paiement_commission));
  const encaisseCeMois = payeesCeMois.reduce((s, t) => s + (t.commission_totale || 0), 0);
  const enRetardTous = transactionsEnAttente.filter((t) => etapeTransaction(t) === 'en_retard');
  const totalEnRetard = enRetardTous.reduce((s, t) => s + (t.commission_totale || 0), 0);

  const paymentTransaction = transactions.find((t) => t.id === paymentDialogOpen) ?? null;
  const deleteTransaction = transactions.find((t) => t.id === deleteId) ?? null;
  const acquisAcompte = acomptes.find((a) => a.id === acquisDialogOpen) ?? null;
  const ristourneAcompte = acomptes.find((a) => a.id === ristourneDialogOpen) ?? null;

  if (loading) {
    return (
      <div className="p-4 md:p-8" role="status" aria-label="Chargement des transactions">
        <div className="h-7 w-44 rounded bg-muted/60" />
        <div className="mt-6 h-24 rounded bg-muted/40" />
      </div>
    );
  }

  const ouvrirPaiement = (transaction: any) => {
    setSelectedPaymentDate(new Date());
    setPaymentDialogOpen(transaction.id);
  };

  const statutBadge = (transaction: any) => {
    const s = STATUT_TRANSACTION[transaction.statut] ?? { label: 'Annulée', tone: 'danger' as const };
    return <DashBadge tone={s.tone}>{s.label}</DashBadge>;
  };

  const boutonSupprimer = (transaction: any, compact = false) => (
    <Button
      variant="outline"
      className={cn(
        "shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive",
        compact ? "h-9 w-9 p-0" : "h-11 w-11 p-0",
      )}
      aria-label="Supprimer la transaction"
      onClick={() => setDeleteId(transaction.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  const actionPrincipale = (transaction: any, compact = false) => {
    if (transaction.commission_payee) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Payée le {dateCH(transaction.date_paiement_commission)}
        </span>
      );
    }
    const enRetard = etapeTransaction(transaction) === 'en_retard';
    return (
      <Button
        variant={transaction.statut === 'conclue' ? 'default' : 'outline'}
        className={cn("rounded-full", compact ? "h-9" : "h-11 flex-1")}
        onClick={() => ouvrirPaiement(transaction)}
      >
        {enRetard ? <AlertTriangle className="mr-2 h-4 w-4" /> : <Clock className="mr-2 h-4 w-4" />}
        Marquer payée
      </Button>
    );
  };

  const vides: Record<VueTransactions, string> = {
    en_retard: `Aucune commission en retard (plus de ${RETARD_COMMISSION_JOURS} jours)`,
    a_encaisser: 'Aucune commission à encaisser',
    en_cours: 'Aucune transaction en cours',
    payees: 'Aucune commission payée',
    toutes: 'Aucune transaction enregistrée',
    acomptes: 'Aucun acompte',
  };

  const filtresActifs = !!qn || periode !== 'all';

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Transactions"
        subtitle={
          <>
            {chf(encaisseCeMois)} encaissés ce mois
            {` · ${chf(totalCommissions - totalCommissionsPayees)} à encaisser`}
            {enRetardTous.length > 0 && ` · ${pluriel(enRetardTous.length, 'commission')} en retard`}
            {acomptesPayes.length > 0 && ` · ${pluriel(acomptesPayes.length, 'acompte')} à décider`}
          </>
        }
        action={
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={refresh} disabled={refreshing} aria-label="Actualiser">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Synthèse */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <FinanceStat icon={Wallet} tone="success" label="Encaissé ce mois" value={chf(encaisseCeMois)} hint={pluriel(payeesCeMois.length, 'commission')} onClick={() => setVue('payees')} />
        <FinanceStat icon={Clock} tone="primary" label="À encaisser" value={chf(totalCommissions - totalCommissionsPayees)} hint={pluriel(transactionsEnAttente.length, 'transaction')} onClick={() => setVue('a_encaisser')} active={vue === 'a_encaisser'} />
        <FinanceStat icon={AlertTriangle} tone={enRetardTous.length > 0 ? 'warning' : 'muted'} label={`En retard (> ${RETARD_COMMISSION_JOURS} j)`} value={chf(totalEnRetard)} hint={pluriel(enRetardTous.length, 'transaction')} onClick={() => setVue('en_retard')} active={vue === 'en_retard'} />
        <FinanceStat icon={DollarSign} tone="primary" label="Commissions réalisées" value={chf(totalCommissions)} hint={`dont ${chf(totalCommissionsPayees)} payées (${transactionsPayees.length})`} />
        <FinanceStat icon={Building2} tone="primary" label="Potentiel agence" value={chf(totalCommissionAgence)} hint={`${clientsActifsPourProjection.length} mandat${clientsActifsPourProjection.length > 1 ? 's' : ''} actif${clientsActifsPourProjection.length > 1 ? 's' : ''}`} onClick={() => setShowProjection((v) => !v)} active={showProjection} />
        <FinanceStat icon={Target} tone="primary" label="Taux conversion" value={`${tauxConversion}%`} hint="réalisé / potentiel" />
      </div>

      {/* Projection détaillée (repliable) */}
      <section aria-label="Projection de l'agence">
        <ToggleDetails open={showProjection} onToggle={() => setShowProjection((v) => !v)}>
          Projection de l'agence · {chf(totalCommissionAgence)} sur {clientsActifsPourProjection.length} mandat{clientsActifsPourProjection.length > 1 ? 's' : ''} actif{clientsActifsPourProjection.length > 1 ? 's' : ''}
        </ToggleDetails>
        {showProjection && (
          <div className="mt-3">
            <AgencyProjectionSection
              projections={agencyProjections}
              totalCommissionAgence={totalCommissionAgence}
            />
          </div>
        )}
      </section>

      {/* Barre d'outils */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SearchField value={q} onChange={setQ} placeholder="Client, agent, adresse…" label="Rechercher une transaction ou un acompte" />
        <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
          <Select value={tri} onValueChange={(v) => setTri(v as TriTransactions)}>
            <SelectTrigger className="h-11 rounded-full md:w-[190px]" aria-label="Trier"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="urgence">Urgent d’abord</SelectItem>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="oldest">Plus anciennes</SelectItem>
              <SelectItem value="montant">Montant décroissant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periode} onValueChange={(v) => setPeriode(v as PeriodeKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[180px]" aria-label="Période"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DashFilterPills
        label="Étapes des transactions"
        value={vue}
        onChange={(v) => setVue(v as VueTransactions)}
        options={[
          { key: 'en_retard', label: 'En retard', count: parEtape.en_retard.length },
          { key: 'a_encaisser', label: 'À encaisser', count: parEtape.a_encaisser.length },
          { key: 'en_cours', label: 'En cours', count: parEtape.en_cours.length },
          { key: 'payees', label: 'Payées', count: parEtape.payees.length },
          { key: 'toutes', label: 'Toutes', count: transactionsVisibles.length },
          { key: 'acomptes', label: 'Acomptes', count: acomptesVisibles.length },
        ]}
      />

      {vue !== 'acomptes' ? (
        listeTransactions.length === 0 ? (
          <DashEmptyState
            icon={DollarSign}
            title={filtresActifs ? 'Aucun résultat pour ces filtres' : vides[vue]}
            description={vue === 'toutes' && !filtresActifs ? 'Les transactions apparaîtront ici une fois conclues' : undefined}
          />
        ) : (
          <>
            {/* Mobile et tablette : une carte par transaction */}
            <div className="grid gap-3 md:grid-cols-2 lg:hidden">
              {listeTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  clientName={getClientName(transaction)}
                  agentName={getAgentName(transaction)}
                  statut={statutBadge(transaction)}
                  action={actionPrincipale(transaction)}
                  supprimer={boutonSupprimer(transaction)}
                />
              ))}
            </div>

            {/* PC : registre dense */}
            <div className="hidden lg:block">
              <TableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Conclue le</TableHead>
                      <TableHead className="text-right">Montant annuel</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Part agent</TableHead>
                      <TableHead className="text-right">Part agence</TableHead>
                      <TableHead>Prochaine action</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listeTransactions.map((transaction) => {
                      const enRetard = etapeTransaction(transaction) === 'en_retard';
                      return (
                        <TableRow key={transaction.id} className={cn(enRetard && 'bg-amber-500/5')}>
                          <TableCell className="max-w-[220px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-foreground">{getClientName(transaction)}</span>
                              {statutBadge(transaction)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">Agent: {getAgentName(transaction)}</div>
                            {transaction.adresse && <div className="truncate text-xs text-muted-foreground">{transaction.adresse}</div>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {dateCH(transaction.date_transaction)}
                            {!transaction.commission_payee && transaction.statut === 'conclue' && (
                              <div className="mt-1"><DelaiPill label={libelleJours(joursDepuis(transaction.date_transaction))} alerte={enRetard} /></div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{chf(transaction.montant_total)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-primary">{chf(transaction.commission_totale)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{chf(transaction.part_agent)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{chf(transaction.part_agence)}</TableCell>
                          <TableCell className="max-w-[240px]"><NextAction action={prochaineActionTransaction(transaction)} className="text-xs" /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {actionPrincipale(transaction, true)}
                              {boutonSupprimer(transaction, true)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableCard>
            </div>
          </>
        )
      ) : (
        <div className="space-y-4">
          {/* Synthèse acomptes */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FinanceStat icon={Wallet} tone="primary" label="Acomptes encaissés" value={chf(totalAcomptesEncaisses)} hint={pluriel(acomptes.length, 'acompte')} onClick={() => setVueAcomptes('tous')} active={vueAcomptes === 'tous'} />
            <FinanceStat icon={CheckCircle2} tone="success" label="Acomptes acquis" value={chf(totalAcomptesAcquis)} hint={`${acomptesAcquis.length} acquis`} onClick={() => setVueAcomptes('acquis')} active={vueAcomptes === 'acquis'} />
            <FinanceStat icon={ArrowDownLeft} tone="warning" label="Ristournes" value={chf(totalRistournes)} hint={`${acomptesRistournes.length} ristourné${acomptesRistournes.length > 1 ? 's' : ''}`} onClick={() => setVueAcomptes('ristournes')} active={vueAcomptes === 'ristournes'} />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Étapes des acomptes">
            {([
              { key: 'a_decider', label: 'À décider', count: acomptesParEtape.a_decider.length },
              { key: 'acquis', label: 'Acquis', count: acomptesParEtape.acquis.length },
              { key: 'ristournes', label: 'Ristournés', count: acomptesParEtape.ristournes.length },
              { key: 'tous', label: 'Tous', count: acomptesVisibles.length },
            ] as { key: VueAcomptes; label: string; count: number }[]).map((o) => (
              <button
                key={o.key}
                type="button"
                role="tab"
                aria-selected={vueAcomptes === o.key}
                onClick={() => setVueAcomptes(o.key)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  vueAcomptes === o.key ? 'border-foreground/80 bg-muted text-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {o.label} <span className="text-xs text-muted-foreground">{o.count}</span>
              </button>
            ))}
          </div>

          {listeAcomptes.length === 0 ? (
            <DashEmptyState
              icon={Wallet}
              title={filtresActifs ? 'Aucun résultat pour ces filtres' : acomptes.length === 0 ? 'Aucun acompte enregistré' : 'Aucun acompte dans cette étape'}
              description={acomptes.length === 0 ? 'Les acomptes apparaîtront ici une fois payés par les clients' : undefined}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {listeAcomptes.map((acompte) => {
                const s = STATUT_ACOMPTE[acompte.statut] ?? STATUT_ACOMPTE.ristourne;
                return (
                  <article key={acompte.id} className={cn(DASH_CARD, 'flex flex-col gap-3 p-4 md:p-5')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-foreground">{acompte.client_name || 'Client inconnu'}</p>
                        <p className="truncate text-xs text-muted-foreground">Agent: {acompte.agent_name || 'Non assigné'}</p>
                      </div>
                      <DashBadge tone={s.tone}>{s.label}</DashBadge>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-xl font-semibold tabular-nums text-foreground">{chf(acompte.montant || 300)}</p>
                      <div className="text-right text-xs text-muted-foreground">
                        {acompte.date_paiement && (
                          <p className="inline-flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Payé le {dateCH(acompte.date_paiement)}</p>
                        )}
                        {acompte.statut === 'ristourne' && acompte.date_ristourne && (
                          <p className="flex items-center justify-end gap-1 text-amber-700 dark:text-amber-400"><ArrowDownLeft className="h-3.5 w-3.5" /> Ristourné le {dateCH(acompte.date_ristourne)}</p>
                        )}
                      </div>
                    </div>
                    <NextAction action={prochaineActionAcompte(acompte)} />
                    {acompte.statut === 'paye' && (
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <Button className="h-11 rounded-full md:h-10" onClick={() => setAcquisDialogOpen(acompte.id)}>
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Acquis
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 rounded-full md:h-10"
                          onClick={() => {
                            setSelectedRistourneDate(new Date());
                            setRistourneDialogOpen(acompte.id);
                          }}
                        >
                          <ArrowDownLeft className="mr-1.5 h-4 w-4" />
                          Ristourner
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Suppression d'une transaction */}
      <AlertDialog open={!!deleteTransaction} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La transaction de <strong>{deleteTransaction ? getClientName(deleteTransaction) : ''}</strong>
              {deleteTransaction?.adresse && <> ({deleteTransaction.adresse})</>} pour un montant de <strong>{chf(deleteTransaction?.commission_totale)}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTransaction) handleDeleteTransaction(deleteTransaction.id); setDeleteId(null); }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Paiement d'une commission */}
      <Dialog
        open={!!paymentTransaction}
        onOpenChange={(open) => {
          if (!open) setPaymentDialogOpen(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Marquer la commission de <strong>{chf(paymentTransaction?.commission_totale)}</strong> comme payée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date du paiement</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 w-full justify-start rounded-full text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedPaymentDate, "dd.MM.yyyy", { locale: fr })}
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

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setPaymentDialogOpen(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => paymentTransaction && handleMarkCommissionPaid(paymentTransaction.id, selectedPaymentDate)}
              className="rounded-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acompte acquis */}
      <AlertDialog
        open={!!acquisAcompte}
        onOpenChange={(open) => { if (!open) setAcquisDialogOpen(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer l'acompte comme acquis ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'acompte de <strong>CHF {acquisAcompte?.montant}</strong> de <strong>{acquisAcompte?.client_name}</strong> sera considéré comme revenu acquis (client ayant arrêté sa recherche).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => acquisAcompte && handleMarquerAcquis(acquisAcompte.id)}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ristourne d'un acompte */}
      <Dialog
        open={!!ristourneAcompte}
        onOpenChange={(open) => { if (!open) setRistourneDialogOpen(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ristourner l'acompte</DialogTitle>
            <DialogDescription>
              Rembourser l'acompte de <strong>CHF {ristourneAcompte?.montant}</strong> à <strong>{ristourneAcompte?.client_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de la ristourne</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 w-full justify-start rounded-full text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedRistourneDate, "dd.MM.yyyy", { locale: fr })}
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
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setRistourneDialogOpen(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => ristourneAcompte && handleRistourne(ristourneAcompte.id, selectedRistourneDate)}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
            >
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Confirmer la ristourne
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashPage>
  );
};

/**
 * Une transaction = une carte (mobile et tablette) : client, montants, délai,
 * UNE prochaine action et le bouton correspondant ; répartition repliable.
 */
function TransactionCard({ transaction, clientName, agentName, statut, action, supprimer }: {
  transaction: any;
  clientName: string;
  agentName: string;
  statut: ReactNode;
  action: ReactNode;
  supprimer: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const etape = etapeTransaction(transaction);
  const enRetard = etape === 'en_retard';
  return (
    <article className={cn(DASH_CARD, 'flex flex-col gap-3 p-4 md:p-5', enRetard && 'ring-1 ring-amber-500/40')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{clientName}</p>
          <p className="truncate text-xs text-muted-foreground">Agent: {agentName}</p>
          {transaction.adresse && <p className="line-clamp-2 text-xs text-muted-foreground">{transaction.adresse}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {statut}
          {(etape === 'a_encaisser' || enRetard) && (
            <DelaiPill label={libelleJours(joursDepuis(transaction.date_transaction))} alerte={enRetard} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 px-3 py-2">
        <div>
          <p className="text-xs text-muted-foreground">Commission totale</p>
          <p className="text-base font-semibold tabular-nums text-primary">{chf(transaction.commission_totale)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Conclue le</p>
          <p className="text-sm font-medium text-foreground">{dateCH(transaction.date_transaction)}</p>
        </div>
      </div>

      <NextAction action={prochaineActionTransaction(transaction)} />

      <div>
        <ToggleDetails open={ouvert} onToggle={() => setOuvert((o) => !o)}>Répartition</ToggleDetails>
        {ouvert && (
          <div className="mt-1 space-y-1.5 rounded-lg bg-muted/50 p-3">
            <Ligne label="Montant total (annuel)">{chf(transaction.montant_total)}</Ligne>
            <Ligne label="Part agent">{chf(transaction.part_agent)}</Ligne>
            <Ligne label="Part agence">{chf(transaction.part_agence)}</Ligne>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        {action}
        {supprimer}
      </div>
    </article>
  );
}

export default Transactions;
