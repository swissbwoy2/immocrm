import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from './statusBadges';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarPlus, Loader2 } from 'lucide-react';

interface Props {
  visit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateVisit?: (visit: any) => void;
  isCreating?: boolean;
}

export function VisitDetailDrawer({ visit, open, onOpenChange, onCreateVisit, isCreating }: Props) {
  const [visitDate, setVisitDate] = useState('');

  if (!visit) return null;

  const canCreateVisit = visit.status === 'demande_prete' || visit.status === 'visite_confirmee';

  const handleCreateVisit = () => {
    const visitWithDate = visitDate
      ? { ...visit, confirmed_date: new Date(visitDate).toISOString() }
      : visit;
    onCreateVisit?.(visitWithDate);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Détail de la visite</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <StatusBadge type="visit" value={visit.status} />
              {visit.approval_required && (
                <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Validation requise</span>
              )}
            </div>

            {/* Property info */}
            {visit.property_results && (
              <div className="text-sm">
                <span className="text-muted-foreground">Bien:</span>
                <span className="block font-medium">{visit.property_results.title || visit.property_results.address || '—'}</span>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {visit.confirmed_date && (
                <div>
                  <span className="text-muted-foreground">Date confirmée:</span>
                  <span className="block font-medium">{format(new Date(visit.confirmed_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                </div>
              )}
              {visit.sent_at && (
                <div>
                  <span className="text-muted-foreground">Envoyée le:</span>
                  <span className="block">{format(new Date(visit.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                </div>
              )}
              {visit.assigned_to && (
                <div>
                  <span className="text-muted-foreground">Assignée à:</span>
                  <span className="block">{visit.assigned_to}</span>
                </div>
              )}
            </div>

            {/* CRM Visit Creation Section */}
            {canCreateVisit && (
              <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4 text-primary" />
                  Créer la visite dans le CRM
                </h4>
                <div>
                  <Label className="text-xs">Date et heure de visite</Label>
                  <Input
                    type="datetime-local"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si vide, la date confirmée existante sera utilisée.
                  </p>
                </div>
                <Button
                  onClick={handleCreateVisit}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CalendarPlus className="w-4 h-4 mr-1" />}
                  Créer la visite CRM
                </Button>
                <p className="text-xs text-muted-foreground">
                  Les notifications et invitations calendrier seront envoyées automatiquement.
                </p>
              </div>
            )}

            {/* Proposed slots */}
            {visit.proposed_slots && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Créneaux proposés</h4>
                <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap">
                  {JSON.stringify(visit.proposed_slots, null, 2)}
                </pre>
              </div>
            )}

            {/* Contact message */}
            {visit.contact_message && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Message de contact</h4>
                <p className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap">{visit.contact_message}</p>
              </div>
            )}

            {/* Source response */}
            {visit.source_response && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Réponse source</h4>
                <p className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap">{visit.source_response}</p>
              </div>
            )}

            {/* Notes */}
            {visit.notes && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{visit.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
