import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Send, MessageSquare, CheckCircle, DollarSign } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, getAgents, getClients, getOffres, getMessages } from '@/utils/localStorage';
import { calculateDaysElapsed, getStatutLabel } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';

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
        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Gérez vos clients et vos offres</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard 
              title="Clients actifs" 
              value={clientsActifs} 
              icon={Users}
              onClick={() => navigate('/agent/mes-clients')}
            />
            <KPICard 
              title="Offres envoyées" 
              value={offresEnvoyees} 
              icon={Send}
              onClick={() => navigate('/agent/offres-envoyees')}
            />
            <KPICard 
              title="Messages non lus" 
              value={messagesNonLus} 
              icon={MessageSquare}
              onClick={() => navigate('/agent/messagerie')}
            />
            <KPICard 
              title="Deadlines critiques" 
              value={deadlinesCritiques} 
              icon={LayoutDashboard} 
              variant={deadlinesCritiques > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/agent/mes-clients')}
            />
            <KPICard 
              title="Commission pot." 
              value={`${totalCommissionPotentielle.toLocaleString()} CHF`} 
              icon={DollarSign}
              variant="default"
            />
          </div>

          {/* Projection financière & Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projection financière */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">💰 Projection financière</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectionFinanciere.slice(0, 5).map(proj => (
                  <div key={proj.clientId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{proj.nom}</p>
                      <p className="text-xs text-muted-foreground">Budget: {proj.budgetMax.toLocaleString()} CHF</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold text-success">{proj.partAgent.toLocaleString()} CHF</p>
                      <p className="text-xs text-muted-foreground">{proj.splitAgent}%</p>
                    </div>
                  </div>
                ))}
                {projectionFinanciere.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Aucune projection disponible
                  </div>
                )}
                {projectionFinanciere.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Total potentiel</p>
                      <p className="text-xl font-bold text-success">{totalCommissionPotentielle.toLocaleString()} CHF</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deadlines critiques */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">⚠️ Deadlines critiques</CardTitle>
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
                            : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{client.prenom} {client.nom}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Inscrit le {new Date(client.dateInscription).toLocaleDateString('fr-CH')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${
                              isExpired ? 'text-destructive' : isWarning ? 'text-warning' : 'text-foreground'
                            }`}>
                              {isExpired ? 'Expiré' : `${daysRemaining}j`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isExpired ? 'J+90' : 'restants'}
                            </p>
                          </div>
                        </div>
                        {isExpired && (
                          <div className="mt-2 pt-2 border-t border-destructive/20">
                            <p className="text-xs text-destructive font-medium">⚠️ Mandat expiré - Action requise</p>
                          </div>
                        )}
                        {isWarning && !isExpired && (
                          <div className="mt-2 pt-2 border-t border-warning/20">
                            <p className="text-xs text-warning font-medium">⏰ Moins de 30 jours restants</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">Aucune deadline critique</p>
                    <p className="text-xs mt-1">Tous vos clients sont à jour</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dernières offres */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">📤 Dernières offres envoyées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dernieresOffres.length > 0 ? (
                dernieresOffres.map(offre => {
                  const client = clients.find(c => c.id === offre.clientId);
                  return (
                    <div key={offre.id} className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{offre.localisation}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {client?.prenom} {client?.nom} • {offre.nombrePieces} pcs • {offre.prix.toLocaleString()} CHF
                        </p>
                      </div>
                      <Badge 
                        variant={
                          offre.statut === 'acceptee' ? 'default' :
                          offre.statut === 'refusee' ? 'destructive' :
                          'secondary'
                        }
                        className="ml-3 flex-shrink-0"
                      >
                        {getStatutLabel(offre.statut)}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Send className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium">Aucune offre envoyée</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/agent/envoyer-offre')}
                  >
                    Envoyer une offre
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
