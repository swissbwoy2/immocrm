import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { TYPES_PERMIS } from '@/components/mandat/types';

const fieldCls = 'w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

/** Solvabilité candidat (permis, revenu net mensuel, poursuites) — obligatoire avant l'essai de 3 jours. */
export function CandidatSolvabiliteForm({ onSaved, submitLabel = 'Enregistrer' }: { onSaved: () => Promise<void> | void; submitLabel?: string }) {
  const { user } = useAuth();
  const [permis, setPermis] = useState('');
  const [revenu, setRevenu] = useState('');
  const [poursuites, setPoursuites] = useState<'' | 'oui' | 'non'>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (supabase.from as any)('candidat_criteres').select('type_permis, revenus_mensuels, poursuites').eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => {
        if (!data) return;
        setPermis(data.type_permis ?? '');
        setRevenu(data.revenus_mensuels ? String(data.revenus_mensuels) : '');
        setPoursuites(data.poursuites === true ? 'oui' : data.poursuites === false ? 'non' : '');
      });
  }, [user?.id]);

  const submit = async () => {
    const rev = Number(revenu);
    if (!permis || !(rev > 0) || !poursuites) {
      toast.error('Veuillez remplir les 3 champs de solvabilité');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase.from as any)('candidat_criteres')
        .update({ type_permis: permis, revenus_mensuels: rev, poursuites: poursuites === 'oui' })
        .eq('user_id', user.id).select('user_id');
      if (error) throw error;
      if (!data?.length) throw new Error("Renseignez d'abord vos critères de recherche");
      await onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <label htmlFor="solv-permis" className="text-sm font-medium text-muted-foreground">Permis de séjour *</label>
        <select id="solv-permis" value={permis} onChange={(e) => setPermis(e.target.value)} className={fieldCls}>
          <option value="">Sélectionner…</option>
          {TYPES_PERMIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="solv-revenu" className="text-sm font-medium text-muted-foreground">Revenu net mensuel (CHF) *</label>
        <input id="solv-revenu" type="number" min={0} inputMode="numeric" value={revenu} onChange={(e) => setRevenu(e.target.value)} className={fieldCls} />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-muted-foreground">Avez-vous des poursuites ? *</span>
        <div className="grid grid-cols-2 gap-2">
          {(['non', 'oui'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setPoursuites(v)}
              className={`min-h-[44px] rounded-xl border text-sm ${poursuites === v ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {v === 'oui' ? 'Oui' : 'Non'}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={submit} disabled={saving} size="lg" className="w-full min-h-[44px]">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        {submitLabel}
      </Button>
    </div>
  );
}
