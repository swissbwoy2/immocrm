import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Megaphone, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { metaInitials, metaFullName, getSourceBadge, type MetaLead } from "./types";

interface Props {
  lead: MetaLead;
  onClick: () => void;
  compact?: boolean;
}

export function MetaLeadCard({ lead, onClick, compact }: Props) {
  const src = getSourceBadge(lead);
  const dateRef = lead.lead_created_time_meta || lead.created_at;

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
            "flex-shrink-0 rounded-full bg-gradient-to-br from-[#1877F2] to-[#1877F2]/60 text-white font-semibold flex items-center justify-center",
            compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
          )}>
            {metaInitials(lead)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{metaFullName(lead)}</div>
            <div className="text-xs text-muted-foreground truncate">{lead.email || "—"}</div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {lead.city && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />{lead.city}
                </span>
              )}
              {lead.form_name && (
                <span className="inline-flex items-center gap-1 text-muted-foreground truncate max-w-[160px]">
                  <FileText className="h-3 w-3" /><span className="truncate">{lead.form_name}</span>
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", src.className)}>
                {src.label}
              </Badge>
              {lead.campaign_name && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 max-w-[140px]">
                  <Megaphone className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{lead.campaign_name}</span>
                </Badge>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(dateRef), { addSuffix: true, locale: fr })}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
