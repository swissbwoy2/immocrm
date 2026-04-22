import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wallet, Phone as PhoneIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card
        onClick={onClick}
        className={cn(
          "group cursor-pointer p-3 hover:shadow-md hover:border-primary/40 transition-all",
          "active:scale-[0.99] bg-card/80 backdrop-blur-sm"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold flex items-center justify-center",
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
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", src.badgeClass)}>
                {src.label}
              </Badge>
              {appt && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] py-0 px-1.5 gap-1",
                    appt.status === "confirme"
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  )}
                >
                  <PhoneIcon className="h-3 w-3" />
                  {format(new Date(appt.slot_start), "EEE d MMM HH'h'mm", { locale: fr })}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
