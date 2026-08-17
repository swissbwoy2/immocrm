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
import { CallMode, CallTokenResult, fetchCallToken, isCallHostRole } from '@/lib/livekitCall';
import { CallStage } from '@/components/calls/CallStage';
import { AddParticipantDialog } from '@/components/calls/AddParticipantDialog';
import { IncomingCallBanner, IncomingCall } from '@/components/calls/IncomingCallBanner';

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

  // Appels entrants : notification in-app en temps réel (aucune navigation)
  useEffect(() => {
    if (!user?.id) return;
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
        (payload) => {
          const n: any = payload.new;
          if (n?.type !== 'call_incoming' && n?.type !== 'call_invite') return;
          const conversationId = n?.metadata?.conversationId;
          if (!conversationId) return;
          // Déjà en appel sur la même conversation → on ignore
          if (session?.conversationId === conversationId) return;
          setIncoming({
            conversationId,
            mode: (n?.metadata?.mode as CallMode) || 'video',
            title: n?.title || 'Appel entrant',
            message: n?.message || '',
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, session?.conversationId]);

  const value = useMemo(
    () => ({ session, connecting, startCall, joinCall, leaveCall }),
    [session, connecting, startCall, joinCall, leaveCall],
  );

  return (
    <CallContext.Provider value={value}>
      {children}

      {incoming && !session && (
        <IncomingCallBanner
          call={incoming}
          accepting={!!connecting}
          onAccept={() => joinCall(incoming.conversationId, incoming.mode)}
          onDecline={() => setIncoming(null)}
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
