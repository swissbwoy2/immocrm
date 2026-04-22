import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LeadCard } from "./LeadCard";
import { STAGES, getStage, type Lead, type PhoneAppointment, type PipelineStage } from "./types";

interface Props {
  leads: Lead[];
  appointments: Map<string, PhoneAppointment>;
  apptByEmail: Map<string, PhoneAppointment>;
  clientEmails: Set<string>;
  onSelect: (lead: Lead) => void;
  onMove: (lead: Lead, stage: PipelineStage) => void;
}

function DraggableCard({ lead, appt, onClick }: { lead: Lead; appt?: PhoneAppointment | null; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} appt={appt} onClick={onClick} compact />
    </div>
  );
}

function Column({
  stage, label, gradient, ring, leads, getAppt, onSelect,
}: {
  stage: PipelineStage;
  label: string;
  gradient: string;
  ring: string;
  leads: Lead[];
  getAppt: (l: Lead) => PhoneAppointment | null;
  onSelect: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[260px] rounded-xl bg-gradient-to-b border border-border/40 p-3 flex flex-col gap-3 transition-all",
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
            <DraggableCard key={l.id} lead={l} appt={getAppt(l)} onClick={() => onSelect(l)} />
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

export function LeadsPipeline({ leads, appointments, apptByEmail, clientEmails, onSelect, onMove }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const getAppt = (l: Lead): PhoneAppointment | null =>
    appointments.get(l.id) || (l.email ? apptByEmail.get(l.email.toLowerCase()) || null : null);

  const grouped = useMemo(() => {
    const map: Record<PipelineStage, Lead[]> = {
      nouveau: [], rdv: [], contacte: [], qualifie: [], client: [],
    };
    leads.forEach((l) => {
      const isClient = !!l.email && clientEmails.has(l.email.toLowerCase());
      const hasAppt = !!getAppt(l);
      const s = getStage(l, hasAppt, isClient);
      map[s].push(l);
    });
    return map;
  }, [leads, appointments, apptByEmail, clientEmails]);

  const handleDragEnd = (e: DragEndEvent) => {
    const leadId = e.active.id as string;
    const target = e.over?.id as PipelineStage | undefined;
    if (!target) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const isClient = !!lead.email && clientEmails.has(lead.email.toLowerCase());
    const hasAppt = !!getAppt(lead);
    const current = getStage(lead, hasAppt, isClient);
    if (current === target) return;
    onMove(lead, target);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {STAGES.map((s) => (
            <Column
              key={s.key}
              stage={s.key}
              label={s.label}
              gradient={s.gradient}
              ring={s.ring}
              leads={grouped[s.key]}
              getAppt={getAppt}
              onSelect={onSelect}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DndContext>
  );
}
