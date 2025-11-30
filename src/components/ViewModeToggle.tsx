import { Button } from "@/components/ui/button";
import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewModeToggleProps {
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  className?: string;
}

export function ViewModeToggle({ viewMode, onViewModeChange, className }: ViewModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg", className)}>
      <Button
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('cards')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Cartes</span>
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('table')}
        className="h-8 px-3"
      >
        <Table2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Tableau</span>
      </Button>
    </div>
  );
}
