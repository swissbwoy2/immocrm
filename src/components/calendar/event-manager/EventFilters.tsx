import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { eventTypeLabels, eventTypeCalendarColors } from '../types';

interface EventFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  availableTypes: string[];
}

export function EventFilters({
  search,
  onSearchChange,
  selectedTypes,
  onTypesChange,
  availableTypes,
}: EventFiltersProps) {
  const hasActive = search.length > 0 || selectedTypes.length > 0;

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un événement…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Catégories
            {selectedTypes.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {selectedTypes.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filtrer par catégorie</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableTypes.map((type) => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={selectedTypes.includes(type)}
              onCheckedChange={() => toggleType(type)}
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-3 h-3 rounded',
                    eventTypeCalendarColors[type] || 'bg-gray-500',
                  )}
                />
                {eventTypeLabels[type] || type}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-muted-foreground"
          onClick={() => {
            onSearchChange('');
            onTypesChange([]);
          }}
        >
          <X className="h-3.5 w-3.5" />
          Effacer
        </Button>
      )}
    </div>
  );
}
