import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CallMode, CallTokenResult, fetchCallToken, isCallHostRole, signalCall } from '@/lib/livekitCall';
import { CallStage } from '@/components/calls/CallStage';
import { AddParticipantDialog } from '@/components/calls/AddParticipantDialog';
import { IncomingCallScreen, IncomingCall } from '@/components/calls/IncomingCallScreen';
import { stopRingtone } from '@/lib/callRingtone';

interface CallSession extends CallTokenResult {
  mode: CallMode;
  conversationId: string;
}

interface CallContextValue {
  session: CallSession | null;
  connecting: CallMode | null;
  /** Démarre un appel (notifie les autres participants). */
  startCall: (conversationId: string, mode: CallMode) => Promise<void>;
  /** Rejoint un appel existant EN PLACE (aucune notification, aucun rechargement). */
  joinCall: (conversationId: string, mode: CallMode) => Promise<void>;
  leaveCall: () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall doit être utilisé dans <CallProvider>');
  return ctx;
};

/** Empêche le service worker PWA de recharger la page pendant un appel. */
const setInCallFlag = (value: boolean) => {
  (window as any).__logisorama_in_call = value;
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<CallSession | null>(null);
  const [connecting, setConnecting] = useState<CallMode | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const busyRef = useRef(false);
  const deepLinkedRef = useRef<string | null>(null);
  const handledCallsRef = useRef<Set<string>>(new Set());
  const sessionRef = useRef<CallSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const canInvite = isCallHostRole(userRole);

  useEffect(() => {
    setInCallFlag(!!session);
    return () => setInCallFlag(false);
  }, [session]);

  const connect = useCallback(
    async (conversationId: string, mode: CallMode, notify: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setConnecting(mode);
      try {
        const res = await fetchCallToken({ conversationId, mode, notify });
        setSession({ ...res, mode, conversationId });
      } catch (e: any) {
        toast({
          title: 'Appel impossible',
          description: e?.message || "Impossible de rejoindre l'appel",
          variant: 'destructive',
        });
      } finally {
        setConnecting(null);
        busyRef.current = false;
      }
    },
    [toast],
  );

  const startCall = useCallback(
    (conversationId: string, mode: CallMode) => connect(conversationId, mode, true),
    [connect],
  );

  const joinCall = useCallback(
    async (conversationId: string, mode: CallMode) => {
      setIncoming(null);
      await connect(conversationId, mode, false);
    },
    [connect],
  );

  const leaveCall = useCallback(() => {
    setSession(null);
    setInviteOpen(false);
  }, []);

  // Deep-link global : ?call={conversationId} (notification push / e-mail)
  // → on rejoint l'appel même si aucune conversation n'est encore ouverte.
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('call');
    if (!conversationId || deepLinkedRef.current === conversationId) return;
    deepLinkedRef.current = conversationId;
    const mode = (params.get('mode') as CallMode) || 'video';
    void joinCall(conversationId, mode);
  }, [user?.id, joinCall]);

  // Appels entrants : notification in-app en temps réel (aucune navigation)
  // + repli par sondage (certaines instances Realtime ne diffusent pas les
  // postgres_changes ; l'écran d'appel doit s'afficher dans tous les cas).
  useEffect(() => {
    if (!user?.id) return;



    const handleNotification = (n: any) => {
      if (n?.type !== 'call_incoming' && n?.type !== 'call_invite') return;
      if (n?.id && handledCallsRef.current.has(n.id)) return;
      if (n?.id) handledCallsRef.current.add(n.id);

      // conversationId : métadonnées en priorité, sinon extrait du lien.
      let conversationId: string | undefined = n?.metadata?.conversationId;
      if (!conversationId && typeof n?.link === 'string') {
        const q = n.link.split('?')[1];
        if (q) {
          const sp = new URLSearchParams(q);
          conversationId = sp.get('call') || sp.get('conversationId') || undefined;
        }
      }
      if (!conversationId) {
        console.error('Appel entrant sans conversationId exploitable', n);
        return;
      }
      if (sessionRef.current?.conversationId === conversationId) return;

      setIncoming({
        conversationId,
        mode: (n?.metadata?.mode as CallMode) || 'video',
        title: n?.title || 'Appel entrant',
        message: n?.message || '',
        callerName: (n?.message || '').replace(/ vous appelle$/i, '') || undefined,
        callerId: n?.metadata?.from,
      });

      // On marque la notification lue pour ne plus la resonner au prochain sondage.
      if (n?.id) {
        void supabase.from('notifications').update({ read: true }).eq('id', n.id);
      }
    };

    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => handleNotification(payload.new),
      )
      .subscribe();

    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      const since = new Date(Date.now() - 60_000).toISOString();
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, link, metadata, created_at')
        .eq('user_id', user.id)
        .in('type', ['call_incoming', 'call_invite'])
        .eq('read', false)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) {
        console.error('[call] sondage appels entrants échoué', error);
        return;
      }
      (data || []).forEach(handleNotification);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  /** Refus / appel manqué : on prévient l'appelant (+ message rapide éventuel). */
  const dismissIncoming = useCallback(
    async (call: IncomingCall, action: 'declined' | 'missed', quickMessage?: string) => {
      setIncoming(null);
      stopRingtone();
      try {
        if (quickMessage && user?.id) {
          await supabase.from('messages').insert({
            conversation_id: call.conversationId,
            sender_id: user.id,
            sender_type: userRole || 'client',
            content: quickMessage,
          });
        }
      } catch (e) {
        console.error('Message rapide non envoyé', e);
      }
      try {
        await signalCall({ conversationId: call.conversationId, action, to: call.callerId });
      } catch (e) {
        console.error('Signal appel non envoyé', e);
      }
    },
    [user?.id, userRole],
  );

  const value = useMemo(
    () => ({ session, connecting, startCall, joinCall, leaveCall }),
    [session, connecting, startCall, joinCall, leaveCall],
  );

  return (
    <CallContext.Provider value={value}>
      {children}

      {incoming && !session && (
        <IncomingCallScreen
          call={incoming}
          accepting={!!connecting}
          onAccept={() => joinCall(incoming.conversationId, incoming.mode)}
          onDecline={(quickMessage) => void dismissIncoming(incoming, 'declined', quickMessage)}
          onTimeout={() => void dismissIncoming(incoming, 'missed')}
        />
      )}


      {session && (
        <div className="fixed inset-0 z-[100] bg-[hsl(200_35%_12%)]">
          <LiveKitRoom
            token={session.token}
            serverUrl={session.url}
            connect
            audio={true}
            video={session.mode === 'video'}
            options={{ adaptiveStream: true, dynacast: true }}
            connectOptions={{ autoSubscribe: true }}
            data-lk-theme="default"
            style={{ height: '100%' }}
            onDisconnected={leaveCall}
            onError={(e: any) => {
              const msg = String(e?.message || '');
              toast({
                title: "Erreur d'appel",
                description: /permission|denied|NotAllowed/i.test(msg)
                  ? 'Autorisation micro / caméra refusée. Active-la dans les réglages du navigateur.'
                  : msg || 'Connexion à la salle impossible.',
                variant: 'destructive',
              });
            }}
          >
            <CallStage
              mode={session.mode}
              canInvite={canInvite}
              onInvite={() => setInviteOpen(true)}
              onLeave={leaveCall}
            />
          </LiveKitRoom>

          {canInvite && (
            <AddParticipantDialog
              open={inviteOpen}
              onOpenChange={setInviteOpen}
              conversationId={session.conversationId}
              mode={session.mode}
            />
          )}
        </div>
      )}
    </CallContext.Provider>
  );
}
