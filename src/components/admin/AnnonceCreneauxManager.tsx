import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Power, Trash2 } from 'lucide-react';

interface Creneau { id: string; date_heure: string; actif: boolean; reservations: number }

export function AnnonceCreneauxManager({ annonce, open, onOpenChange }: {
  annonce: { id: string; titre: string } | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [items, setItems] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!annonce) return;
    setLoading(true);
    const { data } = await supabase.from('annonce_creneaux').select('id, date_heure, actif').eq('annonce_id', annonce.id).order('date_heure');
    const ids = (data ?? []).map((c) => c.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: res } = await supabase.from('candidatures_location').select('creneau_id').in('creneau_id', ids);
      (res ?? []).forEach((r: any) => { counts[r.creneau_id] = (counts[r.creneau_id] || 0) + 1; });
    }
    setItems((data ?? []).map((c) => ({ ...c, reservations: counts[c.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, annonce?.id]);

  const activeCount = items.filter((i) => i.actif).length;

  const run = async (fn: () => PromiseLike<{ error: any }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(ok);
    load();
  };

  const add = () => {
    if (!annonce || !value) return toast.error('Choisissez une date et une heure');
    if (activeCount >= 3) return toast.error('Maximum 3 créneaux actifs');
    const d = new Date(value);
    if (d <= new Date()) return toast.error('Le créneau doit être dans le futur');
    run(() => supabase.from('annonce_creneaux').insert({ annonce_id: annonce.id, date_heure: d.toISOString() }), 'Créneau ajouté').then(() => setValue(''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créneaux de visite</DialogTitle>
          <DialogDescription>{annonce?.titre} — 1 à 3 créneaux actifs</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button onClick={add} disabled={busy || activeCount >= 3}><Plus className="mr-1 h-4 w-4" />Ajouter</Button>
        </div>
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
                  <p className="text-xs text-muted-foreground">{c.reservations} réservation(s)</p>
                </div>
                <Badge variant={c.actif ? 'default' : 'secondary'}>{c.actif ? 'Actif' : 'Inactif'}</Badge>
                <Button size="icon" variant="ghost" title={c.actif ? 'Désactiver' : 'Activer'} disabled={busy}
                  onClick={() => run(() => supabase.from('annonce_creneaux').update({ actif: !c.actif }).eq('id', c.id), c.actif ? 'Créneau désactivé' : 'Créneau activé')}>
                  <Power className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" title="Supprimer" disabled={busy}
                  onClick={() => { if (window.confirm('Supprimer ce créneau ?')) run(() => supabase.from('annonce_creneaux').delete().eq('id', c.id), 'Créneau supprimé'); }}>
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
