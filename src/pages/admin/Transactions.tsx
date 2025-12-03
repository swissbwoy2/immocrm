import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Transactions = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadTransactions();
  }, [user?.id, userRole]);

  const loadTransactions = async () => {
    try {
      // Récupérer toutes les transactions avec les relations via foreign keys explicites
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*, clients!fk_transactions_client(user_id), agents!fk_transactions_agent(user_id)')
        .order('date_transaction', { ascending: false });
      
      if (transError) {
        console.error('Erreur transactions:', transError);
      }
      
      setTransactions(transactionsData || []);

      // Récupérer tous les profils nécessaires
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

  const getClientName = (transaction: any) => {
    const profile = transaction.clients?.user_id ? profiles.get(transaction.clients.user_id) : null;
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getAgentName = (transaction: any) => {
    const profile = transaction.agents?.user_id ? profiles.get(transaction.agents.user_id) : null;
    return profile ? `${profile.prenom} ${profile.nom}` : "Agent inconnu";
  };

  const transactionsConclues = transactions.filter(t => t.statut === 'conclue');
  const totalCommissions = transactionsConclues.reduce((sum, t) => sum + (t.commission_totale || 0), 0);
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Commissions totales</p>
                  <p className="text-lg md:text-2xl font-bold">CHF {totalCommissions.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Part agents</p>
                  <p className="text-lg md:text-2xl font-bold">CHF {totalAgentPart.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-secondary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Part agence</p>
                  <p className="text-lg md:text-2xl font-bold">CHF {totalAgencyPart.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4">
            {transactions.length === 0 ? (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Aucune transaction enregistrée</p>
                  <p className="text-sm mt-1">Les transactions apparaîtront ici une fois conclues</p>
                </div>
              </Card>
            ) : (
              transactions.map((transaction) => {
                return (
                  <Card key={transaction.id} className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{getClientName(transaction)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Agent: {getAgentName(transaction)}
                          </p>
                        </div>
                        <Badge variant={
                          transaction.statut === 'conclue' ? 'default' : 
                          transaction.statut === 'en_cours' ? 'secondary' : 
                          'destructive'
                        }>
                          {transaction.statut === 'conclue' ? 'Conclue' : 
                           transaction.statut === 'en_cours' ? 'En cours' : 
                           'Annulée'}
                        </Badge>
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

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Conclue le {new Date(transaction.date_transaction).toLocaleDateString('fr-CH')}
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
