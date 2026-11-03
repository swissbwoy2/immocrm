import { useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lance la synchronisation AbaNinja → Logisorama (fonction abaninja-sync).
 * Elle tourne aussi toute seule toutes les heures ; ce bouton sert à ne pas attendre.
 */
export function SyncAbaNinjaButton({ onDone }: { onDone?: () => void }) {
  const [enCours, setEnCours] = useState(false);

  const lancer = async () => {
    setEnCours(true);
    try {
      const { data, error } = await supabase.functions.invoke('abaninja-sync', { body: { source: 'bouton' } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Synchronisation impossible');
      const corrections = Number(data.corrections) || 0;
      const ecarts = Number(data.ecarts) || 0;
      toast.success(
        corrections > 0
          ? `${corrections} paiement${corrections > 1 ? 's' : ''} mis à jour depuis AbaNinja`
          : 'Logisorama est à jour avec AbaNinja',
        {
          description: `${data.factures_lues} factures lues${ecarts > 0 ? ` · ${ecarts} écart${ecarts > 1 ? 's' : ''} à vérifier` : ''}`,
        },
      );
      onDone?.();
    } catch (e) {
      toast.error('Synchronisation AbaNinja impossible', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-10 rounded-full"
      onClick={lancer}
      disabled={enCours}
      aria-label="Synchroniser avec AbaNinja"
    >
      {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
      <span className="ml-2 hidden sm:inline">Synchroniser AbaNinja</span>
    </Button>
  );
}
