import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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

interface Client {
  id: string;
  user_id: string;
  profiles?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface ClientMultiSelectProps {
  clients: Client[];
  selectedClientIds: string[];
  onSelectionChange: (clientIds: string[]) => void;
  disabled?: boolean;
}

export const ClientMultiSelect = ({
  clients,
  selectedClientIds,
  onSelectionChange,
  disabled = false,
}: ClientMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const getClientName = (client: Client) => {
    if (client.profiles) {
      return `${client.profiles.prenom} ${client.profiles.nom}`;
    }
    return 'Client inconnu';
  };

  const toggleClient = (clientId: string) => {
    if (selectedClientIds.includes(clientId)) {
      onSelectionChange(selectedClientIds.filter((id) => id !== clientId));
    } else {
      onSelectionChange([...selectedClientIds, clientId]);
    }
  };

  const removeClient = (clientId: string) => {
    onSelectionChange(selectedClientIds.filter((id) => id !== clientId));
  };

  const selectedClients = clients.filter((c) => selectedClientIds.includes(c.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedClientIds.length === 0
              ? 'Sélectionner des clients...'
              : `${selectedClientIds.length} client(s) sélectionné(s)`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Rechercher un client..." />
            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={getClientName(client)}
                  onSelect={() => toggleClient(client.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedClientIds.includes(client.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {getClientName(client)}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClients.map((client) => (
            <Badge key={client.id} variant="secondary" className="pl-3 pr-1">
              {getClientName(client)}
              <button
                onClick={() => removeClient(client.id)}
                className="ml-2 hover:bg-muted rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
