import { useState } from 'react';
import { Phone, Mail, Calendar, User, ExternalLink, XCircle, Clock, MapPin, Building2, CheckCircle2, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { DETAIL_DIALOG, DetailHeader, DetailBody, DetailSection, DetailRow, DetailActions, dateCH } from '@/components/details/DetailPrimitives';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  appointment_type?: 'bureau' | 'telephonique' | string | null;
  prospect_name?: string | null;
  prospect_email?: string | null;
  prospect_phone?: string | null;
  assigned_agent_id?: string | null;
  leads?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
    telephone?: string | null;
  } | null;
}

interface AssignableAgent {
  id: string;
  user_id: string;
  profiles?: { prenom?: string | null; nom?: string | null } | null;
}

interface Props {
  appt: PhoneAppointmentRaw | null;
  open: boolean;
  onClose: () => void;
  onCancelled?: () => void;
  assignableAgents?: AssignableAgent[];
}

export function PhoneAppointmentDetailDialog({ appt, open, onClose, onCancelled, assignableAgents }: Props) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [assigning, setAssigning] = useState(false);


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
  const isPending = appt.status === 'en_attente';
  const isBureau = appt.appointment_type === 'bureau';
  const OFFICE_ADDRESS = 'Ch. de la Verseuse 1, 1023 Crissier';

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

  const handleConfirm = async () => {
    if (!email) {
      toast.error('Email du prospect manquant — impossible d\'envoyer l\'invitation.');
      return;
    }
    try {
      setConfirming(true);
      const { data: userData } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();

      const title = isBureau
        ? 'RDV Logisorama — Bureau Crissier'
        : 'RDV Logisorama — Appel téléphonique';
      const description = isBureau
        ? `Rendez-vous confirmé avec ${prospectName}.\nAdresse : ${OFFICE_ADDRESS}\nMerci d'arriver 5 minutes en avance.`
        : `Appel téléphonique confirmé avec ${prospectName}.\nNous vous appellerons au : ${phone || '—'}`;
      const location = isBureau ? OFFICE_ADDRESS : (phone ? `Téléphone : ${phone}` : '');

      const { error: invErr } = await supabase.functions.invoke('send-calendar-invite', {
        body: {
          title,
          description,
          location,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          all_day: false,
          recipient_email: email,
        },
      });
      if (invErr) throw invErr;

      const { error: updErr } = await supabase
        .from('lead_phone_appointments')
        .update({
          status: 'confirme',
          confirmed_at: nowIso,
          confirmed_by: userData.user?.id ?? null,
          ics_sent_at: nowIso,
        })
        .eq('id', appt.id);
      if (updErr) throw updErr;

      toast.success('RDV confirmé. Invitation envoyée au prospect.');
      onCancelled?.();
      onClose();
    } catch (e: any) {
      toast.error('Erreur lors de la confirmation : ' + (e?.message || e));
    } finally {
      setConfirming(false);
    }
  };

  const heure = (d: Date) => d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isBureau ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`}>
                {isBureau ? <Building2 className="h-4 w-4 text-emerald-600" /> : <Phone className="h-4 w-4 text-indigo-500" />}
              </span>
              {isBureau ? 'RDV au bureau' : 'RDV téléphonique'}
            </span>
          }
          title={prospectName}
          subtitle={<span className="inline-block first-letter:uppercase">{dateCH(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          badge={
            <>
              <DashBadge tone={isConfirmed ? 'success' : 'warning'}>{isConfirmed ? 'Confirmé' : 'En attente'}</DashBadge>
              <DashBadge tone="muted">{isBureau ? 'Bureau' : 'Téléphone'}</DashBadge>
            </>
          }
        />

        <DetailBody>
          <DetailSection title="Rendez-vous" icon={Calendar}>
            <DetailRow
              icon={Clock}
              label="Horaire"
              value={`${heure(start)} – ${heure(end)}`}
            />
            {isBureau && <DetailRow icon={MapPin} label="Lieu du rendez-vous" value={OFFICE_ADDRESS} />}
          </DetailSection>

          {(phone || email) && (
            <DetailSection title="Contact prospect">
              <DetailRow icon={Phone} label="Téléphone" value={phone || null} href={phone ? `tel:${phone}` : undefined} />
              <DetailRow icon={Mail} label="Email" value={email || null} href={email ? `mailto:${email}` : undefined} />
            </DetailSection>
          )}

          {/* Assignation agent (admin) */}
          {assignableAgents && (
            <DetailSection title="Agent assigné" icon={UserCog}>
              <Label htmlFor="phone-appt-agent" className="sr-only">Agent assigné</Label>
              <Select
                value={appt.assigned_agent_id ?? 'none'}
                disabled={assigning}
                onValueChange={async (val) => {
                  try {
                    setAssigning(true);
                    const newId = val === 'none' ? null : val;
                    const { error } = await supabase
                      .from('lead_phone_appointments')
                      .update({ assigned_agent_id: newId })
                      .eq('id', appt.id);
                    if (error) throw error;
                    toast.success(newId ? 'Agent assigné' : 'Assignation retirée');
                    onCancelled?.();
                  } catch (e: any) {
                    toast.error("Erreur d'assignation : " + (e?.message || e));
                  } finally {
                    setAssigning(false);
                  }
                }}
              >
                <SelectTrigger id="phone-appt-agent" className="h-11">
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {assignableAgents.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.profiles?.prenom || ''} {a.profiles?.nom || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-muted-foreground">
                Le RDV apparaîtra dans le calendrier de l'agent sélectionné.
              </p>
            </DetailSection>
          )}

          {appt.lead_id && (
            <Button
              variant="outline"
              className="min-h-11 w-full gap-2"
              onClick={() => {
                onClose();
                navigate(`/admin/leads?id=${appt.lead_id}`);
              }}
            >
              <User className="h-4 w-4" />
              Voir la fiche lead
              <ExternalLink className="ml-auto h-3.5 w-3.5" />
            </Button>
          )}
        </DetailBody>

        <DetailActions>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" disabled={cancelling} className="text-destructive hover:text-destructive">
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
              title: isBureau
                ? `RDV bureau — ${prospectName}`
                : `RDV téléphonique — ${prospectName}`,
              description: [
                isBureau
                  ? `Rendez-vous au bureau avec ${prospectName}`
                  : `Appel à passer au ${phone || '—'}`,
                phone ? `Téléphone : ${phone}` : null,
                email ? `Email : ${email}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
              location: isBureau ? OFFICE_ADDRESS : (phone ? `Téléphone : ${phone}` : ''),
              startDate: start,
              endDate: end,
            }}
            variant={isPending ? 'outline' : 'default'}
            size="default"
          />

          {isPending && (
            <Button onClick={handleConfirm} disabled={confirming}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {confirming ? 'Envoi…' : 'Confirmer et envoyer l\'invitation'}
            </Button>
          )}
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}
