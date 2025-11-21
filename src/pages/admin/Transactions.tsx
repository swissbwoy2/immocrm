import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTransactions, getClients, getAgents, getOffres } from "@/utils/localStorage";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

const Transactions = () => {
  const [transactions] = useState(getTransactions());
  const [clients] = useState(getClients());
  const [agents] = useState(getAgents());
  const [offres] = useState(getOffres());

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.prenom} ${client.nom}` : "Inconnu";
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.prenom} ${agent.nom}` : "Inconnu";
  };

  const getOffreDetails = (offreId: string) => {
    return offres.find(o => o.id === offreId);
  };

  const totalCommissions = transactions.reduce((sum, t) => sum + t.commissionBrute, 0);
  const totalAgentPart = transactions.reduce((sum, t) => sum + t.partAgent, 0);
  const totalAgencyPart = transactions.reduce((sum, t) => sum + t.partAgence, 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Suivi des commissions et transactions</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Commissions totales</p>
                  <p className="text-2xl font-bold">CHF {totalCommissions.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Part agents</p>
                  <p className="text-2xl font-bold">CHF {totalAgentPart.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Part agence</p>
                  <p className="text-2xl font-bold">CHF {totalAgencyPart.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4">
            {transactions.map((transaction) => {
              const offre = getOffreDetails(transaction.offreId);
              
              return (
                <Card key={transaction.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{getClientName(transaction.clientId)}</h3>
                        <p className="text-sm text-muted-foreground">
                          Agent: {getAgentName(transaction.agentId)}
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

                    {offre && (
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">Bien: {offre.localisation}</p>
                        <p>{offre.nombrePieces} pièces • {offre.surface}m²</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Loyer brut</p>
                        <p className="text-lg font-semibold">CHF {transaction.loyerBrut.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Commission brute</p>
                        <p className="text-lg font-semibold text-primary">CHF {transaction.commissionBrute.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Part agent ({transaction.splitAgent}%)</p>
                        <p className="text-xl font-bold text-success">CHF {transaction.partAgent.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Part agence ({transaction.splitAgence}%)</p>
                        <p className="text-xl font-bold">CHF {transaction.partAgence.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Créée le {new Date(transaction.dateCreation).toLocaleDateString('fr-FR')}
                      {transaction.dateConclusion && (
                        <span> • Conclue le {new Date(transaction.dateConclusion).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  export default Transactions;
