import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, List, Rows, Zap, Upload, Download, MoreHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "pipeline" | "list" | "cards";

interface Props {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  total: number;
  rdvCount: number;
  hotCount: number;
  notContactedCount: number;
  onRelance: () => void;
  onImport: () => void;
  onExport: () => void;
}

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: "pipeline", label: "Pipeline", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { key: "list", label: "Liste", icon: <List className="h-3.5 w-3.5" /> },
  { key: "cards", label: "Cartes", icon: <Rows className="h-3.5 w-3.5" /> },
];

export function LeadsHero({
  view, setView, total, rdvCount, hotCount, notContactedCount,
  onRelance, onImport, onExport,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Leads Shortlist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-medium text-foreground">{total}</span> leads ·{" "}
          <span className="font-medium text-amber-600 dark:text-amber-400">{rdvCount}</span> RDV téléphoniques ·{" "}
          <span className="font-medium text-orange-600 dark:text-orange-400">{hotCount}</span> à traiter
        </p>
      </motion.div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Segmented control */}
        <div className="inline-flex items-center rounded-lg bg-muted p-1">
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                view === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <Button onClick={onRelance} disabled={notContactedCount === 0} className="gap-2">
          <Zap className="h-4 w-4" />
          Relancer ({notContactedCount})
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onImport} className="gap-2">
              <Upload className="h-4 w-4" /> Importer CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport} className="gap-2">
              <Download className="h-4 w-4" /> Exporter CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
