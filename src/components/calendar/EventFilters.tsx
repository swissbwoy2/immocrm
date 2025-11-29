import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Agent {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface Client {
  id: string;
  user_id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface EventFiltersProps {
  agents: Agent[];
  clients: Client[];
  selectedAgent: string;
  selectedClient: string;
  selectedEventType: string;
  selectedStatus: string;
  onAgentChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onEventTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function EventFilters({
  agents,
  clients,
  selectedAgent,
  selectedClient,
  selectedEventType,
  selectedStatus,
  onAgentChange,
  onClientChange,
  onEventTypeChange,
  onStatusChange,
}: EventFiltersProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Filtres</h3>
      <div className="space-y-4">
        <div>
          <Label className="text-sm">Agent</Label>
          <Select value={selectedAgent} onValueChange={onAgentChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tous les agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.profiles?.prenom} {agent.profiles?.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Client</Label>
          <Select value={selectedClient} onValueChange={onClientChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.profiles?.prenom} {client.profiles?.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Type d'événement</Label>
          <Select value={selectedEventType} onValueChange={onEventTypeChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="visite">Visites</SelectItem>
              <SelectItem value="rappel">Rappels</SelectItem>
              <SelectItem value="rendez_vous">Rendez-vous</SelectItem>
              <SelectItem value="tache">Tâches</SelectItem>
              <SelectItem value="reunion">Réunions</SelectItem>
              <SelectItem value="autre">Autres</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Statut</Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="planifie">Planifié</SelectItem>
              <SelectItem value="effectue">Effectué</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
