import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Send, MessageSquare, CheckCircle, DollarSign } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateDaysElapsed } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  
  const [agent, setAgent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    
    loadAgentData();
  }, [user, userRole, navigate]);

  const loadAgentData = async () => {
    if (!user) return;
    
    try {
      // Récupérer l'agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setAgent(agentData);

      // Récupérer les clients assignés à cet agent (RLS filtre automatiquement)
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*');
      
      setClients(clientsData || []);
    } catch (error) {
      console.error('Erreur chargement données agent:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Les clients sont déjà filtrés par RLS
  const clientsActifs = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return calculateDaysElapsed(dateAjout) <= 90;
  }).length;
  
  const deadlinesCritiques = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    return calculateDaysElapsed(dateAjout) >= 90;
  }).length;

  const projectionFinanciere = clients.map(client => {
    const commissionBrute = client.budget_max || 0;
    const splitAgent = client.commission_split || 50;
    const partAgent = Math.round(commissionBrute * (splitAgent / 100));
    return {
      clientId: client.id,
      budgetMax: commissionBrute,
      splitAgent,
      partAgent,
    };
  });

  const totalCommissionPotentielle = projectionFinanciere.reduce((sum, p) => sum + p.partAgent, 0);

  const clientsCritiques = clients.filter(c => {
    const dateAjout = c.date_ajout || c.created_at;
    const days = calculateDaysElapsed(dateAjout);
    return days >= 60;
  }).sort((a, b) => {
    const dateA = a.date_ajout || a.created_at;
    const dateB = b.date_ajout || b.created_at;
    return calculateDaysElapsed(dateB) - calculateDaysElapsed(dateA);
  });

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
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
              value={0} 
              icon={Send}
              onClick={() => navigate('/agent/offres-envoyees')}
            />
            <KPICard 
              title="Messages non lus" 
              value={0} 
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
                {projectionFinanciere.slice(0, 5).map(proj => {
                  const client = clients.find(c => c.id === proj.clientId);
                  return (
                    <div key={proj.clientId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">Client</p>
                        <p className="text-xs text-muted-foreground">Budget: {proj.budgetMax.toLocaleString()} CHF</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="font-bold text-success">{proj.partAgent.toLocaleString()} CHF</p>
                        <p className="text-xs text-muted-foreground">{proj.splitAgent}%</p>
                      </div>
                    </div>
                  );
                })}
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
                    const dateAjout = client.date_ajout || client.created_at;
                    const daysElapsed = calculateDaysElapsed(dateAjout);
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
                            <p className="font-medium text-sm truncate">Client</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Inscrit le {new Date(dateAjout).toLocaleDateString('fr-CH')}
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
            </CardContent>
          </Card>
      </div>
    </main>
  );
}
