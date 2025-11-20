import { useEffect, useState } from 'react';
import { Users, UserCog, Clock, CheckCircle, AlertTriangle, DollarSign, Send } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser, getAgents, getClients, getTransactions, getOffres } from '@/utils/localStorage';
import { calculateDaysElapsed } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';

const adminMenu = [
  { name: 'Tableau de bord', icon: Users, path: '/admin' },
  { name: 'Agents', icon: UserCog, path: '/admin/agents' },
  { name: 'Clients', icon: Users, path: '/admin/clients' },
  { name: 'Transactions', icon: DollarSign, path: '/admin/transactions' },
  { name: 'Assignations', icon: AlertTriangle, path: '/admin/assignations' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [agents, setAgents] = useState(getAgents());
  const [clients, setClients] = useState(getClients());
  const [transactions, setTransactions] = useState(getTransactions());
  const [offres, setOffres] = useState(getOffres());

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const clientsActifs = clients.filter(c => calculateDaysElapsed(c.dateInscription) <= 90).length;
  const totalAgents = agents.filter(a => a.actif).length;
  const totalOffresEnvoyees = offres.length;
  const transactionsEnCours = transactions.filter(t => t.statut === 'en_cours').length;
  const transactionsConcluesMois = transactions.filter(t => {
    if (t.statut !== 'conclue' || !t.dateConclusion) return false;
    const conclusionDate = new Date(t.dateConclusion);
    const now = new Date();
    return conclusionDate.getMonth() === now.getMonth() && conclusionDate.getFullYear() === now.getFullYear();
  }).length;
  const deadlinesCritiques = clients.filter(c => calculateDaysElapsed(c.dateInscription) >= 90).length;
  const revenusAgenceMois = transactions
    .filter(t => {
      if (t.statut !== 'conclue' || !t.dateConclusion) return false;
      const conclusionDate = new Date(t.dateConclusion);
      const now = new Date();
      return conclusionDate.getMonth() === now.getMonth() && conclusionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + t.partAgence, 0);

  const clientsSansAgent = clients.filter(c => !c.agentId).length;
  const clientsJ60 = clients.filter(c => {
    const days = calculateDaysElapsed(c.dateInscription);
    return days >= 60 && days < 90 && !c.notificationJ60Envoyee;
  }).length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">Vue d'ensemble de l'activité</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard 
              title="Clients actifs" 
              value={clientsActifs} 
              icon={Users}
              onClick={() => navigate('/admin/clients')}
            />
            <KPICard 
              title="Agents" 
              value={totalAgents} 
              icon={UserCog}
              onClick={() => navigate('/admin/agents')}
            />
            <KPICard 
              title="Offres envoyées" 
              value={totalOffresEnvoyees} 
              icon={Send}
            />
            <KPICard 
              title="Transactions en cours" 
              value={transactionsEnCours} 
              icon={Clock}
              onClick={() => navigate('/admin/transactions')}
            />
            <KPICard 
              title="Conclues ce mois" 
              value={transactionsConcluesMois} 
              icon={CheckCircle} 
              variant="success"
              onClick={() => navigate('/admin/transactions')}
            />
            <KPICard 
              title="Deadlines critiques" 
              value={deadlinesCritiques} 
              icon={AlertTriangle} 
              variant={deadlinesCritiques > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/admin/mandats')}
            />
            <KPICard 
              title="Revenus agence" 
              value={`${revenusAgenceMois.toLocaleString()} CHF`} 
              icon={DollarSign} 
              variant="success"
              onClick={() => navigate('/admin/transactions')}
            />
          </div>

          {/* Répartition des agents */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Répartition des clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Clients</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Critiques</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Commission pot.</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => {
                      const agentClients = clients.filter(c => c.agentId === agent.id);
                      const critiques = agentClients.filter(c => calculateDaysElapsed(c.dateInscription) >= 90).length;
                      const commissionPot = agentClients.reduce((sum, c) => sum + c.budgetMax, 0);

                      return (
                        <tr key={agent.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm">{agent.prenom} {agent.nom}</td>
                          <td className="py-3 px-4 text-sm">{agentClients.length}</td>
                          <td className="py-3 px-4 text-sm">
                            {critiques > 0 ? (
                              <span className="text-destructive font-medium">{critiques}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">{commissionPot.toLocaleString()} CHF</td>
                          <td className="py-3 px-4 text-sm">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/assignations')}>
                              Redistribuer
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Alertes */}
          <Card>
            <CardHeader>
              <CardTitle>Alertes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg border border-warning/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium">{clientsSansAgent} client(s) sans agent</p>
                    <p className="text-sm text-muted-foreground">Assignez un agent pour commencer le suivi</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/assignations')}>
                  Assigner maintenant
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{clientsJ60} client(s) à J+60</p>
                    <p className="text-sm text-muted-foreground">Notification de renouvellement à envoyer</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Voir les clients
                </Button>
              </div>

              {deadlinesCritiques > 0 && (
                <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium">{deadlinesCritiques} deadline(s) critique(s)</p>
                      <p className="text-sm text-muted-foreground">Mandats expirés ou sur le point d'expirer</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/clients')}>
                    Voir les clients
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
