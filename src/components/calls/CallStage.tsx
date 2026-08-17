import { useEffect, useState } from 'react';
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';

interface CallStageProps {
  mode: 'audio' | 'video';
  canInvite: boolean;
  onInvite: () => void;
  onLeave: () => void;
}

/** Inner UI, rendered inside <LiveKitRoom>. */
export function CallStage({ mode, canInvite, onInvite, onLeave }: CallStageProps) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === 'video');

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  useEffect(() => {
    localParticipant?.setCameraEnabled(mode === 'video').catch(() => setCamOn(false));
    localParticipant?.setMicrophoneEnabled(true).catch(() => setMicOn(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const toggleMic = async () => {
    const next = !micOn;
    setMicOn(next);
    try {
      await localParticipant?.setMicrophoneEnabled(next);
    } catch {
      setMicOn(!next);
    }
  };

  const toggleCam = async () => {
    const next = !camOn;
    setCamOn(next);
    try {
      await localParticipant?.setCameraEnabled(next);
    } catch {
      setCamOn(!next);
    }
  };

  const videoVisible = mode === 'video';

  return (
    <div className="flex flex-col h-full min-h-0 bg-[hsl(200_35%_12%)]">
      <RoomAudioRenderer />

      <div className="flex-1 min-h-0 overflow-hidden p-2">
        {videoVisible ? (
          <GridLayout tracks={tracks} className="h-full">
            <ParticipantTile />
          </GridLayout>
        ) : (
          <div className="h-full flex flex-wrap items-center justify-center gap-6 p-4">
            {participants.map((p) => (
              <div key={p.identity} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'rounded-full p-1 transition-all',
                    p.isSpeaking ? 'ring-4 ring-[hsl(158_55%_45%)]' : 'ring-2 ring-white/20',
                  )}
                >
                  <ChatAvatar name={p.name || 'Participant'} size="lg" />
                </div>
                <p className="text-xs text-white/90 max-w-[120px] truncate">
                  {p.name || 'Participant'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-3 border-t border-white/10"
        style={{
          background: 'hsl(158 55% 20%)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Button
          type="button"
          size="icon"
          onClick={toggleMic}
          aria-label={micOn ? 'Couper le micro' : 'Activer le micro'}
          className={cn(
            'h-12 w-12 rounded-full',
            micOn
              ? 'bg-white/15 hover:bg-white/25 text-white'
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
          )}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          type="button"
          size="icon"
          onClick={toggleCam}
          aria-label={camOn ? 'Couper la caméra' : 'Activer la caméra'}
          className={cn(
            'h-12 w-12 rounded-full',
            camOn
              ? 'bg-white/15 hover:bg-white/25 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white/70',
          )}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        {canInvite && (
          <Button
            type="button"
            size="icon"
            onClick={onInvite}
            aria-label="Ajouter un participant"
            className="h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 text-white"
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        )}

        <Button
          type="button"
          size="icon"
          onClick={onLeave}
          aria-label="Quitter l'appel"
          className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
