import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDaysElapsed, calculateDaysRemaining } from "@/utils/calculations";

const Mandats = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [renouvellements, setRenouvellements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('date_ajout', { ascending: false });

      const { data: agentsData } = await supabase
        .from('agents')
        .select('*, profiles!agents_user_id_fkey(*)');

      const { data: renouvData } = await supabase
        .from('renouvellements_mandat')
        .select('*')
        .order('created_at', { ascending: false });

      setClients(clientsData || []);
      setAgents(agentsData || []);
      setRenouvellements(renouvData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    if (!agent?.profiles) return "Non assigné";
    return `${agent.profiles.prenom} ${agent.profiles.nom}`;
  };

  const getMandateStatus = (daysElapsed: number) => {
    if (daysElapsed <= 30) return { label: "Nouveau", variant: "default" as const, color: "text-primary" };
    if (daysElapsed <= 60) return { label: "En cours", variant: "secondary" as const, color: "text-warning" };
    return { label: "Critique", variant: "destructive" as const, color: "text-destructive" };
  };

  const isRecentlyRenewed = (clientId: string) => {
    const renewal = renouvellements.find(r => r.client_id === clientId);
    if (!renewal) return false;
    const daysSinceRenewal = Math.floor((Date.now() - new Date(renewal.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceRenewal <= 7;
  };

  const sortedClients = [...clients].sort((a, b) => {
    const daysElapsedA = calculateDaysElapsed(a.date_ajout || a.created_at);
    const daysElapsedB = calculateDaysElapsed(b.date_ajout || b.created_at);
    return daysElapsedB - daysElapsedA;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des Mandats</h1>
            <p className="text-muted-foreground">Suivi de la durée des mandats clients</p>
          </div>

          <div className="grid gap-4">
            {sortedClients.map((client) => {
              const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
              const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
              const progress = Math.min((daysElapsed / 90) * 100, 100);
              const status = getMandateStatus(daysElapsed);
              const renewed = isRecentlyRenewed(client.id);
              
              return (
                <Card key={client.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">Client</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {renewed && (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200">
                              🔄 Renouvelé récemment
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Agent: {getAgentName(client.agent_id)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${status.color}`}>
                          J+{daysElapsed}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {daysRemaining > 0 ? `${daysRemaining} jours restants` : "Mandat expiré"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression du mandat</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Début: {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Split: {client.commission_split}%
                      </div>
                      {daysElapsed > 60 && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          Mandat proche de l'expiration
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm">
                        <span className="font-medium">Recherche:</span> {client.type_bien} {client.pieces} pièces • 
                        <span className="font-medium ml-2">Budget:</span> CHF {client.budget_max?.toLocaleString()}
                      </div>
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
  
  export default Mandats;
