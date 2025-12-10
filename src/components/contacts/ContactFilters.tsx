import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ContactType, contactTypeLabels } from "./contactTypes";
import { Search, Star, Filter, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = "nom_asc" | "nom_desc" | "created_at_desc" | "created_at_asc";

interface ContactFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: ContactType | "all";
  onTypeFilterChange: (value: ContactType | "all") => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  showFavoritesOnly: boolean;
  onShowFavoritesOnlyChange: (value: boolean) => void;
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
  const hasActiveFilters = typeFilter !== "all" || showFavoritesOnly;

  return (
    <div className="relative overflow-hidden rounded-xl bg-card/60 backdrop-blur-xl border border-border/50 p-4 animate-fade-in">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <div className="relative flex flex-col sm:flex-row gap-3">
        {/* Search with icon */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors peer-focus:text-primary" />
          <Input
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background/80 transition-all duration-300"
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter badge indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground mr-1">
            <Filter className={cn("h-4 w-4 transition-colors", hasActiveFilters && "text-primary")} />
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>

          {/* Type filter */}
          <Select
            value={typeFilter}
            onValueChange={(value) => onTypeFilterChange(value as ContactType | "all")}
          >
            <SelectTrigger className="w-[160px] bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {(Object.keys(contactTypeLabels) as ContactType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {contactTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-[140px] bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Trier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nom_asc">Nom A-Z</SelectItem>
              <SelectItem value="nom_desc">Nom Z-A</SelectItem>
              <SelectItem value="created_at_desc">Plus récent</SelectItem>
              <SelectItem value="created_at_asc">Plus ancien</SelectItem>
            </SelectContent>
          </Select>

          {/* Favorites toggle */}
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="icon"
            onClick={() => onShowFavoritesOnlyChange(!showFavoritesOnly)}
            className={cn(
              "h-10 w-10 transition-all duration-300",
              showFavoritesOnly
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30"
                : "bg-background/50 border-border/50 hover:border-yellow-500/50 hover:text-yellow-400"
            )}
          >
            <Star className={cn("h-4 w-4 transition-transform", showFavoritesOnly && "fill-current scale-110")} />
          </Button>
        </div>
      </div>
    </div>
  );
}
