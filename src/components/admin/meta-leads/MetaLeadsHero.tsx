import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, List, Rows, Upload, Download, MoreHorizontal, RefreshCw } from "lucide-react";
import { DashPageHeader } from "@/components/client/dashboard/DashPrimitives";
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
    <div>
      <DashPageHeader
        title="Leads Meta Ads"
        subtitle={
          <span className="flex flex-wrap gap-x-1.5 gap-y-0.5">
            <span><span className="font-medium text-foreground">{total}</span> leads</span>
            <span aria-hidden>·</span>
            <span><span className="font-medium text-foreground">{campaignsCount}</span> campagnes</span>
            <span aria-hidden>·</span>
            <span><span className="font-medium text-emerald-600 dark:text-emerald-400">{newToday}</span> nouveaux 24h</span>
          </span>
        }
        action={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0 rounded-full">
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

            <Button
              onClick={onSync}
              disabled={syncing}
              className="gap-2 min-h-[40px] rounded-full"
            >
              <Download className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Sync…" : "Sync Meta"}
            </Button>
          </>
        }
      />

      {/* Onglets de vue (même rendu que DashFilterPills) */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Vue"
      >
        {VIEW_TABS.map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(t.key)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/60"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
