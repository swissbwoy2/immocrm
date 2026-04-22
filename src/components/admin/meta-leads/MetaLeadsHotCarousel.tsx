import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { metaInitials, metaFullName, type MetaLead } from "./types";

interface Props {
  hot: MetaLead[];
  onSelect: (l: MetaLead) => void;
}

export function MetaLeadsHotCarousel({ hot, onSelect }: Props) {
  if (hot.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <h3 className="text-sm font-semibold">À traiter en priorité</h3>
        <span className="text-xs text-muted-foreground">({hot.length})</span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-3 snap-x snap-mandatory">
          {hot.map((lead, i) => {
            const dateRef = lead.lead_created_time_meta || lead.created_at;
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Card
                  className="min-w-[260px] sm:min-w-[300px] snap-start p-3 flex items-center gap-3 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-[#1877F2]/10 to-amber-500/5 border-amber-500/30"
                  onClick={() => onSelect(lead)}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1877F2] to-[#1877F2]/60 text-white font-semibold flex items-center justify-center text-sm flex-shrink-0">
                    {metaInitials(lead)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{metaFullName(lead)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      📋 {lead.form_name || "Formulaire"} · {formatDistanceToNow(new Date(dateRef), { addSuffix: true, locale: fr })}
                    </div>
                  </div>
                  {lead.phone && (
                    <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                      <a href={`tel:${lead.phone}`} className="gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        Appeler
                      </a>
                    </Button>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
