import { LeadCard } from "./LeadCard";
import type { Lead, PhoneAppointment } from "./types";
import { Users } from "lucide-react";
import { DashEmptyState } from "@/components/client/dashboard/DashPrimitives";

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
      <DashEmptyState icon={Users} title="Aucun lead pour ces filtres." />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {leads.map((l) => (
        <LeadCard key={l.id} lead={l} appt={getAppt(l)} onClick={() => onSelect(l)} />
      ))}
    </div>
  );
}
