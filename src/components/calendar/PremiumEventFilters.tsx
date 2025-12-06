import { Filter, User, Users, Tag, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  profiles: { prenom: string; nom: string };
}

interface Client {
  id: string;
  profiles: { prenom: string; nom: string };
}

interface PremiumEventFiltersProps {
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

const eventTypes = [
  { value: 'visite', label: 'Visite' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'rendez_vous', label: 'Rendez-vous' },
  { value: 'tache', label: 'Tâche' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'signature', label: 'Signature' },
  { value: 'etat_lieux', label: 'État des lieux' },
  { value: 'autre', label: 'Autre' },
];

const statuses = [
  { value: 'planifie', label: 'Planifié' },
  { value: 'effectue', label: 'Effectué' },
  { value: 'annule', label: 'Annulé' },
];

export function PremiumEventFilters({
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
}: PremiumEventFiltersProps) {
  const activeFiltersCount = [selectedAgent, selectedClient, selectedEventType, selectedStatus]
    .filter(v => v !== 'all').length;

  return (
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-4 space-y-4 shadow-xl">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Filtres</h3>
            {activeFiltersCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Agent filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              Agent
            </label>
            <Select value={selectedAgent} onValueChange={onAgentChange}>
              <SelectTrigger className={cn(
                "h-9 rounded-xl bg-background/50 border-border/50 transition-all",
                "hover:bg-background/80 hover:border-primary/30",
                "focus:ring-2 focus:ring-primary/20",
                selectedAgent !== 'all' && "border-primary/50 bg-primary/5"
              )}>
                <SelectValue placeholder="Tous les agents" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-popover/95 backdrop-blur-xl">
                <SelectItem value="all" className="rounded-lg">Tous les agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id} className="rounded-lg">
                    {agent.profiles.prenom} {agent.profiles.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Client
            </label>
            <Select value={selectedClient} onValueChange={onClientChange}>
              <SelectTrigger className={cn(
                "h-9 rounded-xl bg-background/50 border-border/50 transition-all",
                "hover:bg-background/80 hover:border-primary/30",
                "focus:ring-2 focus:ring-primary/20",
                selectedClient !== 'all' && "border-primary/50 bg-primary/5"
              )}>
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-popover/95 backdrop-blur-xl max-h-60">
                <SelectItem value="all" className="rounded-lg">Tous les clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="rounded-lg">
                    {client.profiles.prenom} {client.profiles.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event type filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              Type
            </label>
            <Select value={selectedEventType} onValueChange={onEventTypeChange}>
              <SelectTrigger className={cn(
                "h-9 rounded-xl bg-background/50 border-border/50 transition-all",
                "hover:bg-background/80 hover:border-primary/30",
                "focus:ring-2 focus:ring-primary/20",
                selectedEventType !== 'all' && "border-primary/50 bg-primary/5"
              )}>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-popover/95 backdrop-blur-xl">
                <SelectItem value="all" className="rounded-lg">Tous les types</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="rounded-lg">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3" />
              Statut
            </label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className={cn(
                "h-9 rounded-xl bg-background/50 border-border/50 transition-all",
                "hover:bg-background/80 hover:border-primary/30",
                "focus:ring-2 focus:ring-primary/20",
                selectedStatus !== 'all' && "border-primary/50 bg-primary/5"
              )}>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-popover/95 backdrop-blur-xl">
                <SelectItem value="all" className="rounded-lg">Tous les statuts</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="rounded-lg">
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
