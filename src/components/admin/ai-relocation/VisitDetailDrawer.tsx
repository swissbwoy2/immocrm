import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from './statusBadges';
import { AlertTriangle, CalendarClock, MessageSquare, Reply, StickyNote, Home } from 'lucide-react';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { VisitBody, VisitHero, VisitInfoTiles, VisitNote, VisitSection } from '@/components/visites/VisitDetailParts';
import { formatZurichDateTime, isDateOnly } from '@/lib/dateZurich';

interface Props {
  visit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Créneau proposé (JSON libre) → libellé lisible en heure suisse, sinon JSON brut. */
function slotLabel(slot: any): string {
  const raw = typeof slot === 'string' ? slot : slot?.start || slot?.date || slot?.datetime || slot?.date_heure || null;
  if (typeof raw === 'string') {
    const label = formatZurichDateTime(raw);
    if (label) {
      const end = typeof slot === 'object' && slot ? slot.end || slot.fin : null;
      const endLabel = typeof end === 'string' && !isDateOnly(end) ? formatZurichDateTime(end).split(' à ')[1] : '';
      return endLabel ? `${label} – ${endLabel}` : label;
    }
  }
  return typeof slot === 'string' ? slot : JSON.stringify(slot);
}

export function VisitDetailDrawer({ visit, open, onOpenChange }: Props) {
  if (!visit) return null;
  const slots: any[] = Array.isArray(visit.proposed_slots) ? visit.proposed_slots : [];
  const hasRawSlots = visit.proposed_slots && !Array.isArray(visit.proposed_slots);
  const title = visit.property_results?.title || visit.property_results?.address || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto overscroll-contain p-0 sm:max-w-xl">
        <VisitHero
          TitleAs={SheetTitle}
          date={visit.confirmed_date}
          kicker="Détail de la visite"
          badges={
            <>
              <StatusBadge type="visit" value={visit.status} />
              {visit.approval_required && <DashBadge tone="warning">Validation requise</DashBadge>}
            </>
          }
          address={visit.property_results?.address || null}
          title={visit.confirmed_date ? title : title || 'Date à confirmer'}
        />

        <VisitBody className="pb-[max(env(safe-area-inset-bottom),1rem)]">
          <VisitInfoTiles
            items={[
              { icon: Home, label: 'Bien', value: visit.property_results?.title && visit.property_results?.address ? visit.property_results.title : undefined },
              { icon: CalendarClock, label: 'Envoyée le', value: visit.sent_at ? formatZurichDateTime(visit.sent_at, { short: true, year: true }) : undefined },
              { label: 'Assignée à', value: visit.assigned_to },
            ]}
          />

          {(slots.length > 0 || hasRawSlots) && (
            <VisitSection icon={CalendarClock} title="Créneaux proposés">
              {slots.length > 0 ? (
                <ul className="space-y-2">
                  {slots.map((s, i) => (
                    <li key={i} className="imr-lg-glass rounded-2xl px-3.5 py-3 text-[15px] font-medium text-foreground">{slotLabel(s)}</li>
                  ))}
                </ul>
              ) : (
                <pre className="whitespace-pre-wrap break-words rounded-2xl bg-muted/60 p-3 text-xs">
                  {JSON.stringify(visit.proposed_slots, null, 2)}
                </pre>
              )}
            </VisitSection>
          )}

          {visit.contact_message && (
            <VisitSection icon={MessageSquare} title="Message de contact">
              <VisitNote>{visit.contact_message}</VisitNote>
            </VisitSection>
          )}

          {visit.source_response && (
            <VisitSection icon={Reply} title="Réponse source">
              <VisitNote>{visit.source_response}</VisitNote>
            </VisitSection>
          )}

          {visit.notes && (
            <VisitSection icon={StickyNote} title="Notes">
              <VisitNote>{visit.notes}</VisitNote>
            </VisitSection>
          )}

          {visit.error_message && (
            <div className="rounded-[22px] bg-destructive/10 p-4">
              <h4 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Erreur
              </h4>
              <p className="whitespace-pre-wrap break-words text-sm text-destructive">{visit.error_message}</p>
            </div>
          )}
        </VisitBody>
      </SheetContent>
    </Sheet>
  );
}
