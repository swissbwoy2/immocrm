import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, MapPin, Home, User, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
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
import { PremiumPageShellV2 } from '@/components/dashboard/v2';

const Transactions = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [agent, setAgent] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<Map<string, any>>(new Map());
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    
    loadTransactions();
  }, [user?.id, userRole]);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      // Récupérer l'agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!agentData) {
        setLoading(false);
        return;
      }

      setAgent(agentData);

      // Récupérer les transactions de l'agent
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('agent_id', agentData.id)
        .order('date_transaction', { ascending: false });
      
      if (error) {
        console.error('Erreur transactions:', error);
      }
      
      setTransactions(transactionsData || []);

      // Récupérer les clients associés
      const clientIds = [...new Set((transactionsData || []).map(t => t.client_id).filter(Boolean))];
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, user_id, commission_split')
          .in('id', clientIds);

        if (clientsData) {
          const clientsMap = new Map(clientsData.map(c => [c.id, c]));
          setClients(clientsMap);

          // Récupérer les profils
          const userIds = clientsData.map(c => c.user_id).filter(Boolean);
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, prenom, nom')
              .in('id', userIds);

            if (profilesData) {
              const profilesMap = new Map(profilesData.map(p => [p.id, p]));
              setProfiles(profilesMap);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.get(clientId);
    if (!client) return "Client inconnu";
    const profile = profiles.get(client.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getCommissionSplit = (clientId: string) => {
    const client = clients.get(clientId);
    return client?.commission_split || 50;
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) throw error;
      toast.success('Transaction supprimée');
      loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Calculer les totaux
  const transactionsConclues = transactions.filter(t => t.statut === 'conclue');
  const totalCommissions = transactionsConclues.reduce((sum, t) => sum + (t.part_agent || 0), 0);
  
  // Transactions du mois
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactionsCeMois = transactionsConclues.filter(t => 
    new Date(t.date_transaction) >= startOfMonth
  );
  const commissionsCeMois = transactionsCeMois.reduce((sum, t) => sum + (t.part_agent || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PremiumPageShellV2 className="flex-1 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mes Transactions</h1>
          <p className="text-muted-foreground">
            {transactionsConclues.length} affaire{transactionsConclues.length > 1 ? 's' : ''} conclue{transactionsConclues.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total commissions</p>
                <p className="text-lg md:text-2xl font-bold text-success">CHF {totalCommissions.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Ce mois</p>
                <p className="text-lg md:text-2xl font-bold text-success">CHF {commissionsCeMois.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{transactionsCeMois.length} affaire{transactionsCeMois.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-secondary/10 rounded-lg">
                <Home className="h-5 w-5 md:h-6 md:w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Affaires conclues</p>
                <p className="text-lg md:text-2xl font-bold">{transactionsConclues.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des transactions */}
        <div className="grid gap-4">
          {transactions.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune transaction enregistrée</p>
                <p className="text-sm mt-1">Vos transactions apparaîtront ici une fois les clés remises</p>
              </div>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const commissionSplit = getCommissionSplit(transaction.client_id);
              
              return (
                <Card key={transaction.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-lg">{getClientName(transaction.client_id)}</CardTitle>
                        </div>
                        {transaction.adresse && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {transaction.adresse}
                          </div>
                        )}
                      </div>
                      <Badge variant={transaction.statut === 'conclue' ? 'default' : 'secondary'}>
                        {transaction.statut === 'conclue' ? '✅ Conclue' : transaction.statut}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Détails du bien */}
                    {(transaction.type_bien || transaction.pieces || transaction.surface) && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {transaction.type_bien && (
                          <Badge variant="outline" className="capitalize">{transaction.type_bien}</Badge>
                        )}
                        {transaction.pieces && (
                          <Badge variant="outline">{transaction.pieces} pièces</Badge>
                        )}
                        {transaction.surface && (
                          <Badge variant="outline">{transaction.surface} m²</Badge>
                        )}
                        {transaction.etage && (
                          <Badge variant="outline">{transaction.etage}</Badge>
                        )}
                      </div>
                    )}

                    {/* Détails financiers */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-1">Loyer mensuel</p>
                        <p className="text-base md:text-lg font-semibold">
                          CHF {(transaction.commission_totale || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-1">Commission totale</p>
                        <p className="text-base md:text-lg font-semibold text-primary">
                          CHF {(transaction.commission_totale || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Split de commission */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="p-3 md:p-4 bg-success/10 border border-success/20 rounded-lg">
                        <p className="text-xs md:text-sm text-muted-foreground mb-1">
                          Ma part ({commissionSplit}%)
                        </p>
                        <p className="text-lg md:text-xl font-bold text-success">
                          CHF {(transaction.part_agent || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs md:text-sm text-muted-foreground mb-1">
                          Part agence ({100 - commissionSplit}%)
                        </p>
                        <p className="text-lg md:text-xl font-bold">
                          CHF {(transaction.part_agence || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Conclue le {format(new Date(transaction.date_transaction), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action supprimera la transaction pour {getClientName(transaction.client_id)}{transaction.adresse ? ` à ${transaction.adresse}` : ''}. Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
    </PremiumPageShellV2>
  );
};

export default Transactions;