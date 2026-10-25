import { motion, AnimatePresence } from "framer-motion";
import { DASH_CARD, DashEmptyState } from "@/components/client/dashboard/DashPrimitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText, Megaphone, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { metaInitials, metaFullName, getSourceBadge, META_STAGES, type MetaLead } from "./types";

interface Props {
  leads: MetaLead[];
  onSelect: (l: MetaLead) => void;
}

export function MetaLeadsListView({ leads, onSelect }: Props) {
  if (leads.length === 0) {
    return <DashEmptyState icon={Users} title="Aucun lead pour ces filtres." />;
  }

  return (
    <div className={cn(DASH_CARD, "overflow-hidden divide-y divide-border/70")}>
      <AnimatePresence>
        {leads.map((lead, i) => {
          const src = getSourceBadge(lead);
          const stage = META_STAGES.find((s) => s.key === lead.lead_status);
          const dateRef = lead.lead_created_time_meta || lead.created_at;
          return (
            <motion.div
              key={lead.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.01, 0.15) }}
            >
              <div
                onClick={() => onSelect(lead)}
                className="group flex items-center gap-4 p-4 min-h-[80px] cursor-pointer transition-colors hover:bg-muted/50"
              >
                <div className="flex-shrink-0 h-11 w-11 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">
                  {metaInitials(lead)}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-3 min-w-0">
                    <div className="font-medium truncate">{metaFullName(lead)}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.email || "—"}</div>
                  </div>
                  <div className="sm:col-span-3 text-xs text-muted-foreground space-y-0.5 min-w-0">
                    {lead.form_name && (
                      <div className="flex items-center gap-1 truncate">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{lead.form_name}</span>
                      </div>
                    )}
                    {lead.campaign_name && (
                      <div className="flex items-center gap-1 truncate">
                        <Megaphone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{lead.campaign_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Badge variant="outline" className={cn("text-[10px] rounded-full", src.className)}>{src.label}</Badge>
                  </div>
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(dateRef), { addSuffix: true, locale: fr })}
                  </div>
                  <div className="sm:col-span-2 text-right">
                    {stage && <Badge variant="outline" className={cn("text-[10px] rounded-full", stage.badge)}>{stage.label}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full opacity-60 group-hover:opacity-100">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
