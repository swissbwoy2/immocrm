import { Input } from "@/components/ui/input";
import { ContactTypeSelect } from "./ContactTypeSelect";
import { ContactType } from "./contactTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortOption = 'nom_asc' | 'nom_desc' | 'created_at_desc' | 'created_at_asc';

interface ContactFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  typeFilter: ContactType | 'all';
  onTypeFilterChange: (type: ContactType | 'all') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showFavoritesOnly: boolean;
  onShowFavoritesOnlyChange: (show: boolean) => void;
}

export function ContactFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortChange,
  showFavoritesOnly,
  onShowFavoritesOnlyChange,
}: ContactFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email, téléphone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <ContactTypeSelect
        value={typeFilter}
        onChange={onTypeFilterChange}
        showAll
      />

      <Select value={sortBy} onValueChange={(val) => onSortChange(val as SortOption)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nom_asc">Nom (A-Z)</SelectItem>
          <SelectItem value="nom_desc">Nom (Z-A)</SelectItem>
          <SelectItem value="created_at_desc">Plus récent</SelectItem>
          <SelectItem value="created_at_asc">Plus ancien</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={showFavoritesOnly ? "default" : "outline"}
        size="icon"
        onClick={() => onShowFavoritesOnlyChange(!showFavoritesOnly)}
        title={showFavoritesOnly ? "Afficher tous" : "Favoris uniquement"}
      >
        <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
      </Button>
    </div>
  );
}
