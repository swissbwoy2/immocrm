import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MetaLeadCard } from "./MetaLeadCard";
import { META_STAGES, type MetaLead, type MetaLeadStatus } from "./types";

interface Props {
  leads: MetaLead[];
  onSelect: (l: MetaLead) => void;
  onMove: (l: MetaLead, status: MetaLeadStatus) => void;
}

function DraggableCard({ lead, onClick }: { lead: MetaLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <MetaLeadCard lead={lead} onClick={onClick} compact />
    </div>
  );
}

function Column({
  stage, label, gradient, ring, leads, onSelect,
}: {
  stage: MetaLeadStatus;
  label: string;
  gradient: string;
  ring: string;
  leads: MetaLead[];
  onSelect: (l: MetaLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[280px] sm:min-w-[260px] snap-start rounded-xl bg-gradient-to-b border border-border/40 p-3 flex flex-col gap-3 transition-all",
        gradient,
        isOver && `ring-2 ${ring}`
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs font-medium text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[120px]">
        <AnimatePresence>
          {leads.map((l) => (
            <DraggableCard key={l.id} lead={l} onClick={() => onSelect(l)} />
          ))}
        </AnimatePresence>
        {leads.length === 0 && (
          <div className="text-center text-xs text-muted-foreground/60 py-8 italic">
            Aucun lead
          </div>
        )}
      </div>
    </div>
  );
}

export function MetaLeadsPipeline({ leads, onSelect, onMove }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map: Record<MetaLeadStatus, MetaLead[]> = {
      new: [], contacted: [], qualified: [], not_qualified: [], converted: [], archived: [],
    };
    for (const l of leads) {
      const k = (l.lead_status as MetaLeadStatus) || "new";
      if (map[k]) map[k].push(l); else map.new.push(l);
    }
    return map;
  }, [leads]);

  const handleDragEnd = (e: DragEndEvent) => {
    const id = e.active.id as string;
    const target = e.over?.id as MetaLeadStatus | undefined;
    if (!target) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.lead_status === target) return;
    onMove(lead, target);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max snap-x snap-mandatory">
          {META_STAGES.map((s) => (
            <Column
              key={s.key}
              stage={s.key}
              label={s.label}
              gradient={s.gradient}
              ring={s.ring}
              leads={grouped[s.key]}
              onSelect={onSelect}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DndContext>
  );
}
