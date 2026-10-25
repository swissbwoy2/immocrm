import { Users } from "lucide-react";
import { DashEmptyState } from "@/components/client/dashboard/DashPrimitives";
import { MetaLeadCard } from "./MetaLeadCard";
import type { MetaLead } from "./types";

interface Props {
  leads: MetaLead[];
  onSelect: (l: MetaLead) => void;
}

export function MetaLeadsCardsView({ leads, onSelect }: Props) {
  if (leads.length === 0) {
    return <DashEmptyState icon={Users} title="Aucun lead pour ces filtres." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {leads.map((l) => <MetaLeadCard key={l.id} lead={l} onClick={() => onSelect(l)} />)}
    </div>
  );
}
