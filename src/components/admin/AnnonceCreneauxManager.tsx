import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Power, Trash2, Users } from 'lucide-react';
import { fetchCreneauxReservations, isCreneauFull, capaciteLabel } from '@/lib/creneauxCapacite';

interface Creneau { id: string; date_heure: string; actif: boolean; capacite_max: number | null; reservations: number }

/** Prévient les candidats inscrits qu'une visite est annulée (best-effort, jamais bloquant). */
export const notifyAnnulation = async (body: { creneau_id: string } | { annonce_id: string }) => {
  try {
    const { data, error } = await supabase.functions.invoke('notify-visite-annulee', { body });
    if (error) throw error;
    if (data?.targeted) toast.info(`${data.targeted} candidat(s) prévenu(s) de l'annulation`);
  } catch (e) {
    console.error('notify-visite-annulee', e);
    toast.error("Les candidats n'ont pas pu être prévenus de l'annulation");
  }
};

export const parseCapacite = (v: string): number | null | 'invalid' => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 'invalid';
};

export function AnnonceCreneauxManager({ annonce, open, onOpenChange }: {
  annonce: { id: string; titre: string } | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [items, setItems] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [cap, setCap] = useState('20');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!annonce) return;
    setLoading(true);
    const { data } = await supabase.from('annonce_creneaux').select('id, date_heure, actif, capacite_max').eq('annonce_id', annonce.id).order('date_heure');
    const counts = await fetchCreneauxReservations((data ?? []).map((c) => c.id));
    setItems((data ?? []).map((c) => ({ ...c, reservations: counts[c.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, annonce?.id]);

  const activeCount = items.filter((i) => i.actif).length;

  const run = async (fn: () => PromiseLike<{ error: any }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(ok);
    load();
    return true;
  };

  const add = async () => {
    if (!annonce || !value) return toast.error('Choisissez une date et une heure');
    if (activeCount >= 3) return toast.error('Maximum 3 créneaux actifs');
    const d = new Date(value);
    if (d <= new Date()) return toast.error('Le créneau doit être dans le futur');
    const c = parseCapacite(cap);
    if (c === 'invalid') return toast.error('Nombre max de visiteurs invalide');
    const ok = await run(() => supabase.from('annonce_creneaux').insert({ annonce_id: annonce.id, date_heure: d.toISOString(), capacite_max: c }), 'Créneau ajouté');
    if (ok) { setValue(''); setCap('20'); }
  };

  const editCap = (c: Creneau) => {
    const v = window.prompt('Nombre max de visiteurs (vide = illimité)', c.capacite_max?.toString() ?? '');
    if (v === null) return;
    const n = parseCapacite(v);
    if (n === 'invalid') return toast.error('Nombre invalide');
    run(() => supabase.from('annonce_creneaux').update({ capacite_max: n }).eq('id', c.id), 'Capacité mise à jour');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créneaux de visite</DialogTitle>
          <DialogDescription>{annonce?.titre} — 1 à 3 créneaux actifs</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-[200px] flex-1" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          <Input className="w-40" type="number" min={1} placeholder="Max visiteurs" title="Nombre max de visiteurs (vide = illimité)" value={cap} onChange={(e) => setCap(e.target.value)} />
          <Button onClick={add} disabled={busy || activeCount >= 3}><Plus className="mr-1 h-4 w-4" />Ajouter</Button>
        </div>
        <p className="text-xs text-muted-foreground">Nombre max de visiteurs : laisser vide pour illimité.</p>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Aucun créneau défini.</p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-foreground">
                    {new Date(c.date_heure).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{capaciteLabel(c.reservations, c.capacite_max)}</p>
                </div>
                {isCreneauFull(c.reservations, c.capacite_max) && <Badge variant="destructive">Complet</Badge>}
                <Badge variant={c.actif ? 'default' : 'secondary'}>{c.actif ? 'Actif' : 'Inactif'}</Badge>
                <Button size="icon" variant="ghost" title="Modifier la capacité" disabled={busy} onClick={() => editCap(c)}>
                  <Users className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" title={c.actif ? 'Désactiver' : 'Activer'} disabled={busy}
                  onClick={async () => {
                    const wasActive = c.actif;
                    const ok = await run(() => supabase.from('annonce_creneaux').update({ actif: !c.actif }).eq('id', c.id), c.actif ? 'Créneau désactivé' : 'Créneau activé');
                    if (ok && wasActive) notifyAnnulation({ creneau_id: c.id });
                  }}>
                  <Power className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Supprimer" disabled={busy}
                  onClick={async () => {
                    if (!window.confirm('Supprimer ce créneau ?')) return;
                    // Prévenir AVANT la suppression (la réservation perd son lien au créneau ensuite)
                    if (c.reservations > 0) await notifyAnnulation({ creneau_id: c.id });
                    run(() => supabase.from('annonce_creneaux').delete().eq('id', c.id), 'Créneau supprimé');
                  }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
