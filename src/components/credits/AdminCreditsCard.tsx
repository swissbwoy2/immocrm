import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdminCreditsCard({ userId }: { userId?: string | null }) {
  const { credits, reload } = useUserCredits(userId);
  const [v, setV] = useState(0);
  const [m, setM] = useState(0);
  const [s, setS] = useState('actif');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (credits) { setV(credits.coins_visite); setM(credits.coins_mandat); setS(credits.mandat_statut); }
  }, [credits]);

  if (!userId || !credits) return null;

  const save = async (vals: { coins_visite: number; coins_mandat: number; mandat_statut: string }) => {
    setSaving(true);
    const { error } = await (supabase as any).from('user_credits').update(vals).eq('user_id', userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Crédits enregistrés');
    reload();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Crédits</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm">Crédits visite<Input type="number" min={0} value={v} onChange={(e) => setV(Number(e.target.value))} /></label>
          <label className="text-sm">Crédit mandat (jours)<Input type="number" min={0} value={m} onChange={(e) => setM(Number(e.target.value))} /></label>
          <label className="text-sm">Statut mandat
            <Select value={s} onValueChange={setS}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="resilie">Résilié</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => save({ coins_visite: v, coins_mandat: m, mandat_statut: s })}>Enregistrer</Button>
          <Button variant="outline" disabled={saving} onClick={() => save({ coins_visite: 30, coins_mandat: 90, mandat_statut: 'actif' })}>Recharger (30 visites / 90 jours)</Button>
        </div>
      </CardContent>
    </Card>
  );
}
