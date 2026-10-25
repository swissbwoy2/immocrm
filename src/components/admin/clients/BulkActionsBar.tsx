import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ShieldCheck, X, CheckSquare, Square, Tag, Loader2 } from "lucide-react";

export type BulkStatut = "actif" | "en_attente" | "reloge" | "stoppe" | "suspendu" | "inactif";

const STATUT_LABELS: Record<BulkStatut, string> = {
  actif: "Actif",
  en_attente: "En attente",
  reloge: "Relogé",
  stoppe: "Stoppé",
  suspendu: "Suspendu",
  inactif: "Inactif",
};

interface Props {
  visible: boolean;
  selectedCount: number;
  totalVisible: number;
  loading?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onChangeStatut: (s: BulkStatut) => void;
}

export function BulkActionsBar({
  visible,
  selectedCount,
  totalVisible,
  loading = false,
  onSelectAll,
  onClear,
  onCancel,
  onDelete,
  onChangeStatut,
}: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 sm:pb-4 pointer-events-none"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-3xl pointer-events-auto">
            <div className="rounded-2xl border border-border/70 bg-card shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.12)] p-2.5 sm:p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="rounded-full bg-foreground text-background border-0 px-3 py-1 text-xs whitespace-nowrap">
                  {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
                </Badge>

                <div className="hidden sm:flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={onSelectAll} disabled={loading} className="h-9 rounded-full px-3 text-xs">
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    Tout ({totalVisible})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onClear} disabled={loading || selectedCount === 0} className="h-9 rounded-full px-3 text-xs">
                    <Square className="h-3.5 w-3.5 mr-1" />
                    Aucun
                  </Button>
                </div>

                <div className="flex-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={loading || selectedCount === 0} className="h-10 rounded-full text-xs sm:h-9">
                      <Tag className="h-3.5 w-3.5 mr-1.5" />
                      Statut
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.keys(STATUT_LABELS) as BulkStatut[]).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => onChangeStatut(s)}>
                        {STATUT_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={loading || selectedCount === 0}
                  className="h-10 rounded-full text-xs sm:h-9"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Anonymiser (RGPD)
                </Button>

                <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading} className="h-10 w-10 rounded-full p-0 sm:h-9 sm:w-9">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="sm:hidden flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="ghost" onClick={onSelectAll} disabled={loading} className="h-10 rounded-full px-2 text-xs flex-1">
                  Tout ({totalVisible})
                </Button>
                <Button size="sm" variant="ghost" onClick={onClear} disabled={loading || selectedCount === 0} className="h-10 rounded-full px-2 text-xs flex-1">
                  Aucun
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { STATUT_LABELS };
