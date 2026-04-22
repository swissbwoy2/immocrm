import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, List, Rows, Upload, Download, MoreHorizontal, RefreshCw, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetaViewMode = "pipeline" | "list" | "cards";

interface Props {
  view: MetaViewMode;
  setView: (v: MetaViewMode) => void;
  total: number;
  campaignsCount: number;
  newToday: number;
  loading: boolean;
  syncing: boolean;
  onImport: () => void;
  onSync: () => void;
  onRefresh: () => void;
}

const VIEW_TABS: { key: MetaViewMode; label: string; icon: React.ReactNode }[] = [
  { key: "pipeline", label: "Pipeline", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { key: "list", label: "Liste", icon: <List className="h-3.5 w-3.5" /> },
  { key: "cards", label: "Cartes", icon: <Rows className="h-3.5 w-3.5" /> },
];

export function MetaLeadsHero({
  view, setView, total, campaignsCount, newToday,
  loading, syncing, onImport, onSync, onRefresh,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 justify-between items-stretch lg:items-center">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          <span className="relative inline-flex">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-[#1877F2] flex-shrink-0" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#1877F2] animate-pulse" />
          </span>
          Leads Meta Ads
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5">
          <span><span className="font-medium text-foreground">{total}</span> leads</span>
          <span aria-hidden>·</span>
          <span><span className="font-medium text-[#1877F2]">{campaignsCount}</span> campagnes</span>
          <span aria-hidden>·</span>
          <span><span className="font-medium text-emerald-600 dark:text-emerald-400">{newToday}</span> nouveaux 24h</span>
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg bg-muted p-1 flex-1 sm:flex-none">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={cn(
                  "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-md text-xs font-medium transition-all cursor-pointer",
                  view === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.icon}
                <span className="hidden xs:inline sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 sm:h-10 sm:w-10 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onImport} className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" /> Importer CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSync} disabled={syncing} className="gap-2 cursor-pointer">
                <Download className={cn("h-4 w-4", syncing && "animate-spin")} />
                {syncing ? "Synchronisation…" : "Sync Meta"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRefresh} disabled={loading} className="gap-2 cursor-pointer">
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Actualiser
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          onClick={onSync}
          disabled={syncing}
          className="gap-2 min-h-[44px] sm:min-h-[40px] w-full sm:w-auto bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
        >
          <Download className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Sync…" : "Sync Meta"}
        </Button>
      </div>
    </div>
  );
}
