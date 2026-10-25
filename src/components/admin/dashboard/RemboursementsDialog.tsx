import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCHF } from '@/lib/adminFinance';

export interface RemboursementRow {
  id: string;
  date_remboursement: string;
  client_nom: string;
  montant: number;
  moyen: string | null;
  client_id: string | null;
  notes: string | null;
}

export interface PendingRefund {
  clientId: string;
  demandeId: string | null;
  nom: string;
  demandeLe: string | null;
  montant: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: PendingRefund[];
  rows: RemboursementRow[];
  /** false = la table « remboursements » n'existe pas encore. */
  available: boolean;
  onChanged: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const MOYENS = ['TWINT', 'Virement', 'Espèces', 'Autre'];

/**
 * Journal des remboursements versés : marquer une demande en attente comme remboursée,
 * ou saisir un remboursement libre (par ex. client dont le compte a été supprimé ensuite).
 * Rien n'est supprimé.
 */
export function RemboursementsDialog({ open, onOpenChange, pending, rows, available, onChanged }: Props) {
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('300');
  const [date, setDate] = useState(today());
  const [moyen, setMoyen] = useState('TWINT');
  const [notes, setNotes] = useState('');

  const table = () => (supabase as any).from('remboursements');

  const markDone = async (p: PendingRefund) => {
    const d = dates[p.clientId] || today();
    setBusy(p.clientId);
    const { error } = await table().insert({
      date_remboursement: d, client_nom: p.nom, montant: p.montant, client_id: p.clientId, demande_mandat_id: p.demandeId,
    });
    if (error) {
      setBusy(null);
      toast.error("Impossible d'enregistrer le remboursement");
      return;
    }
    await supabase.from('clients').update({ refund_status: 'processed', refund_processed_at: new Date(d).toISOString() } as any).eq('id', p.clientId);
    setBusy(null);
    toast.success(`Remboursement de ${p.nom} enregistré`);
    onChanged();
  };

  const add = async () => {
    const m = Number(String(montant).replace(/'/g, '').replace(',', '.'));
    if (!nom.trim() || !Number.isFinite(m) || m <= 0) {
      toast.error('Indiquez le nom du client et un montant valide');
      return;
    }
    setBusy('new');
    const { error } = await table().insert({ date_remboursement: date, client_nom: nom.trim(), montant: m, moyen, notes: notes.trim() || null });
    setBusy(null);
    if (error) {
      toast.error("Impossible d'enregistrer le remboursement");
      return;
    }
    toast.success('Remboursement enregistré');
    setNom('');
    setNotes('');
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remboursements</DialogTitle>
          <DialogDescription>
            Chaque remboursement versé est déduit du bénéfice, à sa date. Il reste enregistré même si le compte du client est supprimé.
          </DialogDescription>
        </DialogHeader>

        {!available ? (
          <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800">
            Le journal des remboursements n'est pas encore créé. Collez le fichier « 20261025210000_remboursements.sql » dans l'éditeur SQL de Lovable Cloud, puis rechargez la page.
          </p>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Demandes en attente ({pending.length})</h3>
                {pending.map((p) => (
                  <div key={p.clientId} className="rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{p.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          Demandé le {p.demandeLe ? new Date(p.demandeLe).toLocaleDateString('fr-CH') : '—'} · {formatCHF(p.montant)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        value={dates[p.clientId] || today()}
                        onChange={(e) => setDates((s) => ({ ...s, [p.clientId]: e.target.value }))}
                        className="h-10 w-40"
                        aria-label={`Date du remboursement de ${p.nom}`}
                      />
                      <Button size="sm" className="h-10 rounded-lg" disabled={busy === p.clientId} onClick={() => markDone(p)}>
                        <Check className="mr-1.5 h-4 w-4" /> Marquer remboursé
                      </Button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Ajouter un remboursement</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rb-nom">Client</Label>
                  <Input id="rb-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Prénom Nom" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rb-montant">Montant (CHF)</Label>
                  <Input id="rb-montant" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rb-date">Date du remboursement</Label>
                  <Input id="rb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Moyen</Label>
                  <Select value={moyen} onValueChange={setMoyen}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOYENS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rb-notes">Note</Label>
                  <Input id="rb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Facultatif" />
                </div>
              </div>
              <Button onClick={add} disabled={busy === 'new'} className="h-11 w-full rounded-lg">
                <Plus className="mr-2 h-4 w-4" /> Enregistrer le remboursement
              </Button>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Déjà enregistrés ({rows.length})</h3>
              {rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun remboursement enregistré.</p>}
              <div className="divide-y divide-border/60">
                {rows.slice(0, 60).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{r.client_nom}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(r.date_remboursement).toLocaleDateString('fr-CH')}{r.moyen ? ` · ${r.moyen}` : ''}{r.notes ? ` · ${r.notes}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatCHF(Number(r.montant))}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
