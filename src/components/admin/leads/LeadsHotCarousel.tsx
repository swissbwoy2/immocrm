import { Button } from "@/components/ui/button";
import { Phone, CheckCircle, Loader2, Flame } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { initials, fullName, type Lead, type PhoneAppointment } from "./types";
import { cn } from "@/lib/utils";
import { DASH_CARD } from "@/components/client/dashboard/DashPrimitives";

interface HotItem {
  lead: Lead;
  reason: "rdv_today" | "qualified_cold";
  appt?: PhoneAppointment | null;
}

interface Props {
  hot: HotItem[];
  onConfirm: (apptId: string) => void;
  confirmingId: string | null;
  onSelect: (lead: Lead) => void;
}

export function LeadsHotCarousel({ hot, onConfirm, confirmingId, onSelect }: Props) {
  if (hot.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <Flame className="h-4 w-4" />
        </span>
        <h3 className="text-base font-semibold">À traiter en priorité</h3>
        <span className="text-xs text-muted-foreground">({hot.length})</span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-3 snap-x snap-mandatory">
          {hot.map((h) => (
            <div key={h.lead.id + h.reason}>
              <div
                className={cn(
                  DASH_CARD,
                  "min-w-[260px] sm:min-w-[300px] snap-start p-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-muted/50"
                )}
                onClick={() => onSelect(h.lead)}
              >
                <div className={cn(
                  "h-10 w-10 rounded-full font-semibold flex items-center justify-center text-sm flex-shrink-0",
                  h.reason === "rdv_today" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                )}>
                  {initials(h.lead)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{fullName(h.lead)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {h.reason === "rdv_today" && h.appt ? (
                      <>RDV bureau · {format(new Date(h.appt.slot_start), "EEE HH'h'mm", { locale: fr })} · {h.appt.status === "confirme" ? "confirmé" : "à confirmer"}</>
                    ) : (
                      <>Qualifié non contacté</>
                    )}
                  </div>
                </div>
                {h.reason === "rdv_today" && h.appt && h.appt.status === "en_attente" && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onConfirm(h.appt!.id); }}
                    disabled={confirmingId === h.appt.id}
                    className="gap-1 rounded-full"
                  >
                    {confirmingId === h.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Confirmer
                  </Button>
                )}
                {h.reason === "qualified_cold" && h.lead.telephone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={`tel:${h.lead.telephone}`} className="gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Appeler
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export type { HotItem };
