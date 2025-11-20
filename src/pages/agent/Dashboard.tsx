import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Send, MessageSquare, FileText, Settings } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser, getAgents, getClients, getOffres, getMessages } from '@/utils/localStorage';
import { calculateDaysElapsed, getStatutLabel, getStatutColor } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';

const agentMenu = [
  { name: 'Tableau de bord', icon: LayoutDashboard, path: '/agent' },
  { name: 'Mes clients', icon: Users, path: '/agent/clients' },
  { name: 'Envoyer une offre', icon: Send, path: '/agent/envoyer-offre' },
  { name: 'Messagerie', icon: MessageSquare, path: '/agent/messagerie' },
  { name: 'Documents', icon: FileText, path: '/agent/documents' },
  { name: 'Paramètres', icon: Settings, path: '/agent/parametres' },
];

export default function AgentDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [agent, setAgent] = useState(() => {
    const agents = getAgents();
    return agents.find(a => a.userId === currentUser?.id);
  });
  const [clients, setClients] = useState(getClients());
  const [offres, setOffres] = useState(getOffres());
  const [messages, setMessages] = useState(getMessages());

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'agent') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || !agent) return null;

  const mesClients = clients.filter(c => c.agentId === agent.id);
  const clientsActifs = mesClients.filter(c => calculateDaysElapsed(c.dateInscription) <= 90).length;
  const deadlinesCritiques = mesClients.filter(c => calculateDaysElapsed(c.dateInscription) >= 90).length;
  const mesOffres = offres.filter(o => o.agentId === agent.id);
  const offresEnvoyees = mesOffres.length;
  const messagesNonLus = messages.filter(m => 
    m.expediteurRole === 'client' && 
    !m.lu &&
    mesClients.some(c => m.expediteurId === c.id)
  ).length;

  const projectionFinanciere = mesClients.map(client => {
    const commissionBrute = client.budgetMax;
    const partAgent = Math.round(commissionBrute * (client.splitAgent / 100));
    return {
      clientId: client.id,
      nom: `${client.prenom} ${client.nom}`,
      budgetMax: client.budgetMax,
      commissionBrute,
      splitAgent: client.splitAgent,
      partAgent,
    };
  });

  const totalCommissionPotentielle = projectionFinanciere.reduce((sum, p) => sum + p.partAgent, 0);

  const dernieresOffres = mesOffres.slice(0, 5).sort((a, b) => 
    new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime()
  );

  const clientsCritiques = mesClients.filter(c => {
    const days = calculateDaysElapsed(c.dateInscription);
    return days >= 60;
  }).sort((a, b) => calculateDaysElapsed(b.dateInscription) - calculateDaysElapsed(a.dateInscription));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">Gérez vos clients et vos offres</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard title="Mes clients" value={clientsActifs} icon={Users} />
            <KPICard title="Offres envoyées" value={offresEnvoyees} icon={Send} />
            <KPICard title="Messages non lus" value={messagesNonLus} icon={MessageSquare} />
            <KPICard 
              title="Deadlines critiques" 
              value={deadlinesCritiques} 
              icon={LayoutDashboard} 
              variant={deadlinesCritiques > 0 ? 'danger' : 'default'} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Projection financière */}
            <Card>
              <CardHeader>
                <CardTitle>💰 Projection financière</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectionFinanciere.slice(0, 5).map(proj => (
                  <div key={proj.clientId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{proj.nom}</p>
                      <p className="text-xs text-muted-foreground">Budget: {proj.budgetMax} CHF</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{proj.partAgent} CHF</p>
                      <p className="text-xs text-muted-foreground">{proj.splitAgent}% sur {proj.commissionBrute} CHF</p>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Total potentiel</p>
                    <p className="text-xl font-bold text-success">{totalCommissionPotentielle.toLocaleString()} CHF</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deadlines critiques */}
            <Card>
              <CardHeader>
                <CardTitle>⚠️ Deadlines critiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {clientsCritiques.length > 0 ? (
                  clientsCritiques.slice(0, 5).map(client => {
                    const daysElapsed = calculateDaysElapsed(client.dateInscription);
                    const daysRemaining = 90 - daysElapsed;
                    const isExpired = daysRemaining <= 0;
                    const isWarning = daysRemaining > 0 && daysRemaining <= 30;

                    return (
                      <div 
                        key={client.id}
                        className={`p-3 rounded-lg border ${
                          isExpired 
                            ? 'bg-destructive/10 border-destructive/20' 
                            : isWarning 
                            ? 'bg-warning/10 border-warning/20'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{client.prenom} {client.nom}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Depuis le {new Date(client.dateInscription).toLocaleDateString('fr-CH')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              isExpired ? 'text-destructive' : isWarning ? 'text-warning' : 'text-blue-600'
                            }`}>
                              {isExpired ? '0 jours' : `${daysRemaining} jours`}
                            </p>
                            <p className="text-xs text-muted-foreground">restants</p>
                          </div>
                        </div>
                        {isExpired && (
                          <p className="text-xs text-destructive font-medium mt-2">Délai critique - 90 jours écoulés</p>
                        )}
                        {isWarning && !isExpired && (
                          <p className="text-xs text-warning font-medium mt-2">Attention - 60 jours écoulés</p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Aucune deadline critique</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dernières offres */}
          <Card>
            <CardHeader>
              <CardTitle>📤 Dernières offres envoyées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dernieresOffres.length > 0 ? (
                dernieresOffres.map(offre => {
                  const client = clients.find(c => c.id === offre.clientId);
                  return (
                    <div key={offre.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{offre.localisation}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pour {client?.prenom} {client?.nom} • {offre.nombrePieces} pcs • {offre.prix} CHF
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatutColor(offre.statut)}`}>
                        {getStatutLabel(offre.statut)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune offre envoyée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
