import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, List, Rows, Zap, Upload, Download, MoreHorizontal, MessageCircle } from "lucide-react";
import { DashPageHeader } from "@/components/client/dashboard/DashPrimitives";
import { cn } from "@/lib/utils";

export type ViewMode = "pipeline" | "list" | "cards";

interface Props {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  total: number;
  rdvCount: number;
  hotCount: number;
  notContactedCount: number;
  whatsappCount?: number;
  onRelance: () => void;
  onWhatsapp?: () => void;
  whatsappLoading?: boolean;
  onImport?: () => void;
  onExport: () => void;
}

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: "pipeline", label: "Pipeline", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { key: "list", label: "Liste", icon: <List className="h-3.5 w-3.5" /> },
  { key: "cards", label: "Cartes", icon: <Rows className="h-3.5 w-3.5" /> },
];

export function LeadsHero({
  view, setView, total, rdvCount, hotCount, notContactedCount,
  whatsappCount = 0, onRelance, onWhatsapp, whatsappLoading,
  onImport, onExport,
}: Props) {
  return (
    <div>
      <DashPageHeader
        title="Leads Shortlist"
        subtitle={
          <span className="flex flex-wrap gap-x-1.5 gap-y-0.5">
            <span><span className="font-medium text-foreground">{total}</span> leads</span>
            <span aria-hidden>·</span>
            <span><span className="font-medium text-amber-600 dark:text-amber-400">{rdvCount}</span> RDV</span>
            <span aria-hidden>·</span>
            <span><span className="font-medium text-foreground">{hotCount}</span> à traiter</span>
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
                {onImport && (
                  <DropdownMenuItem onClick={onImport} className="gap-2">
                    <Upload className="h-4 w-4" /> Importer CSV
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onExport} className="gap-2">
                  <Download className="h-4 w-4" /> Exporter CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={onRelance} disabled={notContactedCount === 0} className="gap-2 min-h-[40px] rounded-full">
              <Zap className="h-4 w-4" />
              Relancer ({notContactedCount})
            </Button>

            {onWhatsapp && (
              <Button
                onClick={onWhatsapp}
                disabled={whatsappLoading || whatsappCount === 0}
                variant="outline"
                title="Leads Shortlist avec téléphone, jamais contactés sur WhatsApp (dédup logs Meta)."
                className="gap-2 min-h-[40px] rounded-full"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                {whatsappLoading ? "Envoi…" : `WhatsApp (${whatsappCount})`}
              </Button>
            )}
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
