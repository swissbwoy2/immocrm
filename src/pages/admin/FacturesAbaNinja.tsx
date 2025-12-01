import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Receipt, Clock, Mail, Phone, CheckCircle, Search,
  RefreshCw, Eye, CreditCard, Building2, Home, Loader2,
  Send, BarChart3, TrendingUp, Trash2
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
        return <Badge variant="destructive">En attente</Badge>;
      case 'facture_envoyee':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Facture envoyée</Badge>;
      case 'paye':
        return <Badge variant="default" className="bg-green-600">Payé</Badge>;
      case 'active':
        return <Badge variant="secondary">Activé</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Receipt className="h-7 w-7" />
              Factures AbaNinja
            </h1>
            <p className="text-muted-foreground">Suivi des factures et paiements</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandes.length}</p>
                <p className="text-xs text-muted-foreground">Total factures</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-950">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvoices.length}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidInvoices.length}</p>
                <p className="text-xs text-muted-foreground">Payées</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">CHF encaissés</p>
              </div>
            </div>
          </Card>
          {/* Overdue invoices alert */}
          <Card className={`p-4 ${overdueInvoices.length > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${overdueInvoices.length > 0 ? 'bg-red-100 dark:bg-red-950' : 'bg-gray-100 dark:bg-gray-950'}`}>
                <Clock className={`h-5 w-5 ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : ''}`}>{overdueInvoices.length}</p>
                <p className="text-xs text-muted-foreground">&gt; 7 jours</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Overdue invoices alert banner */}
        {overdueInvoices.length > 0 && (
          <Card className="p-4 bg-red-50 dark:bg-red-950/30 border-red-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    ⚠️ {overdueInvoices.length} facture(s) en attente depuis plus de 7 jours
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Montant total en attente : {overdueInvoices.reduce((sum, d) => sum + getMontant(d), 0).toLocaleString()} CHF
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
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
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Toutes ({demandes.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente ({pendingInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Payées ({paidInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <InvoiceList 
              demandes={filteredDemandes}
              resendingInvoice={resendingInvoice}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              onDelete={(d) => { setDemandeToDelete(d); setDeleteDialogOpen(true); }}
              getStatusBadge={getStatusBadge}
              getMontant={getMontant}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="pending">
            <InvoiceList 
              demandes={filteredDemandes.filter(d => d.statut === 'facture_envoyee')}
              resendingInvoice={resendingInvoice}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              onDelete={(d) => { setDemandeToDelete(d); setDeleteDialogOpen(true); }}
              getStatusBadge={getStatusBadge}
              getMontant={getMontant}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="paid">
            <InvoiceList 
              demandes={filteredDemandes.filter(d => d.statut === 'paye' || d.statut === 'active')}
              resendingInvoice={resendingInvoice}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              onDelete={(d) => { setDemandeToDelete(d); setDeleteDialogOpen(true); }}
              getStatusBadge={getStatusBadge}
              getMontant={getMontant}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Bar Chart - Montants encaissés */}
              <Card className="p-6 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Montants encaissés par mois</h3>
                </div>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="mois" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value.toLocaleString()}`}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => [`${value.toLocaleString()} CHF`, 'Montant']}
                      />
                      <Bar 
                        dataKey="montant" 
                        fill="hsl(142, 76%, 36%)" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>

              {/* Pie Chart - Location vs Achat */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Répartition Location / Achat</h3>
                </div>
                <div className="h-[300px]">
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
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} factures`, 
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {typeRepartition.map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.montant.toLocaleString()} CHF</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Line Chart - Évolution des factures */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Évolution des factures</h3>
              </div>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="mois" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone"
                      dataKey="creees" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      name="Créées"
                    />
                    <Line 
                      type="monotone"
                      dataKey="payees" 
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2 }}
                      name="Payées"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>

            {/* Summary Table */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Récapitulatif mensuel</h3>
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
                        <TableCell className="text-center">
                          <Badge variant="outline">{stat.creees}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-green-600">{stat.payees}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${
                            stat.tauxConversion >= 80 ? 'text-green-600' :
                            stat.tauxConversion >= 50 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {stat.tauxConversion}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {stat.montant.toLocaleString()} CHF
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-center">
                        {monthlyStats.reduce((sum, s) => sum + s.creees, 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {monthlyStats.reduce((sum, s) => sum + s.payees, 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {Math.round(
                          (monthlyStats.reduce((sum, s) => sum + s.payees, 0) /
                          Math.max(monthlyStats.reduce((sum, s) => sum + s.creees, 0), 1)) * 100
                        )}%
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {monthlyStats.reduce((sum, s) => sum + s.montant, 0).toLocaleString()} CHF
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDemande}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface InvoiceListProps {
  demandes: DemandeMandat[];
  resendingInvoice: string | null;
  onResend: (demande: DemandeMandat) => void;
  onMarkAsPaid: (demande: DemandeMandat) => void;
  onDelete: (demande: DemandeMandat) => void;
  getStatusBadge: (statut: string) => JSX.Element;
  getMontant: (demande: DemandeMandat) => number;
  navigate: (path: string) => void;
}

function InvoiceList({ 
  demandes, 
  resendingInvoice, 
  onResend, 
  onMarkAsPaid,
  onDelete,
  getStatusBadge,
  getMontant,
  navigate 
}: InvoiceListProps) {
  if (demandes.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucune facture</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {demandes.map((demande) => (
            <div
              key={demande.id}
              className={`p-4 rounded-lg border ${
                demande.statut === 'facture_envoyee' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20' :
                demande.statut === 'paye' ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20' :
                'bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{demande.prenom} {demande.nom}</p>
                    {getStatusBadge(demande.statut)}
                    {demande.type_recherche === 'Acheter' ? (
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        <Building2 className="h-3 w-3 mr-1" />
                        Achat
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Home className="h-3 w-3 mr-1" />
                        Location
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />{demande.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />{demande.telephone}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <CreditCard className="h-3 w-3" />
                      {getMontant(demande).toLocaleString()} CHF
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-blue-600 font-medium">
                      <Receipt className="h-3 w-3 inline mr-1" />
                      {demande.abaninja_invoice_ref || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Créée le {format(new Date(demande.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    {demande.date_paiement && (
                      <span className="text-green-600">
                        {' '}• Payée le {format(new Date(demande.date_paiement), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                    {!demande.date_paiement && differenceInDays(new Date(), new Date(demande.created_at)) > 7 && (
                      <Badge variant="destructive" className="ml-2">
                        ⚠️ &gt; 7 jours
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/admin/demandes-activation')}
                  >
                    <Eye className="h-4 w-4 mr-1" />Détails
                  </Button>
                  
                  {demande.statut === 'facture_envoyee' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onResend(demande)}
                        disabled={resendingInvoice === demande.id}
                      >
                        {resendingInvoice === demande.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Send className="h-4 w-4 mr-1" />Renvoyer</>
                        )}
                      </Button>
                      <Button size="sm" onClick={() => onMarkAsPaid(demande)}>
                        <CheckCircle className="h-4 w-4 mr-1" />Payé
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(demande)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
