import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Plus, Check, X, Trash2 } from 'lucide-react';

const SLOT_STATUS: Record<string, { label: string; cls: string }> = {
  proposed:  { label: 'Proposé',   cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmé',  cls: 'bg-emerald-100 text-emerald-700' },
  rejected:  { label: 'Refusé',    cls: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Annulé',    cls: 'bg-zinc-100 text-zinc-600' },
  completed: { label: 'Terminé',   cls: 'bg-indigo-100 text-indigo-700' },
};

const SLOT_TYPES = ['physique', 'groupée', 'vidéo', 'déléguée'];

interface Props {
  requestId: string;
  mode: 'client' | 'admin';
}

export function RelouerSlotsManager({ requestId, mode }: Props) {
  const [slots, setSlots] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState('physique');
  const [capacity, setCapacity] = useState('1');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('relouer_visit_slots')
      .select('*')
      .eq('request_id', requestId)
      .order('slot_start', { ascending: true });
    setSlots(data || []);
  };

  useEffect(() => { if (requestId) load(); /* eslint-disable-next-line */ }, [requestId]);

  const log = async (event_type: string, payload: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('relouer_timeline').insert({
      request_id: requestId, event_type, payload, created_by: user?.id || null,
    });
  };

  const add = async () => {
    if (!date || !start || !end) {
      toast.error('Date, heure début et fin requises');
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const slot_start = new Date(`${date}T${start}:00`).toISOString();
    const slot_end = new Date(`${date}T${end}:00`).toISOString();
    const { error } = await supabase.from('relouer_visit_slots').insert({
      request_id: requestId,
      slot_start, slot_end,
      slot_type: type,
      capacity: Number(capacity) || 1,
      notes: notes || null,
      status: mode === 'admin' ? 'confirmed' : 'proposed',
      created_by: user?.id || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await log(mode === 'admin' ? 'slot_added' : 'slot_proposed', { slot_start, slot_end, slot_type: type });
    setDate(''); setStart(''); setEnd(''); setNotes('');
    toast.success(mode === 'admin' ? 'Créneau ajouté' : 'Créneau proposé à l\'équipe');
    load();
  };

  const update = async (id: string, status: string, event_type: string) => {
    const { error } = await supabase.from('relouer_visit_slots').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    await log(event_type, { slot_id: id, status });
    toast.success('Mis à jour');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    await supabase.from('relouer_visit_slots').delete().eq('id', id);
    await log('slot_deleted', { slot_id: id });
    toast.success('Supprimé');
    load();
  };

  return (
    <div>
      <div className="p-4 rounded-xl border bg-sky-50/40 mb-4">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-sky-600" />
          {mode === 'admin' ? 'Ajouter un créneau' : 'Proposer un créneau'}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SLOT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Places" />
          <Button onClick={add} disabled={busy} className="bg-sky-600 hover:bg-sky-700">
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
        <Input className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions (optionnel)…" />
      </div>

      {slots.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-xl">
          Aucun créneau pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map((s) => {
            const st = SLOT_STATUS[s.status] || SLOT_STATUS.proposed;
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-card">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {new Date(s.slot_start).toLocaleString('fr-CH', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' → '}
                    {new Date(s.slot_end).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.slot_type || 'physique'} · {s.capacity || 1} place(s)
                    {s.notes ? ` · ${s.notes}` : ''}
                  </div>
                </div>
                <Badge className={`${st.cls} border-0`}>{st.label}</Badge>
                {mode === 'admin' && s.status === 'proposed' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => update(s.id, 'confirmed', 'slot_accepted')}>
                      <Check className="h-4 w-4 mr-1" /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(s.id, 'rejected', 'slot_rejected')}>
                      <X className="h-4 w-4 mr-1" /> Refuser
                    </Button>
                  </>
                )}
                {mode === 'admin' && (
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                )}
                {mode === 'client' && s.status === 'proposed' && (
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RelouerSlotsManager;
