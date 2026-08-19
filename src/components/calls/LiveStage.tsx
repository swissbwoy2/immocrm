import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  UserPlus,
  Volume2,
  Volume1,
  SwitchCamera,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  UserX,
  Radio,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';
import { toast } from 'sonner';
import {
  ParticipantAction,
  setParticipantPermission,
  setLiveSpeaker,
  endLive,
} from '@/lib/livekitLive';


interface LiveStageProps {
  /** Nom complet de la room LiveKit (visit:{visiteId}). */
  room: string;
  isHost: boolean;
  onInvite: () => void;
  onLeave: () => void;
}

const parseMeta = (raw?: string) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/** Live de visite : hôte diffuseur + clients spectateurs (promouvables). */
export function LiveStage({ room: roomName, isHost, onInvite, onLeave }: LiveStageProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();

  const [micOn, setMicOn] = useState(isHost);
  const [camOn, setCamOn] = useState(isHost);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busyIdentity, setBusyIdentity] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const canPublish = !!localParticipant?.permissions?.canPublish;

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // --- Autoplay audio ------------------------------------------------------
  useEffect(() => {
    if (!room) return;
    const sync = () => setAudioBlocked(!room.canPlaybackAudio);
    const tryStart = () => {
      room
        .startAudio()
        .then(() => setAudioBlocked(false))
        .catch(() => setAudioBlocked(!room.canPlaybackAudio));
    };
    sync();
    tryStart();
    room.on(RoomEvent.AudioPlaybackStatusChanged, sync);
    room.on(RoomEvent.TrackSubscribed, tryStart);
    document.addEventListener('pointerdown', tryStart);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, sync);
      room.off(RoomEvent.TrackSubscribed, tryStart);
      document.removeEventListener('pointerdown', tryStart);
    };
  }, [room]);

  // --- Publication : l'hôte diffuse d'emblée, le spectateur non -------------
  useEffect(() => {
    if (!localParticipant || initializedRef.current) return;
    initializedRef.current = true;
    if (isHost) {
      localParticipant.setMicrophoneEnabled(true).catch(() => setMicOn(false));
      localParticipant.setCameraEnabled(true).catch(() => setCamOn(false));
    }
  }, [localParticipant, isHost]);

  // --- Promotion / rétrogradation côté participant --------------------------
  useEffect(() => {
    if (!room || !localParticipant) return;
    const onPermissions = () => {
      const allowed = !!localParticipant.permissions?.canPublish;
      if (allowed) {
        toast.success('Vous êtes en direct', {
          description: 'L’hôte vous a fait monter : caméra et micro activés.',
        });
        localParticipant
          .setMicrophoneEnabled(true)
          .then(() => setMicOn(true))
          .catch(() => setMicOn(false));
        localParticipant
          .setCameraEnabled(true)
          .then(() => setCamOn(true))
          .catch(() => setCamOn(false));
      } else {
        localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
        localParticipant.setCameraEnabled(false).catch(() => undefined);
        setMicOn(false);
        setCamOn(false);
        if (!isHost) toast.info('Vous êtes repassé en spectateur.');
      }
    };
    room.on(RoomEvent.ParticipantPermissionsChanged, onPermissions);
    return () => {
      room.off(RoomEvent.ParticipantPermissionsChanged, onPermissions);
    };
  }, [room, localParticipant, isHost]);

  const toggleMic = async () => {
    if (!canPublish) return;
    const next = !micOn;
    setMicOn(next);
    try {
      await localParticipant?.setMicrophoneEnabled(next);
    } catch {
      setMicOn(!next);
    }
  };

  const toggleCam = async () => {
    if (!canPublish) return;
    const next = !camOn;
    setCamOn(next);
    try {
      await localParticipant?.setCameraEnabled(next);
    } catch {
      setCamOn(!next);
    }
  };

  // --- Périphériques -------------------------------------------------------
  const speakerSupported =
    typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [speakerOn, setSpeakerOn] = useState(true);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setOutputs(devices.filter((d) => d.kind === 'audiooutput'));
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
    } catch {
      /* permissions non accordées */
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices, micOn, camOn]);

  const toggleSpeaker = async () => {
    if (!room || !speakerSupported) return;
    const next = !speakerOn;
    const speaker = outputs.find((d) => /speaker|haut-parleur/i.test(d.label));
    const earpiece = outputs.find((d) => /earpiece|écouteur|headset|headphone/i.test(d.label));
    const target = next ? speaker || outputs[0] : earpiece || outputs[1] || outputs[0];
    if (!target) return;
    try {
      await room.switchActiveDevice('audiooutput', target.deviceId);
      setSpeakerOn(next);
    } catch (e) {
      console.error('Sortie audio non modifiable', e);
    }
  };

  const canSwitchCamera = cameras.length > 1 && canPublish;
  const switchCamera = async () => {
    if (!room || !canSwitchCamera) return;
    const currentId = room.getActiveDevice('videoinput');
    const idx = Math.max(0, cameras.findIndex((c) => c.deviceId === currentId));
    const next = cameras[(idx + 1) % cameras.length];
    try {
      if (!camOn) {
        await localParticipant?.setCameraEnabled(true);
        setCamOn(true);
      }
      await room.switchActiveDevice('videoinput', next.deviceId);
    } catch (e) {
      console.error('Changement de caméra impossible', e);
    }
  };

  // --- Mains levées (data channel) -----------------------------------------
  const visiteId = roomName.startsWith('visit:') ? roomName.slice('visit:'.length) : '';
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [endingLive, setEndingLive] = useState(false);

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array, participant?: any) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg?.type !== 'raise_hand') return;
        const identity = participant?.identity;
        if (!identity) return;
        setRaisedHands((prev) =>
          msg.raised
            ? prev.includes(identity)
              ? prev
              : [...prev, identity]
            : prev.filter((i) => i !== identity),
        );
        if (isHost && msg.raised) {
          toast.info(`${participant?.name || 'Un participant'} demande la parole`);
        }
      } catch {
        /* message non pertinent */
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, isHost]);

  const toggleHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    try {
      await localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'raise_hand', raised: next })),
        { reliable: true },
      );
      toast.success(next ? 'Demande de parole envoyée' : 'Demande de parole retirée');
    } catch (e: any) {
      setHandRaised(!next);
      toast.error('Impossible d’envoyer la demande', { description: e?.message });
    }
  };

  // --- Actions hôte --------------------------------------------------------
  const runHostAction = async (identity: string, action: ParticipantAction, name: string) => {
    setBusyIdentity(identity);
    try {
      if ((action === 'promote' || action === 'demote') && visiteId) {
        // Live : promotion contrôlée côté serveur (max 2 intervenants).
        await setLiveSpeaker({ visiteId, identity, action });
      } else {
        await setParticipantPermission({ room: roomName, identity, action });
      }
      if (action === 'promote' || action === 'remove') {
        setRaisedHands((prev) => prev.filter((i) => i !== identity));
      }
      const labels: Record<ParticipantAction, string> = {
        promote: `${name} est monté en direct`,
        demote: `${name} est repassé spectateur`,
        mute: `Micro de ${name} coupé`,
        remove: `${name} a été retiré du live`,
      };
      toast.success(labels[action]);
    } catch (e: any) {
      toast.error('Action impossible', { description: e?.message });
    } finally {
      setBusyIdentity(null);
    }
  };

  const handleLeave = async () => {
    if (!isHost || !visiteId) {
      onLeave();
      return;
    }
    setEndingLive(true);
    try {
      await endLive(visiteId);
      toast.success('Live terminé');
    } catch (e: any) {
      toast.error('Fermeture du live incomplète', { description: e?.message });
    } finally {
      setEndingLive(false);
      onLeave();
    }
  };


  const people = useMemo(
    () =>
      participants.map((p) => {
        const meta = parseMeta(p.metadata as any);
        return {
          identity: p.identity,
          sid: p.sid,
          name: p.name || 'Participant',
          isLocal: p.isLocal,
          isHost: !!meta.host,
          role: (meta.role as string) || 'client',
          live: !!p.permissions?.canPublish,
          speaking: p.isSpeaking,
        };
      }),
    [participants],
  );

  const liveCount = people.filter((p) => p.live).length;
  const hasVideo = tracks.some((t) => !t.publication?.isMuted);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[hsl(200_35%_12%)]">
      <RoomAudioRenderer volume={1} />

      {/* En-tête */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-white/10"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <Badge className="bg-[hsl(0_75%_55%)] text-white gap-1 border-0">
          <Radio className="h-3 w-3" /> LIVE
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">Live de visite</p>
          <p className="text-[11px] text-white/60">
            {connectionState !== LKConnectionState.Connected
              ? 'Connexion…'
              : `${people.length} participant${people.length > 1 ? 's' : ''} · ${liveCount} en direct`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setPanelOpen((v) => !v)}
          className="text-white hover:bg-white/10 rounded-full"
        >
          <Users className="h-4 w-4 mr-1" />
          {people.length}
        </Button>
      </div>

      {audioBlocked && (
        <div className="px-4 pt-3 flex justify-center">
          <Button
            type="button"
            onClick={() => room?.startAudio().then(() => setAudioBlocked(false)).catch(() => undefined)}
            className="rounded-full bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)] text-white"
          >
            <Volume2 className="h-4 w-4 mr-2" /> Activer le son
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden p-2">
          {hasVideo ? (
            <GridLayout tracks={tracks} className="h-full">
              <ParticipantTile />
            </GridLayout>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <Radio className="h-10 w-10 text-[hsl(158_55%_45%)] animate-pulse" />
              <p className="text-sm text-white/80">
                {isHost
                  ? 'Activez votre caméra pour démarrer la diffusion.'
                  : 'En attente du démarrage du live par votre agent…'}
              </p>
            </div>
          )}
        </div>

        {/* Panneau participants */}
        {panelOpen && (
          <aside className="w-full max-w-[300px] absolute right-0 top-0 bottom-0 sm:relative bg-[hsl(200_35%_16%)] border-l border-white/10 flex flex-col z-10">
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
              <p className="text-sm font-semibold text-white">Participants</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPanelOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {people.map((p) => (
                <div key={p.identity} className="rounded-lg p-2 hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <ChatAvatar name={p.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {p.name}
                        {p.isLocal ? ' (vous)' : ''}
                      </p>
                      <p className="text-[11px] text-white/60">
                        {p.isHost ? 'Hôte' : p.live ? 'En direct' : 'Spectateur'}
                      </p>
                    </div>
                    {p.live && !p.isHost && (
                      <Badge className="bg-[hsl(158_55%_45%)] text-white border-0 text-[10px]">
                        Direct
                      </Badge>
                    )}
                  </div>

                  {isHost && !p.isLocal && !p.isHost && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyIdentity === p.identity}
                        onClick={() => runHostAction(p.identity, p.live ? 'demote' : 'promote', p.name)}
                        className="h-8 text-xs text-white hover:bg-white/10"
                      >
                        {p.live ? (
                          <>
                            <ArrowDownCircle className="h-3.5 w-3.5 mr-1" /> Redescendre
                          </>
                        ) : (
                          <>
                            <ArrowUpCircle className="h-3.5 w-3.5 mr-1" /> Faire monter
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyIdentity === p.identity}
                        onClick={() => runHostAction(p.identity, 'mute', p.name)}
                        className="h-8 text-xs text-white hover:bg-white/10"
                      >
                        <MicOff className="h-3.5 w-3.5 mr-1" /> Micro
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyIdentity === p.identity}
                        onClick={() => runHostAction(p.identity, 'remove', p.name)}
                        className="h-8 text-xs text-red-300 hover:bg-red-500/15"
                      >
                        <UserX className="h-3.5 w-3.5 mr-1" /> Retirer
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isHost && (
              <div className="p-2 border-t border-white/10">
                <Button
                  onClick={onInvite}
                  className="w-full rounded-full bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)] text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Ajouter un participant
                </Button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Barre de contrôles */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-3 border-t border-white/10"
        style={{
          background: 'hsl(158 55% 20%)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {canPublish && (
          <>
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
          </>
        )}

        {speakerSupported && outputs.length > 0 && (
          <Button
            type="button"
            size="icon"
            onClick={toggleSpeaker}
            aria-label={speakerOn ? 'Passer sur écouteur' : 'Passer sur haut-parleur'}
            className={cn(
              'h-12 w-12 rounded-full',
              speakerOn
                ? 'bg-white/15 hover:bg-white/25 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white/70',
            )}
          >
            {speakerOn ? <Volume2 className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
          </Button>
        )}

        {canSwitchCamera && (
          <Button
            type="button"
            size="icon"
            onClick={switchCamera}
            aria-label="Changer de caméra"
            className="h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 text-white"
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>
        )}

        {isHost && (
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
          aria-label={isHost ? 'Terminer le live' : 'Quitter le live'}
          className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
