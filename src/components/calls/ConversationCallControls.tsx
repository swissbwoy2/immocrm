import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Phone, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CallMode, CallTokenResult, fetchCallToken, isCallHostRole } from '@/lib/livekitCall';
import { CallStage } from './CallStage';
import { AddParticipantDialog } from './AddParticipantDialog';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string;
  /** white = on colored mobile header, default = on light desktop header */
  variant?: 'default' | 'onColor';
  className?: string;
}

/**
 * Audio / video call buttons for a conversation + the full-screen call overlay.
 * Room = call:{conversationId}. Permissions are enforced server-side (livekit-token).
 */
export function ConversationCallControls({ conversationId, variant = 'default', className }: Props) {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connecting, setConnecting] = useState<CallMode | null>(null);
  const [session, setSession] = useState<(CallTokenResult & { mode: CallMode }) | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const autoJoinedRef = useRef<string | null>(null);

  const canInvite = isCallHostRole(userRole);

  const startCall = useCallback(
    async (mode: CallMode, notify = true) => {
      if (session || connecting) return;
      setConnecting(mode);
      try {
        const res = await fetchCallToken({ conversationId, mode, notify });
        setSession({ ...res, mode });
      } catch (e: any) {
        toast({
          title: "Appel impossible",
          description: e?.message || "Impossible de démarrer l'appel",
          variant: 'destructive',
        });
      } finally {
        setConnecting(null);
      }
    },
    [conversationId, session, connecting, toast],
  );

  // Deep-link: ?call={conversationId} → rejoint automatiquement l'appel
  useEffect(() => {
    const callParam = searchParams.get('call');
    if (!callParam || callParam !== conversationId) return;
    if (autoJoinedRef.current === conversationId) return;
    autoJoinedRef.current = conversationId;
    const mode = (searchParams.get('mode') as CallMode) || 'video';
    startCall(mode, false);
    const next = new URLSearchParams(searchParams);
    next.delete('call');
    next.delete('mode');
    setSearchParams(next, { replace: true });
  }, [searchParams, conversationId, startCall, setSearchParams]);

  const handleLeave = () => {
    setSession(null);
    setInviteOpen(false);
  };

  const btnClass =
    variant === 'onColor'
      ? 'h-10 w-10 text-white hover:bg-white/15 hover:text-white'
      : 'h-9 w-9 text-[hsl(158_55%_32%)] hover:bg-[hsl(158_55%_38%)]/10 hover:text-[hsl(158_55%_28%)]';

  return (
    <>
      <div className={cn('flex items-center gap-1 shrink-0', className)}>
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          onClick={() => startCall('audio')}
          disabled={!!connecting || !!session}
          aria-label="Appel audio"
          title="Appel audio"
        >
          {connecting === 'audio' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          onClick={() => startCall('video')}
          disabled={!!connecting || !!session}
          aria-label="Appel vidéo"
          title="Appel vidéo"
        >
          {connecting === 'video' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
        </Button>
      </div>

      {session && (
        <div className="fixed inset-0 z-[100] bg-[hsl(200_35%_12%)]">
          <LiveKitRoom
            token={session.token}
            serverUrl={session.url}
            connect
            audio
            video={session.mode === 'video'}
            data-lk-theme="default"
            style={{ height: '100%' }}
            onDisconnected={handleLeave}
            onError={(e) => {
              toast({
                title: 'Erreur d\'appel',
                description: e?.message || 'Vérifie les autorisations micro / caméra.',
                variant: 'destructive',
              });
            }}
          >
            <CallStage
              mode={session.mode}
              canInvite={canInvite}
              onInvite={() => setInviteOpen(true)}
              onLeave={handleLeave}
            />
          </LiveKitRoom>

          {canInvite && (
            <AddParticipantDialog
              open={inviteOpen}
              onOpenChange={setInviteOpen}
              conversationId={conversationId}
              mode={session.mode}
            />
          )}
        </div>
      )}
    </>
  );
}
