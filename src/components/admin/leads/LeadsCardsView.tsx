import { LeadCard } from "./LeadCard";
import type { Lead, PhoneAppointment } from "./types";
import { Card } from "@/components/ui/card";

interface Props {
  leads: Lead[];
  appointments: Map<string, PhoneAppointment>;
  apptByEmail: Map<string, PhoneAppointment>;
  onSelect: (lead: Lead) => void;
}

export function LeadsCardsView({ leads, appointments, apptByEmail, onSelect }: Props) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {leads.map((l) => (
        <LeadCard key={l.id} lead={l} appt={getAppt(l)} onClick={() => onSelect(l)} />
      ))}
    </div>
  );
}
