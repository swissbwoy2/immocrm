import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Phone, Mail, Calendar, User, ExternalLink, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PhoneAppointmentRaw {
  id: string;
  lead_id?: string | null;
  slot_start: string;
  slot_end?: string | null;
  status: string;
  prospect_name?: string | null;
  prospect_email?: string | null;
  prospect_phone?: string | null;
  leads?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
    telephone?: string | null;
  } | null;
}

interface Props {
  appt: PhoneAppointmentRaw | null;
  open: boolean;
  onClose: () => void;
  onCancelled?: () => void;
}

export function PhoneAppointmentDetailDialog({ appt, open, onClose, onCancelled }: Props) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  if (!appt) return null;

  const lead = appt.leads;
  const prospectName =
    appt.prospect_name ||
    (lead ? `${lead.prenom || ''} ${lead.nom || ''}`.trim() : '') ||
    'Prospect';
  const phone = appt.prospect_phone || lead?.telephone || '';
  const email = appt.prospect_email || lead?.email || '';

  const start = new Date(appt.slot_start);
  const end = appt.slot_end ? new Date(appt.slot_end) : new Date(start.getTime() + 30 * 60 * 1000);

  const isConfirmed = appt.status === 'confirme';

  const handleCancel = async () => {
    try {
      setCancelling(true);
      const { error } = await supabase
        .from('lead_phone_appointments')
        .update({ status: 'annule' })
        .eq('id', appt.id);
      if (error) throw error;
      toast.success('RDV téléphonique annulé');
      onCancelled?.();
      onClose();
    } catch (e: any) {
      toast.error('Erreur lors de l\'annulation : ' + e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Phone className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <div>RDV téléphonique</div>
              <div className="text-sm font-normal text-muted-foreground mt-0.5">
                {prospectName}
              </div>
            </div>
            <Badge
              variant={isConfirmed ? 'default' : 'secondary'}
              className={isConfirmed ? 'bg-green-500/15 text-green-600 border-green-500/30' : ''}
            >
              {isConfirmed ? 'Confirmé' : 'En attente'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold capitalize">
                  {format(start, "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Contact prospect
            </Label>
            <div className="space-y-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Téléphone</p>
                    <p className="font-medium group-hover:text-primary transition-colors truncate">
                      {phone}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium group-hover:text-primary transition-colors truncate">
                      {email}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>
          </div>

          {/* Lead link */}
          {appt.lead_id && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                onClose();
                navigate(`/admin/leads?id=${appt.lead_id}`);
              }}
            >
              <User className="h-4 w-4" />
              Voir la fiche lead
              <ExternalLink className="h-3.5 w-3.5 ml-auto" />
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={cancelling}>
                <XCircle className="h-4 w-4 mr-2" />
                Annuler le RDV
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler ce rendez-vous ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le RDV sera marqué comme annulé. Le prospect ne sera pas notifié automatiquement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleCancel}
                >
                  Confirmer l'annulation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AddToCalendarButton
            event={{
              uid: `phone-appt-${appt.id}@logisorama.ch`,
              title: `RDV téléphonique — ${prospectName}`,
              description: [
                `Appel à passer au ${phone || '—'}`,
                email ? `Email : ${email}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
              location: phone ? `Téléphone : ${phone}` : '',
              startDate: start,
              endDate: end,
            }}
            variant="default"
            size="sm"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
