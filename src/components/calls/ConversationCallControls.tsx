import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, Video, Loader2 } from 'lucide-react';
import { CallMode } from '@/lib/livekitCall';
import { useCall } from '@/contexts/CallContext';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string;
  /** white = on colored mobile header, default = on light desktop header */
  variant?: 'default' | 'onColor';
  className?: string;
}

/**
 * Boutons d'appel audio / vidéo d'une conversation.
 * L'UI d'appel est montée globalement par <CallProvider> : rejoindre un appel
 * ne provoque aucun remount de l'app ni rechargement de page.
 */
export function ConversationCallControls({ conversationId, variant = 'default', className }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, connecting, startCall, joinCall } = useCall();
  const autoJoinedRef = useRef<string | null>(null);

  const busy = !!connecting || !!session;

  // Deep-link: ?call={conversationId} → rejoint automatiquement l'appel (sans reload)
  useEffect(() => {
    const callParam = searchParams.get('call');
    if (!callParam || callParam !== conversationId) return;
    if (autoJoinedRef.current === conversationId) return;
    autoJoinedRef.current = conversationId;
    const mode = (searchParams.get('mode') as CallMode) || 'video';
    void joinCall(conversationId, mode);
    const next = new URLSearchParams(searchParams);
    next.delete('call');
    next.delete('mode');
    setSearchParams(next, { replace: true });
  }, [searchParams, conversationId, joinCall, setSearchParams]);

  const btnClass =
    variant === 'onColor'
      ? 'h-10 w-10 text-white hover:bg-white/15 hover:text-white'
      : 'h-9 w-9 text-[hsl(158_55%_32%)] hover:bg-[hsl(158_55%_38%)]/10 hover:text-[hsl(158_55%_28%)]';

  return (
    <div className={cn('flex items-center gap-1 shrink-0', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={btnClass}
        onClick={(e) => {
          e.preventDefault();
          void startCall(conversationId, 'audio');
        }}
        disabled={busy}
        aria-label="Appel audio"
        title="Appel audio"
      >
        {connecting === 'audio' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={btnClass}
        onClick={(e) => {
          e.preventDefault();
          void startCall(conversationId, 'video');
        }}
        disabled={busy}
        aria-label="Appel vidéo"
        title="Appel vidéo"
      >
        {connecting === 'video' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
      </Button>
    </div>
  );
}
