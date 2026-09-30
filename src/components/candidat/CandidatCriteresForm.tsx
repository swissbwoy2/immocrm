import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import MandatFormStep4 from '@/components/mandat/MandatFormStep4';
import { MandatFormData } from '@/components/mandat/types';
import { isCriteresComplete, useCandidatCriteres } from '@/hooks/useCandidatCriteres';

/** Formulaire de critères candidat : réutilise l'étape « Critères de recherche » client (MandatFormStep4). */
export function CandidatCriteresForm({ onSaved }: { onSaved?: () => void }) {
  const { formData: initial, data: row, save, isLoading } = useCandidatCriteres();
  const [data, setData] = useState<MandatFormData>(initial);
  const [dateEntree, setDateEntree] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setData(initial);
    setDateEntree(row?.date_entree_souhaitee ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, row?.user_id]);

  const submit = async () => {
    if (!isCriteresComplete(data)) {
      toast.error('Veuillez remplir les champs obligatoires (*)');
      return;
    }
    setSaving(true);
    try {
      await save(data, dateEntree);
      toast.success('Critères de recherche enregistrés');
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'enregistrer vos critères");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <MandatFormStep4 data={data} onChange={(p) => setData((prev) => ({ ...prev, ...p }))} />
      <div className="space-y-1.5">
        <label htmlFor="crit-date-entree" className="text-sm font-medium text-muted-foreground">Date d'entrée souhaitée</label>
        <input
          id="crit-date-entree"
          type="date"
          value={dateEntree}
          onChange={(e) => setDateEntree(e.target.value)}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <Button onClick={submit} disabled={saving} size="lg" className="w-full min-h-[44px]">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
        Enregistrer mes critères
      </Button>
    </div>
  );
}
