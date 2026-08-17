import { useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCall } from '@/contexts/CallContext';
import { cn } from '@/lib/utils';

interface Props {
  visiteId: string;
  /** Hôte = admin / agent / coursier rattaché à la visite. */
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

/**
 * Démarre (ou rejoint) le live de visite : room LiveKit visit:{visiteId}.
 * Les clients concernés reçoivent une notification « Rejoindre le live ».
 */
export function StartVisitLiveButton({
  visiteId,
  label = 'Démarrer le live',
  size = 'sm',
  variant = 'default',
  className,
}: Props) {
  const { startLive, connecting, session } = useCall();
  const [busy, setBusy] = useState(false);
  const active = session?.visiteId === visiteId;

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || active) return;
    setBusy(true);
    try {
      await startLive(visiteId);
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
        'rounded-full gap-1.5',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
      {active ? 'Live en cours' : label}
    </Button>
  );
}
