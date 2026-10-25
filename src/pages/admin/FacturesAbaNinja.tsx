import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Receipt, Clock, Mail, Phone, CheckCircle, Search,
  RefreshCw, Eye, CreditCard, Building2, Home, Loader2,
  Send, BarChart3, TrendingUp, Trash2, AlertTriangle, FileText
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { differenceInDays } from 'date-fns';
import { DashPage, DashPageHeader, DashFilterPills, DashEmptyState, DashBadge, TodoCard, DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { FinanceStat, NextAction, DelaiPill, SearchField, TableCard } from '@/components/admin/finances/FinanceParts';
import {
  chf, dateCH, joursDepuis, libelleJours, estCeMois, pluriel, dansPeriode, PERIODES,
  etapeFacture, prochaineActionFacture, RETARD_FACTURE_JOURS, type EtapeFacture, type PeriodeKey,
} from '@/components/admin/finances/financeModel';
import { cn } from '@/lib/utils';
import { nombreSuisse } from '@/lib/montantSuisse';

type VueFactures = EtapeFacture | 'toutes' | 'stats';
type TriFactures = 'urgence' | 'recent' | 'oldest' | 'montant';
const ORDRE_FACTURES: EtapeFacture[] = ['en_retard', 'a_envoyer', 'envoyees', 'payees'];

interface DemandeMandat {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  statut: string;
  created_at: string;
  type_recherche: string;
  montant_acompte: number;
  date_paiement: string | null;
  abaninja_invoice_id: string | null;
  abaninja_invoice_ref: string | null;
  abaninja_client_uuid: string | null;
}

interface MonthlyStats {
  mois: string;
  monthKey: string;
  creees: number;
  payees: number;
  enAttente: number;
  montant: number;
  tauxConversion: number;
}

export default function FacturesAbaNinja() {
  const [demandes, setDemandes] = useState<DemandeMandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingInvoice, setResendingInvoice] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState<DemandeMandat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all demandes that have invoice info OR are in invoiced/paid status
      const { data, error } = await supabase
        .from('demandes_mandat')
        .select('*')
        .or('abaninja_invoice_id.not.is.null,statut.in.(facture_envoyee,paye,active)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDemandes((data as DemandeMandat[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getMontant = (demande: DemandeMandat) => {
    return demande.type_recherche === 'Acheter' ? 2500 : (demande.montant_acompte || 300);
  };

  const monthlyStats = useMemo(() => {
    const stats: MonthlyStats[] = [];
    const now = new Date();

    // Calculate stats for the last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM yyyy', { locale: fr });

      const monthDemandes = demandes.filter(d => {
        const createdDate = new Date(d.created_at);
        return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      });

      const paidDemandes = demandes.filter(d => {
        if (!d.date_paiement) return false;
        const paidDate = new Date(d.date_paiement);
        return isWithinInterval(paidDate, { start: monthStart, end: monthEnd });
      });

      const montantPaye = paidDemandes.reduce((sum, d) => sum + getMontant(d), 0);
      const creees = monthDemandes.length;
      const payees = paidDemandes.length;
      const tauxConversion = creees > 0 ? Math.round((payees / creees) * 100) : 0;

      stats.push({
        mois: monthLabel,
        monthKey,
        creees,
        payees,
        enAttente: monthDemandes.filter(d => d.statut === 'facture_envoyee').length,
        montant: montantPaye,
        tauxConversion
      });
    }

    return stats;
  }, [demandes]);

  const handleResendInvoice = async (demande: DemandeMandat) => {
    if (!demande.abaninja_invoice_id) {
      toast.error('Pas de facture à renvoyer');
      return;
    }

    try {
      setResendingInvoice(demande.id);

      const { data, error } = await supabase.functions.invoke('resend-abaninja-invoice', {
        body: {
          invoice_uuid: demande.abaninja_invoice_id,
          email: demande.email
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Facture renvoyée par email !');
    } catch (error: any) {
      console.error('Error resending invoice:', error);
      toast.error(error.message || 'Erreur lors du renvoi');
    } finally {
      setResendingInvoice(null);
    }
  };

  const handleMarkAsPaid = async (demande: DemandeMandat) => {
    try {
      const { error } = await supabase
        .from('demandes_mandat')
        .update({ 
          statut: 'paye',
          date_paiement: new Date().toISOString()
        })
        .eq('id', demande.id);

      if (error) throw error;
      toast.success('Paiement enregistré');
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur');
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return <DashBadge tone="warning">En attente</DashBadge>;
      case 'facture_envoyee':
        return <DashBadge tone="primary">Facture envoyée</DashBadge>;
      case 'paye':
        return <DashBadge tone="success">Payé</DashBadge>;
      case 'active':
        return <DashBadge tone="success">Activé</DashBadge>;
      default:
        return <DashBadge tone="neutral">{statut}</DashBadge>;
    }
  };

  const pendingInvoices = demandes.filter(d => d.statut === 'facture_envoyee');
  const paidInvoices = demandes.filter(d => d.statut === 'paye' || d.statut === 'active');
  
  // Invoices pending more than 7 days
  const overdueInvoices = pendingInvoices.filter(d => {
    const daysPending = differenceInDays(new Date(), new Date(d.created_at));
    return daysPending > 7;
  });

  // Pie chart data - Location vs Achat
  const typeRepartition = useMemo(() => {
    const location = demandes.filter(d => d.type_recherche !== 'Acheter').length;
    const achat = demandes.filter(d => d.type_recherche === 'Acheter').length;
    const locationMontant = demandes.filter(d => d.type_recherche !== 'Acheter').reduce((sum, d) => sum + getMontant(d), 0);
    const achatMontant = demandes.filter(d => d.type_recherche === 'Acheter').reduce((sum, d) => sum + getMontant(d), 0);
    
    return [
      { name: 'Location', value: location, montant: locationMontant, color: 'hsl(215, 76%, 56%)' },
      { name: 'Achat', value: achat, montant: achatMontant, color: 'hsl(142, 76%, 36%)' },
    ];
  }, [demandes]);

  const handleSendReminders = async () => {
    try {
      setSendingReminders(true);
      const { data, error } = await supabase.functions.invoke('send-invoice-reminders');
      
      if (error) throw error;
      
      toast.success(`${data.processed} rappels envoyés avec succès`);
      await loadData();
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi des rappels');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleDeleteDemande = async () => {
    if (!demandeToDelete) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('demandes_mandat')
        .delete()
        .eq('id', demandeToDelete.id);

      if (error) throw error;
      
      toast.success('Demande supprimée');
      setDeleteDialogOpen(false);
      setDemandeToDelete(null);
      await loadData();
    } catch (error: any) {
      console.error('Error deleting demande:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDemandes = demandes.filter(demande => 
    `${demande.prenom} ${demande.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    demande.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (demande.abaninja_invoice_ref || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = pendingInvoices.reduce((sum, d) => sum + getMontant(d), 0);
  const totalPaid = paidInvoices.reduce((sum, d) => sum + getMontant(d), 0);

  const chartConfig = {
    creees: {
      label: "Factures créées",
      color: "hsl(var(--primary))",
    },
    payees: {
      label: "Factures payées",
      color: "hsl(142, 76%, 36%)",
    },
    montant: {
      label: "Montant (CHF)",
      color: "hsl(142, 76%, 36%)",
    },
  };

  // ─── Affichage : file de travail par étape (calculs purement visuels) ───
  const [vue, setVue] = useState<VueFactures>('en_retard');
  const [vueChoisie, setVueChoisie] = useState(false);
  const [tri, setTri] = useState<TriFactures>('urgence');
  const [periode, setPeriode] = useState<PeriodeKey>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const visibles = useMemo(
    () => filteredDemandes.filter((d) => dansPeriode(d.created_at, periode)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demandes, searchTerm, periode],
  );

  const parEtape = useMemo(() => {
    const m: Record<EtapeFacture, DemandeMandat[]> = { a_envoyer: [], envoyees: [], en_retard: [], payees: [] };
    for (const d of visibles) m[etapeFacture(d)].push(d);
    return m;
  }, [visibles]);

  // Onglet par défaut : ce qui attend une action, choisi une seule fois après le premier chargement.
  useEffect(() => {
    if (loading || vueChoisie) return;
    setVue(parEtape.en_retard.length > 0 ? 'en_retard' : parEtape.a_envoyer.length > 0 ? 'a_envoyer' : parEtape.envoyees.length > 0 ? 'envoyees' : 'toutes');
    setVueChoisie(true);
  }, [loading, vueChoisie, parEtape]);

  const liste = useMemo(() => {
    if (vue === 'stats') return [];
    const arr = vue === 'toutes' ? [...visibles] : [...parEtape[vue]];
    const t = (d: DemandeMandat) => new Date(d.created_at).getTime();
    if (tri === 'urgence') arr.sort((a, b) => ORDRE_FACTURES.indexOf(etapeFacture(a)) - ORDRE_FACTURES.indexOf(etapeFacture(b)) || t(a) - t(b));
    else if (tri === 'montant') arr.sort((a, b) => getMontant(b) - getMontant(a));
    else arr.sort((a, b) => (tri === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vue, visibles, parEtape, tri]);

  useEffect(() => { setPage(1); }, [vue, searchTerm, periode, tri, pageSize]);
  const paged = useMemo(() => liste.slice((page - 1) * pageSize, page * pageSize), [liste, page, pageSize]);

  const encaisseCeMois = paidInvoices.filter((d) => estCeMois(d.date_paiement)).reduce((s, d) => s + getMontant(d), 0);
  const totalOverdue = overdueInvoices.reduce((sum, d) => sum + getMontant(d), 0);
  const filtresActifs = !!searchTerm || periode !== 'all';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const boutonRappels = (
    <Button
      className="h-11 w-full rounded-full sm:w-auto md:h-10"
      onClick={handleSendReminders}
      disabled={sendingReminders}
    >
      {sendingReminders ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Envoi...
        </>
      ) : (
        <>
          <Send className="h-4 w-4 mr-2" />
          Envoyer les rappels
        </>
      )}
    </Button>
  );

  const vides: Record<Exclude<VueFactures, 'stats'>, string> = {
    en_retard: `Aucune facture impayée depuis plus de ${RETARD_FACTURE_JOURS} jours`,
    a_envoyer: 'Aucune facture à envoyer',
    envoyees: 'Aucune facture envoyée en attente de paiement',
    payees: 'Aucune facture payée',
    toutes: 'Aucune facture',
  };

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Factures AbaNinja"
        subtitle={
          <>
            {chf(encaisseCeMois)} encaissés ce mois
            {pendingInvoices.length > 0 && ` · ${chf(totalPending)} en attente (${pendingInvoices.length})`}
            {overdueInvoices.length > 0 && ` · ${pluriel(overdueInvoices.length, 'facture')} en retard`}
          </>
        }
        action={
          <Button onClick={loadData} variant="outline" size="sm" className="h-10 rounded-full" aria-label="Actualiser">
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Synthèse */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FinanceStat icon={Receipt} tone="primary" label="Total factures" value={String(demandes.length)} hint={chf(demandes.reduce((s, d) => s + getMontant(d), 0))} onClick={() => setVue('toutes')} active={vue === 'toutes'} />
        <FinanceStat icon={Clock} tone="primary" label="En attente" value={String(pendingInvoices.length)} hint={chf(totalPending)} onClick={() => setVue('envoyees')} active={vue === 'envoyees'} />
        <FinanceStat icon={AlertTriangle} tone={overdueInvoices.length > 0 ? 'warning' : 'muted'} label={`> ${RETARD_FACTURE_JOURS} jours`} value={String(overdueInvoices.length)} hint={chf(totalOverdue)} onClick={() => setVue('en_retard')} active={vue === 'en_retard'} />
        <FinanceStat icon={CheckCircle} tone="success" label="Payées" value={String(paidInvoices.length)} hint={`${chf(encaisseCeMois)} ce mois`} onClick={() => setVue('payees')} active={vue === 'payees'} />
        <FinanceStat icon={CreditCard} tone="success" label="CHF encaissés" value={chf(totalPaid)} hint="depuis le début" />
      </div>

      {/* Relances groupées */}
      {overdueInvoices.length > 0 && (
        <TodoCard
          icon={Clock}
          title={`${overdueInvoices.length} facture(s) en attente depuis plus de 7 jours`}
          description={`Montant total en attente : ${chf(totalOverdue)}`}
          action={boutonRappels}
        />
      )}

      {/* Barre d'outils */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher par nom, email ou référence..." label="Rechercher une facture" />
        <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
          <Select value={tri} onValueChange={(v) => setTri(v as TriFactures)}>
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
        label="Étapes des factures"
        value={vue}
        onChange={(v) => setVue(v as VueFactures)}
        options={[
          { key: 'en_retard', label: 'En retard', count: parEtape.en_retard.length },
          { key: 'a_envoyer', label: 'À envoyer', count: parEtape.a_envoyer.length },
          { key: 'envoyees', label: 'Envoyées non payées', count: parEtape.envoyees.length },
          { key: 'payees', label: 'Payées', count: parEtape.payees.length },
          { key: 'toutes', label: 'Toutes', count: visibles.length },
          { key: 'stats', label: 'Statistiques' },
        ]}
      />

      {vue === 'stats' ? (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            {/* Montants encaissés */}
            <section className={cn(DASH_CARD, 'p-4 md:col-span-2 md:p-5')}>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><CreditCard className="h-[18px] w-[18px]" /></span>
                <h3 className="text-base font-semibold">Montants encaissés par mois</h3>
              </div>
              <ChartContainer config={chartConfig} className="h-[260px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mois" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => nombreSuisse(Number(value))} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [chf(value), 'Montant']}
                    />
                    <Bar dataKey="montant" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </section>

            {/* Location vs Achat */}
            <section className={cn(DASH_CARD, 'p-4 md:p-5')}>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="h-[18px] w-[18px]" /></span>
                <h3 className="text-base font-semibold">Répartition Location / Achat</h3>
              </div>
              <div className="h-[260px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeRepartition}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeRepartition.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} factures`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {typeRepartition.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{chf(item.montant)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Évolution des factures */}
          <section className={cn(DASH_CARD, 'p-4 md:p-5')}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><TrendingUp className="h-[18px] w-[18px]" /></span>
              <h3 className="text-base font-semibold">Évolution des factures</h3>
            </div>
            <ChartContainer config={chartConfig} className="h-[260px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="creees" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }} name="Créées" />
                  <Line type="monotone" dataKey="payees" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2 }} name="Payées" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </section>

          {/* Récapitulatif mensuel */}
          <section className={cn(DASH_CARD, 'p-4 md:p-5')}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Receipt className="h-[18px] w-[18px]" /></span>
              <h3 className="text-base font-semibold">Récapitulatif mensuel</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-center">Factures créées</TableHead>
                    <TableHead className="text-center">Factures payées</TableHead>
                    <TableHead className="text-center">Taux conversion</TableHead>
                    <TableHead className="text-right">Montant encaissé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyStats.slice().reverse().map((stat) => (
                    <TableRow key={stat.monthKey}>
                      <TableCell className="font-medium capitalize">{stat.mois}</TableCell>
                      <TableCell className="text-center"><DashBadge tone="neutral">{stat.creees}</DashBadge></TableCell>
                      <TableCell className="text-center"><DashBadge tone="success">{stat.payees}</DashBadge></TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${
                          stat.tauxConversion >= 80 ? 'text-emerald-700 dark:text-emerald-400' :
                          stat.tauxConversion >= 50 ? 'text-amber-700 dark:text-amber-400' :
                          'text-destructive'
                        }`}>
                          {stat.tauxConversion}%
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{chf(stat.montant)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-center">{monthlyStats.reduce((sum, s) => sum + s.creees, 0)}</TableCell>
                    <TableCell className="text-center">{monthlyStats.reduce((sum, s) => sum + s.payees, 0)}</TableCell>
                    <TableCell className="text-center">
                      {Math.round(
                        (monthlyStats.reduce((sum, s) => sum + s.payees, 0) /
                        Math.max(monthlyStats.reduce((sum, s) => sum + s.creees, 0), 1)) * 100
                      )}%
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {chf(monthlyStats.reduce((sum, s) => sum + s.montant, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      ) : liste.length === 0 ? (
        <DashEmptyState
          icon={Receipt}
          title={filtresActifs ? 'Aucun résultat pour ces filtres' : vides[vue]}
        />
      ) : (
        <div className="space-y-3">
          {vue === 'en_retard' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Relancez chaque client avec « Renvoyer », ou envoyez tous les rappels d’un coup.</p>
              {boutonRappels}
            </div>
          )}
          {paged.map((demande) => (
            <FactureCard
              key={demande.id}
              demande={demande}
              montant={getMontant(demande)}
              statusBadge={getStatusBadge(demande.statut)}
              resending={resendingInvoice === demande.id}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              onDelete={(d) => { setDemandeToDelete(d); setDeleteDialogOpen(true); }}
              onDetails={() => navigate('/admin/demandes-activation')}
            />
          ))}
          {liste.length > pageSize && (
            <TablePagination
              total={liste.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              label="factures"
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la demande de {demandeToDelete?.prenom} {demandeToDelete?.nom} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDemande}
              disabled={deleting}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashPage>
  );
}

interface FactureCardProps {
  demande: DemandeMandat;
  montant: number;
  statusBadge: JSX.Element;
  resending: boolean;
  onResend: (demande: DemandeMandat) => void;
  onMarkAsPaid: (demande: DemandeMandat) => void;
  onDelete: (demande: DemandeMandat) => void;
  onDetails: () => void;
}

/**
 * Une facture = une carte. Mobile : tout empilé, bouton principal pleine largeur.
 * Grand écran : trois colonnes (client | facture et prochaine action | actions).
 */
function FactureCard({ demande, montant, statusBadge, resending, onResend, onMarkAsPaid, onDelete, onDetails }: FactureCardProps) {
  const etape = etapeFacture(demande);
  const next = prochaineActionFacture(demande);
  const jours = joursDepuis(demande.created_at);
  const enRetard = etape === 'en_retard';
  const envoyee = demande.statut === 'facture_envoyee';

  return (
    <article className={cn(DASH_CARD, 'overflow-hidden', enRetard && 'ring-1 ring-amber-500/40')}>
      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-start lg:gap-6">
        {/* 1. Client */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[15px] font-semibold text-foreground">{demande.prenom} {demande.nom}</p>
            {!demande.date_paiement && (
              <DelaiPill
                label={libelleJours(jours)}
                alerte={differenceInDays(new Date(), new Date(demande.created_at)) > 7}
                title={`Créée le ${format(new Date(demande.created_at), 'dd.MM.yyyy à HH:mm', { locale: fr })}`}
              />
            )}
          </div>
          <a href={`mailto:${demande.email}`} className="flex min-h-[28px] max-w-full items-center gap-1.5 truncate text-sm text-muted-foreground hover:text-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{demande.email}</span>
          </a>
          {demande.telephone && (
            <a href={`tel:${demande.telephone}`} className="flex min-h-[28px] items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />{demande.telephone}
            </a>
          )}
        </div>

        {/* 2. Facture et prochaine action */}
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusBadge}
            {demande.type_recherche === 'Acheter' ? (
              <DashBadge tone="neutral"><Building2 className="mr-1 h-3 w-3" />Achat</DashBadge>
            ) : (
              <DashBadge tone="muted"><Home className="mr-1 h-3 w-3" />Location</DashBadge>
            )}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {demande.abaninja_invoice_ref || 'N/A'}
            </span>
            <span className="text-base font-semibold tabular-nums text-foreground">{chf(montant)}</span>
            <span className="w-full text-xs text-muted-foreground">
              Créée le {dateCH(demande.created_at)}
              {demande.date_paiement && <span className="text-emerald-700 dark:text-emerald-400"> • Payée le {dateCH(demande.date_paiement)}</span>}
            </span>
          </div>
          <NextAction action={next} />
        </div>

        {/* 3. Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-[200px] lg:flex-col lg:flex-nowrap lg:items-stretch">
          {envoyee && (
            <div className="grid grid-cols-2 gap-2 sm:flex lg:flex-col">
              {/* En retard : la relance est l'action principale ; sinon, l'enregistrement du paiement. */}
              <Button
                variant={enRetard ? 'default' : 'outline'}
                className={cn('h-11 rounded-full lg:h-10', enRetard ? 'order-1' : 'order-2')}
                onClick={() => onResend(demande)}
                disabled={resending}
              >
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 h-4 w-4" />Renvoyer</>}
              </Button>
              <Button
                variant={enRetard ? 'outline' : 'default'}
                className={cn('h-11 rounded-full lg:h-10', enRetard ? 'order-2' : 'order-1')}
                onClick={() => onMarkAsPaid(demande)}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />Payé
              </Button>
            </div>
          )}
          <div className="flex gap-2 lg:flex-col">
            <Button
              variant={etape === 'a_envoyer' ? 'default' : 'outline'}
              className="h-11 flex-1 rounded-full lg:h-10 lg:flex-none"
              onClick={onDetails}
            >
              <Eye className="mr-1.5 h-4 w-4" />Détails
            </Button>
            <Button
              variant="outline"
              className="h-11 w-11 shrink-0 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-10 lg:w-auto lg:px-4"
              onClick={() => onDelete(demande)}
              aria-label="Supprimer la demande"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden lg:ml-2 lg:inline">Supprimer</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
