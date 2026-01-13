import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar as CalendarIcon, Trash2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadTransactions();
  }, [user?.id, userRole]);

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
  const transactionsPayees = transactions.filter(t => t.statut === 'conclue' && t.commission_payee);
  const transactionsEnAttente = transactions.filter(t => t.statut === 'conclue' && !t.commission_payee);
  const totalCommissions = transactionsConclues.reduce((sum, t) => sum + (t.commission_totale || 0), 0);
  const totalCommissionsPayees = transactionsPayees.reduce((sum, t) => sum + (t.commission_totale || 0), 0);
  const totalAgentPart = transactionsConclues.reduce((sum, t) => sum + (t.part_agent || 0), 0);
  const totalAgencyPart = transactionsConclues.reduce((sum, t) => sum + (t.part_agence || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Suivi des commissions et transactions - {transactionsConclues.length} affaire{transactionsConclues.length > 1 ? 's' : ''} conclue{transactionsConclues.length > 1 ? 's' : ''}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="card-interactive p-4 md:p-6 animate-fade-in group" style={{ animationDelay: '0ms' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Commissions totales</p>
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
                <div className="p-2 md:p-3 bg-success/10 rounded-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Part agents</p>
                  <p className="text-lg md:text-2xl font-bold group-hover:scale-105 transition-transform origin-left">CHF {totalAgentPart.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>

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
                        
                        {/* Commission payment status */}
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
        </div>
      </div>
    );
  };
  
  export default Transactions;
