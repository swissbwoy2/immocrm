import { Card } from "@/components/ui/card";
import { MetaLeadCard } from "./MetaLeadCard";
import type { MetaLead } from "./types";

interface Props {
  leads: MetaLead[];
  onSelect: (l: MetaLead) => void;
}

export function MetaLeadsCardsView({ leads, onSelect }: Props) {
  if (leads.length === 0) {
    return <Card className="p-12 text-center text-muted-foreground">Aucun lead pour ces filtres.</Card>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {leads.map((l) => <MetaLeadCard key={l.id} lead={l} onClick={() => onSelect(l)} />)}
    </div>
  );
}
