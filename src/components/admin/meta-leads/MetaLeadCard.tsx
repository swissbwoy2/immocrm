import { Badge } from "@/components/ui/badge";
import { FileText, Megaphone, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
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
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 rounded-full", src.className)}>
                {src.label}
              </Badge>
              {lead.campaign_name && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 max-w-[140px] rounded-full">
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
      </div>
    </div>
  );
}
