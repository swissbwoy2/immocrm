import { useEffect, useRef, useState } from 'react';
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState as LKConnectionState, RoomEvent, Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, Volume2 } from 'lucide-react';
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
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const [micOn, setMicOn] = useState(true);
  // Appel téléphone = audio seul : caméra coupée au départ (activable ensuite).
  const [camOn, setCamOn] = useState(mode === 'video');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const initializedRef = useRef(false);

  // Toutes les pistes vidéo (locales ET distantes), placeholder inclus pour
  // les participants sans caméra active.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // --- Autoplay audio : débloquer la lecture des pistes distantes -----------
  useEffect(() => {
    if (!room) return;

    const sync = () => setAudioBlocked(!room.canPlaybackAudio);
    sync();

    const tryStart = () => {
      room
        .startAudio()
        .then(() => setAudioBlocked(false))
        .catch(() => setAudioBlocked(!room.canPlaybackAudio));
    };

    // Tentative immédiate (le clic « Répondre » compte comme geste utilisateur)
    tryStart();

    room.on(RoomEvent.AudioPlaybackStatusChanged, sync);
    room.on(RoomEvent.TrackSubscribed, tryStart);
    document.addEventListener('pointerdown', tryStart, { once: false });

    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, sync);
      room.off(RoomEvent.TrackSubscribed, tryStart);
      document.removeEventListener('pointerdown', tryStart);
    };
  }, [room]);

  // --- Publication initiale : micro TOUJOURS activé, une seule fois ---------
  useEffect(() => {
    if (!localParticipant || initializedRef.current) return;
    initializedRef.current = true;

    localParticipant.setMicrophoneEnabled(true).catch(() => setMicOn(false));
    if (mode === 'video') {
      localParticipant.setCameraEnabled(true).catch(() => setCamOn(false));
    } else {
      // Mode audio : on ne publie AUCUNE vidéo par défaut (le micro reste actif).
      localParticipant.setCameraEnabled(false).catch(() => undefined);
      setCamOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localParticipant]);


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

  // On affiche la grille vidéo dès qu'une caméra est active quelque part.
  const hasVideo =
    camOn || tracks.some((t) => !t.participant.isLocal && t.publication?.isSubscribed && !t.publication?.isMuted);

  const remoteCount = participants.filter((p) => !p.isLocal).length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[hsl(200_35%_12%)]">
      {/* Rend l'audio de TOUS les participants distants */}
      <RoomAudioRenderer volume={1} />

      {audioBlocked && (
        <div className="px-4 pt-3 flex justify-center">
          <Button
            type="button"
            onClick={() => room?.startAudio().then(() => setAudioBlocked(false)).catch(() => undefined)}
            className="rounded-full bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)] text-white"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Activer le son
          </Button>
        </div>
      )}


      <div className="px-4 pt-3 text-center text-xs text-white/70">
        {connectionState !== LKConnectionState.Connected
          ? 'Connexion…'
          : remoteCount === 0
            ? 'En attente que votre correspondant rejoigne…'
            : `${remoteCount + 1} participants`}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-2">
        {hasVideo ? (
          <GridLayout tracks={tracks} className="h-full">
            <ParticipantTile />
          </GridLayout>
        ) : (
          <div className="h-full flex flex-wrap items-center justify-center gap-6 p-4">
            {participants.map((p) => (
              <div key={p.sid || p.identity} className="flex flex-col items-center gap-2">
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
                  {p.isLocal ? ' (vous)' : ''}
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
