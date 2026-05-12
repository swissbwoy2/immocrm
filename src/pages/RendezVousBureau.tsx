import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MapPin, ExternalLink, CheckCircle2, Loader2, Sun, Sunset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUTMParams } from '@/hooks/useUTMParams';
import {
  generateSlotsForDay,
  getAvailableDays,
  formatDayLabel,
  getDayPart,
  type Slot,
  type DayPart,
  OFFICE_ADDRESS,
  OFFICE_MAPS_URL,
} from '@/lib/phoneSlots';

const DAY_PARTS: { key: DayPart; label: string; icon: typeof Sun; range: string }[] = [
  { key: 'matin', label: 'Matin', icon: Sun, range: '08h30 → 12h00' },
  { key: 'apres-midi', label: 'Après-midi', icon: Sunset, range: '13h30 → 16h00' },
];

export default function RendezVousBureau() {
  const utm = useUTMParams();
  const availableDays = useMemo(() => getAvailableDays(), []);
  const [date, setDate] = useState<Date>(availableDays[0]);
  const [activeDayPart, setActiveDayPart] = useState<DayPart>('matin');
  const [selected, setSelected] = useState<Slot | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Réserver un RDV gratuit — Bureau Logisorama Crissier';
  }, []);

  // Charger les créneaux occupés (vue publique) + realtime
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.rpc('get_available_phone_slots', {
        p_from: from,
        p_to: to,
      });
      if (!mounted) return;
      const set = new Set<string>();
      (data || []).forEach((row: any) => set.add(new Date(row.slot_start).toISOString()));
      setTaken(set);
    };
    load();
    const channel = supabase
      .channel('rdv-bureau-slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_phone_appointments' }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const slots = useMemo(() => generateSlotsForDay(date), [date]);
  const filtered = useMemo(() => slots.filter((s) => getDayPart(s) === activeDayPart), [slots, activeDayPart]);

  const isFormValid =
    !!selected &&
    prenom.trim().length >= 2 &&
    nom.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    telephone.trim().length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selected) return;
    setSubmitting(true);

    try {
      // Anti-doublon: la contrainte unique côté DB renverra 23505 si déjà pris.

      const apptId = crypto.randomUUID();
      const fullName = `${prenom.trim()} ${nom.trim()}`.trim();
      const notes = message.trim() ? `Message client: ${message.trim()}` : null;

      const { error: apptErr } = await supabase
        .from('lead_phone_appointments')
        .insert({
          id: apptId,
          prospect_email: email.trim(),
          prospect_phone: telephone.trim(),
          prospect_name: fullName,
          slot_start: selected.start.toISOString(),
          slot_end: selected.end.toISOString(),
          source_form: 'whatsapp_rdv_crissier',
          status: 'confirme',
          notes_admin: notes,
        });

      if (apptErr) {
        if ((apptErr as any).code === '23505') {
          toast.error('Ce créneau vient d\'être réservé. Choisis-en un autre.');
          setSelected(null);
        } else {
          throw apptErr;
        }
        setSubmitting(false);
        return;
      }

      // Créer un lead léger pour traçabilité CRM
      const leadId = crypto.randomUUID();
      await supabase.from('leads').insert({
        id: leadId,
        email: email.trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone.trim(),
        source: 'whatsapp_rdv_crissier',
        type_recherche: 'location',
        is_qualified: true,
        utm_source: utm.utm_source || 'whatsapp',
        utm_medium: utm.utm_medium || 'business_message',
        utm_campaign: utm.utm_campaign || 'location_v2',
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
      });
      await supabase
        .from('lead_phone_appointments')
        .update({ lead_id: leadId })
        .eq('id', apptId);

      // Mail confirmation + ICS
      supabase.functions
        .invoke('send-calendar-invite', {
          body: {
            title: 'RDV Logisorama — Bureau Crissier',
            description: `Rendez-vous confirmé avec ${fullName}.\nTéléphone : ${telephone.trim()}\nAdresse : ${OFFICE_ADDRESS}\nItinéraire : ${OFFICE_MAPS_URL}`,
            location: OFFICE_ADDRESS,
            start_date: selected.start.toISOString(),
            end_date: selected.end.toISOString(),
            all_day: false,
            recipient_email: email.trim(),
          },
        })
        .then(() => {
          supabase
            .from('lead_phone_appointments')
            .update({ ics_sent_at: new Date().toISOString() })
            .eq('id', apptId)
            .then(() => {});
        }, () => {});

      // Notif interne admin (email Resend + WhatsApp + cloche in-app) — best-effort
      supabase.functions
        .invoke('notify-admin-new-phone-appointment', {
          body: { appointment_id: apptId },
        })
        .then(() => {}, () => {});

      // ICS calendrier admin (best-effort, conservé pour agenda Google)
      supabase.functions
        .invoke('send-calendar-invite', {
          body: {
            title: `Nouveau RDV bureau — ${fullName}`,
            description: `Email: ${email.trim()}\nTél: ${telephone.trim()}\nMessage: ${message.trim() || '—'}`,
            location: OFFICE_ADDRESS,
            start_date: selected.start.toISOString(),
            end_date: selected.end.toISOString(),
            all_day: false,
            recipient_email: 'info@immo-rama.ch',
          },
        })
        .then(() => {}, () => {});

      setDone(true);
      toast.success('RDV confirmé. Tu vas recevoir un email de confirmation.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erreur lors de la réservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Rendez-vous confirmé</h1>
          <p className="text-muted-foreground">
            Le {formatDayLabel(selected!.start)} à {selected!.label}.
          </p>
          <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-2">
            <div className="flex items-start justify-center gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>{OFFICE_ADDRESS}</span>
            </div>
            <a
              href={OFFICE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
            >
              Itinéraire <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Un email avec invitation calendrier (ICS) vient d'être envoyé. Tu recevras aussi des rappels 24h, 3h, 1h et 30 min avant.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-3xl mx-auto px-4 py-6 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Réserve ton RDV gratuit au bureau
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Logisorama · {OFFICE_ADDRESS}
            </p>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Jours */}
          <Card className="p-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Jour</Label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {availableDays.map((d) => {
                const active = d.toDateString() === date.toDateString();
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setSelected(null);
                    }}
                    className={cn(
                      'shrink-0 rounded-lg px-3 py-2 text-sm border transition-colors min-w-[88px]',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                  >
                    <div className="font-semibold capitalize">
                      {d.toLocaleDateString('fr-CH', { weekday: 'short' })}
                    </div>
                    <div className="text-xs opacity-80">
                      {d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Période matin / après-midi */}
          <Card className="p-4">
            <div className="flex gap-2 mb-3">
              {DAY_PARTS.map((dp) => {
                const Icon = dp.icon;
                const active = activeDayPart === dp.key;
                return (
                  <button
                    key={dp.key}
                    type="button"
                    onClick={() => setActiveDayPart(dp.key)}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-2 text-sm border transition-colors flex items-center gap-2 justify-center',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{dp.label}</span>
                    <span className="text-xs opacity-70 hidden sm:inline">{dp.range}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((slot) => {
                const isTaken = taken.has(slot.start.toISOString());
                const isSelected = selected?.start.getTime() === slot.start.getTime();
                return (
                  <button
                    key={slot.key}
                    type="button"
                    disabled={isTaken}
                    onClick={() => setSelected(slot)}
                    className={cn(
                      'rounded-lg px-2 py-2 text-sm border transition-all',
                      isTaken && 'bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60',
                      !isTaken && !isSelected && 'bg-background hover:bg-muted border-border',
                      isSelected && 'bg-primary text-primary-foreground border-primary scale-[1.02]'
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Formulaire */}
          {selected && (
            <Card className="p-4 md:p-6">
              <h2 className="font-semibold mb-1">Tes coordonnées</h2>
              <p className="text-xs text-muted-foreground mb-4">
                RDV le {formatDayLabel(selected.start)} à {selected.label} (30 min)
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tel">Téléphone *</Label>
                    <Input
                      id="tel"
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+41 ..."
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="msg">Message (facultatif)</Label>
                  <Textarea
                    id="msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Précise ta recherche, ton budget, tes besoins..."
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={!isFormValid || submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Réservation...
                    </>
                  ) : (
                    'Confirmer mon rendez-vous'
                  )}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
