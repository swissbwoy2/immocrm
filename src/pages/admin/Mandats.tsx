import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { getClients, getAgents } from "@/utils/localStorage";
import { calculateMandateDuration } from "@/utils/calculations";

const Mandats = () => {
  const [clients] = useState(getClients());
  const [agents] = useState(getAgents());

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.prenom} ${agent.nom}` : "Non assigné";
  };

  const getMandateStatus = (duration: number) => {
    if (duration <= 30) return { label: "Nouveau", variant: "default" as const, color: "text-primary" };
    if (duration <= 60) return { label: "En cours", variant: "secondary" as const, color: "text-warning" };
    return { label: "Critique", variant: "destructive" as const, color: "text-destructive" };
  };

  const sortedClients = [...clients].sort((a, b) => {
    const durationA = calculateMandateDuration(a.dateInscription);
    const durationB = calculateMandateDuration(b.dateInscription);
    return durationB - durationA;
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des Mandats</h1>
            <p className="text-muted-foreground">Suivi de la durée des mandats clients</p>
          </div>

          <div className="grid gap-4">
            {sortedClients.map((client) => {
              const duration = calculateMandateDuration(client.dateInscription);
              const progress = Math.min((duration / 90) * 100, 100);
              const status = getMandateStatus(duration);
              
              return (
                <Card key={client.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{client.prenom} {client.nom}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Agent: {getAgentName(client.agentId)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${status.color}`}>
                          J+{duration}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {90 - duration > 0 ? `${90 - duration} jours restants` : "Mandat expiré"}
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
                        Début: {new Date(client.dateInscription).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Split: {client.splitAgent}% / {client.splitAgence}%
                      </div>
                      {duration > 60 && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          Mandat proche de l'expiration
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm">
                        <span className="font-medium">Recherche:</span> {client.typeBien} {client.nombrePiecesSouhaite} pièces • 
                        <span className="font-medium ml-2">Budget:</span> CHF {client.budgetMax.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mandats;
