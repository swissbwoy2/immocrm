import { Badge } from "@/components/ui/badge";
import { MapPin, Wallet, Phone as PhoneIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
import { getLeadSource } from "@/lib/lead-source";
import { initials, fullName, type Lead, type PhoneAppointment } from "./types";

interface Props {
  lead: Lead;
  appt?: PhoneAppointment | null;
  onClick: () => void;
  draggable?: boolean;
  compact?: boolean;
}

const TYPE_ICON: Record<string, string> = {
  Louer: "🔑",
  Acheter: "🏠",
  Vendre: "🏢",
};

export function LeadCard({ lead, appt, onClick, compact }: Props) {
  const src = getLeadSource(lead);
  const typeIcon = lead.type_recherche ? TYPE_ICON[lead.type_recherche] : null;

  return (
    <div>
      <div
        onClick={onClick}
        className={cn(
          DASH_CARD,
          "group cursor-pointer p-3 transition-colors hover:bg-muted/50"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center",
            compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
          )}>
            {initials(lead)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium text-sm truncate">{fullName(lead)}</span>
              {typeIcon && <span className="text-base leading-none">{typeIcon}</span>}
            </div>
            <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {lead.localite && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />{lead.localite}
                </span>
              )}
              {lead.budget && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Wallet className="h-3 w-3" />{lead.budget}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 rounded-full", src.badgeClass)}>
                {src.label}
              </Badge>
              {appt && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] py-0 px-1.5 gap-1 rounded-full border-transparent",
                    appt.status === "confirme"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  )}
                >
                  <PhoneIcon className="h-3 w-3" />
                  {format(new Date(appt.slot_start), "EEE d MMM HH'h'mm", { locale: fr })}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
