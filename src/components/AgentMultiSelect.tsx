import { useState } from 'react';
import { Check, ChevronsUpDown, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Agent {
  id: string;
  user_id: string;
  profiles?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface AgentAssignment {
  agent_id: string;
  is_primary: boolean;
  commission_split: number;
}

interface AgentMultiSelectProps {
  agents: Agent[];
  selectedAssignments: AgentAssignment[];
  onSelectionChange: (assignments: AgentAssignment[]) => void;
  disabled?: boolean;
}

export const AgentMultiSelect = ({
  agents,
  selectedAssignments,
  onSelectionChange,
  disabled = false,
}: AgentMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const getAgentName = (agent: Agent) => {
    if (agent.profiles) {
      return `${agent.profiles.prenom} ${agent.profiles.nom}`;
    }
    return 'Agent inconnu';
  };

  const toggleAgent = (agentId: string) => {
    const existingAssignment = selectedAssignments.find((a) => a.agent_id === agentId);
    
    if (existingAssignment) {
      // Remove agent
      const newAssignments = selectedAssignments.filter((a) => a.agent_id !== agentId);
      // If removed agent was primary, make first remaining agent primary
      if (existingAssignment.is_primary && newAssignments.length > 0) {
        newAssignments[0].is_primary = true;
      }
      onSelectionChange(newAssignments);
    } else {
      // Add agent
      const newAssignment: AgentAssignment = {
        agent_id: agentId,
        is_primary: selectedAssignments.length === 0, // First agent is primary by default
        commission_split: 50,
      };
      onSelectionChange([...selectedAssignments, newAssignment]);
    }
  };

  const removeAgent = (agentId: string) => {
    const assignment = selectedAssignments.find((a) => a.agent_id === agentId);
    const newAssignments = selectedAssignments.filter((a) => a.agent_id !== agentId);
    
    // If removed agent was primary, make first remaining agent primary
    if (assignment?.is_primary && newAssignments.length > 0) {
      newAssignments[0].is_primary = true;
    }
    
    onSelectionChange(newAssignments);
  };

  const setPrimaryAgent = (agentId: string) => {
    const newAssignments = selectedAssignments.map((a) => ({
      ...a,
      is_primary: a.agent_id === agentId,
    }));
    onSelectionChange(newAssignments);
  };

  const updateCommissionSplit = (agentId: string, split: number) => {
    const newAssignments = selectedAssignments.map((a) =>
      a.agent_id === agentId ? { ...a, commission_split: split } : a
    );
    onSelectionChange(newAssignments);
  };

  const selectedAgents = agents.filter((agent) =>
    selectedAssignments.some((a) => a.agent_id === agent.id)
  );

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedAssignments.length === 0
              ? 'Sélectionner des agents...'
              : `${selectedAssignments.length} agent(s) sélectionné(s)`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Rechercher un agent..." />
            <CommandEmpty>Aucun agent trouvé.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {agents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={getAgentName(agent)}
                  onSelect={() => toggleAgent(agent.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedAssignments.some((a) => a.agent_id === agent.id)
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {getAgentName(agent)}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAgents.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Agents assignés</div>
          {selectedAgents.map((agent) => {
            const assignment = selectedAssignments.find((a) => a.agent_id === agent.id);
            if (!assignment) return null;

            return (
              <div key={agent.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={assignment.is_primary ? 'default' : 'secondary'}>
                      {assignment.is_primary && <Star className="h-3 w-3 mr-1" />}
                      {getAgentName(agent)}
                    </Badge>
                  </div>
                  <button
                    onClick={() => removeAgent(agent.id)}
                    className="hover:bg-muted rounded-full p-1"
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroup
                      value={assignment.is_primary ? 'primary' : 'secondary'}
                      onValueChange={(value) => {
                        if (value === 'primary') {
                          setPrimaryAgent(agent.id);
                        }
                      }}
                      disabled={disabled}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="primary" id={`primary-${agent.id}`} />
                        <Label htmlFor={`primary-${agent.id}`} className="text-sm">
                          Agent principal
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex-1">
                    <Label htmlFor={`split-${agent.id}`} className="text-xs">
                      Commission (%)
                    </Label>
                    <input
                      id={`split-${agent.id}`}
                      type="number"
                      min="0"
                      max="100"
                      value={assignment.commission_split}
                      onChange={(e) =>
                        updateCommissionSplit(agent.id, Number(e.target.value))
                      }
                      className="w-20 px-2 py-1 text-sm border rounded"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
