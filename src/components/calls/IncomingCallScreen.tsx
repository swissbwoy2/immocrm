import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, PhoneOff, Video, MessageSquare, Send, X } from 'lucide-react';
import { CallMode } from '@/lib/livekitCall';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';
import { startRingtone, stopRingtone, onRingtoneBlocked, retryRingtone } from '@/lib/callRingtone';
import { cn } from '@/lib/utils';

export interface IncomingCall {
  conversationId: string;
  mode: CallMode;
  title: string;
  message: string;
  callerName?: string;
  callerId?: string;
}

interface Props {
  call: IncomingCall;
  accepting?: boolean;
  onAccept: () => void;
  onDecline: (quickMessage?: string) => void;
  /** Délai (ms) avant appel manqué automatique. */
  timeoutMs?: number;
  onTimeout: () => void;
}

const QUICK_REPLIES = [
  'Je ne peux pas répondre là, je te rappelle.',
  'Je suis en visite, envoie-moi un message.',
  'Je te rappelle dans 10 minutes.',
];

/**
 * Écran plein écran d'appel entrant (sonnerie + vibration).
 * Décrocher rejoint la salle EN PLACE : aucune navigation, aucun rechargement.
 */
export function IncomingCallScreen({
  call,
  accepting,
  onAccept,
  onDecline,
  timeoutMs = 40000,
  onTimeout,
}: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    startRingtone();
    return () => stopRingtone();
  }, [call.conversationId]);

  useEffect(() => onRingtoneBlocked(setAudioBlocked), []);

  useEffect(() => {
    if (accepting) stopRingtone();
  }, [accepting]);

  useEffect(() => {
    const t = window.setTimeout(() => onTimeout(), timeoutMs);
    return () => window.clearTimeout(t);
  }, [timeoutMs, onTimeout]);

  const caller = call.callerName || call.message?.replace(/ vous appelle$/i, '') || 'Appel entrant';

  return (
    <div
      role="dialog"
      aria-label="Appel entrant"
      className="fixed inset-0 z-[120] flex flex-col items-center justify-between text-white animate-in fade-in"
      style={{
        background: 'linear-gradient(160deg, hsl(158 55% 20%) 0%, hsl(200 35% 12%) 100%)',
        paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="rounded-full p-1.5 ring-4 ring-[hsl(158_55%_45%)]/60 animate-pulse">
          <ChatAvatar name={caller} size="lg" />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-semibold">{caller}</p>
          <p className="mt-1 text-sm text-white/75 flex items-center justify-center gap-2">
            {call.mode === 'audio' ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            {call.mode === 'audio' ? 'Appel audio entrant…' : 'Appel vidéo entrant…'}
          </p>
        </div>
      </div>

      {replyOpen && (
        <div className="w-full max-w-md px-6 pb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setText(q)}
                className="text-xs rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-left"
              >
                {q}
              </button>
            ))}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Votre message…"
            rows={2}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReplyOpen(false)}
              className="h-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
            <Button
              type="button"
              onClick={() => onDecline(text.trim() || QUICK_REPLIES[0])}
              className="flex-1 h-11 rounded-full bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)] text-white"
            >
              <Send className="h-4 w-4 mr-2" /> Envoyer et refuser
            </Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md px-6 flex items-end justify-around">
        <CallAction
          label="Refuser"
          onClick={() => onDecline()}
          className="bg-destructive hover:bg-destructive/90"
        >
          <PhoneOff className="h-7 w-7" />
        </CallAction>

        {!replyOpen && (
          <CallAction
            label="Message"
            onClick={() => setReplyOpen(true)}
            className="bg-white/15 hover:bg-white/25"
          >
            <MessageSquare className="h-6 w-6" />
          </CallAction>
        )}

        <CallAction
          label={accepting ? 'Connexion…' : 'Décrocher'}
          disabled={accepting}
          onClick={onAccept}
          className="bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)]"
        >
          {call.mode === 'audio' ? <Phone className="h-7 w-7" /> : <Video className="h-7 w-7" />}
        </CallAction>
      </div>
    </div>
  );
}

function CallAction({
  children,
  label,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        size="icon"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className={cn('h-16 w-16 rounded-full text-white shadow-lg', className)}
      >
        {children}
      </Button>
      <span className="text-xs text-white/80">{label}</span>
    </div>
  );
}
