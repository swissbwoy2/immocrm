import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { TYPES_PERMIS } from '@/components/mandat/types';

export const GARANT_CRITERE = "Votre garant doit gagner au moins 3× le loyer visé, avoir un permis B ou C ou la nationalité suisse, et ne pas avoir de poursuites ni d'actes de défaut de biens.";

const fieldCls = 'w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
type YN = '' | 'oui' | 'non';
const toYN = (b: boolean | null | undefined): YN => (b === true ? 'oui' : b === false ? 'non' : '');

function YesNo({ label, value, onChange }: { label: string; value: YN; onChange: (v: YN) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {(['non', 'oui'] as const).map((v) => (
          <Button key={v} type="button" variant={value === v ? 'default' : 'outline'} className="min-h-[44px]" onClick={() => onChange(v)}>
            {v === 'oui' ? 'Oui' : 'Non'}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Formulaire « Mon garant » du candidat (stocké dans candidat_criteres). */
export function CandidatGarantForm({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const [nom, setNom] = useState('');
  const [lien, setLien] = useState('');
  const [revenus, setRevenus] = useState('');
  const [permis, setPermis] = useState('');
  const [poursuites, setPoursuites] = useState<YN>('');
  const [actes, setActes] = useState<YN>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (supabase.from as any)('candidat_criteres')
      .select('garant_nom, garant_lien, garant_revenus, garant_permis, garant_poursuites, garant_actes_defaut')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => {
        if (!data) return;
        setNom(data.garant_nom ?? ''); setLien(data.garant_lien ?? '');
        setRevenus(data.garant_revenus ? String(data.garant_revenus) : '');
        setPermis(data.garant_permis ?? '');
        setPoursuites(toYN(data.garant_poursuites)); setActes(toYN(data.garant_actes_defaut));
      });
  }, [user?.id]);

  const submit = async () => {
    if (!user?.id) return;
    if (!nom.trim()) { toast.error('Indiquez le nom du garant'); return; }
    setSaving(true);
    try {
      const { data, error } = await (supabase.from as any)('candidat_criteres').update({
        garant_nom: nom.trim(), garant_lien: lien.trim() || null,
        garant_revenus: revenus ? Number(revenus) : null, garant_permis: permis || null,
        garant_poursuites: poursuites ? poursuites === 'oui' : null,
        garant_actes_defaut: actes ? actes === 'oui' : null,
      }).eq('user_id', user.id).select('user_id');
      if (error) throw error;
      if (!data?.length) throw new Error("Renseignez d'abord vos critères de recherche");
      toast.success('Garant enregistré');
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <label htmlFor="g-nom" className="text-sm font-medium text-muted-foreground">Nom du garant *</label>
        <input id="g-nom" value={nom} onChange={(e) => setNom(e.target.value)} className={fieldCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="g-lien" className="text-sm font-medium text-muted-foreground">Lien avec vous (parent, ami, employeur…)</label>
        <input id="g-lien" value={lien} onChange={(e) => setLien(e.target.value)} className={fieldCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="g-rev" className="text-sm font-medium text-muted-foreground">Revenu net mensuel (CHF)</label>
        <input id="g-rev" type="number" min={0} inputMode="numeric" value={revenus} onChange={(e) => setRevenus(e.target.value)} className={fieldCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="g-permis" className="text-sm font-medium text-muted-foreground">Permis de séjour</label>
        <select id="g-permis" value={permis} onChange={(e) => setPermis(e.target.value)} className={fieldCls}>
          <option value="">Sélectionner…</option>
          {TYPES_PERMIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <YesNo label="Poursuites ?" value={poursuites} onChange={setPoursuites} />
      <YesNo label="Actes de défaut de biens ?" value={actes} onChange={setActes} />
      <Button className="w-full min-h-[44px]" disabled={saving} onClick={submit}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer mon garant
      </Button>
    </div>
  );
}
