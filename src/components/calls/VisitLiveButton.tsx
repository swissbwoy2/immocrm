import { useEffect, useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCall } from '@/contexts/CallContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const HOST_ROLES = ['admin', 'agent', 'coursier'];

interface Props {
  visiteId: string;
  /** Date/heure de la visite : le bouton hôte n'apparaît que pour aujourd'hui / à venir. */
  dateVisite?: string | Date | null;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  /** Ignore le filtre de date (fiche offre, etc.). */
  alwaysShowForHost?: boolean;
}

/**
 * Bouton unique de live de visite :
 * - admin / agent / coursier → « Démarrer un live de visite » (crée la room + statut en_cours)
 * - client → « Rejoindre le live » uniquement si un live est en_cours pour cette visite
 */
export function VisitLiveButton({
  visiteId,
  dateVisite,
  size = 'sm',
  variant = 'default',
  className,
  alwaysShowForHost = false,
}: Props) {
  const { userRole } = useAuth();
  const { startLive, joinLive, connecting, session } = useCall();
  const [busy, setBusy] = useState(false);
  const [liveEnCours, setLiveEnCours] = useState(false);

  const isHost = !!userRole && HOST_ROLES.includes(userRole);
  const active = session?.visiteId === visiteId;

  // Détecte un live en cours (utile pour les clients + affichage « rejoindre »).
  useEffect(() => {
    if (!visiteId) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from('lives')
        .select('id')
        .eq('visite_id', visiteId)
        .eq('statut', 'en_cours')
        .limit(1);
      if (!cancelled) setLiveEnCours(!!data?.length);
    };
    void check();
    const channel = supabase
      .channel(`lives-${visiteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lives', filter: `visite_id=eq.${visiteId}` },
        () => void check(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [visiteId]);

  if (!visiteId) return null;

  // Client (ou tout autre rôle) : uniquement rejoindre un live en cours.
  if (!isHost && !liveEnCours) return null;

  if (isHost && !alwaysShowForHost && !liveEnCours && dateVisite) {
    const d = new Date(dateVisite);
    if (!Number.isNaN(d.getTime())) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (d < startOfToday) return null;
    }
  }

  const label = active
    ? 'Live en cours'
    : !isHost
      ? 'Rejoindre le live'
      : liveEnCours
        ? 'Rejoindre le live'
        : 'Démarrer un live de visite';

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || active) return;
    setBusy(true);
    try {
      if (isHost && !liveEnCours) await startLive(visiteId);
      else await joinLive(visiteId);
    } finally {
      setBusy(false);
    }
  };

  const loading = busy && !!connecting;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={loading || active}
      className={cn(
        variant === 'default' &&
          'bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)] text-white border-0',
        'rounded-full gap-1.5 font-semibold',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
      {label}
    </Button>
  );
}
