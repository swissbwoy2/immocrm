import { useState } from 'react';
import { Plus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHARGE_CATEGORIES, chargeCategoryLabel, formatCHF, type ChargeRow } from '@/lib/adminFinance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charges: ChargeRow[];
  /** false = la table n'existe pas encore (migration à appliquer). */
  available: boolean;
  onChanged: () => void;
}

const RECURRENCES = [
  { key: 'mensuelle', label: 'Chaque mois' },
  { key: 'annuelle', label: 'Chaque année' },
  { key: 'ponctuelle', label: 'Une seule fois' },
] as const;

const today = () => new Date().toISOString().slice(0, 10);

/** Saisie des charges de l'agence (loyer, pubs, logiciels…). Une charge qui s'arrête reçoit une date de fin : rien n'est supprimé. */
export function ChargesAgenceDialog({ open, onOpenChange, charges, available, onChanged }: Props) {
  const [libelle, setLibelle] = useState('');
  const [categorie, setCategorie] = useState('loyer');
  const [montant, setMontant] = useState('');
  const [recurrence, setRecurrence] = useState<'mensuelle' | 'annuelle' | 'ponctuelle'>('mensuelle');
  const [dateDebut, setDateDebut] = useState(today());
  const [saving, setSaving] = useState(false);

  const table = () => (supabase as any).from('charges_agence');

  const add = async () => {
    const m = Number(String(montant).replace(/'/g, '').replace(',', '.'));
    if (!libelle.trim() || !Number.isFinite(m) || m <= 0) {
      toast.error('Indiquez un libellé et un montant valide');
      return;
    }
    setSaving(true);
    const { error } = await table().insert({ libelle: libelle.trim(), categorie, montant: m, recurrence, date_debut: dateDebut });
    setSaving(false);
    if (error) {
      toast.error("Impossible d'enregistrer la charge");
      return;
    }
    toast.success('Charge ajoutée');
    setLibelle('');
    setMontant('');
    onChanged();
  };

  const stop = async (c: ChargeRow) => {
    const { error } = await table().update({ date_fin: today(), updated_at: new Date().toISOString() }).eq('id', c.id);
    if (error) toast.error("Impossible d'arrêter la charge");
    else { toast.success('Charge arrêtée : ce mois-ci est le dernier compté'); onChanged(); }
  };

  const actives = charges.filter((c) => !c.date_fin || c.date_fin >= today());
  const terminees = charges.filter((c) => c.date_fin && c.date_fin < today());
  const parMois = actives
    .filter((c) => c.recurrence !== 'ponctuelle')
    .reduce((s, c) => s + (c.recurrence === 'annuelle' ? Number(c.montant) / 12 : Number(c.montant)), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charges de l'agence</DialogTitle>
          <DialogDescription>
            Loyer, publicité, logiciels, assurances… Elles entrent dans le calcul du bénéfice réel.
          </DialogDescription>
        </DialogHeader>

        {!available ? (
          <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800">
            La table des charges n'est pas encore créée. Collez le fichier « 20261025200000_charges_agence.sql » dans l'éditeur SQL de Lovable Cloud, puis rechargez la page.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">Charges fixes actuelles</p>
              <p className="text-2xl font-semibold text-foreground">{formatCHF(parMois)} <span className="text-sm font-normal text-muted-foreground">/ mois</span></p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ch-libelle">Libellé</Label>
                <Input id="ch-libelle" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex. Loyer bureau Ecublens" />
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={categorie} onValueChange={setCategorie}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHARGE_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-montant">Montant (CHF)</Label>
                <Input id="ch-montant" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Fréquence</Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-date">{recurrence === 'ponctuelle' ? 'Date' : 'À partir du'}</Label>
                <Input id="ch-date" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </div>
            </div>
            <Button onClick={add} disabled={saving} className="h-11 w-full rounded-lg">
              <Plus className="mr-2 h-4 w-4" /> Ajouter la charge
            </Button>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">En cours ({actives.length})</h3>
              {actives.length === 0 && <p className="text-sm text-muted-foreground">Aucune charge saisie.</p>}
              {actives.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.libelle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {chargeCategoryLabel(c.categorie)} · {RECURRENCES.find((r) => r.key === c.recurrence)?.label} · depuis le {new Date(c.date_debut).toLocaleDateString('fr-CH')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">{formatCHF(Number(c.montant))}</span>
                  {c.recurrence !== 'ponctuelle' && (
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => stop(c)} aria-label={`Arrêter ${c.libelle}`}>
                      <Square className="mr-1 h-3.5 w-3.5" /> Arrêter
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {terminees.length > 0 && (
              <details className="rounded-xl border border-border/70 p-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Charges terminées ({terminees.length})</summary>
                <div className="mt-2 space-y-1">
                  {terminees.map((c) => (
                    <p key={c.id} className="text-xs text-muted-foreground">
                      {c.libelle} — {formatCHF(Number(c.montant))} · fin le {new Date(c.date_fin as string).toLocaleDateString('fr-CH')}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
