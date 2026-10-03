import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CandidatDocumentsSection, useCandidatureDocs } from './CandidatDocumentsSection';
import { useQueryClient } from '@tanstack/react-query';

const GROUPS: [string, (k: string) => boolean][] = [
  ['IBAN', (k) => k.startsWith('iban') || k.includes('reference_paiement')],
  ['Garantie', (k) => k.includes('garantie')],
  ['Loyer ancien', (k) => k.startsWith('ancien_')],
  ['Loyer nouveau', (k) => /loyer|charges|total|garage|divers|taux|ispc/.test(k)],
  ['Dates', (k) => k.includes('date') || /preavis|duree/.test(k)],
  ['Parties', (k) => /bailleur|locataire|represente|proprietaire|civilite|appel|signataire|affaire|email|signature_entite/.test(k)],
  ['Objet', () => true],
];

export function AdminGenererDocuments({ candidatureId, onDone }: { candidatureId: string; onDone?: () => void }) {
  const qc = useQueryClient();
  const { data: docs = [] } = useCandidatureDocs(candidatureId);
  const [open, setOpen] = useState(false);
  const [champs, setChamps] = useState<string[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any).from('document_templates').select('code, champs').in('code', ['bail_loyer', 'notification_loyer', 'lettre_attribution', 'convocation_edl']);
      const set = new Set<string>();
      (data ?? []).forEach((t: any) => (Array.isArray(t.champs) ? t.champs : []).forEach((c: any) => set.add(typeof c === 'string' ? c : c?.key || c?.nom)));
      setChamps(Array.from(set).filter(Boolean));
      const pre: Record<string, string> = {};
      docs.forEach((d: any) => Object.entries(d.valeurs || {}).forEach(([k, v]) => { if (v != null && v !== '' && !pre[k]) pre[k] = String(v); }));
      setVals(pre);
    })();
  }, [open, docs]);

  const grouped = useMemo(() => {
    const out: Record<string, string[]> = {};
    champs.forEach((k) => { const g = GROUPS.find(([, f]) => f(k))![0]; (out[g] ||= []).push(k); });
    return GROUPS.map(([g]) => [g, out[g] || []] as const).filter(([, l]) => l.length);
  }, [champs]);

  const generer = async () => {
    if (busy) return;
    setBusy(true);
    const p_valeurs = Object.fromEntries(Object.entries(vals).filter(([, v]) => v.trim() !== ''));
    const { error } = await (supabase as any).rpc('generer_documents_candidature', { p_candidature_id: candidatureId, p_valeurs });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Documents générés');
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['candidature-docs', candidatureId] });
    onDone?.();
  };

  return (
    <div className="space-y-2">
      <Button size="sm" className="min-h-[40px]" onClick={() => setOpen(true)}>{docs.length ? 'Modifier / régénérer les documents' : 'Retenir et générer les documents'}</Button>
      <CandidatDocumentsSection candidatureId={candidatureId} canSign={false} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Valeurs des documents</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Champs vides : valeur calculée automatiquement. Les documents déjà signés ne sont pas écrasés.</p>
          {grouped.map(([g, list]) => (
            <section key={g} className="space-y-2">
              <p className="text-sm font-semibold">{g}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((k) => (
                  <label key={k} className="space-y-1 text-xs text-muted-foreground">
                    <span>{k.replace(/_/g, ' ')}</span>
                    <Input value={vals[k] ?? ''} onChange={(e) => setVals((p) => ({ ...p, [k]: e.target.value }))} className="min-h-[40px] text-foreground" />
                  </label>
                ))}
              </div>
            </section>
          ))}
          <Button className="min-h-[44px] w-full" disabled={busy} onClick={generer}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Générer les documents</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
