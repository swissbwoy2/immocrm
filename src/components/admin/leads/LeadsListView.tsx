import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Wallet, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getLeadSource } from "@/lib/lead-source";
import { initials, fullName, type Lead, type PhoneAppointment } from "./types";

interface Props {
  leads: Lead[];
  appointments: Map<string, PhoneAppointment>;
  apptByEmail: Map<string, PhoneAppointment>;
  onSelect: (lead: Lead) => void;
}

export function LeadsListView({ leads, appointments, apptByEmail, onSelect }: Props) {
  const getAppt = (l: Lead) =>
    appointments.get(l.id) || (l.email ? apptByEmail.get(l.email.toLowerCase()) || null : null);

  if (leads.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        Aucun lead pour ces filtres.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {leads.map((lead, i) => {
          const src = getLeadSource(lead);
          const appt = getAppt(lead);
          return (
            <motion.div
              key={lead.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.01, 0.15) }}
            >
              <Card
                onClick={() => onSelect(lead)}
                className="group flex items-center gap-4 p-4 min-h-[80px] cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold flex items-center justify-center">
                  {initials(lead)}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-3 min-w-0">
                    <div className="font-medium truncate">{fullName(lead)}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                  </div>
                  <div className="sm:col-span-3 text-xs text-muted-foreground space-y-0.5">
                    {lead.type_recherche && <div className="font-medium text-foreground">{lead.type_recherche}</div>}
                    <div className="flex flex-wrap gap-2">
                      {lead.localite && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.localite}</span>}
                      {lead.budget && <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{lead.budget}</span>}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Badge variant="outline" className={cn("text-[10px]", src.badgeClass)}>{src.label}</Badge>
                  </div>
                  <div className="sm:col-span-2">
                    {appt ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] gap-1",
                          appt.status === "confirme"
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                        )}
                      >
                        <Phone className="h-3 w-3" />
                        {format(new Date(appt.slot_start), "d MMM HH'h'mm", { locale: fr })}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </div>
                  <div className="sm:col-span-2 text-right">
                    {lead.contacted ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Contacté</Badge>
                    ) : (
                      <Badge variant="secondary">Nouveau</Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="opacity-60 group-hover:opacity-100">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
